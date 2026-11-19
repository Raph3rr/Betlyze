import { Link } from "react-router-dom";

export default function Maintenance() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-6 py-12 text-paper">
      <div className="w-full max-w-xl text-center">
        <Link to="/" className="mb-12 inline-block">
          <span className="text-2xl font-extrabold tracking-tight">
            BET<span className="text-brand">LYZE</span>
          </span>
        </Link>

        <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-3xl border border-line bg-panel">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="44"
            height="44"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-brand"
          >
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.1-3.1a6 6 0 0 1-7.9 7.9l-6.8 6.8a2.1 2.1 0 0 1-3-3l6.8-6.8a6 6 0 0 1 7.9-7.9z" />
          </svg>
        </div>

        <p className="mb-4 text-xs font-bold uppercase tracking-[0.25em] text-brand">
          Under maintenance
        </p>

        <h1 className="mb-4 font-display text-3xl font-extrabold sm:text-4xl">
          We'll be back shortly.
        </h1>

        <p className="mx-auto max-w-md text-sm leading-7 opacity-65 sm:text-base">
          BETLYZE is currently undergoing scheduled maintenance as we work to
          improve your experience. Thank you for your patience.
        </p>

        <div className="mx-auto mt-9 flex max-w-xs items-center justify-center gap-3 rounded-xl border border-line bg-panel px-5 py-4">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-brand" />
          <span className="text-xs font-medium opacity-70">
            Improvements in progress
          </span>
        </div>

        <p className="mt-16 text-xs opacity-40">
          © {new Date().getFullYear()} BETLYZE. All rights reserved.
        </p>
      </div>
    </div>
  );
}
