import React, { useState, useEffect } from 'react';
import getAllGridData from '../../static/DataRetrieval';
import './App.css';

/* Theme colors live as CSS variables in App.css. Components below pick
 * classes from App.css; inline styles are only used for values that come
 * from props (gap, alignment, grid columns). */

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

/* ── UI primitives ─────────────────────────────────────────────────── */

function Stack({ children, gap = 0, className, style }) {
  return (
    <div className={cx("stack", className)} style={{ gap, ...style }}>
      {children}
    </div>
  );
}

function Row({ children, gap = 0, align = "stretch", justify = "start", wrap, className, style }) {
  return (
    <div
      className={cx("row", wrap && "row--wrap", className)}
      style={{ gap, alignItems: align, justifyContent: justify, ...style }}
    >
      {children}
    </div>
  );
}

function Grid({ children, columns, gap = 0, className, style }) {
  const cols = typeof columns === "number" ? `repeat(${columns}, minmax(0, 1fr))` : columns;
  return (
    <div className={cx("grid", className)} style={{ gridTemplateColumns: cols, gap, ...style }}>
      {children}
    </div>
  );
}

function Spacer() {
  return <div className="spacer" />;
}

function Divider() {
  return <hr className="divider" />;
}

const TEXT_TONES = ["primary", "secondary", "tertiary", "quaternary", "link", "onAccent"];
const TEXT_WEIGHTS = ["normal", "medium", "semibold", "bold"];

function Text({ children, tone = "primary", size = "body", weight = "normal", className, style }) {
  return (
    <p
      className={cx(
        "text",
        size === "small" && "text--small",
        `text--${TEXT_WEIGHTS.includes(weight) ? weight : "normal"}`,
        `text--${TEXT_TONES.includes(tone) ? tone : "primary"}`,
        className,
      )}
      style={style}
    >
      {children}
    </p>
  );
}

function H2({ children, className, style }) {
  return (
    <h2 className={cx("h2", className)} style={style}>
      {children}
    </h2>
  );
}

function Button({ children, variant = "primary", onClick, className, style }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx("btn", `btn--${variant}`, className)}
      style={style}
    >
      {children}
    </button>
  );
}

function Pill({ children, active, size = "md", onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx("pill", size === "sm" && "pill--sm", active && "pill--active", onClick && "pill--clickable")}
    >
      {children}
    </button>
  );
}

function TextInput({ value, onChange, placeholder, type = "text", className, style }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      className={cx("text-input", className)}
      style={style}
    />
  );
}

function Select({ value, onChange, options, className, style }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      className={cx("select", className)}
      style={style}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value} disabled={opt.disabled}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

function Callout({ title, children, tone = "info" }) {
  const toneClass = ["info", "success", "warning"].includes(tone) ? tone : "info";
  return (
    <div className={cx("callout", `callout--${toneClass}`)}>
      {title && <div className="callout-title">{title}</div>}
      {children}
    </div>
  );
}

function Card({ children }) {
  return <div className="card">{children}</div>;
}

function CardHeader({ children, trailing }) {
  return (
    <div className="card-header">
      <span>{children}</span>
      {trailing}
    </div>
  );
}

function CardBody({ children, className, style }) {
  return (
    <div className={cx("card-body", className)} style={style}>
      {children}
    </div>
  );
}

function Stat({ value, label, tone, className, style }) {
  return (
    <div className={cx("stat", className)} style={style}>
      <div className={cx("stat-value", tone && `stat-value--${tone}`)}>{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function LineChart({ categories, series, height = 160 }) {
  const pad = { top: 12, right: 12, bottom: 28, left: 36 };
  const width = 340;
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const yMin = 30;
  const yMax = 100;

  const xScale = (i) => pad.left + (i / Math.max(categories.length - 1, 1)) * plotW;
  const yScale = (v) => pad.top + plotH - ((v - yMin) / (yMax - yMin)) * plotH;

  // Each series sets `color` via its class; marks draw with currentColor.
  const seriesClass = (tone) => cx("series", tone && `series--${tone}`);

  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="chart-svg">
        {[30, 50, 70, 90].map((v) => (
          <g key={v}>
            <line
              x1={pad.left}
              y1={yScale(v)}
              x2={width - pad.right}
              y2={yScale(v)}
              className="chart-gridline"
              strokeWidth={1}
            />
            <text x={pad.left - 6} y={yScale(v) + 3} textAnchor="end" fontSize={9} className="chart-axis-label">
              {v}
            </text>
          </g>
        ))}
        {categories.map((cat, i) => (
          <text
            key={cat}
            x={xScale(i)}
            y={height - 6}
            textAnchor="middle"
            fontSize={9}
            className="chart-axis-label"
          >
            {cat}
          </text>
        ))}
        {series.map((s) => {
          const points = s.data.map((v, i) => `${xScale(i)},${yScale(v)}`).join(" ");
          const areaPoints = `${xScale(0)},${yScale(yMin)} ${points} ${xScale(s.data.length - 1)},${yScale(yMin)}`;
          return (
            <g key={s.name} className={seriesClass(s.tone)}>
              <polygon points={areaPoints} fill="currentColor" opacity={0.12} />
              <polyline points={points} fill="none" stroke="currentColor" strokeWidth={2} />
              {s.data.map((v, i) => (
                <circle key={i} cx={xScale(i)} cy={yScale(v)} r={3} fill="currentColor" />
              ))}
            </g>
          );
        })}
      </svg>
      <Row gap={12} className="chart-legend">
        {series.map((s) => (
          <Row key={s.name} gap={4} align="center">
            <div className={cx("chart-legend-dot", seriesClass(s.tone))} />
            <span className="chart-legend-label">{s.name}</span>
          </Row>
        ))}
      </Row>
    </div>
  );
}

/* ── Live data (from getAllGridData) ──────────────────────────────────
 * getAllGridData() returns data shaped like:
 * {
 *   [building]: {
 *     [roomId]: {
 *       [dateString]: [{ time: '7a', status: 'True' }, ...],
 *       capacity: '4'
 *     }
 *   }
 * }
 * The block below normalizes that into the flat room list + per-room
 * availability lookup that the rest of this file expects.
 * ────────────────────────────────────────────────────────────────── */

/* ── Live data (from getAllGridData) ──────────────────────────────────
 * getAllGridData() returns data shaped like:
 * {
 *   [building]: {
 *     [roomId]: {
 *       [dateString]: [{ time: '7a', status: 'True' }, ...],
 *       capacity: '4'
 *     }
 *   }
 * }
 * Everything below reads that nested shape directly on demand — there
 * is no upfront pass that reshapes it into the old flat room-array
 * format. Components ask for exactly what they need (buildings, room
 * ids, capacity, slots for a date) straight from GRID_DATA.
 * ────────────────────────────────────────────────────────────────── */

let GRID_DATA = await getAllGridData();
GRID_DATA = GRID_DATA ?? {}; // Fallback to an empty array [] (or object {}) if GRID_DATA is null or undefined
console.log(GRID_DATA);

// Time axis. Derived from whatever the backend actually returned rather than
// hardcoded, so a slot outside a fixed 9a–7p window still renders instead of
// being silently dropped. Falls back to a standard day when there is no data
// yet, so the grid still draws a frame on a cold start.
const FALLBACK_TIME_SLOTS = ["9a", "10a", "11a", "12p", "1p", "2p", "3p", "4p", "5p", "6p", "7p"];

// "9a" -> 9, "12p" -> 12, "7p" -> 19. Used to order the axis.
function slotHour(label) {
  const m = /^(\d+)([ap])$/.exec(label || "");
  if (!m) return 0;
  const h = Number(m[1]) % 12;
  return m[2] === "p" ? h + 12 : h;
}

function deriveTimeSlots() {
  const seen = new Set();
  Object.keys(GRID_DATA).forEach((buildingName) => {
    const rooms = GRID_DATA[buildingName] || {};
    Object.keys(rooms).forEach((roomId) => {
      const room = rooms[roomId] || {};
      Object.keys(room).forEach((key) => {
        if (key === "capacity") return;
        (room[key] || []).forEach((entry) => {
          if (entry && entry.time) seen.add(entry.time);
        });
      });
    });
  });
  return seen.size ? [...seen].sort((a, b) => slotHour(a) - slotHour(b)) : FALLBACK_TIME_SLOTS;
}

const TIME_SLOTS = deriveTimeSlots();

function slotToClock(label) {
  const m = /^(\d+)([ap])$/.exec(label || "");
  return m ? `${m[1]} ${m[2] === "a" ? "am" : "pm"}` : label || "";
}

const TIME_RANGE_LABEL = TIME_SLOTS.length
  ? `${slotToClock(TIME_SLOTS[0])} – ${slotToClock(TIME_SLOTS[TIME_SLOTS.length - 1])}`
  : "No times available";

function isSlotAvailable(status) {
  return status === true || status === "True" || status === "true";
}

// Building names present in the live data.
function getBuildings() {
  return Object.keys(GRID_DATA);
}

// Room ids that exist under a given building.
function getRoomIds(buildingName) {
  return Object.keys(GRID_DATA[buildingName] || {});
}

function getCapacity(buildingName, roomId) {
  const raw = GRID_DATA[buildingName]?.[roomId]?.capacity;
  return Number(raw) || 0;
}

// A room's keys are all dates except the "capacity" key.
function getDatesForRoom(buildingName, roomId) {
  const room = GRID_DATA[buildingName]?.[roomId] || {};
  return Object.keys(room).filter((k) => k !== "capacity");
}

// Earliest date found anywhere in the data — used as the default view
// since the data doesn't tell us which date is "today".
function getDefaultDate() {
  let earliest = null;
  getBuildings().forEach((buildingName) => {
    getRoomIds(buildingName).forEach((roomId) => {
      getDatesForRoom(buildingName, roomId).forEach((date) => {
        if (!earliest || date < earliest) earliest = date;
      });
    });
  });
  return earliest;
}

const DEFAULT_DATE = getDefaultDate();

function formatDateLabel(dateStr) {
  if (!dateStr) return "No dates available";
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

// Boolean slot map, aligned to TIME_SLOTS, for one room on one date.
// Reads GRID_DATA[building][roomId][date] = [{ time, status }, ...] directly.
function getSlots(buildingName, roomId, date = DEFAULT_DATE) {
  const entries = GRID_DATA[buildingName]?.[roomId]?.[date] || [];
  const statusByTime = {};
  entries.forEach((entry) => {
    statusByTime[entry.time] = isSlotAvailable(entry.status);
  });
  return TIME_SLOTS.map((t) => Boolean(statusByTime[t]));
}

function countAvailable(slots) {
  return slots.filter(Boolean).length;
}

// Walks the nested tree into a flat list of records for a given date.
// Computed on demand from GRID_DATA rather than cached as a separate
// "rooms" model — the nested structure stays the single source of truth.
function getAllRoomRecords(date = DEFAULT_DATE) {
  const records = [];
  getBuildings().forEach((buildingName) => {
    getRoomIds(buildingName).forEach((roomId) => {
      const slots = getSlots(buildingName, roomId, date);
      records.push({
        building: buildingName,
        roomId,
        capacity: getCapacity(buildingName, roomId),
        slots,
        open: countAvailable(slots),
      });
    });
  });
  return records;
}

const BUILDINGS = getBuildings();
const ALL_ROOM_RECORDS = getAllRoomRecords();

const TOP_5 = [...ALL_ROOM_RECORDS].sort((a, b) => b.open - a.open).slice(0, 5);

const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Recommended picks are surfaced from real rooms in GRID_DATA (most
// open slots first) instead of hardcoded room ids, so this section
// stays valid no matter which buildings/rooms the live data contains.
const RECOMMENDED = [...ALL_ROOM_RECORDS]
  .sort((a, b) => b.open - a.open)
  .slice(0, 3)
  .map((r, i) => ({
    building: r.building,
    roomId: r.roomId,
    capacity: r.capacity,
    openSlots: r.open,
    match: 94 - i * 6,
    reason:
      i === 0
        ? "Most open slots today"
        : i === 1
        ? `Capacity ${r.capacity} — good for small groups`
        : `In ${r.building}, several open slots left`,
  }));

// Illustrative campus map only — coordinates/labels here are decorative
// and not derived from GRID_DATA, since the live data has no geographic
// layout information for buildings.
const CAMPUS_BUILDINGS = [
  { id: "tfdl", label: "TFDL", x: 52, y: 38, available: 7, total: 9 },
  { id: "machall", label: "MacHall", x: 28, y: 55, available: 2, total: 4 },
  { id: "ict", label: "ICT", x: 68, y: 62, available: 3, total: 5 },
  { id: "st", label: "Sci. Theatres", x: 42, y: 72, available: 1, total: 3 },
  { id: "eeel", label: "EEEL", x: 78, y: 28, available: 4, total: 6 },
  { id: "msc", label: "MSC", x: 18, y: 35, available: 5, total: 8 },
];

/* ── Brand helpers ──────────────────────────────────────────────────── */

function BrandLabel({ children, className }) {
  return <span className={cx("brand-label", className)}>{children}</span>;
}

function SubBrandLabel({ children }) {
  return <span className="sub-brand-label">{children}</span>;
}

/* ── Availability block (striped, like web booking grid) ─────────────── */

function AvailabilityBlock({ available, width = 28, height = 22 }) {
  const pid = `stripe-${available ? "g" : "r"}-${width}-${height}`;
  return (
    <svg
      width={width}
      height={height}
      className={cx("avail-block", available ? "avail-block--open" : "avail-block--booked")}
    >
      <defs>
        <pattern id={pid} patternUnits="userSpaceOnUse" width={6} height={6} patternTransform="rotate(45)">
          <rect width={6} height={6} className="avail-block-fill" />
          <line x1={0} y1={0} x2={0} y2={6} className="avail-block-stripe" strokeWidth={1.5} opacity={0.35} />
        </pattern>
      </defs>
      <rect width={width} height={height} fill={`url(#${pid})`} rx={2} />
    </svg>
  );
}

function RoomIconRow({ building }) {
  return (
    <Row gap={6} align="center">
      <svg width={12} height={12} viewBox="0 0 12 12" aria-label="Room info" className="room-icon">
        <rect x={1} y={1} width={10} height={10} rx={1} fill="none" strokeWidth={1} />
        <text x={6} y={8.5} textAnchor="middle" fontSize={7} fontWeight={700}>
          i
        </text>
      </svg>
      {building && (
        <Text size="small" tone="tertiary" className="caption">
          {building}
        </Text>
      )}
    </Row>
  );
}

/* ── Mobile phone frame ─────────────────────────────────────────────── */

function PhoneFrame({ children }) {
  return (
    <div className="phone-frame">
      <Row justify="space-between" align="center" className="phone-status-bar">
        <span>10:46</span>
        <span>LTE ▮▮▮</span>
      </Row>
      {children}
    </div>
  );
}

/* ── App header (matches UCal web chrome) ───────────────────────────── */

function AppHeader() {
  return (
    <Stack gap={0}>
      <Row align="center" gap={10} className="app-header-bar">
        <svg width={32} height={32} viewBox="0 0 32 32" aria-hidden="true">
          <rect x={2} y={4} width={28} height={24} rx={2} className="app-logo-base" />
          <rect x={6} y={8} width={20} height={8} className="app-logo-top" opacity={0.9} />
          <rect x={10} y={18} width={12} height={6} className="app-logo-bottom" opacity={0.85} />
        </svg>
        <Stack gap={0}>
          <Text size="small" tone="secondary" className="app-header-university">
            University of Calgary
          </Text>
          <BrandLabel className="app-header-brand">Workrooms</BrandLabel>
        </Stack>
      </Row>
      <Text size="small" className="app-breadcrumb">
        Libraries Booking System / Space Availability
      </Text>
    </Stack>
  );
}

/* ── Search & filter bar ────────────────────────────────────────────── */

function SearchFilters({ query, setQuery, capacity, setCapacity, building, setBuilding }) {
  return (
    <Stack gap={10} className="search-filters">
      <Callout tone="info" title="Student Workrooms">
        These rooms are for UCalgary students. Book up to 2 hours per day.
      </Callout>
      <TextInput
        type="search"
        value={query}
        onChange={setQuery}
        placeholder="Search rooms by name or building…"
        className="search-input"
      />
      <Row gap={8} wrap>
        <Select
          value={capacity}
          onChange={setCapacity}
          options={[
            { value: "any", label: "Any capacity" },
            { value: "4", label: "Capacity 4" },
            { value: "6", label: "Capacity 6" },
            { value: "8", label: "Capacity 8+" },
          ]}
          className="filter-select"
        />
        <Select
          value={building}
          onChange={setBuilding}
          options={[
            { value: "all", label: "All buildings" },
            ...BUILDINGS.map((b) => ({ value: b, label: b })),
          ]}
          className="filter-select"
        />
      </Row>
      <Row gap={6} wrap>
        <Pill active size="sm">
          Accessible
        </Pill>
        <Pill size="sm">Outlets</Pill>
        <Pill size="sm">Available now</Pill>
      </Row>
      <Text size="small" tone="tertiary" className="caption">
        {formatDateLabel(DEFAULT_DATE)} · Filtered by search &amp; capacity
      </Text>
    </Stack>
  );
}

/* ── Top 5 section ──────────────────────────────────────────────────── */

function TopFiveSection() {
  return (
    <Stack gap={8} className="section">
      <Row align="center" justify="space-between">
        <Stack gap={2}>
          <BrandLabel>Top 5 Available</BrandLabel>
          <SubBrandLabel>Most open slots today</SubBrandLabel>
        </Stack>
        <Text size="small" tone="tertiary">
          Now
        </Text>
      </Row>
      <Stack gap={6}>
        {TOP_5.map((room, idx) => (
          <Row key={`${room.building}-${room.roomId}`} align="center" gap={10} className="top5-item">
            <Text weight="bold" className="top5-rank">
              {idx + 1}
            </Text>
            <Stack gap={2} className="top5-info">
              <Row align="center" gap={6}>
                <Text weight="semibold" size="small">
                  {room.roomId}
                </Text>
                <Text size="small" tone="tertiary">
                  {room.building} · Cap. {room.capacity}
                </Text>
              </Row>
              <Row gap={3}>
                {room.slots.slice(0, 8).map((avail, i) => (
                  <AvailabilityBlock key={i} available={avail} width={22} height={16} />
                ))}
              </Row>
            </Stack>
            <Stat value={room.open} label="open" tone="success" className="top5-stat" />
          </Row>
        ))}
      </Stack>
    </Stack>
  );
}

/* ── Weekly prediction ──────────────────────────────────────────────── */

function WeeklyPredictionSection() {
  const predicted = [62, 58, 71, 65, 48, 82, 76];
  const historical = [55, 52, 68, 60, 44, 78, 70];
  return (
    <Stack gap={8} className="section">
      <Stack gap={2}>
        <BrandLabel>Predicted Availability</BrandLabel>
        <SubBrandLabel>This week · TFDL workrooms</SubBrandLabel>
      </Stack>
      <LineChart
        categories={WEEK_DAYS}
        series={[
          { name: "Predicted", data: predicted, tone: "info" },
          { name: "Last week", data: historical, tone: "neutral" },
        ]}
        height={160}
      />
      <Text size="small" tone="tertiary" className="caption">
        Source: booking history model · Aug 4–10, 2026 · Percent of slots open 9 am–7 pm
      </Text>
    </Stack>
  );
}

/* ── Recommended for you ────────────────────────────────────────────── */

function RecommendedSection() {
  return (
    <Stack gap={8} className="section">
      <Stack gap={2}>
        <BrandLabel>Recommended For You</BrandLabel>
        <SubBrandLabel>Based on your booking history</SubBrandLabel>
      </Stack>
      {RECOMMENDED.map((rec) => (
        <Card key={`${rec.building}-${rec.roomId}`}>
          <CardHeader trailing={<Pill active size="sm">{`${rec.match}% match`}</Pill>}>
            {rec.building} · Room {rec.roomId}
          </CardHeader>
          <CardBody className="rec-card-body">
            <Text size="small" tone="secondary">
              {rec.reason}
            </Text>
            <Row gap={8} align="center" className="rec-actions">
              <Row gap={3}>
                {getSlots(rec.building, rec.roomId)
                  .slice(2, 9)
                  .map((avail, i) => (
                    <AvailabilityBlock key={i} available={avail} width={24} height={16} />
                  ))}
              </Row>
              <Spacer />
              <Button variant="primary">Book</Button>
            </Row>
          </CardBody>
        </Card>
      ))}
    </Stack>
  );
}

/* ── Campus map (satellite-style SVG) ───────────────────────────────── */

function availabilityLevel(ratio) {
  return ratio >= 0.6 ? "high" : ratio >= 0.3 ? "med" : "low";
}

function CampusMapSection() {
  return (
    <Stack gap={8} className="section">
      <Stack gap={2}>
        <BrandLabel>Campus Availability Map</BrandLabel>
        <SubBrandLabel>Satellite view · live room status</SubBrandLabel>
      </Stack>
      <div className="campus-map">
        <svg viewBox="0 0 100 80" width="100%" className="campus-map-svg">
          <rect width={100} height={80} className="map-bg" />
          <path
            d="M0 40 H100 M50 0 V80 M15 60 Q40 45 70 55"
            className="map-roads"
            strokeWidth={0.6}
            fill="none"
            opacity={0.5}
          />
          <ellipse cx={22} cy={48} rx={10} ry={7} className="map-park" opacity={0.15} />
          <ellipse cx={75} cy={42} rx={8} ry={6} className="map-park" opacity={0.12} />
          {CAMPUS_BUILDINGS.map((b) => (
            <g key={b.id}>
              <rect
                x={b.x - 5}
                y={b.y - 3}
                width={10}
                height={6}
                className="map-building"
                strokeWidth={0.3}
                rx={0.5}
              />
              <circle
                cx={b.x}
                cy={b.y}
                r={2.8}
                className={cx("map-pin", `map-dot--${availabilityLevel(b.available / b.total)}`)}
                strokeWidth={0.4}
              />
              <text x={b.x} y={b.y + 8} textAnchor="middle" fontSize={3.2} className="map-label">
                {b.label}
              </text>
            </g>
          ))}
          <rect x={2} y={2} width={28} height={14} className="map-legend-bg" opacity={0.88} rx={1} />
          <circle cx={6} cy={6} r={1.5} className="map-dot--high" />
          <text x={9} y={7.2} fontSize={2.8} className="map-label">
            High
          </text>
          <circle cx={6} cy={11} r={1.5} className="map-dot--med" />
          <text x={9} y={12.2} fontSize={2.8} className="map-label">
            Med
          </text>
          <circle cx={17} cy={6} r={1.5} className="map-dot--low" />
          <text x={20} y={7.2} fontSize={2.8} className="map-label">
            Low
          </text>
        </svg>
      </div>
      <Grid columns={3} gap={8}>
        {CAMPUS_BUILDINGS.slice(0, 3).map((b) => (
          <Stat
            key={b.id}
            value={`${b.available}/${b.total}`}
            label={b.label}
            tone={b.available / b.total >= 0.5 ? "success" : "warning"}
          />
        ))}
      </Grid>
      <Text size="small" tone="tertiary" className="caption">
        Tap a building pin to filter rooms below · Source: live booking feed
      </Text>
    </Stack>
  );
}

/* ── All rooms availability grid ──────────────────────────────────────── */

function AllRoomsSection({ query, capacity, building }) {
  const filtered = ALL_ROOM_RECORDS.filter((r) => {
    const q = query.toLowerCase();
    const matchQuery = !q || r.roomId.toLowerCase().includes(q) || r.building.toLowerCase().includes(q);
    const matchCap = capacity === "any" || r.capacity >= Number(capacity);
    const matchBldg = building === "all" || r.building === building;
    return matchQuery && matchCap && matchBldg;
  });

  return (
    <Stack gap={8} className="section section--last">
      <Row align="center" justify="space-between">
        <Stack gap={2}>
          <BrandLabel>All Room Availability</BrandLabel>
          <SubBrandLabel>{`${filtered.length} rooms · ${TIME_RANGE_LABEL}`}</SubBrandLabel>
        </Stack>
        <Button variant="secondary">Go To Date</Button>
      </Row>

      <Row gap={0} className="time-header">
        {TIME_SLOTS.map((t) => (
          <Text key={t} size="small" tone="tertiary" className="time-header-label">
            {t}
          </Text>
        ))}
      </Row>

      <Stack gap={4}>
        {filtered.map((room) => (
          <Row key={`${room.building}-${room.roomId}`} align="center" gap={6} className="room-row">
            <Stack gap={2} className="room-row-info">
              <Text weight="semibold" size="small">
                {room.roomId}
              </Text>
              <Text size="small" tone="tertiary" className="caption">
                Cap. {room.capacity}
              </Text>
              <RoomIconRow building={room.building} />
            </Stack>
            <Row gap={3} className="room-row-slots">
              {room.slots.map((avail, i) => (
                <AvailabilityBlock key={i} available={avail} />
              ))}
            </Row>
          </Row>
        ))}
      </Stack>

      <Row gap={16} align="center" className="avail-legend">
        <Row gap={6} align="center">
          <AvailabilityBlock available width={20} height={14} />
          <Text size="small" tone="secondary">
            Available
          </Text>
        </Row>
        <Row gap={6} align="center">
          <AvailabilityBlock available={false} width={20} height={14} />
          <Text size="small" tone="secondary">
            Booked
          </Text>
        </Row>
        <div className="now-marker" title="Current time" />
        <Text size="small" tone="tertiary">
          Now
        </Text>
      </Row>
    </Stack>
  );
}

/* ── Bottom tab bar ─────────────────────────────────────────────────── */

function TabBar({ active }) {
  const tabs = ["Home", "Book", "Map", "Account"];
  return (
    <Grid columns={4} gap={0} className="tab-bar">
      {tabs.map((tab) => (
        <Stack key={tab} gap={2} className="tab">
          <div className={cx("tab-dot", tab === active && "tab-dot--active")} />
          <Text
            size="small"
            weight={tab === active ? "semibold" : "normal"}
            className={cx("tab-label", tab === active && "tab-label--active")}
          >
            {tab}
          </Text>
        </Stack>
      ))}
    </Grid>
  );
}

/* ── Main component ─────────────────────────────────────────────────── */

export default function UCalgaryRoomBookingMobile() {
  const [query, setQuery] = useState("");
  const [capacity, setCapacity] = useState("any");
  const [building, setBuilding] = useState("all");
  const [activeTab] = useState("Home");

  return (
    <div className="app-shell">
      <Stack gap={12} className="app-content">
        <H2 className="page-title">Mobile App UI — UCalgary Room Booking</H2>
        <Text tone="tertiary" size="small" className="page-subtitle">
          Design mockup matching Libraries &amp; Cultural Resources booking system
        </Text>

        <PhoneFrame>
          <AppHeader />
          <div className="phone-scroll">
            <SearchFilters
              query={query}
              setQuery={setQuery}
              capacity={capacity}
              setCapacity={setCapacity}
              building={building}
              setBuilding={setBuilding}
            />
            <Divider />
            <TopFiveSection />
            <Divider />
            <WeeklyPredictionSection />
            <Divider />
            <RecommendedSection />
            <Divider />
            <CampusMapSection />
            <Divider />
            <AllRoomsSection query={query} capacity={capacity} building={building} />
          </div>
          <TabBar active={activeTab} />
        </PhoneFrame>
      </Stack>
    </div>
  );
}
