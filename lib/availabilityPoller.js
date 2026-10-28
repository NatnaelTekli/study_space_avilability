// lib/availabilityPoller.js
// ---------------------------------------------------------------------------
// SERVER-SIDE. Runs only inside the cron poller (api/refresh.js). This is the
// ONLY code that spends Webshare bandwidth. Browsers never import this — they
// read the finished snapshot from Supabase via /api/availability, which is
// served to them by static/DataRetrieval.js.
//
// (This is the module that used to be called DataRetrieval.js. It was renamed
//  so it can't be confused with the browser file of that name.)
//
// Two clearly separated phases:
//   BOOTSTRAP (rare)  -> fetch a room's HTML page once to learn its name +
//                        capacity, then store it in Supabase forever.
//   REFRESH  (every poll) -> fetch ONLY the availability grid JSON and turn it
//                        into a tiny compact snapshot.
// ---------------------------------------------------------------------------

import { createClient } from '@supabase/supabase-js';
import { proxiedFetch } from './proxy.js';

// ===========================================================================
// 1. DATASTORE (Supabase / Postgres)
// ===========================================================================
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

/** Load every known room's metadata as Map<itemId, {name, capacity}>. One query. */
async function getKnownRooms() {
  const { data, error } = await supabase.from('rooms').select('item_id, name, capacity');
  if (error) throw new Error(`getKnownRooms: ${error.message}`);
  const map = new Map();
  for (const row of data ?? []) map.set(String(row.item_id), { name: row.name, capacity: row.capacity });
  return map;
}

/** Insert/update a single room's static metadata (called only at bootstrap). */
async function upsertRoom(itemId, building, name, capacity) {
  const { error } = await supabase
    .from('rooms')
    .upsert(
      { item_id: Number(itemId), building, name, capacity, updated_at: new Date().toISOString() },
      { onConflict: 'item_id' }
    );
  if (error) throw new Error(`upsertRoom(${itemId}): ${error.message}`);
}

/** Overwrite the current availability snapshot for a building. Users read this. */
async function upsertSnapshot(building, data) {
  const { error } = await supabase
    .from('availability_snapshot')
    .upsert({ building, data, fetched_at: new Date().toISOString() }, { onConflict: 'building' });
  if (error) throw new Error(`upsertSnapshot(${building}): ${error.message}`);
}

/** Read one building's snapshot. */
export async function getSnapshot(building) {
  const { data, error } = await supabase
    .from('availability_snapshot')
    .select('data, fetched_at')
    .eq('building', building)
    .maybeSingle();
  if (error) throw new Error(`getSnapshot(${building}): ${error.message}`);
  return data ? { ...data.data, fetchedAt: data.fetched_at } : null;
}

/** Read every building's snapshot as { [building]: snapshot }. Used by /api/availability?building=all. */
export async function getAllSnapshots() {
  const { data, error } = await supabase
    .from('availability_snapshot')
    .select('building, data, fetched_at');
  if (error) throw new Error(`getAllSnapshots: ${error.message}`);
  const out = {};
  for (const row of data ?? []) out[row.building] = { ...row.data, fetchedAt: row.fetched_at };
  return out;
}

// ===========================================================================
// 2. BUILDINGS
// ===========================================================================
const buildingIds = {
  TFDL: { lid: '1035', gid: '2456' },
  // Gallagher:     { lid: '3542', gid: '8180' },
  // TFDLLarge:     { lid: '1035', gid: '7947' },
  // TFDLLabNext:   { lid: '1394', gid: '5408' },
  // HealthSciences:{ lid: '1396', gid: '2458' },
};

// ===========================================================================
// 3. BOOTSTRAP — get a room's name + capacity from its HTML page (ONCE)
// ===========================================================================
/**
 * Pull the short room designator out of a LibCal resource title.
 *
 *   "TFDL 350J (Capacity 4)"                -> "350J"
 *   "TFDL 2A (Capacity 6)"                  -> "2A"
 *   "Gallagher 110 Group Study (Capacity 8)"-> "110"
 *
 * The capacity clause is stripped first, because otherwise its digits get
 * mistaken for part of the room number. What is left is scanned for the first
 * whitespace-delimited token beginning with a digit — room designators are
 * digits with an optional letter suffix, and the building name never is.
 * Falls back to the whole title rather than inventing a label.
 */
function roomLabel(fullTitle) {
  const withoutCapacity = String(fullTitle).replace(/\(?\s*capacity\s+\d+\s*\)?/i, ' ');
  for (const token of withoutCapacity.split(/\s+/)) {
    const cleaned = token.replace(/^[^0-9A-Za-z]+/, '').replace(/[^0-9A-Za-z]+$/, '');
    if (/^\d/.test(cleaned)) return cleaned;
  }
  // No numbered designator (e.g. a named room). Use the title without its
  // capacity clause, since capacity is already stored in its own column.
  return withoutCapacity.replace(/\s+/g, ' ').trim() || String(fullTitle).trim();
}

async function parseRoomMeta(itemId) {
  const fallback = { name: String(itemId), capacity: null };
  try {
    const res = await proxiedFetch(`/space/${itemId}`);
    if (!res.ok) return fallback;
    const htmlText = await res.text();

    const startIndex = htmlText.indexOf('var resources =');
    if (startIndex === -1) return fallback;

    const subString = htmlText.slice(startIndex);
    const nextVarIndex = subString.indexOf('\nvar ');
    const resourcesCode = nextVarIndex !== -1 ? subString.slice(0, nextVarIndex) : subString;

    const match = resourcesCode.match(/var\s+resources\s*=\s*([\s\S]*?);/);
    if (!match) return fallback;

    const resourcesArray = new Function(`return ${match[1]};`)();
    const fullTitle = (resourcesArray?.[0]?.title) || String(itemId);

    const capMatch = fullTitle.match(/Capacity\s+(\d+)/);
    const capacity = capMatch ? Number(capMatch[1]) : null;

    return { name: roomLabel(fullTitle), capacity };
  } catch (err) {
    console.error(`parseRoomMeta(${itemId}) failed:`, err.message);
    return fallback;
  }
}

// ===========================================================================
// 4. HELPERS
// ===========================================================================
function toLabel(rawTime) {
  const h = Number((rawTime.split(':')[0]) || 0);
  if (h >= 12) return `${h === 12 ? 12 : h - 12}p`;
  return `${h === 0 ? 12 : h}a`;
}
function sortKey(rawTime) {
  const [h, m] = rawTime.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}
function localDate(offsetDays = 0, tz = 'America/Edmonton') {
  const d = new Date(Date.now() + offsetDays * 86400000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

// ===========================================================================
// 5. REFRESH — fetch ONLY the availability grid, emit a minimal snapshot
// ===========================================================================
async function refreshBuilding(building, { lid, gid }, window) {
  const { start, end } = window;

  const form = new URLSearchParams();
  form.append('lid', lid);
  form.append('gid', gid);
  form.append('eid', '0');
  form.append('seat', '0');
  form.append('seatId', '0');
  form.append('zone', '0');
  form.append('start', start); // keep this window as NARROW as your UI needs
  form.append('end', end);     // every extra day multiplies the grid response
  form.append('pageIndex', '0');
  form.append('pageSize', '18');

  const res = await proxiedFetch('/spaces/availability/grid', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
    body: form.toString(),
  });
  if (!res.ok) throw new Error(`grid ${building}: HTTP ${res.status}`);

  const data = await res.json();
  const slots = data.slots || [];

  // resolve room metadata from the DB; HTML-fetch only genuinely new rooms
  const known = await getKnownRooms();
  const newIds = [...new Set(slots.map((s) => s && String(s.itemId)).filter(Boolean))]
    .filter((id) => !known.has(id));
  for (const id of newIds) {
    const meta = await parseRoomMeta(id); // one-time HTML fetch for this room
    known.set(id, meta);
    await upsertRoom(id, building, meta.name, meta.capacity);
  }

  // pass 1: gather raw free/booked per (date, room, time)
  const raw = {};
  for (const s of slots) {
    if (!s || s.itemId === undefined || !s.start) continue;
    const [date, rawTime = ''] = s.start.split(' ');
    if (!date || !rawTime) continue;

    const meta = known.get(String(s.itemId)) || { name: String(s.itemId), capacity: null };
    const label = toLabel(rawTime);
    const bit = s.className === 's-lc-eq-checkout' ? '0' : '1'; // booked : free

    raw[date] ??= { times: new Map(), rooms: new Map() };
    if (!raw[date].times.has(label)) raw[date].times.set(label, sortKey(rawTime));
    if (!raw[date].rooms.has(meta.name)) raw[date].rooms.set(meta.name, { cap: meta.capacity, slots: new Map() });
    raw[date].rooms.get(meta.name).slots.set(label, bit);
  }

  // pass 2: build the compact, sorted snapshot
  const dates = {};
  for (const [date, d] of Object.entries(raw)) {
    const times = [...d.times.entries()].sort((a, b) => a[1] - b[1]).map(([label]) => label);
    const r = {};
    for (const [name, room] of d.rooms) {
      r[name] = { c: room.cap, s: times.map((t) => room.slots.get(t) ?? '.').join('') };
    }
    dates[date] = { t: times, r };
  }

  const snapshot = { b: building, dates };
  await upsertSnapshot(building, snapshot);
  return { building, rooms: Object.keys(dates[start]?.r || {}).length, newRooms: newIds.length, dates: Object.keys(dates) };
}

// ===========================================================================
// 6. ENTRY POINT — called by the cron endpoint (api/refresh.js)
// ===========================================================================
export async function refreshAll(opts = {}) {
  const start = opts.start || localDate(0);
  const end = opts.end || localDate(1); // API treats `end` as exclusive
  const window = { start, end };

  const summary = [];
  for (const [building, ids] of Object.entries(buildingIds)) {
    try {
      summary.push(await refreshBuilding(building, ids, window));
    } catch (err) {
      console.error(`refresh ${building} failed:`, err.message);
      summary.push({ building, error: err.message });
    }
  }

  // Report the outcome honestly. Every per-building error above is caught so
  // one bad building cannot abort the rest, which means the caller otherwise
  // has no way to tell a clean run from a total failure. An empty building
  // list counts as not-ok too: it means nothing was configured to poll.
  const failed = summary.filter((s) => s.error).length;
  const succeeded = summary.length - failed;

  return { window, summary, succeeded, failed, ok: failed === 0 && succeeded > 0 };
}