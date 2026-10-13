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
    return res.status(200).json({ ok: true, ...result });
  } catch (err) {
    console.error('refresh failed:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}