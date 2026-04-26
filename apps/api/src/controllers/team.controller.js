const { z } = require("zod");
const { db, requireStudio, getStudio } = require("../lib/db");

const createSchema = z.object({
  name: z.string().min(1),
  roleId: z.string().nullable().optional(),
  experience: z.string().optional().default(""),
  monthlyCost: z.number().int().min(0),
  isActive: z.boolean().optional(),
  isPartner: z.boolean().optional(),
  equityPct: z.number().min(0).max(100).optional(),
  execPremPct: z.number().min(0).max(100).optional(),
  bdevPremPct: z.number().min(0).max(100).optional(),
});

const updateSchema = createSchema.partial();
const ALLOWED = ["name", "roleId", "experience", "monthlyCost", "isActive", "isPartner", "equityPct", "execPremPct", "bdevPremPct"];

async function listTeam(_req, res) {
  const studio = await getStudio();
  if (!studio) return res.json({ data: [] });
  const members = await db.teamMember.findMany({
    where: { studioId: studio.id },
    include: { role: true, softwareAssignments: true },
    orderBy: { createdAt: "asc" },
  });
  res.json({ data: members });
}

async function createMember(req, res) {
  const studio = await requireStudio();
  const member = await db.teamMember.create({
    data: { studioId: studio.id, ...req.body },
    include: { role: true },
  });
  res.status(201).json({ data: member });
}

async function updateMember(req, res) {
  const data = Object.fromEntries(Object.entries(req.body).filter(([k]) => ALLOWED.includes(k)));
  const member = await db.teamMember.update({
    where: { id: req.params.id }, data, include: { role: true },
  });
  res.json({ data: member });
}

async function deleteMember(req, res) {
  await db.teamMember.delete({ where: { id: req.params.id } });
  res.status(204).send();
}

module.exports = { listTeam, createMember, updateMember, deleteMember, createSchema, updateSchema };
