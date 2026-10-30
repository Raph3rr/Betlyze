import mongoose from 'mongoose'

// One document per day (Lagos date): the finished predictions for all odds categories.
const schema = new mongoose.Schema(
  {
    date: { type: String, required: true, unique: true }, // YYYY-MM-DD
    generatedAt: Date,
    oddsSource: String,
    fixtureCount: Number,
    categories: [mongoose.Schema.Types.Mixed], // [{ odds, picks: [...] }]
  },
  { timestamps: true },
)

export default mongoose.models.PredictionSet || mongoose.model('PredictionSet', schema)
