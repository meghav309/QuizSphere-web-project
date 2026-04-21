/**
 * asyncHandler — wraps async route handlers to automatically forward errors to next()
 * Usage: router.get("/path", asyncHandler(async (req, res) => { ... }))
 */
module.exports = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next)
