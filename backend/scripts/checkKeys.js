// Run with: npm run check-keys
// Confirms your keys work and shows what each provider offers. Never prints your keys.
import 'dotenv/config'
import * as football from '../services/apiFootball.js'
import * as odds from '../services/oddsPapi.js'
import * as gemini from '../services/gemini.js'

const WANTED = ['sporty', 'bet9ja', 'msport', '1xbet', 'bet365', 'betway']
const matches = (names) => names.filter((n) => WANTED.some((w) => n.toLowerCase().includes(w)))

async function step(label, fn) {
  console.log(`\n${label}`)
  try { await fn() } catch (e) { console.log('  FAILED:', e.message) }
}

await step('API-Football: account status', async () => {
  const { response: r } = await football.rawCall('/status')
  console.log(`  plan: ${r.subscription?.plan} | requests today: ${r.requests?.current} of ${r.requests?.limit_day}`)
})

await step('API-Football: bookmakers', async () => {
  const { response } = await football.rawCall('/odds/bookmakers')
  const names = response.map((b) => b.name).filter(Boolean)
  console.log(`  count: ${names.length}\n  matches: ${matches(names).join(', ') || 'none'}`)
})

await step('OddsPapi: bookmakers', async () => {
  const data = await odds.rawCall('/v4/bookmakers')
  const list = Array.isArray(data) ? data : Object.values(data)
  const names = list.map((b) => (typeof b === 'string' ? b : b.bookmakerName || b.name || b.slug || '')).filter(Boolean)
  if (!names.length) return console.log('  Unexpected response shape:', JSON.stringify(data).slice(0, 300))
  console.log(`  count: ${names.length}\n  matches: ${matches(names).join(', ') || 'none'}`)
})

await step('Gemini: models your key can use', async () => {
  const models = await gemini.listModels()
  const want = gemini.MODEL()
  console.log(`  selected GEMINI_MODEL: ${want} -> ${models.includes(want) ? 'available' : 'NOT available, pick one from the list below'}`)
  console.log(`  flash models: ${models.filter((m) => m.includes('flash')).join(', ') || 'none found'}`)
})

console.log('\nDone.')
process.exit(0)
