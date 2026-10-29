import { cached } from './cache.js'

const BASE = 'https://v3.football.api-sports.io'
const HOUR = 3600

// One raw request. No caching: used by the check-keys script.
export async function rawCall(path, params = {}) {
  const key = process.env.API_FOOTBALL_KEY
  if (!key) throw new Error('API_FOOTBALL_KEY is missing in your .env')
  const url = new URL(BASE + path)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  const res = await fetch(url, { headers: { 'x-apisports-key': key } })
  if (!res.ok) throw new Error(`API-Football responded ${res.status}`)
  const data = await res.json()
  const errors = Array.isArray(data.errors) ? data.errors : Object.values(data.errors || {})
  if (errors.length) throw new Error(`API-Football: ${errors.join(', ')}`)
  return data
}

const call = (path, params, ttl) => cached(`apif:${path}:${JSON.stringify(params)}`, ttl, () => rawCall(path, params))

export const getFixtures = (date) => call('/fixtures', { date }, 6 * HOUR) // date: YYYY-MM-DD
export const getHeadToHead = (teamA, teamB, last = 10) => call('/fixtures/headtohead', { h2h: `${teamA}-${teamB}`, last }, 24 * HOUR)
export const getPrediction = (fixture) => call('/predictions', { fixture }, 12 * HOUR)
export const getStandings = (league, season) => call('/standings', { league, season }, 12 * HOUR)
export const getOdds = (fixture) => call('/odds', { fixture }, 6 * HOUR)
export const getBookmakers = () => call('/odds/bookmakers', {}, 7 * 24 * HOUR)
