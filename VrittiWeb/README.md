# VrittiWeb

Browser demo client for the Vritti backend.

## Local Ports

- Web app: `5173`
- Backend API: `3000`

## Run Locally

1. Install dependencies:
   `npm install`
2. Optionally set `VITE_API_BASE=http://localhost:3000`
3. Start the dev server:
   `npm run dev`

## Notes

- This app talks to the Fastify backend, not directly to the orchestrator.
- Auth, onboarding, policy status, payout history, and admin override actions all go through the backend API.
