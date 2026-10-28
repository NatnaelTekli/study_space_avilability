// worker/index.js
// ---------------------------------------------------------------------------
// Cloudflare Worker entry point. Replaces the two Vercel functions:
//
//   fetch()     -> GET /api/availability   (was api/availability.js)
//   scheduled() -> every 10 minutes        (was api/refresh.js + Vercel Cron)
//
// The React build in dist/ is served as static assets by Cloudflare before
// this Worker runs (see "assets" in wrangler.jsonc). Only /api/* reaches here.
//
// The cron trigger is configured in wrangler.jsonc and is invoked internally
// by Cloudflare — there is no public URL for it, so there is nothing for a
// random visitor to hit and no CRON_SECRET to check any more.
// ---------------------------------------------------------------------------

import { getSnapshot, getAllSnapshots, refreshAll } from './availabilityPoller.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS, ...extraHeaders },
  });
}

// What browsers call (via static/DataRetrieval.js). Reads the pre-computed
// snapshot(s) from Supabase and returns them. This NEVER touches Webshare — so
// your 1 GB is completely independent of how many users you have.
//
//   /api/availability                 -> { [building]: snapshot }  (all)
//   /api/availability?building=all    -> { [building]: snapshot }  (all)
//   /api/availability?building=TFDL   -> snapshot                  (one)
async function handleAvailability(request, ctx) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 200, headers: CORS_HEADERS });
  if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405);

  // Unlike Vercel, Cloudflare does not cache Worker responses from
  // Cache-Control alone, so we use the Cache API explicitly: one shared copy
  // per data centre for 60s keeps Supabase read load flat under a spike.
  // (The Cache API is a no-op on *.workers.dev — it takes effect once the
  // Worker is on a custom domain.)
  const cache = caches.default;
  const cached = await cache.match(request);
  if (cached) return cached;

  const building = new URL(request.url).searchParams.get('building') || 'all';

  try {
    let response;
    if (building === 'all') { //DataRetrieval.js accesses information from here
      response = json(await getAllSnapshots(), 200, { 'Cache-Control': 'public, max-age=60' });
    } else {
      const snapshot = await getSnapshot(building);
      if (!snapshot) return json({ error: `No snapshot yet for ${building}` }, 404);
      response = json(snapshot, 200, { 'Cache-Control': 'public, max-age=60' });
    }
    ctx.waitUntil(cache.put(request, response.clone()));
    return response;
  } catch (err) {
    console.error('availability read failed:', err);
    return json({ error: err.message }, 500);
  }
}

export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);
    if (pathname === '/api/availability') return handleAvailability(request, ctx);
    return json({ error: 'Not found' }, 404);
  },

  // The ONLY thing that spends Webshare bandwidth.
  async scheduled(controller, env, ctx) {
    const result = await refreshAll();
    // refreshAll swallows per-building errors so one bad building cannot abort
    // the others. Throwing here is what makes Cloudflare record the cron run
    // as failed (visible under the Worker's Cron Events / logs) instead of
    // marking it green while the database goes stale.
    if (!result.ok) throw new Error(`refresh failed: ${JSON.stringify(result)}`);
    console.log('refresh ok:', JSON.stringify(result));
  },
};
