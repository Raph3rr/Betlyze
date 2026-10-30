import { fetchRetry } from './http.js'

const BASE = 'https://generativelanguage.googleapis.com/v1beta'

export const MODEL = () => process.env.GEMINI_MODEL || 'gemini-3.5-flash'

function apiKey() {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error('GEMINI_API_KEY is missing in your .env')
  return key
}

// Sends a prompt and returns the parsed JSON answer. Retries on rate limits and server errors.
export async function generateJson(prompt, { retries = 2, maxOutputTokens = 8192 } = {}) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetchRetry(`${BASE}/models/${MODEL()}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey() },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.3, maxOutputTokens },
      }),
    }, { name: 'Gemini', timeoutMs: 120000, tries: 1 })
    if (res.ok) {
      const data = await res.json()
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text
      if (!text) throw new Error('Gemini returned no text')
      return JSON.parse(text)
    }
    if ((res.status === 429 || res.status >= 500) && attempt < retries) {
      await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt))
      continue
    }
    throw new Error(`Gemini responded ${res.status}`)
  }
}

// Names of the models your key can call.
export async function listModels() {
  const res = await fetchRetry(`${BASE}/models?pageSize=200`, { headers: { 'x-goog-api-key': apiKey() } }, { name: 'Gemini' })
  if (!res.ok) throw new Error(`Gemini responded ${res.status}`)
  const { models = [] } = await res.json()
  return models.filter((m) => m.supportedGenerationMethods?.includes('generateContent')).map((m) => m.name.replace('models/', ''))
}
