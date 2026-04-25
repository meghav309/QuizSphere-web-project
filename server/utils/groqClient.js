/**
 * utils/groqClient.js — Singleton Groq SDK client
 */
const Groq = require("groq-sdk")

const client = new Groq({ apiKey: process.env.GROQ_API_KEY })

module.exports = client
