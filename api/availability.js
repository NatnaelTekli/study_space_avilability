// api/availability.js
// ---------------------------------------------------------------------------
// What browsers call (via static/DataRetrieval.js). Reads the pre-computed
// snapshot(s) from Supabase and returns them. This NEVER touches Webshare — so
// your 1 GB is completely independent of how many users you have.
//
//   /api/availability                 -> { [building]: snapshot }  (all)
//   /api/availability?building=all    -> { [building]: snapshot }  (all)
//   /api/availability?building=TFDL   -> snapshot                  (one)
//
// s-maxage lets Vercel's CDN serve one snapshot to everyone for 60s, so even
// Supabase read load stays flat under a traffic spike.
// ---------------------------------------------------------------------------

import { getSnapshot, getAllSnapshots } from '../lib/Availabilitypoller.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const building = (req.query.building || 'all').toString();

  try {
    // Cache at the edge: 1 shared copy for 60s, serve stale up to 120s while revalidating.
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');

    if (building === 'all') { //DataRetrieval.js accesses information from here
      return res.status(200).json(await getAllSnapshots());
    }

    const snapshot = await getSnapshot(building);
    if (!snapshot) return res.status(404).json({ error: `No snapshot yet for ${building}` });
    return res.status(200).json(snapshot);
  } catch (err) {
    console.error('availability read failed:', err);
    return res.status(500).json({ error: err.message });
  }
}