const { z } = require("zod");
const { db, requireStudio } = require("../lib/db");
const { serialize } = require("../lib/serialize");

const SETTINGS_FIELDS = [
  "name", "founderNames", "email", "phone", "gstin", "entity", "gstRegistered",
  "workingDaysPerMonth", "workingHoursPerDay",
  "pipelineProbLead", "pipelineProbProposal", "pipelineProbNegotiating",
  "fyReviewDismissedYear", "dashBlockOrder", "kpiOrder",
];

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  founderNames: z.string().optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  gstin: z.string().nullable().optional(),
  entity: z.enum(["LLP", "SOLE_PROP", "PARTNERSHIP", "PVT_LTD", "NON_PROFIT"]).optional(),
  gstRegistered: z.boolean().optional(),
  workingDaysPerMonth: z.number().int().min(1).max(31).optional(),
  workingHoursPerDay: z.number().int().min(1).max(24).optional(),
  pipelineProbLead: z.number().int().min(0).max(100).optional(),
  pipelineProbProposal: z.number().int().min(0).max(100).optional(),
  pipelineProbNegotiating: z.number().int().min(0).max(100).optional(),
  fyReviewDismissedYear: z.number().int().nullable().optional(),
  dashBlockOrder: z.array(z.string()).optional(),
  kpiOrder: z.array(z.string()).optional(),
});

async function getSettings(_req, res) {
  const studio = await db.studio.findFirst({
    include: { overheadItems: { orderBy: { createdAt: "asc" } } },
  });
  res.json({ data: serialize(studio) });
}

async function updateSettings(req, res) {
  const studio = await requireStudio();
  const data = Object.fromEntries(Object.entries(req.body).filter(([k]) => SETTINGS_FIELDS.includes(k)));
  const updated = await db.studio.update({ where: { id: studio.id }, data });
  res.json({ data: serialize(updated) });
}

module.exports = { getSettings, updateSettings, updateSchema };
