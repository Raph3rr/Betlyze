import { cached } from './cache.js'
import { fetchRetry } from './http.js'

const BASE = 'https://api.the-odds-api.com/v4'
const HOUR = 3600

export async function rawCall(path, params = {}) {
  const key = process.env.ODDSAPI_KEY
  if (!key) throw new Error('ODDSAPI_KEY is missing in your .env')
  const url = new URL(BASE + path)
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value)
  url.searchParams.set('apiKey', key)
  const res = await fetchRetry(url, {}, { name: 'The Odds API' })
  if (!res.ok) {
    const body = (await res.text().catch(() => '')).replace(/apiKey=[^&\s"]+/g, 'apiKey=***').slice(0, 240)
    throw new Error(`The Odds API responded ${res.status} for ${path}${body ? ': ' + body : ''}`)
  }
  return { data: await res.json(), remaining: res.headers.get('x-requests-remaining'), lastCost: res.headers.get('x-requests-last') }
}

export const getSports = async () => (await cached('theodds:sports', 12 * HOUR, async () => (await rawCall('/sports')).data))

// The free tier provides 500 credits/month. One EU-region request with h2h + totals costs at most 2 credits.
export const getSoccerOdds = async (sportKey) => cached(`theodds:odds:${sportKey}:eu:h2h,totals`, 20 * HOUR, async () => {
  const result = await rawCall(`/sports/${encodeURIComponent(sportKey)}/odds`, {
    regions: 'eu', markets: 'h2h,totals', oddsFormat: 'decimal', dateFormat: 'iso',
  })
  return result
})
