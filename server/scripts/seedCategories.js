/**
 * seedCategories.js — run once to seed the categories collection
 * Usage: node scripts/seedCategories.js
 */
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") })
const mongoose = require("mongoose")
const Category = require("../models/Category")

const categories = [
  {
    slug: "logical-reasoning",
    name: "Logical Reasoning",
    description: "Deductive and inductive reasoning",
  },
  {
    slug: "data-interpretation",
    name: "Data Interpretation",
    description: "Charts, graphs, tables",
  },
  {
    slug: "programming",
    name: "Programming",
    description: "Coding concepts and algorithms",
  },
  {
    slug: "mathematics",
    name: "Mathematics",
    description: "Arithmetic, algebra, and quantitative aptitude",
  },
  {
    slug: "verbal-ability",
    name: "Verbal Ability",
    description: "Grammar, vocabulary, and reading comprehension",
  },
  {
    slug: "general-knowledge",
    name: "General Knowledge",
    description: "Current affairs and static GK",
  },
]

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI)
    console.log("Connected to MongoDB")

    // upsert each slug so re-running the script is safe
    let inserted = 0
    for (const cat of categories) {
      const result = await Category.updateOne(
        { slug: cat.slug },
        { $setOnInsert: cat },
        { upsert: true }
      )
      if (result.upsertedCount) {
        console.log(`  ✔ Inserted: ${cat.name}`)
        inserted++
      } else {
        console.log(`  – Already exists: ${cat.name}`)
      }
    }

    console.log(`\nDone. ${inserted} new categories inserted.`)
    process.exit(0)
  } catch (err) {
    console.error("Seed failed:", err.message)
    process.exit(1)
  }
}

seed()
