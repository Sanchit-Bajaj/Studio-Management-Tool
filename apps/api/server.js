const express = require("express");
const cors = require("cors");

const { authMiddleware } = require("./src/middleware/auth");
const { errorHandler, notFoundHandler } = require("./src/middleware/errorHandler");
const apiRouter = require("./src/routes");

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Global middleware ────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.WEB_URL || "http://localhost:3000", credentials: true }));
app.use(express.json({ limit: "1mb" }));

// ─── Public ───────────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => res.json({ status: "ok", ts: new Date().toISOString() }));

// ─── Auth + resource routes ──────────────────────────────────────────────────
app.use(authMiddleware);
app.use("/", apiRouter);

// ─── 404 + error handlers (must be last) ──────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ─── Start ────────────────────────────────────────────────────────────────────
if (require.main === module) {
  app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
}

module.exports = app;
