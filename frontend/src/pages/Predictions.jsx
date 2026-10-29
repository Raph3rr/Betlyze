import PredictionsView from '../components/PredictionsView'

export default function Predictions() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-3xl font-bold sm:text-4xl">AI predictions</h1>
      <p className="mt-3 max-w-xl text-paper/70">Pick a day, pick an odds category, then open a pick to see its games, the reasoning behind each one, and book them.</p>
      <PredictionsView />
    </div>
  )
}
