const { z } = require("zod");
const { db, requireStudio, getStudio } = require("../lib/db");

const CATEGORIES = ["RENT", "UTILITIES", "ACCOUNTANT", "INTERNET", "MISC", "OTHER"];

const createSchema = z.object({
  category: z.enum(CATEGORIES),
  label: z.string().min(1),
  amount: z.number().int().min(0),
  startDate: z.string().datetime().nullable().optional(),
  endDate: z.string().datetime().nullable().optional(),
});

const updateSchema = createSchema.partial();

async function listOverheads(_req, res) {
  const studio = await getStudio();
  if (!studio) return res.json({ data: [] });
  const items = await db.overheadItem.findMany({
    where: { studioId: studio.id }, orderBy: { createdAt: "asc" },
  });
  res.json({ data: items });
}

async function createOverhead(req, res) {
  const studio = await requireStudio();
  const { startDate, endDate, ...rest } = req.body;
  const item = await db.overheadItem.create({
    data: {
      studioId: studio.id,
      ...rest,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
    },
  });
  res.status(201).json({ data: item });
}

async function updateOverhead(req, res) {
  const { startDate, endDate, ...rest } = req.body;
  const data = { ...rest };
  if (startDate !== undefined) data.startDate = startDate ? new Date(startDate) : null;
  if (endDate !== undefined) data.endDate = endDate ? new Date(endDate) : null;
  const item = await db.overheadItem.update({ where: { id: req.params.id }, data });
  res.json({ data: item });
}

async function stopOverhead(req, res) {
  const item = await db.overheadItem.update({
    where: { id: req.params.id },
    data: { endDate: new Date(req.body?.date || new Date()) },
  });
  res.json({ data: item });
}

async function resumeOverhead(req, res) {
  const item = await db.overheadItem.update({
    where: { id: req.params.id }, data: { endDate: null },
  });
  res.json({ data: item });
}

async function deleteOverhead(req, res) {
  await db.overheadItem.delete({ where: { id: req.params.id } });
  res.status(204).send();
}

module.exports = {
  listOverheads, createOverhead, updateOverhead, stopOverhead, resumeOverhead, deleteOverhead,
  createSchema, updateSchema,
};
