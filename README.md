# Threads of Tradition

Backend-powered multi-page cultural learning platform.

## Run locally

```bash
npm start
```

The server binds to `0.0.0.0` and uses `PORT` when provided.
Default URL: `http://localhost:4173`.

## Why preview may have failed before

If you used a static-file preview, the frontend loaded but backend endpoints (`/api/*`) were unavailable.
This project must run through `node server.js` (or `npm start`) so both static pages and API routes are served together.

## Scripts

- `npm start` – run backend + static site
- `npm run dev` – same as start
- `npm run preview` – same as start (for preview tooling compatibility)
- `npm run check` – syntax check for server and frontend script

## Quick pull / run checklist

If you just pulled updates and things look stale:

1. `git pull`
2. `npm run check`
3. `npm run preview`
4. Open `http://localhost:4173`

If port `4173` is busy, stop the previous server process and run preview again.
