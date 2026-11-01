// Run with: npm run settle            (yesterday)
//           npm run settle -- 2026-10-31   (a specific day)
// Checks the saved predictions of that day against the real final scores. Uses 1 API-Football request.
import 'dotenv/config'
import dns from 'node:dns'
if (process.env.DNS_SERVERS) dns.setServers(process.env.DNS_SERVERS.split(',').map((x) => x.trim()))
import mongoose from 'mongoose'
import { settleDay } from '../pipeline/results.js'
import { addDays, lagosToday } from '../pipeline/generate.js'

await mongoose.connect(process.env.MONGODB_URI)
try { await settleDay(process.argv[2] || addDays(lagosToday(), -1)) } catch (e) { console.error('Settling failed:', e.message) }
await mongoose.disconnect()
process.exit(0)
