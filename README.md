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
