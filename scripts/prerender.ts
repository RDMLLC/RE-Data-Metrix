/**
 * Pre-render script for marketing pages.
 *
 * Usage (after running `npm run build`):
 *   tsx scripts/prerender.ts
 *
 * This script is a thin wrapper over `server/prerender.ts` which defines all
 * pre-render route configurations and the injection logic. To add or change a
 * marketing route's metadata, update the PRERENDER_ROUTES array in
 * `server/prerender.ts` — that is the single source of truth.
 *
 * In production, pre-rendering also runs automatically at server startup
 * (server/index.ts calls runPrerender() before registering static serving).
 * This script enables running it as a standalone postbuild step, e.g.:
 *   "postbuild": "tsx scripts/prerender.ts"
 * in package.json scripts once the environment allows package.json edits.
 *
 * Prerequisite: dist/public/index.html must exist (produced by `vite build`).
 */

import { runPrerender } from "../server/prerender.js";

console.log("[prerender] Starting pre-render for marketing pages...");

runPrerender()
  .then(() => {
    console.log("[prerender] Pre-render complete.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("[prerender] Pre-render failed:", err);
    process.exit(1);
  });
