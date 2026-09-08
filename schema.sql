-- schema.sql — run once in the Supabase SQL editor.

-- Static, bootstrap-once metadata. One row per physical room.
-- This is what lets refresh AVOID re-fetching HTML pages (the expensive
-- Webshare call): we look the name/capacity up here instead.
create table if not exists rooms (
  item_id    bigint primary key,        -- workrooms itemId
  building   text not null,
  name       text not null,             -- short label, e.g. "350J"
  capacity   int,
  updated_at timestamptz default now()
);

-- Current availability, one row per building, overwritten every poll.
-- `data` holds the compact snapshot the browser reads.
create table if not exists availability_snapshot (
  building   text primary key,
  data       jsonb not null,
  fetched_at timestamptz default now()
);

-- The browser reads snapshots through the /api/availability endpoint, which
-- uses the service-role key server-side. If you'd rather let the Supabase JS
-- client read directly from the browser, enable RLS + a read-only policy:
--
-- alter table availability_snapshot enable row level security; (It might be better to NOT do this for security reasons, and instead keep the service-role key server-side.)
-- create policy "public read" on availability_snapshot for select using (true);
--
-- (Keep the `rooms` table and all writes server-side / service-role only.)

-- OPTIONAL: keep history for analytics (Postgres is good at this).
-- Instead of overwriting, append and query the latest per building.
-- create table if not exists availability_history (
--   id         bigserial primary key,
--   building   text not null,
--   data       jsonb not null,
--   fetched_at timestamptz default now()
-- );
-- create index if not exists idx_hist_building_time
--   on availability_history (building, fetched_at desc);
-- *rooms is a few hundred rows; availability_snapshot is literally one
-- row per building (max 5). You will never approach the 500 MB free-tier limit.
-- If you turn on the optional availability_history table at schema.sql:33-40, 
--that becomes ~144 rows per building per day — still small, but add a retention delete so it doesn't run unbounded for years.
