import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import mongoose from 'mongoose'
import routes from './routes.js'

for (const key of ['MONGODB_URI', 'JWT_SECRET']) {
  if (!process.env[key]) {
    console.error(`Missing ${key} in your .env file.`)
    process.exit(1)
  }
}

const app = express()
app.set('trust proxy', 1) // hosts like Render and Railway sit behind a proxy
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }))
app.use(express.json())
app.use(cookieParser())

app.get('/health', (req, res) => res.json({ ok: true }))
app.use('/api', routes)

const PORT = process.env.PORT || 5000

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDB connected')
    app.listen(PORT, () => console.log(`Betlyze backend running on port ${PORT}`))
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message)
    process.exit(1)
  })
