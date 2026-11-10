import { fetchRetry } from './http.js'

const BASE = 'https://generativelanguage.googleapis.com/v1beta'

export const MODEL = () => process.env.GEMINI_MODEL || 'gemini-3.5-flash'

function apiKey() {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error('GEMINI_API_KEY is missing in your .env')
  return key
}

function escapeControls(t) {
  let out = '', inStr = false, esc = false
  for (const ch of t) {
    if (!inStr) { if (ch === '"') inStr = true; out += ch; continue }
    if (esc) { esc = false; out += ch }
    else if (ch === '\\') { esc = true; out += ch }
    else if (ch === '"') { inStr = false; out += ch }
    else if (ch === '\n') out += '\\n'
    else if (ch === '\r') out += '\\r'
    else if (ch === '\t') out += '\\t'
    else out += ch
  }
  return out
}

function parseLoose(text) {
  const tryParse = (t) => { try { return JSON.parse(t) } catch { return undefined } }
  let v = tryParse(text) ?? tryParse(escapeControls(text))
  if (v === undefined) {
    let t = text.replace(/^\s*```(?:json)?\s*|\s*```\s*$/g, '')
    const a = t.indexOf('{'), b = t.lastIndexOf('}')
    if (a >= 0 && b > a) t = t.slice(a, b + 1)
    v = tryParse(t) ?? tryParse(escapeControls(t))
  }
  if (typeof v === 'string') return parseLoose(v) // the answer was JSON inside a string
  if (v === undefined) throw new Error(`Gemini's answer could not be read as JSON. It began: ${text.slice(0, 120).replace(/\s+/g, ' ')}`)
  return v
}

async function callModel(model, prompt, { retries, maxOutputTokens }) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetchRetry(`${BASE}/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey() },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.3, maxOutputTokens },
      }),
    }, { name: 'Gemini', timeoutMs: 120000, tries: 3 })
    if (res.ok) {
      const data = await res.json()
      const parts = data.candidates?.[0]?.content?.parts || []
      const text = parts.filter((p) => !p.thought && p.text).map((p) => p.text).join('')
      if (!text) throw new Error('Gemini returned no text')
      return parseLoose(text)
    }
    if ((res.status === 429 || res.status >= 500) && attempt < retries) {
      await new Promise((r) => setTimeout(r, 3000 * 2 ** attempt)) // 3s, 6s, 12s, 24s
      continue
    }
    throw new Error(`Gemini responded ${res.status}`)
  }
}

// Sends a prompt and returns the parsed JSON answer. Retries when Google is busy, then tries a backup model.
export async function generateJson(prompt, { retries = 4, maxOutputTokens = 8192 } = {}) {
  try {
    return await callModel(MODEL(), prompt, { retries, maxOutputTokens })
  } catch (e) {
    const backup = process.env.GEMINI_FALLBACK_MODEL || 'gemini-2.5-flash'
    if (!backup || backup === MODEL() || !/responded (429|5\d\d)|Could not reach/.test(e.message)) throw e
    console.log(`  Gemini (${MODEL()}) failed: ${e.message}. Trying backup model ${backup}...`)
    return await callModel(backup, prompt, { retries: 2, maxOutputTokens })
  }
}

// Names of the models your key can call.
export async function listModels() {
  const res = await fetchRetry(`${BASE}/models?pageSize=200`, { headers: { 'x-goog-api-key': apiKey() } }, { name: 'Gemini' })
  if (!res.ok) throw new Error(`Gemini responded ${res.status}`)
  const { models = [] } = await res.json()
  return models.filter((m) => m.supportedGenerationMethods?.includes('generateContent')).map((m) => m.name.replace('models/', ''))
}
