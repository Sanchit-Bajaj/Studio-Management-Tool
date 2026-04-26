// Validates `req.body` against a Zod schema and replaces it with the parsed result.
// Errors propagate to the central errorHandler which formats ZodError → 400.
function validateBody(schema) {
  return (req, _res, next) => {
    req.body = schema.parse(req.body);
    next();
  };
}

module.exports = { validateBody };
