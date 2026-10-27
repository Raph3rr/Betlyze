import { Link } from 'react-router-dom'
import PicksByDay from '../components/PicksByDay'

const steps = [
  ['Paste a booking code', 'Enter the code from the bookie your friend used.'],
  ['Choose where to convert', 'Pick the bookie you want to bet with.'],
  ['Get your new code', 'We rebuild the slip there. If a game is not available, we tell you.'],
]

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl">
      {/* Hero */}
      <section className="grid items-center gap-10 lg:grid-cols-2">
        <div>
          <h1 className="font-display text-4xl font-extrabold leading-tight sm:text-5xl lg:text-6xl">
            AI football predictions and bet code conversion, in one place.
          </h1>
          <p className="mt-5 max-w-lg text-lg text-paper/70">
            See today’s analysed accumulators, then move any booking code from the bookie your friend uses to the one you bet with.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/converter" className="rounded-lg bg-brand-deep px-6 py-3 font-bold text-white hover:bg-brand">
              Convert a code
            </Link>
            <Link to="/predictions" className="rounded-lg border border-line px-6 py-3 font-semibold hover:border-brand">
              See today’s picks
            </Link>
          </div>
          <p className="mt-4 text-sm text-paper/60">Sign up and get 3 free conversions.</p>
        </div>

        {/* Converter mockup */}
        <div className="rounded-2xl border border-brand/40 bg-panel p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <span className="font-semibold">Bet code converter</span>
            <span className="rounded-full bg-brand/15 px-3 py-1 text-xs font-semibold text-brand">Sample</span>
          </div>
          <div className="mt-5 rounded-xl border border-line p-4">
            <p className="text-sm text-paper/60">From SportyBet</p>
            <p className="mt-1 font-display text-2xl font-bold tracking-wider">7K2P9XQ</p>
          </div>
          <div className="my-3 flex justify-center text-brand" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M6 13l6 6 6-6" /></svg>
          </div>
          <div className="rounded-xl border border-brand p-4">
            <p className="text-sm text-paper/60">To MSport</p>
            <p className="mt-1 font-display text-2xl font-bold tracking-wider text-brand">M4X81QZ</p>
            <p className="mt-2 text-sm text-paper/70">All games matched. Ready to use.</p>
          </div>
        </div>
      </section>

      {/* Picks by day */}
      <section className="mt-20">
        <h2 className="font-display text-2xl font-bold sm:text-3xl">Picks by day</h2>
        <PicksByDay />
      </section>

      {/* How it works */}
      <section className="mt-20">
        <h2 className="font-display text-2xl font-bold sm:text-3xl">How the converter works</h2>
        <ol className="mt-6 grid gap-4 sm:grid-cols-3">
          {steps.map(([title, text], i) => (
            <li key={title} className="rounded-2xl border border-line p-5">
              <span className="font-display text-2xl font-bold text-brand">{i + 1}</span>
              <h3 className="mt-2 font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-paper/70">{text}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
