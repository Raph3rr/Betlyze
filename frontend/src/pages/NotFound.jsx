import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-6 py-12 text-paper">
      <div className="w-full max-w-xl text-center">
        <Link to="/" className="mb-12 inline-block">
          <span className="text-2xl font-extrabold tracking-tight">
            BET<span className="text-brand">LYZE</span>
          </span>
        </Link>

        <div className="mb-6">
          <h1 className="text-8xl font-extrabold tracking-tighter text-brand sm:text-9xl">
            404
          </h1>
        </div>

        <h2 className="mb-3 font-display text-2xl font-bold sm:text-3xl">
          Page not found
        </h2>

        <p className="mx-auto mb-9 max-w-md text-sm leading-7 opacity-65 sm:text-base">
          The page you're looking for doesn't exist, may have been moved, or the
          link may be incorrect.
        </p>

        <Link
          to="/"
          className="inline-flex items-center justify-center rounded-xl bg-brand px-7 py-3.5 text-sm font-bold text-white transition hover:opacity-85"
        >
          Back to homepage
        </Link>

        <p className="mt-16 text-xs opacity-40">
          © {new Date().getFullYear()} BETLYZE. All rights reserved.
        </p>
      </div>
    </div>
  );
}
