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
