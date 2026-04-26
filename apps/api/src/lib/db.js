const { PrismaClient } = require("@prisma/client");

const globalForPrisma = global;
const db = globalForPrisma.__prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.__prisma = db;

async function getStudio() {
  return db.studio.findFirst();
}

async function requireStudio() {
  const studio = await getStudio();
  if (!studio) {
    const err = new Error("Studio not found");
    err.status = 404;
    err.code = "NOT_FOUND";
    throw err;
  }
  return studio;
}

module.exports = { db, getStudio, requireStudio };
