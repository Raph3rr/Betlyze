// Run with: npm run check-keys
// Confirms your keys work and shows what each provider offers. Never prints your keys.
import 'dotenv/config'
import * as football from '../services/apiFootball.js'
import * as bsd from '../services/bsd.js'
import * as theOdds from '../services/theOddsApi.js'
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

await step('BSD: upcoming football events', async () => {
  const date = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' })
  const body = await bsd.rawCall('/events/', { status: 'upcoming', date_from: date, date_to: date, limit: 5 })
  const rows = Array.isArray(body) ? body : body.results || body.data || []
  console.log(`  key accepted; returned ${rows.length} sample event(s)`)
})

await step('The Odds API: soccer competitions', async () => {
  const { data } = await theOdds.rawCall('/sports')
  const soccer = data.filter((s) => /^soccer_/i.test(s.key))
  console.log(`  key accepted; ${soccer.length} soccer competitions available`)
})

await step('Gemini: models your key can use', async () => {
  const models = await gemini.listModels()
  const want = gemini.MODEL()
  console.log(`  selected GEMINI_MODEL: ${want} -> ${models.includes(want) ? 'available' : 'NOT available, pick one from the list below'}`)
  console.log(`  flash models: ${models.filter((m) => m.includes('flash')).join(', ') || 'none found'}`)
})

console.log('\nDone.')
process.exit(0)
