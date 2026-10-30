// Run with: npm run generate
// Builds today's, tomorrow's and the day after's predictions and saves them in MongoDB.
import 'dotenv/config'
import mongoose from 'mongoose'
import { generateForDays } from '../pipeline/generate.js'

await mongoose.connect(process.env.MONGODB_URI)
try { await generateForDays() } catch (e) { console.error('Generation failed:', e.message) }
await mongoose.disconnect()
process.exit(0)
