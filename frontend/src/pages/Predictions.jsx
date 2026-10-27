import PicksByDay from '../components/PicksByDay'

export default function Predictions() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-3xl font-bold sm:text-4xl">AI predictions</h1>
      <p className="mt-3 max-w-xl text-paper/70">
        Accumulators built from match data and analysed by AI. Open a pick to see its games, then book them. The 3-odds and 5-odds picks are free. Bigger odds are for subscribers.
      </p>
      <PicksByDay />
    </div>
  )
}
