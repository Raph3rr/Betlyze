import mongoose from 'mongoose'

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    plan: { type: String, enum: ['free', 'pro'], default: 'free' },
    windowStart: Date, // when the user's first conversion in the current 24h window happened
    used: { type: Number, default: 0 }, // conversions used in the current window
  },
  { timestamps: true },
)

export default mongoose.model('User', userSchema)
