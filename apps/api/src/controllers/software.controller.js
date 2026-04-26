const { z } = require("zod");
const { db, requireStudio, getStudio } = require("../lib/db");

const createSchema = z.object({
  name: z.string().min(1),
  costPerSeat: z.number().int().min(0),
  isSharedLicence: z.boolean().optional(),
  startDate: z.string().datetime().nullable().optional(),
});

const updateSchema = createSchema.partial();
const assignmentsSchema = z.array(z.string()).default([]);

async function listSoftware(_req, res) {
  const studio = await getStudio();
  if (!studio) return res.json({ data: [] });
  const sw = await db.softwareTool.findMany({
    where: { studioId: studio.id },
    include: { assignments: { include: { member: true } } },
    orderBy: { createdAt: "asc" },
  });
  res.json({ data: sw });
}

async function createSoftware(req, res) {
  const studio = await requireStudio();
  const { startDate, ...rest } = req.body;
  const sw = await db.softwareTool.create({
    data: {
      studioId: studio.id,
      ...rest,
      isSharedLicence: rest.isSharedLicence || false,
      startDate: startDate ? new Date(startDate) : null,
    },
    include: { assignments: true },
  });
  res.status(201).json({ data: sw });
}

async function updateSoftware(req, res) {
  const { startDate, ...rest } = req.body;
  const data = { ...rest };
  if (startDate !== undefined) data.startDate = startDate ? new Date(startDate) : null;
  const sw = await db.softwareTool.update({
    where: { id: req.params.id }, data, include: { assignments: true },
  });
  res.json({ data: sw });
}

async function setAssignments(req, res) {
  const memberIds = req.body;
  await db.softwareAssignment.deleteMany({ where: { softwareId: req.params.id } });
  if (memberIds.length) {
    await db.softwareAssignment.createMany({
      data: memberIds.map((memberId) => ({ softwareId: req.params.id, memberId })),
    });
  }
  const sw = await db.softwareTool.findUnique({
    where: { id: req.params.id },
    include: { assignments: { include: { member: true } } },
  });
  res.json({ data: sw });
}

async function deleteSoftware(req, res) {
  await db.softwareTool.delete({ where: { id: req.params.id } });
  res.status(204).send();
}

module.exports = {
  listSoftware, createSoftware, updateSoftware, setAssignments, deleteSoftware,
  createSchema, updateSchema, assignmentsSchema,
};
