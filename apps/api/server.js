const express = require("express");
const cors = require("cors");
const { createClerkClient } = require("@clerk/backend");
const { PrismaClient } = require("@prisma/client");
const { calcEstimate, calcPartnerSplit } = require("./lib/calc");

const app = express();
const db = new PrismaClient();
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
const STUDIO_ORG_ID = process.env.STUDIO_ORG_ID;
const PORT = process.env.PORT || 3001;

const COMMISSION_PCT = { NONE: 0, REFERRAL_3: 3, SALES_PARTNER_7: 7, INTERNAL_1_5: 1.5 };

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.WEB_URL || "http://localhost:3000", credentials: true }));
app.use(express.json());

// Auth — skip /health
app.use(async (req, res, next) => {
  if (req.path === "/health") return next();
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return res.status(401).json({ error: "Missing token" });
  try {
    const payload = await clerk.verifyToken(auth.slice(7));
    if (!payload.org_id || payload.org_id !== STUDIO_ORG_ID)
      return res.status(403).json({ error: "Not a member of this studio" });
    req.userId = payload.sub;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
});

// Helper — get the single studio row
async function getStudio() {
  return db.studio.findFirst();
}

// Helper — build calcEstimate inputs from DB records
async function buildCalcInput(est, studio) {
  const now = new Date();
  const allSoftware = await db.softwareTool.findMany({ where: { studioId: studio.id }, include: { assignments: true } });
  const allOverheads = await db.overheadItem.findMany({ where: { studioId: studio.id } });
  const commPct = est.commissionType === "CUSTOM" ? (est.commissionCustomPct || 0) : (COMMISSION_PCT[est.commissionType] || 0);

  return {
    type: est.type,
    durationWeeks: est.durationWeeks || 8,
    margin: est.margin,
    commissionPct: commPct,
    members: est.allocations.map((a) => ({
      id: a.memberId, name: a.member.name, monthlyCost: a.member.monthlyCost,
      allocationPct: a.allocationPct, weeks: a.weeks, margin: a.margin,
    })),
    software: allSoftware.map((sw) => ({
      id: sw.id, name: sw.name, costPerSeat: sw.costPerSeat,
      isSharedLicence: sw.isSharedLicence, memberIds: sw.assignments.map((a) => a.memberId),
    })),
    overheads: allOverheads.map((oh) => ({
      id: oh.id, label: oh.label, amount: oh.amount, isActive: !oh.endDate || oh.endDate > now,
    })),
    excludedSoftwareIds: est.exclusions.filter((e) => e.softwareId).map((e) => e.softwareId),
    excludedOverheadIds: est.exclusions.filter((e) => e.overheadId).map((e) => e.overheadId),
    entity: studio.entity,
    gstRegistered: studio.gstRegistered,
  };
}

// Serialize BigInt for JSON
function serialize(obj) {
  return JSON.parse(JSON.stringify(obj, (_, v) => (typeof v === "bigint" ? Number(v) : v)));
}

// ─── Health ───────────────────────────────────────────────────────────────────
app.get("/health", (_, res) => res.json({ status: "ok", ts: new Date().toISOString() }));

// ─── Settings ─────────────────────────────────────────────────────────────────
app.get("/settings", async (_, res) => {
  const studio = await db.studio.findFirst({ include: { overheadItems: { orderBy: { createdAt: "asc" } } } });
  res.json({ data: serialize(studio) });
});

app.patch("/settings", async (req, res) => {
  const studio = await getStudio();
  if (!studio) return res.status(404).json({ error: "Studio not found" });
  const allowed = ["name","founderNames","email","phone","gstin","entity","gstRegistered",
    "workingDaysPerMonth","workingHoursPerDay","pipelineProbLead","pipelineProbProposal","pipelineProbNegotiating","fyReviewDismissedYear"];
  const data = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));
  const updated = await db.studio.update({ where: { id: studio.id }, data });
  res.json({ data: updated });
});

// ─── Overheads ────────────────────────────────────────────────────────────────
app.get("/overheads", async (_, res) => {
  const studio = await getStudio();
  if (!studio) return res.json({ data: [] });
  const items = await db.overheadItem.findMany({ where: { studioId: studio.id }, orderBy: { createdAt: "asc" } });
  res.json({ data: items });
});

app.post("/overheads", async (req, res) => {
  const studio = await getStudio();
  if (!studio) return res.status(404).json({ error: "Studio not found" });
  const { category, label, amount, startDate, endDate } = req.body;
  const item = await db.overheadItem.create({
    data: { studioId: studio.id, category, label, amount,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null },
  });
  res.status(201).json({ data: item });
});

app.patch("/overheads/:id", async (req, res) => {
  const { category, label, amount, startDate, endDate } = req.body;
  const data = {};
  if (category !== undefined) data.category = category;
  if (label !== undefined) data.label = label;
  if (amount !== undefined) data.amount = amount;
  if (startDate !== undefined) data.startDate = startDate ? new Date(startDate) : null;
  if (endDate !== undefined) data.endDate = endDate ? new Date(endDate) : null;
  const item = await db.overheadItem.update({ where: { id: req.params.id }, data });
  res.json({ data: item });
});

app.patch("/overheads/:id/stop", async (req, res) => {
  const item = await db.overheadItem.update({ where: { id: req.params.id }, data: { endDate: new Date(req.body.date || new Date()) } });
  res.json({ data: item });
});

app.patch("/overheads/:id/resume", async (req, res) => {
  const item = await db.overheadItem.update({ where: { id: req.params.id }, data: { endDate: null } });
  res.json({ data: item });
});

app.delete("/overheads/:id", async (req, res) => {
  await db.overheadItem.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

// ─── Roles ────────────────────────────────────────────────────────────────────
app.get("/roles", async (_, res) => {
  const studio = await getStudio();
  if (!studio) return res.json({ data: [] });
  const roles = await db.role.findMany({ where: { studioId: studio.id }, orderBy: { name: "asc" } });
  res.json({ data: roles });
});

app.post("/roles", async (req, res) => {
  const studio = await getStudio();
  if (!studio) return res.status(404).json({ error: "Studio not found" });
  try {
    const role = await db.role.create({ data: { studioId: studio.id, name: req.body.name, department: req.body.department || "DESIGN" } });
    res.status(201).json({ data: role });
  } catch (e) {
    if (e.code === "P2002") return res.status(409).json({ error: "Role name already exists" });
    throw e;
  }
});

app.delete("/roles/:id", async (req, res) => {
  await db.role.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

// ─── Team ─────────────────────────────────────────────────────────────────────
app.get("/team", async (_, res) => {
  const studio = await getStudio();
  if (!studio) return res.json({ data: [] });
  const members = await db.teamMember.findMany({
    where: { studioId: studio.id },
    include: { role: true, softwareAssignments: true },
    orderBy: { createdAt: "asc" },
  });
  res.json({ data: members });
});

app.post("/team", async (req, res) => {
  const studio = await getStudio();
  if (!studio) return res.status(404).json({ error: "Studio not found" });
  const { name, roleId, department, monthlyCost, isPartner, equityPct, execPremPct, bdevPremPct } = req.body;
  const member = await db.teamMember.create({
    data: { studioId: studio.id, name, roleId: roleId || null, department: department || "DESIGN",
      monthlyCost, isPartner: isPartner || false, equityPct: equityPct || 0,
      execPremPct: execPremPct || 0, bdevPremPct: bdevPremPct || 0 },
    include: { role: true },
  });
  res.status(201).json({ data: member });
});

app.patch("/team/:id", async (req, res) => {
  const allowed = ["name","roleId","department","monthlyCost","isActive","isPartner","equityPct","execPremPct","bdevPremPct"];
  const data = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));
  const member = await db.teamMember.update({ where: { id: req.params.id }, data, include: { role: true } });
  res.json({ data: member });
});

app.delete("/team/:id", async (req, res) => {
  await db.teamMember.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

// ─── Software ─────────────────────────────────────────────────────────────────
app.get("/software", async (_, res) => {
  const studio = await getStudio();
  if (!studio) return res.json({ data: [] });
  const sw = await db.softwareTool.findMany({
    where: { studioId: studio.id },
    include: { assignments: { include: { member: true } } },
    orderBy: { createdAt: "asc" },
  });
  res.json({ data: sw });
});

app.post("/software", async (req, res) => {
  const studio = await getStudio();
  if (!studio) return res.status(404).json({ error: "Studio not found" });
  const { name, costPerSeat, isSharedLicence } = req.body;
  const sw = await db.softwareTool.create({
    data: { studioId: studio.id, name, costPerSeat, isSharedLicence: isSharedLicence || false },
    include: { assignments: true },
  });
  res.status(201).json({ data: sw });
});

app.patch("/software/:id", async (req, res) => {
  const { name, costPerSeat, isSharedLicence } = req.body;
  const data = {};
  if (name !== undefined) data.name = name;
  if (costPerSeat !== undefined) data.costPerSeat = costPerSeat;
  if (isSharedLicence !== undefined) data.isSharedLicence = isSharedLicence;
  const sw = await db.softwareTool.update({ where: { id: req.params.id }, data, include: { assignments: true } });
  res.json({ data: sw });
});

// Replace member assignments for a software tool
app.put("/software/:id/assignments", async (req, res) => {
  const memberIds = req.body; // array of member IDs
  await db.softwareAssignment.deleteMany({ where: { softwareId: req.params.id } });
  if (memberIds.length) {
    await db.softwareAssignment.createMany({
      data: memberIds.map((memberId) => ({ softwareId: req.params.id, memberId })),
    });
  }
  const sw = await db.softwareTool.findUnique({ where: { id: req.params.id }, include: { assignments: { include: { member: true } } } });
  res.json({ data: sw });
});

app.delete("/software/:id", async (req, res) => {
  await db.softwareTool.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

// ─── Prospects ────────────────────────────────────────────────────────────────
app.get("/prospects", async (_, res) => {
  const studio = await getStudio();
  if (!studio) return res.json({ data: [] });
  const prospects = await db.prospect.findMany({
    where: { studioId: studio.id },
    include: { estimate: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json({ data: serialize(prospects) });
});

app.get("/prospects/:id", async (req, res) => {
  const prospect = await db.prospect.findUnique({
    where: { id: req.params.id },
    include: { estimate: { select: { id: true, name: true } } },
  });
  if (!prospect) return res.status(404).json({ error: "Not found" });
  res.json({ data: serialize(prospect) });
});

app.post("/prospects", async (req, res) => {
  const studio = await getStudio();
  if (!studio) return res.status(404).json({ error: "Studio not found" });
  const { projectName, clientName, contactEmail, notes, stage, vsUrgency, vsCompetitive, vsClientSize, vsValueScore, vsRevenueImpact, vaPricingMode } = req.body;
  const prospect = await db.prospect.create({
    data: { studioId: studio.id, projectName, clientName, contactEmail, notes,
      stage: stage || "LEAD", vsUrgency: vsUrgency || "MEDIUM", vsCompetitive: vsCompetitive || "MEDIUM",
      vsClientSize: vsClientSize || "SMB", vsValueScore, vaPricingMode: vaPricingMode || "COST_PLUS",
      vsRevenueImpact: vsRevenueImpact ? BigInt(vsRevenueImpact) : null },
  });
  res.status(201).json({ data: serialize(prospect) });
});

app.patch("/prospects/:id", async (req, res) => {
  const allowed = ["projectName","clientName","contactEmail","notes","stage","vsUrgency","vsCompetitive","vsClientSize","vsValueScore","vsRevenueImpact","vaPricingMode","estimateId"];
  const data = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));
  if (data.vsRevenueImpact !== undefined) data.vsRevenueImpact = data.vsRevenueImpact ? BigInt(data.vsRevenueImpact) : null;
  const prospect = await db.prospect.update({ where: { id: req.params.id }, data });
  res.json({ data: serialize(prospect) });
});

app.delete("/prospects/:id", async (req, res) => {
  await db.prospect.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

// ─── Estimates ────────────────────────────────────────────────────────────────
async function getEstimateWithCalc(id) {
  const est = await db.estimate.findUnique({
    where: { id },
    include: {
      prospect: true,
      allocations: { include: { member: true } },
      exclusions: true,
    },
  });
  if (!est) return null;
  const studio = await getStudio();
  const calc = calcEstimate(await buildCalcInput(est, studio));
  return serialize({ ...est, calc });
}

app.get("/estimates", async (_, res) => {
  const studio = await getStudio();
  if (!studio) return res.json({ data: [] });
  const estimates = await db.estimate.findMany({
    where: { studioId: studio.id },
    include: { prospect: { select: { id: true, projectName: true, clientName: true, stage: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json({ data: serialize(estimates) });
});

app.get("/estimates/:id", async (req, res) => {
  const est = await getEstimateWithCalc(req.params.id);
  if (!est) return res.status(404).json({ error: "Not found" });
  res.json({ data: est });
});

app.post("/estimates", async (req, res) => {
  const studio = await getStudio();
  if (!studio) return res.status(404).json({ error: "Studio not found" });
  const { name, type, durationWeeks, margin, commissionType, commissionCustomPct, contractValue, executionLeadId, prospectId } = req.body;
  const estimate = await db.estimate.create({
    data: { studioId: studio.id, name, type: type || "FIXED", durationWeeks, margin,
      commissionType: commissionType || "NONE", commissionCustomPct, executionLeadId,
      prospectId: prospectId || null,
      contractValue: contractValue ? BigInt(contractValue) : null },
  });
  res.status(201).json({ data: serialize(estimate) });
});

app.patch("/estimates/:id", async (req, res) => {
  const allowed = ["name","type","durationWeeks","margin","commissionType","commissionCustomPct","contractValue","executionLeadId","prospectId"];
  const data = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));
  if (data.contractValue !== undefined) data.contractValue = data.contractValue ? BigInt(data.contractValue) : null;
  const estimate = await db.estimate.update({ where: { id: req.params.id }, data });
  res.json({ data: serialize(estimate) });
});

// Replace team allocations
app.put("/estimates/:id/allocations", async (req, res) => {
  const allocations = req.body; // [{memberId, allocationPct, weeks, margin}]
  await db.estimateAllocation.deleteMany({ where: { estimateId: req.params.id } });
  if (allocations.length) {
    await db.estimateAllocation.createMany({
      data: allocations.map((a) => ({ estimateId: req.params.id, ...a })),
    });
  }
  const est = await getEstimateWithCalc(req.params.id);
  res.json({ data: est });
});

// Replace software/overhead exclusions
app.put("/estimates/:id/exclusions", async (req, res) => {
  const { excludedSoftwareIds = [], excludedOverheadIds = [] } = req.body;
  await db.estimateExclusion.deleteMany({ where: { estimateId: req.params.id } });
  const rows = [
    ...excludedSoftwareIds.map((softwareId) => ({ estimateId: req.params.id, softwareId })),
    ...excludedOverheadIds.map((overheadId) => ({ estimateId: req.params.id, overheadId })),
  ];
  if (rows.length) await db.estimateExclusion.createMany({ data: rows });
  const est = await getEstimateWithCalc(req.params.id);
  res.json({ data: est });
});

app.delete("/estimates/:id", async (req, res) => {
  await db.estimate.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

// ─── Dashboard ────────────────────────────────────────────────────────────────
app.get("/dashboard", async (_, res) => {
  const studio = await getStudio();
  if (!studio) return res.json({ data: null });

  const now = new Date();
  const [team, software, overheads, prospects] = await Promise.all([
    db.teamMember.findMany({ where: { studioId: studio.id, isActive: true }, include: { softwareAssignments: true } }),
    db.softwareTool.findMany({ where: { studioId: studio.id }, include: { assignments: true } }),
    db.overheadItem.findMany({ where: { studioId: studio.id } }),
    db.prospect.findMany({
      where: { studioId: studio.id },
      include: { estimate: { include: { allocations: { include: { member: true } }, exclusions: true } } },
    }),
  ]);

  const activeOverheads = overheads.filter((oh) => !oh.endDate || oh.endDate > now);

  // Monthly burn
  const salaryCost = team.reduce((s, m) => s + m.monthlyCost, 0);
  const swCost = software.reduce((s, sw) => {
    const seats = sw.isSharedLicence ? 1 : sw.assignments.filter((a) => team.find((m) => m.id === a.memberId)).length || 1;
    return s + sw.costPerSeat * seats;
  }, 0);
  const ohCost = activeOverheads.reduce((s, oh) => s + oh.amount, 0);
  const monthlyBurn = salaryCost + swCost + ohCost;

  // Won revenue & net profit
  const wonProspects = prospects.filter((p) => p.stage === "WON" && p.estimate);
  let wonRevenue = 0;
  let wonNetProfit = 0;

  for (const p of wonProspects) {
    const est = p.estimate;
    const commPct = est.commissionType === "CUSTOM" ? (est.commissionCustomPct || 0) : (COMMISSION_PCT[est.commissionType] || 0);
    const calc = calcEstimate({
      type: est.type, durationWeeks: est.durationWeeks || 8, margin: est.margin,
      commissionPct: commPct,
      members: est.allocations.map((a) => ({ id: a.memberId, name: a.member.name, monthlyCost: a.member.monthlyCost, allocationPct: a.allocationPct, weeks: a.weeks, margin: a.margin })),
      software: software.map((sw) => ({ id: sw.id, name: sw.name, costPerSeat: sw.costPerSeat, isSharedLicence: sw.isSharedLicence, memberIds: sw.assignments.map((a) => a.memberId) })),
      overheads: overheads.map((oh) => ({ id: oh.id, label: oh.label, amount: oh.amount, isActive: !oh.endDate || oh.endDate > now })),
      excludedSoftwareIds: est.exclusions.filter((e) => e.softwareId).map((e) => e.softwareId),
      excludedOverheadIds: est.exclusions.filter((e) => e.overheadId).map((e) => e.overheadId),
      entity: studio.entity, gstRegistered: studio.gstRegistered,
    });
    wonRevenue += est.contractValue ? Number(est.contractValue) : calc.revenue;
    wonNetProfit += calc.netProfit;
  }

  const runwayMonths = monthlyBurn > 0 ? Math.min(wonRevenue / monthlyBurn, 36) : 0;

  // Weighted pipeline
  const STAGE_PROB = { LEAD: studio.pipelineProbLead, PROPOSAL_SENT: studio.pipelineProbProposal, NEGOTIATING: studio.pipelineProbNegotiating, WON: 100, LOST: 0 };
  const pipeline = prospects.filter((p) => p.stage !== "LOST").map((p) => {
    const prob = STAGE_PROB[p.stage] || 0;
    const estRev = p.estimate ? calcEstimate({
      type: p.estimate.type, durationWeeks: p.estimate.durationWeeks || 8, margin: p.estimate.margin,
      commissionPct: COMMISSION_PCT[p.estimate.commissionType] || 0,
      members: p.estimate.allocations.map((a) => ({ id: a.memberId, name: a.member.name, monthlyCost: a.member.monthlyCost, allocationPct: a.allocationPct })),
      software: [], overheads: [], excludedSoftwareIds: [], excludedOverheadIds: [],
      entity: studio.entity, gstRegistered: studio.gstRegistered,
    }).revenue : 0;
    return { id: p.id, projectName: p.projectName, clientName: p.clientName, stage: p.stage, estimateRevenue: estRev, weightedRevenue: estRev * (prob / 100) };
  });

  // Partner distribution
  const partners = team.filter((m) => m.isPartner).map((m) => ({ id: m.id, name: m.name, equityPct: m.equityPct, execPremPct: m.execPremPct, bdevPremPct: m.bdevPremPct }));
  const partnerTotals = {};
  for (const p of wonProspects) {
    const est = p.estimate;
    const commPct = COMMISSION_PCT[est.commissionType] || 0;
    const calc = calcEstimate({
      type: est.type, durationWeeks: est.durationWeeks || 8, margin: est.margin, commissionPct: commPct,
      members: est.allocations.map((a) => ({ id: a.memberId, name: a.member.name, monthlyCost: a.member.monthlyCost, allocationPct: a.allocationPct, weeks: a.weeks, margin: a.margin })),
      software: software.map((sw) => ({ id: sw.id, name: sw.name, costPerSeat: sw.costPerSeat, isSharedLicence: sw.isSharedLicence, memberIds: sw.assignments.map((a) => a.memberId) })),
      overheads: overheads.map((oh) => ({ id: oh.id, label: oh.label, amount: oh.amount, isActive: !oh.endDate || oh.endDate > now })),
      excludedSoftwareIds: est.exclusions.filter((e) => e.softwareId).map((e) => e.softwareId),
      excludedOverheadIds: est.exclusions.filter((e) => e.overheadId).map((e) => e.overheadId),
      entity: studio.entity, gstRegistered: studio.gstRegistered,
    });
    const splits = calcPartnerSplit(calc.netProfit, partners.map((pt) => ({ ...pt, isExecLead: pt.id === est.executionLeadId })));
    splits.forEach((s) => { partnerTotals[s.partnerId] = (partnerTotals[s.partnerId] || 0) + s.total; });
  }

  res.json({
    data: {
      kpis: { wonRevenue, wonProjectCount: wonProspects.length, netProfitAfterTax: wonNetProfit, monthlyBurn, runwayMonths },
      pipeline,
      partners: partners.map((p) => ({ memberId: p.id, name: p.name, totalPayout: partnerTotals[p.id] || 0 })),
      software: software.map((sw) => {
        const seats = sw.isSharedLicence ? 1 : sw.assignments.filter((a) => team.find((m) => m.id === a.memberId)).length || 1;
        return { id: sw.id, name: sw.name, monthlyCost: sw.costPerSeat * seats, seats };
      }),
      teamPayroll: team.map((m) => ({ memberId: m.id, name: m.name, cost: m.monthlyCost, share: salaryCost > 0 ? Math.round((m.monthlyCost / salaryCost) * 100) : 0 })),
    },
  });
});

// ─── Error handler ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
