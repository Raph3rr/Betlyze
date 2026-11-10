// Run with: npm run generate
// Settles yesterday's picks, then builds picks for any day that does not have them yet.
// Exits with an error code when something went wrong, so GitHub shows the run as failed (red) and emails you.
import 'dotenv/config'
import dns from 'node:dns'
if (process.env.DNS_SERVERS) dns.setServers(process.env.DNS_SERVERS.split(',').map((x) => x.trim()))
import mongoose from 'mongoose'
import { generateForDays } from '../pipeline/generate.js'

let failed = false
try {
  await mongoose.connect(process.env.MONGODB_URI)
  const result = await generateForDays()
  failed = result.failedDays > 0
} catch (e) {
  console.error('Generation failed:', e.message)
  failed = true
}
await mongoose.disconnect().catch(() => {})
process.exit(failed ? 1 : 0)
