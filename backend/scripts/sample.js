// Run with: npm run sample   (uses about 4 API-Football requests)
// Saves small, trimmed examples of real API responses into backend/sample-output/ so we can write
// the matching code against real data. The files contain no keys. Send me their contents.
import 'dotenv/config'
import fs from 'node:fs'
import * as football from '../services/apiFootball.js'
import * as odds from '../services/oddsPapi.js'

const OUT = new URL('../sample-output/', import.meta.url)
fs.mkdirSync(OUT, { recursive: true })

const trim = (v, depth = 0) =>
  Array.isArray(v) ? v.slice(0, 2).map((x) => trim(x, depth + 1))
  : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).slice(0, 30).map(([k, x]) => [k, depth > 7 ? '...' : trim(x, depth + 1)]))
  : v
const save = (name, data) => { fs.writeFileSync(new URL(name, OUT), JSON.stringify(trim(data), null, 2)); console.log(`  saved sample-output/${name}`) }

async function step(label, fn) {
  console.log(`\n${label}`)
  try { await fn() } catch (e) { console.log('  FAILED:', e.message) }
}

const today = new Date().toISOString().slice(0, 10)
let fixtureId

await step('API-Football: today’s fixtures', async () => {
  const d = await football.rawCall('/fixtures', { date: today })
  console.log(`  fixtures today: ${d.response.length}`)
  const leagues = {}
  for (const f of d.response) {
    const k = `${f.league.id} | ${f.league.country} | ${f.league.name}`
    leagues[k] = (leagues[k] || 0) + 1
  }
  fs.writeFileSync(new URL('leagues-today.json', OUT), JSON.stringify(leagues, null, 2))
  save('apifootball-fixtures.json', d)
  fixtureId = d.response.find((f) => f.fixture.status.short === 'NS')?.fixture.id
})

if (fixtureId) {
  await step('API-Football: prediction for one fixture', async () => save('apifootball-predictions.json', await football.rawCall('/predictions', { fixture: fixtureId })))
  await step('API-Football: odds for the same fixture', async () => save('apifootball-odds.json', await football.rawCall('/odds', { fixture: fixtureId })))
}

await step('OddsPapi: bookmakers and tournaments', async () => {
  const b = await odds.rawCall('/v4/bookmakers')
  save('oddspapi-bookmakers.json', b)
  const list = Array.isArray(b) ? b : Object.values(b)
  const hits = list.filter((x) => /sporty|bet9ja|msport|1xbet|bet365|betway|pinnacle/i.test(JSON.stringify(x)))
  fs.writeFileSync(new URL('oddspapi-bookmaker-matches.json', OUT), JSON.stringify(hits, null, 2))
  const t = await odds.rawCall('/v4/tournaments', { sportId: odds.SOCCER_SPORT_ID })
  const wanted = (Array.isArray(t) ? t : []).filter((x) => /premier league|la ?liga|serie a|bundesliga|ligue 1|eredivisie|primeira/i.test(x.tournamentName || ''))
  fs.writeFileSync(new URL('oddspapi-tournaments.json', OUT), JSON.stringify(wanted, null, 2))
  const id = wanted.find((x) => /premier league/i.test(x.tournamentName) && x.categorySlug === 'england')?.tournamentId || 17
  save('oddspapi-odds.json', await odds.rawCall('/v4/odds-by-tournaments', { bookmakers: process.env.ODDS_BOOKMAKER || 'pinnacle', tournamentIds: id }))
})

console.log('\nDone. Open the files in backend/sample-output/ and send me their contents.')
process.exit(0)
