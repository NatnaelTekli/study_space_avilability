import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import { cloudflare } from "@cloudflare/vite-plugin";

// https://vite.dev/config/
// The cloudflare() plugin runs worker/index.js inside `npm run dev`, so
// /api/availability works locally with secrets read from .dev.vars.
export default defineConfig({
  plugins: [react(), cloudflare()],
});
