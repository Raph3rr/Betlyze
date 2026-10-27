// Leave VITE_API_URL empty in development (Vite forwards /api to the backend).
// In production set it to your backend address, e.g. https://api.betlyze.com
const BASE = import.meta.env.VITE_API_URL || ''

export async function api(path, body) {
  const res = await fetch(BASE + path, {
    method: body ? 'POST' : 'GET',
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw Object.assign(new Error(data.error || 'Something went wrong.'), { data })
  return data
}
