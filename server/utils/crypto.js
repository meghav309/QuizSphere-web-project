/**
 * utils/crypto.js — AES-256-GCM encrypt / decrypt for answer keys
 *
 * IMPORTANT: CRYPTO_SECRET in .env must be a 64-char hex string (32 bytes).
 * Generate one: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */
const crypto = require("crypto")

// Parse the 64-char hex string into a 32-byte Buffer once at startup
const KEY = Buffer.from(process.env.CRYPTO_SECRET, "hex")

if (KEY.length !== 32) {
  throw new Error(
    `CRYPTO_SECRET must be a 64-character hex string (32 bytes). ` +
    `Got ${KEY.length} bytes. ` +
    `Generate one with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
  )
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * @param {string} text  — plaintext to encrypt (e.g. answer key "A")
 * @returns {{ encryptedData: string, iv: string, authTag: string }}
 *          All values are hex strings, safe to store in MongoDB.
 */
const encrypt = (text) => {
  const iv = crypto.randomBytes(16) // 128-bit IV
  const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv)

  const encryptedBuffer = Buffer.concat([
    cipher.update(text, "utf8"),
    cipher.final(),
  ])

  return {
    encryptedData: encryptedBuffer.toString("hex"),
    iv: iv.toString("hex"),
    authTag: cipher.getAuthTag().toString("hex"),
  }
}

/**
 * Decrypt an AES-256-GCM ciphertext back to plaintext.
 * @param {string} encryptedData — hex ciphertext
 * @param {string} iv            — hex IV
 * @param {string} authTag       — hex authentication tag
 * @returns {string} original plaintext
 */
const decrypt = (encryptedData, iv, authTag) => {
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    KEY,
    Buffer.from(iv, "hex")
  )
  decipher.setAuthTag(Buffer.from(authTag, "hex"))

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedData, "hex")),
    decipher.final(),
  ])

  return decrypted.toString("utf8")
}

module.exports = { encrypt, decrypt }
