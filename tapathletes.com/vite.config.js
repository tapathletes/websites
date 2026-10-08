import { defineConfig } from 'vite';

/**
 * Dev-only Vite config for tapathletes.com.
 *
 * Purpose: live preview during development (`npm run dev`).
 * Production: GitHub Pages serves the static files in this directory
 * (index.html, styles/*.css, sub-page directories) directly. No build
 * step is run for production. Do not run `vite build` — there is no
 * dist artifact to deploy.
 *
 * Port: reads PORT from env if set (used by the Claude Code harness
 * preview manager when autoPort is enabled); otherwise falls back to
 * 5173 for plain `npm run dev`.
 */
const port = process.env.PORT ? Number(process.env.PORT) : 5173;

export default defineConfig({
  root: '.',
  server: {
    port,
    host: 'localhost',
    // No auto-launch of a browser. Navigate manually to the URL.
  },
});
