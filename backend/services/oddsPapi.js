import { cached } from './cache.js'

const BASE = 'https://api.oddspapi.io'
const HOUR = 3600
export const SOCCER_SPORT_ID = 10

export async function rawCall(path, params = {}) {
  const key = process.env.ODDSPAPI_KEY
  if (!key) throw new Error('ODDSPAPI_KEY is missing in your .env')
  const url = new URL(BASE + path)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  url.searchParams.set('apiKey', key)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`OddsPapi responded ${res.status}`)
  return res.json()
}

const call = (path, params, ttl) => cached(`oddspapi:${path}:${JSON.stringify(params)}`, ttl, () => rawCall(path, params))

export const getTournaments = () => call('/v4/tournaments', { sportId: SOCCER_SPORT_ID }, 24 * HOUR)
export const getOddsByTournaments = (tournamentIds, bookmaker) => call('/v4/odds-by-tournaments', { bookmaker, tournamentIds: tournamentIds.join(',') }, 3 * HOUR)
export const getOdds = (fixtureId) => call('/v4/odds', { fixtureId }, 3 * HOUR)
// Not in the docs pages I read: if the check script says this path fails, look up the bookmakers endpoint in the OddsPapi docs.
export const getBookmakers = () => call('/v4/bookmakers', {}, 7 * 24 * HOUR)
