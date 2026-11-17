import { cached } from './cache.js'
import { fetchRetry } from './http.js'

const BASE = 'https://sports.bzzoiro.com/api/v2'
const HOUR = 3600

export async function rawCall(path, params = {}) {
  const key = process.env.BSD_API_KEY
  if (!key) throw new Error('BSD_API_KEY is missing in your .env')
  const url = new URL(BASE + path)
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value)
  const res = await fetchRetry(url, { headers: { Authorization: `Token ${key}` } }, { name: 'BSD' })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`BSD responded ${res.status}: ${JSON.stringify(body).slice(0, 240)}`)
  return body
}

const call = (path, params, ttl) => cached(`bsd:${path}:${JSON.stringify(params)}`, ttl, () => rawCall(path, params))
const list = (body) => Array.isArray(body) ? body : body?.results || body?.data || []

export async function getEvents(date) {
  const rows = []
  const limit = 200
  for (let offset = 0; ; offset += limit) {
    const params = { status: 'upcoming', date_from: date, date_to: date, limit, offset }
    const body = await call('/events/', params, 3 * HOUR)
    const page = list(body)
    rows.push(...page)
    const count = Number(body?.count)
    if (!page.length || page.length < limit || (Number.isFinite(count) && rows.length >= count)) break
  }
  return rows
}

export async function getOddsMarket(market) {
  const rows = []
  const limit = 200
  for (let offset = 0; ; offset += limit) {
    const params = { market, limit, offset }
    const body = await call('/odds/', params, 3 * HOUR)
    const page = list(body)
    rows.push(...page)
    const count = Number(body?.count)
    if (!page.length || page.length < limit || (Number.isFinite(count) && rows.length >= count)) break
  }
  return rows
}

export async function getEventOdds(id) {
  return call(`/events/${encodeURIComponent(id)}/odds/`, {}, 3 * HOUR)
}

export async function getEventMarket(id, market) {
  return call('/odds/', { event_id: id, market }, 3 * HOUR)
}
