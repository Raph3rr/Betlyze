import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import User from './User.js'

const router = Router()
const FREE_LIMIT = 3
const WINDOW_MS = 24 * 60 * 60 * 1000 // 24 hours after the first conversion
const isProduction = process.env.NODE_ENV === 'production'
const cookieOpts = { httpOnly: true, sameSite: isProduction ? 'none' : 'lax', secure: isProduction, maxAge: 7 * 24 * 60 * 60 * 1000 }

const handle = (fn) => (req, res) =>
  fn(req, res).catch((e) => {
    console.error(e)
    res.status(500).json({ error: 'Server error. Please try again.' })
  })

function usage(u) {
  if (u.plan === 'pro') return { unlimited: true }
  const live = u.windowStart && Date.now() - u.windowStart.getTime() < WINDOW_MS
  const used = live ? u.used : 0
  return { limit: FREE_LIMIT, left: FREE_LIMIT - used, resetsAt: live ? new Date(u.windowStart.getTime() + WINDOW_MS) : null }
}
const view = (u) => ({ id: u._id, username: u.username, email: u.email, plan: u.plan, ...usage(u) })
const start = (res, u) => {
  res.cookie('token', jwt.sign({ id: u._id }, process.env.JWT_SECRET, { expiresIn: '7d' }), cookieOpts)
  res.json({ user: view(u) })
}

async function auth(req, res, next) {
  try {
    const { id } = jwt.verify(req.cookies.token, process.env.JWT_SECRET)
    req.user = await User.findById(id)
    if (!req.user) throw new Error('no user')
    next()
  } catch {
    res.status(401).json({ error: 'Please log in.' })
  }
}

router.post('/signup', handle(async (req, res) => {
  const { username = '', email = '', password = '' } = req.body
  if (username.trim().length < 3) return res.status(400).json({ error: 'Username must be at least 3 characters.' })
  if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' })
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' })
  const taken = await User.findOne({ $or: [{ email: email.toLowerCase().trim() }, { username: username.trim() }] })
  if (taken) return res.status(409).json({ error: 'That email or username is already taken.' })
  const user = await User.create({ username, email, passwordHash: await bcrypt.hash(password, 12) })
  start(res, user)
}))

router.post('/login', handle(async (req, res) => {
  const { email = '', password = '' } = req.body
  const user = await User.findOne({ email: email.toLowerCase().trim() })
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) return res.status(401).json({ error: 'Wrong email or password.' })
  start(res, user)
}))

router.post('/logout', (req, res) => {
  res.clearCookie('token')
  res.json({ ok: true })
})

router.get('/me', auth, (req, res) => res.json({ user: view(req.user) }))

// MOCK conversion: enforces the daily limit for real, but the result is fake until we connect the converter API.
router.post('/convert', auth, handle(async (req, res) => {
  const { from, to, code = '' } = req.body
  if (!from || !to || !code.trim()) return res.status(400).json({ error: 'Choose both bookies and enter a booking code.' })
  if (from === to) return res.status(400).json({ error: 'Choose two different bookies.' })
  const u = req.user
  if (u.plan !== 'pro') {
    const s = usage(u)
    if (s.left <= 0)
      return res.status(429).json({ error: 'You have used your 3 free conversions. Subscribe for unlimited conversions, or come back when your limit resets.', usage: s })
    if (!s.resetsAt) { u.windowStart = new Date(); u.used = 0 }
    u.used += 1
    await u.save()
  }
  await new Promise((r) => setTimeout(r, 1500))
  res.json({
    from, to, total: 5, converted: 4, mock: true,
    newCode: Math.random().toString(36).slice(2, 9).toUpperCase(),
    missing: [{ league: 'Eredivisie', match: 'Ajax vs PSV', pick: 'Both teams to score', reason: `Market not available on ${to}` }],
    usage: usage(u),
  })
}))

export default router
