const { z } = require("zod");
const { db, requireStudio, getStudio } = require("../lib/db");
const { serialize } = require("../lib/serialize");

const STAGES = ["LEAD", "PROPOSAL_SENT", "NEGOTIATING", "WON", "LOST"];
const URGENCY = ["STANDARD", "EXPEDITED", "CRITICAL"];
const COMPETITIVE = ["SOLE", "SHORTLISTED", "PITCH"];
const CLIENT_SIZE = ["BOOTSTRAP", "FUNDED", "SME", "ENTERPRISE"];
const VA_MODE = ["MATRIX", "REVENUE"];

const createSchema = z.object({
  projectName: z.string().min(1),
  clientName: z.string().min(1),
  contactName: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  domain: z.string().nullable().optional(),
  stage: z.enum(STAGES).optional(),
  vsMode: z.enum(VA_MODE).optional(),
  vsComplexity: z.number().int().min(1).max(3).optional(),
  vsImpact: z.number().int().min(1).max(3).optional(),
  vsUrgency: z.enum(URGENCY).optional(),
  vsCompetitive: z.enum(COMPETITIVE).optional(),
  vsClientSize: z.enum(CLIENT_SIZE).optional(),
  vsRevenueImpact: z.union([z.number(), z.string(), z.null()]).optional(),
});

const updateSchema = createSchema.partial();
const ALLOWED = [
  "projectName", "clientName", "contactName", "email", "phone", "website", "domain", "stage",
  "vsMode", "vsComplexity", "vsImpact", "vsUrgency", "vsCompetitive", "vsClientSize", "vsRevenueImpact",
];

async function listProspects(_req, res) {
  const studio = await getStudio();
  if (!studio) return res.json({ data: [] });
  const prospects = await db.prospect.findMany({
    where: { studioId: studio.id },
    include: { estimate: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json({ data: serialize(prospects) });
}

async function getProspect(req, res) {
  const prospect = await db.prospect.findUnique({
    where: { id: req.params.id },
    include: { estimate: { select: { id: true, name: true } } },
  });
  if (!prospect) return res.status(404).json({ error: "Not found", code: "NOT_FOUND" });
  res.json({ data: serialize(prospect) });
}

async function createProspect(req, res) {
  const studio = await requireStudio();
  const { vsRevenueImpact, ...rest } = req.body;
  const prospect = await db.prospect.create({
    data: {
      studioId: studio.id,
      ...rest,
      stage: rest.stage || "LEAD",
      vsRevenueImpact: vsRevenueImpact != null ? BigInt(vsRevenueImpact) : null,
    },
  });
  res.status(201).json({ data: serialize(prospect) });
}

async function updateProspect(req, res) {
  const data = Object.fromEntries(Object.entries(req.body).filter(([k]) => ALLOWED.includes(k)));
  if ("vsRevenueImpact" in data) {
    data.vsRevenueImpact = data.vsRevenueImpact != null ? BigInt(data.vsRevenueImpact) : null;
  }
  const prospect = await db.prospect.update({ where: { id: req.params.id }, data });
  res.json({ data: serialize(prospect) });
}

async function deleteProspect(req, res) {
  await db.prospect.delete({ where: { id: req.params.id } });
  res.status(204).send();
}

module.exports = {
  listProspects, getProspect, createProspect, updateProspect, deleteProspect,
  createSchema, updateSchema,
};
