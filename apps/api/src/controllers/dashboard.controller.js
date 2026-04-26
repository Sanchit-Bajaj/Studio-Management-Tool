const { db, getStudio } = require("../lib/db");
const { calcEstimate, calcPartnerSplit, buildCalcInputFromAggregates, commissionPctFor } = require("../lib/calc");

async function getDashboard(_req, res) {
  const studio = await getStudio();
  if (!studio) return res.json({ data: null });

  const now = new Date();
  const [team, software, overheads, prospects] = await Promise.all([
    db.teamMember.findMany({
      where: { studioId: studio.id, isActive: true },
      include: { softwareAssignments: true },
    }),
    db.softwareTool.findMany({
      where: { studioId: studio.id }, include: { assignments: true },
    }),
    db.overheadItem.findMany({ where: { studioId: studio.id } }),
    db.prospect.findMany({
      where: { studioId: studio.id },
      include: {
        estimate: {
          include: { allocations: { include: { member: true } }, exclusions: true },
        },
      },
    }),
  ]);

  const activeOverheads = overheads.filter((oh) => !oh.endDate || oh.endDate > now);

  // Monthly burn
  const salaryCost = team.reduce((s, m) => s + m.monthlyCost, 0);
  const swCost = software.reduce((s, sw) => {
    const assignedActive = sw.assignments.filter((a) => team.find((m) => m.id === a.memberId)).length;
    const seats = sw.isSharedLicence ? 1 : (assignedActive || 1);
    return s + sw.costPerSeat * seats;
  }, 0);
  const ohCost = activeOverheads.reduce((s, oh) => s + oh.amount, 0);
  const monthlyBurn = salaryCost + swCost + ohCost;

  // Won revenue + net profit
  const wonProspects = prospects.filter((p) => p.stage === "WON" && p.estimate);
  let wonRevenue = 0;
  let wonNetProfit = 0;

  const calcFor = (estimate) => calcEstimate(buildCalcInputFromAggregates({
    estimate, studio, allSoftware: software, allOverheads: overheads, now,
  }));

  for (const p of wonProspects) {
    const calc = calcFor(p.estimate);
    wonRevenue += p.estimate.contractValue ? Number(p.estimate.contractValue) : calc.revenue;
    wonNetProfit += calc.netProfit;
  }

  const runwayMonths = monthlyBurn > 0 ? Math.min(wonRevenue / monthlyBurn, 36) : 0;

  // Weighted pipeline
  const STAGE_PROB = {
    LEAD: studio.pipelineProbLead,
    PROPOSAL_SENT: studio.pipelineProbProposal,
    NEGOTIATING: studio.pipelineProbNegotiating,
    WON: 100, LOST: 0,
  };
  const pipeline = prospects.filter((p) => p.stage !== "LOST").map((p) => {
    const prob = STAGE_PROB[p.stage] || 0;
    const estRev = p.estimate ? calcFor(p.estimate).revenue : 0;
    return {
      id: p.id, projectName: p.projectName, clientName: p.clientName, stage: p.stage,
      estimateRevenue: estRev, weightedRevenue: estRev * (prob / 100),
    };
  });

  // Partner distribution
  const partners = team.filter((m) => m.isPartner).map((m) => ({
    id: m.id, name: m.name, equityPct: m.equityPct, execPremPct: m.execPremPct, bdevPremPct: m.bdevPremPct,
  }));
  const partnerTotals = {};
  for (const p of wonProspects) {
    const calc = calcFor(p.estimate);
    const splits = calcPartnerSplit(
      calc.netProfit,
      partners.map((pt) => ({ ...pt, isExecLead: pt.id === p.estimate.executionLeadId })),
    );
    splits.forEach((s) => { partnerTotals[s.partnerId] = (partnerTotals[s.partnerId] || 0) + s.total; });
  }

  res.json({
    data: {
      kpis: {
        wonRevenue, wonProjectCount: wonProspects.length,
        netProfitAfterTax: wonNetProfit, monthlyBurn, runwayMonths,
      },
      pipeline,
      partners: partners.map((p) => ({
        memberId: p.id, name: p.name, totalPayout: partnerTotals[p.id] || 0,
      })),
      software: software.map((sw) => {
        const assignedActive = sw.assignments.filter((a) => team.find((m) => m.id === a.memberId)).length;
        const seats = sw.isSharedLicence ? 1 : (assignedActive || 1);
        return { id: sw.id, name: sw.name, monthlyCost: sw.costPerSeat * seats, seats };
      }),
      teamPayroll: team.map((m) => ({
        memberId: m.id, name: m.name, cost: m.monthlyCost,
        share: salaryCost > 0 ? Math.round((m.monthlyCost / salaryCost) * 100) : 0,
      })),
    },
  });
}

module.exports = { getDashboard };
