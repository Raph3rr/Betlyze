import mongoose from 'mongoose'

// Saves API responses in MongoDB so we never pay a request twice. Entries delete themselves when they expire.
const schema = new mongoose.Schema({
  key: { type: String, unique: true },
  data: mongoose.Schema.Types.Mixed,
  expiresAt: { type: Date, index: { expireAfterSeconds: 0 } },
})
const Cache = mongoose.models.Cache || mongoose.model('Cache', schema)

export async function cached(key, ttlSeconds, fetcher) {
  const hit = await Cache.findOne({ key }).lean()
  if (hit) return hit.data
  const data = await fetcher()
  try {
    await Cache.updateOne({ key }, { data, expiresAt: new Date(Date.now() + ttlSeconds * 1000) }, { upsert: true })
  } catch (e) {
    console.log('  (could not cache a response:', e.message + ')')
  }
  return data
}
