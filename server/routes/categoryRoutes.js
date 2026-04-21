const express = require("express")
const router = express.Router()
const NodeCache = require("node-cache")
const Category = require("../models/Category")
const asyncHandler = require("../middleware/asyncHandler")

// Cache instance: TTL 300 seconds (5 minutes)
const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 })
const CACHE_KEY = "all_categories"

// GET /api/v1/categories — public
router.get(
  "/",
  asyncHandler(async (req, res) => {
    // Cache hit
    const cached = cache.get(CACHE_KEY)
    if (cached) {
      return res.status(200).json({ success: true, fromCache: true, data: cached })
    }

    // Cache miss — query DB
    const categories = await Category.find({}, "slug name description").lean()

    cache.set(CACHE_KEY, categories)

    res.status(200).json({ success: true, fromCache: false, data: categories })
  })
)

module.exports = router
