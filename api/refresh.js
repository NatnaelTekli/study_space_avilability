// api/refresh.js
// ---------------------------------------------------------------------------
// The ONLY thing that spends Webshare bandwidth. Triggered by Vercel Cron
// (see vercel.json). Never call this from a browser.
//
// Vercel Cron automatically sends `Authorization: Bearer $CRON_SECRET`.
// We reject anything else so a random visitor can't burn your 1 GB.
// ---------------------------------------------------------------------------

import { refreshAll } from '../lib/availabilityPoller.js';

export default async function handler(req, res) {
  const auth = req.headers.authorization;
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' }); // Check is .env contains a CRON_SECRET for authorization
  }

  try {
    const result = await refreshAll();
    // refreshAll swallows per-building errors so one bad building cannot abort
    // the others, so a 200 here would mark the cron run green even when every
    // fetch failed and the database went stale. Anything short of a fully
    // clean run returns 5xx, which is what Vercel flags as a failed run.
    return res.status(result.ok ? 200 : 500).json(result);
  } catch (err) {
    console.error('refresh failed:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}