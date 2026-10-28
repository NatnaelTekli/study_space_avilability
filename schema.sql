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

-- ===========================================================================
-- ROW LEVEL SECURITY — required, not optional.
-- ===========================================================================
-- A table created here with plain `create table` has RLS DISABLED, which means
-- PostgREST exposes it to the public `anon` role with full select/insert/
-- update/delete. The anon key ships in any frontend, so without the lines
-- below anyone could overwrite availability_snapshot and we would serve it.
--
-- Nothing in this app needs anon access: browsers read through
-- /api/availability (the Cloudflare Worker), which holds the service-role key. So we turn
-- RLS on and deliberately create NO policies — that denies anon and
-- authenticated everything. service_role BYPASSES RLS entirely, so the cron
-- poller (worker/index.js scheduled() -> worker/availabilityPoller.js) keeps
-- working unchanged.
--
-- Do NOT add a "public read" policy unless you move reads into the browser's
-- Supabase client; it would re-open the table for no benefit.
alter table rooms                 enable row level security;
alter table availability_snapshot enable row level security;

-- Belt and braces: revoke the default PostgREST grants as well, so the tables
-- are unreachable for these roles even if RLS is ever toggled back off.
revoke all on rooms                 from anon, authenticated;
revoke all on availability_snapshot from anon, authenticated;

-- OPTIONAL: keep history for analytics (Postgres is good at this).
-- Instead of overwriting, append and query the latest per building.
-- Remember to enable RLS on it too, and add a retention delete so it does not
-- grow unbounded (~144 rows per building per day at a 10-minute poll).
-- create table if not exists availability_history (
--   id         bigserial primary key,
--   building   text not null,
--   data       jsonb not null,
--   fetched_at timestamptz default now()
-- );
-- create index if not exists idx_hist_building_time
--   on availability_history (building, fetched_at desc);
-- alter table availability_history enable row level security;
-- revoke all on availability_history from anon, authenticated;
