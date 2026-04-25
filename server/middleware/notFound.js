/**
 * 404 catch-all handler — registered after all valid routes
 */
module.exports = (req, res) =>
  res.status(404).json({ success: false, message: "Route not found" })
