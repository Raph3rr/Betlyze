# Betlyze

Two separate apps:

- `backend/`  Express + MongoDB API
- `frontend/` React + Vite + Tailwind site

## Run locally

Backend (terminal 1):
    cd backend
    npm install
    copy .env.example to .env and fill it in
    node server.js

Frontend (terminal 2):
    cd frontend
    npm install
    npm run dev

## Check your API keys (backend)

Put `API_FOOTBALL_KEY` and `ODDSPAPI_KEY` in `backend/.env`, then run:

    cd backend
    npm run check-keys

It shows your plan, requests used today, and which bookmakers each provider offers. It never prints your keys.

## More scripts (backend)

    npm run check-keys   # checks all your keys and lists the Gemini models your key can use
    npm run sample       # saves small real examples of each API into backend/sample-output/

## Real predictions (backend)

    npm run generate     # builds today, tomorrow and the day after, and saves them in MongoDB

The server also has a protected endpoint for a daily scheduler:

    POST https://YOUR-BACKEND/api/jobs/generate    header: x-cron-secret: <your CRON_SECRET>

Settings live in `backend/.env` (see `.env.example`). Leagues are listed in `backend/pipeline/leagues.js`.

## Team news (backend settings)

- Injuries and suspensions: always on, one request per league per day.
- Teams that played the day before: always on.
- `RECENT_GAMES=true`: game-by-game stats for each team's last 5 games.
- `LINEUPS=true`: formation and rotation from each team's last 2 lineups (about 6 requests per fixture).

## Results

    npm run settle                 # checks yesterday's saved picks against the real final scores (1 API-Football request)
    npm run settle -- 2026-10-31   # a specific day

`npm run generate` also settles yesterday first. The Yesterday tab on the site then shows Won / Lost on each pick and the final score of each game.

## Checking how good the predictions really are

    npm run calibration   # compares our predicted percentages with real results, by odds level, confidence and market

Needs a few weeks of settled days before the numbers mean much.

## Owner access

Put your email in `ADMIN_EMAILS` (backend `.env` and Render) to see every odds level, including Pro ones.

## Automatic daily run (GitHub Actions)

`.github/workflows/daily.yml` runs three times every morning (05:17, 07:47 and 10:27 Lagos time; extra runs are harmless). It checks yesterday's results, then creates
today's and tomorrow's picks if they do not exist yet. A day's picks are never replaced once created.
You can also start it by hand: GitHub, Actions tab, "Daily predictions", Run workflow.

Secrets needed in GitHub (Settings, Secrets and variables, Actions): MONGODB_URI, API_FOOTBALL_KEY, ODDSPAPI_KEY, GEMINI_API_KEY.

## Login on Vercel (important)

`frontend/vercel.json` passes `/api` to your Render backend. Replace `YOUR-BACKEND-NAME.onrender.com` with your real Render address,
and delete (or empty) `VITE_API_URL` in the Vercel project settings, then redeploy. This keeps you logged in after a refresh.
