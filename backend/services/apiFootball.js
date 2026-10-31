import { cached } from './cache.js'
import { fetchRetry } from './http.js'

const BASE = 'https://v3.football.api-sports.io'
const HOUR = 3600
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
// Free plan allows 10 requests a minute. Set API_FOOTBALL_MIN_INTERVAL_MS=0 on a paid plan.
const gap = () => (process.env.API_FOOTBALL_MIN_INTERVAL_MS === undefined ? 6500 : Number(process.env.API_FOOTBALL_MIN_INTERVAL_MS))
let lastCall = 0

// Stops a run before it can use up your daily quota (free plan = 100 a day).
export const budget = { limit: Number(process.env.API_FOOTBALL_BUDGET) || 90, used: 0 }

// One raw request. No caching: used by the check-keys script.
export async function rawCall(path, params = {}) {
  const key = process.env.API_FOOTBALL_KEY
  if (!key) throw new Error('API_FOOTBALL_KEY is missing in your .env')
  if (budget.used >= budget.limit) throw new Error('API-Football request budget reached for this run')
  budget.used++
  const url = new URL(BASE + path)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  let res
  for (let attempt = 0; ; attempt++) {
    const wait = lastCall + gap() - Date.now()
    if (wait > 0) await sleep(wait)
    lastCall = Date.now()
    res = await fetchRetry(url, { headers: { 'x-apisports-key': key } }, { name: 'API-Football' })
    if (res.status === 429 && attempt < 2) { await sleep(20000); continue } // too many requests a minute: wait and retry
    break
  }
  if (!res.ok) throw new Error(`API-Football responded ${res.status}`)
  const data = await res.json()
  const errors = Array.isArray(data.errors) ? data.errors : Object.values(data.errors || {})
  if (errors.length) throw new Error(`API-Football: ${errors.join(', ')}`)
  return data
}

const call = (path, params, ttl) => cached(`apif:${path}:${JSON.stringify(params)}`, ttl, () => rawCall(path, params))

export const getFixtures = (date) => call('/fixtures', { date, timezone: 'Africa/Lagos' }, 6 * HOUR) // date: YYYY-MM-DD
export const getHeadToHead = (teamA, teamB, last = 10) => call('/fixtures/headtohead', { h2h: `${teamA}-${teamB}`, last }, 24 * HOUR)
export const getTeamLast = (team, last = 5) => call('/fixtures', { team, last, timezone: 'Africa/Lagos' }, 12 * HOUR)
export const getInjuries = (league, season, date) => call('/injuries', { league, season, date, timezone: 'Africa/Lagos' }, 3 * HOUR)
export const getLineups = (fixture) => call('/fixtures/lineups', { fixture }, 30 * 24 * HOUR) // past lineups never change
export const getPrediction = (fixture) => call('/predictions', { fixture }, 12 * HOUR)
export const getStandings = (league, season) => call('/standings', { league, season }, 12 * HOUR)
export const getOdds = (fixture) => call('/odds', { fixture }, 6 * HOUR)
export const getBookmakers = () => call('/odds/bookmakers', {}, 7 * 24 * HOUR)
