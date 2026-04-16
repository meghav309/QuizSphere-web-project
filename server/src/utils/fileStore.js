import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { seedStore } from '../data/seedData.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dataDirectory = path.resolve(__dirname, '../../data')
const dataFilePath = path.join(dataDirectory, 'store.json')

export const getDataFilePath = () => dataFilePath

export const ensureStore = async () => {
  await fs.mkdir(dataDirectory, { recursive: true })

  try {
    await fs.access(dataFilePath)
  } catch {
    await fs.writeFile(dataFilePath, JSON.stringify(seedStore, null, 2))
  }
}

export const readStore = async () => {
  await ensureStore()
  const raw = await fs.readFile(dataFilePath, 'utf8')
  return JSON.parse(raw)
}

export const writeStore = async (nextStore) => {
  await ensureStore()
  await fs.writeFile(dataFilePath, JSON.stringify(nextStore, null, 2))
  return nextStore
}
