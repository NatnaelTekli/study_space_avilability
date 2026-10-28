// static/DataRetrieval.js  —  BROWSER module (imported by App.jsx)
// ---------------------------------------------------------------------------
// This replaces the old scraper that ran in the browser. It NO LONGER touches
// the Webshare proxy or workrooms.ucalgary.ca. It just reads the pre-computed
// snapshot that the cron poller wrote to Supabase, via /api/availability
// (served by study-space-app/worker/index.js).
//
// App.jsx is unchanged: it still does
//     import getAllGridData from '../../static/DataRetrieval';
//     const GRID_DATA = await getAllGridData();
// and still receives the exact nested shape it expects:
//   { [building]: { [roomId]: { [date]: [{ time, status }], capacity } } }
// ---------------------------------------------------------------------------

// Same-origin by default. For local `vite dev` against a deployed backend,
// set VITE_API_BASE=https://study-space-app.<your-subdomain>.workers.dev in your .env.
const API_BASE = (import.meta?.env?.VITE_API_BASE ?? '').replace(/\/$/, '');


function reshapeBuilding(snap) {

    // Turn one compact building snapshot ...
    //   { b, dates: { "2026-08-25": { t: ["9a",..], r: { "350J": { c:4, s:"110.." } } } } }
    // ... into the nested shape App.jsx reads.

  const rooms = {};
  const dates = snap?.dates || {};

  for (const [date, day] of Object.entries(dates)) {

    const times = day.t || [];

    for (const [roomId, room] of Object.entries(day.r || {})) {

      if (!rooms[roomId]) rooms[roomId] = { capacity: room.c ?? 0 };

      const bits = room.s || '';
      const slots = [];

      for (let i = 0; i < times.length; i++) {
        const ch = bits[i];
        if (ch === '.' || ch === undefined) continue; // no slot at this time
        slots.push({ time: times[i], status: ch === '1' }); // status is a real boolean
      }

      rooms[roomId][date] = slots;
    }
  }
  return rooms;
}

export default async function getAllGridData() {
  try {
    const res = await fetch(`${API_BASE}/api/availability?building=all`, { // API endpoint receives it (study-space-app/worker/index.js)
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`availability HTTP ${res.status}`);

    const byBuilding = await res.json(); // { [building]: compactSnapshot }
    const out = {};
    for (const [building, snap] of Object.entries(byBuilding || {})) {
      out[building] = reshapeBuilding(snap);
    }
    return out;
  } catch (err) {
    console.error('getAllGridData failed:', err);
    return {}; // App.jsx already renders gracefully from an empty object
  }
}