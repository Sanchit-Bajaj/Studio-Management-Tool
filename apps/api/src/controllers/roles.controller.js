const { z } = require("zod");
const { db, requireStudio, getStudio } = require("../lib/db");

const DEPARTMENTS = ["DESIGN", "TECHNOLOGY", "STRATEGY", "MANAGEMENT", "OPERATIONS", "OTHER"];

const createSchema = z.object({
  name: z.string().min(1),
  department: z.enum(DEPARTMENTS).optional(),
});

const updateSchema = createSchema.partial();

async function listRoles(_req, res) {
  const studio = await getStudio();
  if (!studio) return res.json({ data: [] });
  const roles = await db.role.findMany({ where: { studioId: studio.id }, orderBy: { name: "asc" } });
  res.json({ data: roles });
}

async function createRole(req, res) {
  const studio = await requireStudio();
  const role = await db.role.create({
    data: { studioId: studio.id, name: req.body.name, department: req.body.department || "DESIGN" },
  });
  res.status(201).json({ data: role });
}

async function updateRole(req, res) {
  const role = await db.role.update({
    where: { id: req.params.id },
    data: req.body,
  });
  res.json({ data: role });
}

async function deleteRole(req, res) {
  await db.role.delete({ where: { id: req.params.id } });
  res.status(204).send();
}

module.exports = { listRoles, createRole, updateRole, deleteRole, createSchema, updateSchema };
