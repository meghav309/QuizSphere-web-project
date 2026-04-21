/**
 * Global error handling middleware
 * Must be registered LAST in the Express middleware chain
 */
module.exports = (err, req, res, next) => {
  const statusCode = err.statusCode || 500

  res.status(statusCode).json({
    success: false,
    message: err.message || "Server Error",
    stack: process.env.NODE_ENV === "development" ? err.stack : null,
  })
}
