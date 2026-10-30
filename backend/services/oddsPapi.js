import fs from 'node:fs'
import { cached } from './cache.js'
import { fetchRetry } from './http.js'

const BASE = 'https://api.oddspapi.io'
const HOUR = 3600
export const SOCCER_SPORT_ID = 10

export async function rawCall(path, params = {}, opts = {}) {
  const key = process.env.ODDSPAPI_KEY
  if (!key) throw new Error('ODDSPAPI_KEY is missing in your .env')
  const url = new URL(BASE + path)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  url.searchParams.set('apiKey', key)
  const res = await fetchRetry(url, {}, { name: 'OddsPapi', ...opts })
  if (!res.ok) {
    const body = (await res.text().catch(() => '')).replace(/apiKey=[^&\s"]+/g, 'apiKey=***').slice(0, 200)
    throw new Error(`OddsPapi responded ${res.status} for ${path}${body ? ': ' + body : ''}`)
  }
  return res.json()
}

const call = (path, params, ttl) => cached(`oddspapi:${path}:${JSON.stringify(params)}`, ttl, () => rawCall(path, params))

export const getTournaments = () => call('/v4/tournaments', { sportId: SOCCER_SPORT_ID }, 24 * HOUR)
export const getOddsByTournaments = (tournamentIds, bookmaker) => call('/v4/odds-by-tournaments', { bookmakers: bookmaker, tournamentIds: tournamentIds.join(',') }, 3 * HOUR)
export const getOdds = (fixtureId) => call('/v4/odds', { fixtureId }, 3 * HOUR)
export const getMarkets = () => call('/v4/markets', {}, 7 * 24 * HOUR)
// The full team list is ~18 MB: too big for MongoDB (16 MB limit), so it is saved as a file for 7 days instead.
export async function getParticipants() {
  const dir = new URL('../.cache/', import.meta.url)
  const file = new URL('participants.json', dir)
  try {
    if (Date.now() - fs.statSync(file).mtimeMs < 7 * 24 * 3600e3) return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {}
  console.log('  downloading the OddsPapi team list (large, once a week)...')
  const data = await rawCall('/v4/participants', { sportId: SOCCER_SPORT_ID }, { timeoutMs: 180000 })
  try { fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(file, JSON.stringify(data)) } catch {}
  return data
}
// Not in the docs pages I read: if the check script says this path fails, look up the bookmakers endpoint in the OddsPapi docs.
export const getBookmakers = () => call('/v4/bookmakers', {}, 7 * 24 * HOUR)

// Caches an already-trimmed result (the raw odds are too big to store).
export const cachedReduced = (key, fn) => cached(`oddspapi:${key}`, 3 * HOUR, fn)
