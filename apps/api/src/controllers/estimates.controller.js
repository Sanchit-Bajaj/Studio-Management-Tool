const { z } = require("zod");
const { db, requireStudio, getStudio } = require("../lib/db");
const { serialize } = require("../lib/serialize");
const { calcEstimate, buildCalcInputFromAggregates } = require("../lib/calc");

const ESTIMATE_TYPES = ["FIXED", "RETAINER"];
const COMMISSION_TYPES = ["NONE", "REFERRAL_3", "SALES_PARTNER_7", "INTERNAL_1_5", "CUSTOM"];

const createSchema = z.object({
  name: z.string().min(1),
  type: z.enum(ESTIMATE_TYPES).optional(),
  durationWeeks: z.number().int().min(1).nullable().optional(),
  margin: z.number().nullable().optional(),
  commissionType: z.enum(COMMISSION_TYPES).optional(),
  commissionCustomPct: z.number().nullable().optional(),
  contractValue: z.union([z.number(), z.string(), z.null()]).optional(),
  executionLeadId: z.string().nullable().optional(),
  prospectId: z.string().nullable().optional(),
});

const updateSchema = createSchema.partial();

const allocationSchema = z.object({
  memberId: z.string(),
  allocationPct: z.number().int().min(0).max(100),
  weeks: z.number().int().nullable().optional(),
  margin: z.number().nullable().optional(),
});
const allocationsSchema = z.array(allocationSchema);

const exclusionsSchema = z.object({
  excludedSoftwareIds: z.array(z.string()).default([]),
  excludedOverheadIds: z.array(z.string()).default([]),
});

const ALLOWED = [
  "name", "type", "durationWeeks", "margin",
  "commissionType", "commissionCustomPct",
  "contractValue", "executionLeadId", "prospectId",
];

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
  const studio = await db.studio.findFirst();
  const [allSoftware, allOverheads] = await Promise.all([
    db.softwareTool.findMany({ where: { studioId: studio.id }, include: { assignments: true } }),
    db.overheadItem.findMany({ where: { studioId: studio.id } }),
  ]);
  const calc = calcEstimate(buildCalcInputFromAggregates({ estimate: est, studio, allSoftware, allOverheads }));
  return serialize({ ...est, calc });
}

async function listEstimates(_req, res) {
  const studio = await getStudio();
  if (!studio) return res.json({ data: [] });
  const estimates = await db.estimate.findMany({
    where: { studioId: studio.id },
    include: { prospect: { select: { id: true, projectName: true, clientName: true, stage: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json({ data: serialize(estimates) });
}

async function getEstimate(req, res) {
  const est = await getEstimateWithCalc(req.params.id);
  if (!est) return res.status(404).json({ error: "Not found", code: "NOT_FOUND" });
  res.json({ data: est });
}

async function createEstimate(req, res) {
  const studio = await requireStudio();
  const { contractValue, ...rest } = req.body;
  const estimate = await db.estimate.create({
    data: {
      studioId: studio.id,
      ...rest,
      type: rest.type || "FIXED",
      commissionType: rest.commissionType || "NONE",
      contractValue: contractValue != null ? BigInt(contractValue) : null,
    },
  });
  res.status(201).json({ data: serialize(estimate) });
}

async function updateEstimate(req, res) {
  const data = Object.fromEntries(Object.entries(req.body).filter(([k]) => ALLOWED.includes(k)));
  if ("contractValue" in data) {
    data.contractValue = data.contractValue != null ? BigInt(data.contractValue) : null;
  }
  const estimate = await db.estimate.update({ where: { id: req.params.id }, data });
  res.json({ data: serialize(estimate) });
}

async function setAllocations(req, res) {
  const allocations = req.body;
  await db.estimateAllocation.deleteMany({ where: { estimateId: req.params.id } });
  if (allocations.length) {
    await db.estimateAllocation.createMany({
      data: allocations.map((a) => ({ estimateId: req.params.id, ...a })),
    });
  }
  const est = await getEstimateWithCalc(req.params.id);
  res.json({ data: est });
}

async function setExclusions(req, res) {
  const { excludedSoftwareIds, excludedOverheadIds } = req.body;
  await db.estimateExclusion.deleteMany({ where: { estimateId: req.params.id } });
  const rows = [
    ...excludedSoftwareIds.map((softwareId) => ({ estimateId: req.params.id, softwareId })),
    ...excludedOverheadIds.map((overheadId) => ({ estimateId: req.params.id, overheadId })),
  ];
  if (rows.length) await db.estimateExclusion.createMany({ data: rows });
  const est = await getEstimateWithCalc(req.params.id);
  res.json({ data: est });
}

async function deleteEstimate(req, res) {
  await db.estimate.delete({ where: { id: req.params.id } });
  res.status(204).send();
}

module.exports = {
  listEstimates, getEstimate, createEstimate, updateEstimate,
  setAllocations, setExclusions, deleteEstimate,
  createSchema, updateSchema, allocationsSchema, exclusionsSchema,
};
