// fetch with a timeout, a few retries, and an error message that says WHY it failed
// (Node's plain "fetch failed" hides the real reason).
export async function fetchRetry(url, init = {}, { name = 'server', timeoutMs = 60000, tries = 3 } = {}) {
  let last
  for (let i = 0; i < tries; i++) {
    try {
      return await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) })
    } catch (e) {
      last = e
      if (i < tries - 1) await new Promise((r) => setTimeout(r, 1500 * (i + 1)))
    }
  }
  const why = last?.cause?.code || last?.cause?.message || last?.name || last?.message
  throw new Error(`Could not reach ${name} (${why}). Check your internet connection, VPN or firewall.`)
}
