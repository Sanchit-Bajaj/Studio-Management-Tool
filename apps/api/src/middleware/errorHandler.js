function notFoundHandler(req, res) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}`, code: "NOT_FOUND" });
}

function errorHandler(err, req, res, _next) {
  // Prisma not-found
  if (err.code === "P2025") {
    return res.status(404).json({ error: "Resource not found", code: "NOT_FOUND" });
  }
  // Prisma unique-constraint
  if (err.code === "P2002") {
    return res.status(409).json({ error: "Conflict — duplicate value", code: "CONFLICT", target: err.meta?.target });
  }
  // Zod validation
  if (err.name === "ZodError") {
    return res.status(400).json({ error: "Validation failed", code: "VALIDATION_ERROR", issues: err.issues });
  }
  // Custom thrown errors with .status / .code
  if (err.status) {
    return res.status(err.status).json({ error: err.message, code: err.code || "ERROR" });
  }
  console.error("[unhandled]", err);
  res.status(500).json({ error: "Internal server error", code: "INTERNAL_ERROR" });
}

module.exports = { notFoundHandler, errorHandler };
