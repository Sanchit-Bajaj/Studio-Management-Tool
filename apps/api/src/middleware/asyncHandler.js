// Express 4 doesn't forward async-throws automatically. Wrap controllers so any
// rejected promise lands in the central errorHandler instead of hanging the request.
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

module.exports = { asyncHandler };
