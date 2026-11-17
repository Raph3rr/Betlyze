// Read-only provider probe. It never connects to or writes to MongoDB and never prints API keys.
import 'dotenv/config'
import { sim } from '../pipeline/data.js'

const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' })
const next = new Date(`${today}T12:00:00Z`)
next.setUTCDate(next.getUTCDate() + 1)
const tomorrow = next.toISOString().slice(0, 10)

async function request(url, headers = {}) {
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(30000) })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`${res.status}: ${JSON.stringify(body).slice(0, 200)}`)
  return { body, remaining: res.headers.get('x-requests-remaining'), lastCost: res.headers.get('x-requests-last') }
}

const apiFixtures = new Map()
if (process.env.API_FOOTBALL_KEY) {
  for (const date of [today, tomorrow]) try {
    const url = new URL('https://v3.football.api-sports.io/fixtures')
    url.searchParams.set('date', date); url.searchParams.set('timezone', 'Africa/Lagos')
    const { body } = await request(url, { 'x-apisports-key': process.env.API_FOOTBALL_KEY })
    const rows = body.response || []
    apiFixtures.set(date, rows)
    const internationals = rows.filter((f) => [5, 10, 28, 36, 536].includes(f.league.id))
    console.log(`API-Football ${date}: ${rows.length} fixtures, senior international comps ${internationals.length}`)
    for (const f of internationals.slice(0, 8)) console.log(`  ${f.league.name}: ${f.teams.home.name} vs ${f.teams.away.name} (${f.fixture.status.short})`)
  } catch (e) { console.log(`API-Football ${date}: FAILED ${e.message}`) }
} else console.log('API-Football: API_FOOTBALL_KEY is missing')

if (process.env.BSD_API_KEY) try {
  const url = new URL('https://sports.bzzoiro.com/api/v2/events/')
  url.searchParams.set('status', 'upcoming'); url.searchParams.set('date_from', today); url.searchParams.set('date_to', tomorrow); url.searchParams.set('limit', '200')
  const { body } = await request(url, { Authorization: `Token ${process.env.BSD_API_KEY}` })
  const events = Array.isArray(body) ? body : body.results || body.data || []
  console.log(`BSD: ${events.length} upcoming events for ${today}–${tomorrow}`)
  const football = [...apiFixtures.values()].flat().filter((f) => [5, 10, 28, 36, 536].includes(f.league.id))
  const matches = []
  for (const e of events) {
    const home = typeof e.home_team === 'string' ? e.home_team : e.home_team?.name
    const away = typeof e.away_team === 'string' ? e.away_team : e.away_team?.name
    const fx = football.find((f) => sim(f.teams.home.name, home) >= 0.6 && sim(f.teams.away.name, away) >= 0.6)
    if (fx) matches.push({ e, fx, home, away })
  }
  console.log(`BSD: ${matches.length} team-name matches against API-Football senior internationals`)
  if (matches[0]) {
    const { e, home, away } = matches[0]
    const [summary, dc] = await Promise.all([
      request(`https://sports.bzzoiro.com/api/v2/events/${encodeURIComponent(e.id)}/odds/`, { Authorization: `Token ${process.env.BSD_API_KEY}` }),
      request(`https://sports.bzzoiro.com/api/v2/odds/?event_id=${encodeURIComponent(e.id)}&market=double_chance`, { Authorization: `Token ${process.env.BSD_API_KEY}` }).catch((x) => ({ body: { error: x.message } })),
    ])
    const s = summary.body.odds || summary.body
    const dcRows = Array.isArray(dc.body) ? dc.body : dc.body.results || dc.body.data || []
    console.log(`BSD sample ${home} vs ${away}: 1X2=${[s.home_win, s.draw, s.away_win].filter(Boolean).length}/3; total/BTTS fields=${Object.keys(s).filter((k) => /over|under|btts/i.test(k)).length}; double-chance rows=${dcRows.length}`)
  } else if (events[0]?.id) {
    const { body } = await request(`https://sports.bzzoiro.com/api/v2/events/${encodeURIComponent(events[0].id)}/odds/`, { Authorization: `Token ${process.env.BSD_API_KEY}` })
    console.log(`BSD sample event odds response fields: ${Object.keys(body.odds || body).join(',')}`)
  }
} catch (e) { console.log(`BSD: FAILED ${e.message}`) }
else console.log('BSD: BSD_API_KEY is missing')

if (process.env.ODDSAPI_KEY) try {
  const { body: sports } = await request(`https://api.the-odds-api.com/v4/sports?apiKey=${encodeURIComponent(process.env.ODDSAPI_KEY)}`)
  const key = 'soccer_uefa_nations_league'
  const found = sports.find((s) => s.key === key)
  console.log(`The Odds API: soccer competitions=${sports.filter((s) => /^soccer_/i.test(s.key)).length}; Nations League active=${Boolean(found?.active)}`)
  if (found?.active) {
    const url = new URL(`https://api.the-odds-api.com/v4/sports/${key}/odds`)
    url.searchParams.set('regions', 'eu'); url.searchParams.set('markets', 'h2h,totals'); url.searchParams.set('oddsFormat', 'decimal'); url.searchParams.set('apiKey', process.env.ODDSAPI_KEY)
    const result = await request(url)
    const matches = [...apiFixtures.values()].flat().filter((f) => f.league.id === 5)
    const joined = result.body.filter((o) => matches.some((f) => sim(f.teams.home.name, o.home_team) >= 0.6 && sim(f.teams.away.name, o.away_team) >= 0.6))
    console.log(`The Odds API Nations League: returned events=${result.body.length}, matching API-Football team pairs=${joined.length}, remaining credits=${result.remaining ?? 'unknown'}, cost=${result.lastCost ?? 'unknown'}`)
  }
} catch (e) { console.log(`The Odds API: FAILED ${e.message}`) }
else console.log('The Odds API: ODDSAPI_KEY is missing')
