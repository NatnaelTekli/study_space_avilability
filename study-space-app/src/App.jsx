import React, { useState, useEffect } from 'react';
import getAllGridData from '../../static/DataRetrieval';

/* ── UCalgary theme (light mode, matches Libraries booking system) ─── */

const theme = {
  bg: { editor: "#FCFCFC", chrome: "#F8F8F8", elevated: "#FCFCFC" },
  text: {
    primary: "#141414F0",
    secondary: "#141414BD",
    tertiary: "#1414148A",
    quaternary: "#1414145C",
    link: "#3685BF",
    onAccent: "#FCFCFC",
  },
  stroke: { primary: "#14141433", secondary: "#1414141F", tertiary: "#14141414" },
  fill: { primary: "#14141433", secondary: "#14141424", tertiary: "#14141414", quaternary: "#1414140F" },
  accent: { primary: "#3685BF", control: "#3685BF", controlHover: "#2E76AB" },
  category: {
    red: "#CF2D56",
    green: "#1F8A65",
    yellow: "#C08532",
    blue: "#3685BF",
    gray: "#1414148A",
  },
};

function mergeStyle(base, override) {
  return override ? { ...base, ...override } : base;
}

/* ── UI primitives ─────────────────────────────────────────────────── */

function Stack({ children, gap = 0, style }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap, ...style }}>
      {children}
    </div>
  );
}

function Row({ children, gap = 0, align = "stretch", justify = "start", wrap, style }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        gap,
        alignItems: align,
        justifyContent: justify,
        flexWrap: wrap ? "wrap" : "nowrap",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Grid({ children, columns, gap = 0, style }) {
  const cols = typeof columns === "number" ? `repeat(${columns}, minmax(0, 1fr))` : columns;
  return (
    <div style={{ display: "grid", gridTemplateColumns: cols, gap, ...style }}>
      {children}
    </div>
  );
}

function Spacer() {
  return <div style={{ flex: 1 }} />;
}

function Divider() {
  return <hr style={{ border: "none", borderTop: `1px solid ${theme.stroke.tertiary}`, margin: 0 }} />;
}

function Text({ children, tone = "primary", size = "body", weight = "normal", style }) {
  const fontSize = size === "small" ? 12 : 14;
  const fontWeight = { normal: 400, medium: 500, semibold: 600, bold: 700 }[weight] ?? 400;
  return (
    <p
      style={{
        margin: 0,
        fontSize,
        lineHeight: size === "small" ? "16px" : "20px",
        fontWeight,
        color: theme.text[tone] ?? theme.text.primary,
        ...style,
      }}
    >
      {children}
    </p>
  );
}

function H2({ children, style }) {
  return (
    <h2
      style={{
        margin: 0,
        fontSize: 18,
        lineHeight: "24px",
        fontWeight: 590,
        color: theme.text.primary,
        ...style,
      }}
    >
      {children}
    </h2>
  );
}

function Button({ children, variant = "primary", onClick, style }) {
  const styles = {
    primary: { background: theme.accent.control, color: theme.text.onAccent, border: "none" },
    secondary: { background: theme.fill.secondary, color: theme.text.primary, border: `1px solid ${theme.stroke.secondary}` },
    ghost: { background: "transparent", color: theme.text.secondary, border: "none" },
  };
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        height: 24,
        padding: "0 10px",
        borderRadius: 4,
        fontSize: 12,
        fontWeight: 500,
        cursor: "pointer",
        whiteSpace: "nowrap",
        ...styles[variant],
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function Pill({ children, active, size = "md", onClick }) {
  const isSm = size === "sm";
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        fontSize: isSm ? 11 : 12,
        padding: isSm ? "2px 8px" : "4px 10px",
        borderRadius: 9999,
        border: isSm ? "none" : `1px solid ${theme.stroke.secondary}`,
        background: active ? theme.fill.primary : "transparent",
        color: theme.text.primary,
        cursor: onClick ? "pointer" : "default",
        fontWeight: active ? 600 : 400,
      }}
    >
      {children}
    </button>
  );
}

function TextInput({ value, onChange, placeholder, type = "text", style }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      style={{
        height: 28,
        padding: "0 8px",
        borderRadius: 4,
        border: `1px solid ${theme.stroke.secondary}`,
        background: theme.bg.editor,
        color: theme.text.primary,
        fontSize: 13,
        boxSizing: "border-box",
        ...style,
      }}
    />
  );
}

function Select({ value, onChange, options, style }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      style={{
        height: 28,
        padding: "0 8px",
        borderRadius: 4,
        border: `1px solid ${theme.stroke.secondary}`,
        background: theme.bg.editor,
        color: theme.text.primary,
        fontSize: 13,
        ...style,
      }}
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
  const tones = {
    info: { bg: "#E8F2FA", border: "#3685BF33", color: theme.text.primary },
    success: { bg: "#E6F4EE", border: "#1F8A6533", color: theme.text.primary },
    warning: { bg: "#FDF4E6", border: "#C0853233", color: theme.text.primary },
  };
  const t = tones[tone] ?? tones.info;
  return (
    <div
      style={{
        padding: "8px 10px",
        borderRadius: 4,
        background: t.bg,
        border: `1px solid ${t.border}`,
        color: t.color,
        fontSize: 13,
        lineHeight: "18px",
      }}
    >
      {title && <div style={{ fontWeight: 600, marginBottom: 4 }}>{title}</div>}
      {children}
    </div>
  );
}

function Card({ children }) {
  return (
    <div
      style={{
        border: `1px solid ${theme.stroke.secondary}`,
        borderRadius: 6,
        background: theme.bg.editor,
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  );
}

function CardHeader({ children, trailing }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "8px 12px",
        fontSize: 12,
        fontWeight: 600,
        borderBottom: `1px solid ${theme.stroke.tertiary}`,
      }}
    >
      <span>{children}</span>
      {trailing}
    </div>
  );
}

function CardBody({ children, style }) {
  return <div style={{ padding: 12, ...style }}>{children}</div>;
}

function Stat({ value, label, tone, style }) {
  const toneColors = {
    success: theme.category.green,
    danger: theme.category.red,
    warning: theme.category.yellow,
    info: theme.accent.primary,
  };
  return (
    <div style={{ textAlign: "center", ...style }}>
      <div
        style={{
          fontSize: 20,
          fontWeight: 600,
          color: tone ? toneColors[tone] : theme.text.primary,
          lineHeight: 1.2,
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 11, color: theme.text.tertiary, marginTop: 2 }}>{label}</div>
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

  const seriesColors = {
    info: theme.accent.primary,
    neutral: theme.category.gray,
    success: theme.category.green,
    danger: theme.category.red,
  };

  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: "block" }}>
        {[30, 50, 70, 90].map((v) => (
          <g key={v}>
            <line
              x1={pad.left}
              y1={yScale(v)}
              x2={width - pad.right}
              y2={yScale(v)}
              stroke={theme.stroke.tertiary}
              strokeWidth={1}
            />
            <text x={pad.left - 6} y={yScale(v) + 3} textAnchor="end" fontSize={9} fill={theme.text.tertiary}>
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
            fill={theme.text.tertiary}
          >
            {cat}
          </text>
        ))}
        {series.map((s) => {
          const color = seriesColors[s.tone] ?? theme.accent.primary;
          const points = s.data.map((v, i) => `${xScale(i)},${yScale(v)}`).join(" ");
          const areaPoints = `${xScale(0)},${yScale(yMin)} ${points} ${xScale(s.data.length - 1)},${yScale(yMin)}`;
          return (
            <g key={s.name}>
              <polygon points={areaPoints} fill={color} opacity={0.12} />
              <polyline points={points} fill="none" stroke={color} strokeWidth={2} />
              {s.data.map((v, i) => (
                <circle key={i} cx={xScale(i)} cy={yScale(v)} r={3} fill={color} />
              ))}
            </g>
          );
        })}
      </svg>
      <Row gap={12} style={{ marginTop: 4, paddingLeft: 4 }}>
        {series.map((s) => (
          <Row key={s.name} gap={4} align="center">
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                background: seriesColors[s.tone] ?? theme.accent.primary,
              }}
            />
            <span style={{ fontSize: 10, color: theme.text.secondary }}>{s.name}</span>
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

const TIME_SLOTS = ["9a", "10a", "11a", "12p", "1p", "2p", "3p", "4p", "5p", "6p", "7p"];

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

function BrandLabel({ children, style }) {
  return (
    <span
      style={mergeStyle(
        {
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: theme.category.red,
        },
        style,
      )}
    >
      {children}
    </span>
  );
}

function SubBrandLabel({ children }) {
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: theme.text.tertiary,
      }}
    >
      {children}
    </span>
  );
}

/* ── Availability block (striped, like web booking grid) ─────────────── */

function AvailabilityBlock({ available, width = 28, height = 22 }) {
  const fill = available ? theme.category.green : theme.category.red;
  const stripe = theme.text.onAccent;
  const pid = `stripe-${available ? "g" : "r"}-${width}-${height}`;
  return (
    <svg width={width} height={height} style={{ flexShrink: 0, borderRadius: 2 }}>
      <defs>
        <pattern id={pid} patternUnits="userSpaceOnUse" width={6} height={6} patternTransform="rotate(45)">
          <rect width={6} height={6} fill={fill} />
          <line x1={0} y1={0} x2={0} y2={6} stroke={stripe} strokeWidth={1.5} opacity={0.35} />
        </pattern>
      </defs>
      <rect width={width} height={height} fill={`url(#${pid})`} rx={2} />
    </svg>
  );
}

function RoomIconRow({ building }) {
  const stroke = theme.accent.primary;
  return (
    <Row gap={6} align="center">
      <svg width={12} height={12} viewBox="0 0 12 12" aria-label="Room info">
        <rect x={1} y={1} width={10} height={10} rx={1} fill="none" stroke={stroke} strokeWidth={1} />
        <text x={6} y={8.5} textAnchor="middle" fontSize={7} fill={stroke} fontWeight={700}>
          i
        </text>
      </svg>
      {building && (
        <Text size="small" tone="tertiary" style={{ fontSize: 10 }}>
          {building}
        </Text>
      )}
    </Row>
  );
}

/* ── Mobile phone frame ─────────────────────────────────────────────── */

function PhoneFrame({ children }) {
  return (
    <div
      style={{
        maxWidth: 390,
        margin: "0 auto",
        border: `2px solid ${theme.stroke.primary}`,
        borderRadius: 28,
        overflow: "hidden",
        background: theme.bg.editor,
      }}
    >
      <Row
        justify="space-between"
        align="center"
        style={{
          padding: "8px 20px 4px",
          background: theme.bg.chrome,
          fontSize: 11,
          color: theme.text.secondary,
        }}
      >
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
      <Row
        align="center"
        gap={10}
        style={{
          padding: "10px 16px",
          background: theme.bg.editor,
          borderBottom: `1px solid ${theme.stroke.tertiary}`,
        }}
      >
        <svg width={32} height={32} viewBox="0 0 32 32" aria-hidden="true">
          <rect x={2} y={4} width={28} height={24} rx={2} fill={theme.category.red} />
          <rect x={6} y={8} width={20} height={8} fill={theme.category.yellow} opacity={0.9} />
          <rect x={10} y={18} width={12} height={6} fill={theme.bg.editor} opacity={0.85} />
        </svg>
        <Stack gap={0}>
          <Text size="small" tone="secondary" style={{ fontSize: 10, lineHeight: "14px" }}>
            University of Calgary
          </Text>
          <BrandLabel style={{ fontSize: 13 }}>Workrooms</BrandLabel>
        </Stack>
      </Row>
      <Text
        size="small"
        style={{
          padding: "6px 16px 8px",
          color: theme.text.link,
          fontSize: 11,
        }}
      >
        Libraries Booking System / Space Availability
      </Text>
    </Stack>
  );
}

/* ── Search & filter bar ────────────────────────────────────────────── */

function SearchFilters({ query, setQuery, capacity, setCapacity, building, setBuilding }) {
  return (
    <Stack gap={10} style={{ padding: "0 16px 12px" }}>
      <Callout tone="info" title="Student Workrooms">
        These rooms are for UCalgary students. Book up to 2 hours per day.
      </Callout>
      <TextInput
        type="search"
        value={query}
        onChange={setQuery}
        placeholder="Search rooms by name or building…"
        style={{ width: "100%" }}
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
          style={{ flex: 1, minWidth: 120 }}
        />
        <Select
          value={building}
          onChange={setBuilding}
          options={[
            { value: "all", label: "All buildings" },
            ...BUILDINGS.map((b) => ({ value: b, label: b })),
          ]}
          style={{ flex: 1, minWidth: 120 }}
        />
      </Row>
      <Row gap={6} wrap>
        <Pill active size="sm">
          Accessible
        </Pill>
        <Pill size="sm">Outlets</Pill>
        <Pill size="sm">Available now</Pill>
      </Row>
      <Text size="small" tone="tertiary" style={{ fontSize: 10 }}>
        {formatDateLabel(DEFAULT_DATE)} · Filtered by search &amp; capacity
      </Text>
    </Stack>
  );
}

/* ── Top 5 section ──────────────────────────────────────────────────── */

function TopFiveSection() {
  return (
    <Stack gap={8} style={{ padding: "12px 16px" }}>
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
          <Row
            key={`${room.building}-${room.roomId}`}
            align="center"
            gap={10}
            style={{
              padding: "8px 10px",
              background: theme.fill.tertiary,
              borderRadius: 6,
              border: `1px solid ${theme.stroke.tertiary}`,
            }}
          >
            <Text weight="bold" style={{ width: 18, color: theme.category.red, fontSize: 14 }}>
              {idx + 1}
            </Text>
            <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
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
            <Stat value={room.open} label="open" tone="success" style={{ minWidth: 44 }} />
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
    <Stack gap={8} style={{ padding: "12px 16px" }}>
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
      <Text size="small" tone="tertiary" style={{ fontSize: 10 }}>
        Source: booking history model · Aug 4–10, 2026 · Percent of slots open 9 am–7 pm
      </Text>
    </Stack>
  );
}

/* ── Recommended for you ────────────────────────────────────────────── */

function RecommendedSection() {
  return (
    <Stack gap={8} style={{ padding: "12px 16px" }}>
      <Stack gap={2}>
        <BrandLabel>Recommended For You</BrandLabel>
        <SubBrandLabel>Based on your booking history</SubBrandLabel>
      </Stack>
      {RECOMMENDED.map((rec) => (
        <Card key={`${rec.building}-${rec.roomId}`}>
          <CardHeader trailing={<Pill active size="sm">{`${rec.match}% match`}</Pill>}>
            {rec.building} · Room {rec.roomId}
          </CardHeader>
          <CardBody style={{ paddingTop: 0 }}>
            <Text size="small" tone="secondary">
              {rec.reason}
            </Text>
            <Row gap={8} align="center" style={{ marginTop: 8 }}>
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

function CampusMapSection() {
  return (
    <Stack gap={8} style={{ padding: "12px 16px" }}>
      <Stack gap={2}>
        <BrandLabel>Campus Availability Map</BrandLabel>
        <SubBrandLabel>Satellite view · live room status</SubBrandLabel>
      </Stack>
      <div
        style={{
          position: "relative",
          borderRadius: 8,
          overflow: "hidden",
          border: `1px solid ${theme.stroke.secondary}`,
        }}
      >
        <svg viewBox="0 0 100 80" width="100%" style={{ display: "block" }}>
          <rect width={100} height={80} fill={theme.fill.secondary} />
          <path
            d="M0 40 H100 M50 0 V80 M15 60 Q40 45 70 55"
            stroke={theme.stroke.primary}
            strokeWidth={0.6}
            fill="none"
            opacity={0.5}
          />
          <ellipse cx={22} cy={48} rx={10} ry={7} fill={theme.category.green} opacity={0.15} />
          <ellipse cx={75} cy={42} rx={8} ry={6} fill={theme.category.green} opacity={0.12} />
          {CAMPUS_BUILDINGS.map((b) => {
            const ratio = b.available / b.total;
            const tone =
              ratio >= 0.6 ? theme.category.green : ratio >= 0.3 ? theme.category.yellow : theme.category.red;
            return (
              <g key={b.id}>
                <rect
                  x={b.x - 5}
                  y={b.y - 3}
                  width={10}
                  height={6}
                  fill={theme.fill.primary}
                  stroke={theme.stroke.secondary}
                  strokeWidth={0.3}
                  rx={0.5}
                />
                <circle cx={b.x} cy={b.y} r={2.8} fill={tone} stroke={theme.bg.editor} strokeWidth={0.4} />
                <text x={b.x} y={b.y + 8} textAnchor="middle" fontSize={3.2} fill={theme.text.secondary}>
                  {b.label}
                </text>
              </g>
            );
          })}
          <rect x={2} y={2} width={28} height={14} fill={theme.bg.editor} opacity={0.88} rx={1} />
          <circle cx={6} cy={6} r={1.5} fill={theme.category.green} />
          <text x={9} y={7.2} fontSize={2.8} fill={theme.text.secondary}>
            High
          </text>
          <circle cx={6} cy={11} r={1.5} fill={theme.category.yellow} />
          <text x={9} y={12.2} fontSize={2.8} fill={theme.text.secondary}>
            Med
          </text>
          <circle cx={17} cy={6} r={1.5} fill={theme.category.red} />
          <text x={20} y={7.2} fontSize={2.8} fill={theme.text.secondary}>
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
      <Text size="small" tone="tertiary" style={{ fontSize: 10 }}>
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
    <Stack gap={8} style={{ padding: "12px 16px 24px" }}>
      <Row align="center" justify="space-between">
        <Stack gap={2}>
          <BrandLabel>All Room Availability</BrandLabel>
          <SubBrandLabel>{`${filtered.length} rooms · 9 am – 7 pm`}</SubBrandLabel>
        </Stack>
        <Button variant="secondary">Go To Date</Button>
      </Row>

      <Row gap={0} style={{ paddingLeft: 100, overflowX: "auto" }}>
        {TIME_SLOTS.map((t) => (
          <Text
            key={t}
            size="small"
            tone="tertiary"
            style={{ width: 28, flexShrink: 0, fontSize: 9, textAlign: "center" }}
          >
            {t}
          </Text>
        ))}
      </Row>

      <Stack gap={4}>
        {filtered.map((room) => (
          <Row
            key={`${room.building}-${room.roomId}`}
            align="center"
            gap={6}
            style={{
              padding: "6px 0",
              borderBottom: `1px solid ${theme.stroke.tertiary}`,
            }}
          >
            <Stack gap={2} style={{ width: 94, flexShrink: 0 }}>
              <Text weight="semibold" size="small">
                {room.roomId}
              </Text>
              <Text size="small" tone="tertiary" style={{ fontSize: 10 }}>
                Cap. {room.capacity}
              </Text>
              <RoomIconRow building={room.building} />
            </Stack>
            <Row gap={3} style={{ overflowX: "auto", flex: 1 }}>
              {room.slots.map((avail, i) => (
                <AvailabilityBlock key={i} available={avail} />
              ))}
            </Row>
          </Row>
        ))}
      </Stack>

      <Row gap={16} align="center" style={{ marginTop: 8 }}>
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
        <div
          style={{
            width: 2,
            height: 18,
            background: theme.category.red,
            marginLeft: 4,
          }}
          title="Current time"
        />
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
    <Grid
      columns={4}
      gap={0}
      style={{
        padding: "10px 0 14px",
        borderTop: `1px solid ${theme.stroke.tertiary}`,
        background: theme.bg.chrome,
      }}
    >
      {tabs.map((tab) => (
        <Stack key={tab} gap={2} style={{ alignItems: "center" }}>
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              background: tab === active ? theme.category.red : "transparent",
            }}
          />
          <Text
            size="small"
            weight={tab === active ? "semibold" : "normal"}
            style={{
              fontSize: 10,
              color: tab === active ? theme.category.red : theme.text.tertiary,
            }}
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
    <div
      style={{
        background: theme.bg.chrome,
        minHeight: "100vh",
        padding: "16px 12px 24px",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <Stack gap={12} style={{ maxWidth: 420, margin: "0 auto" }}>
        <H2 style={{ textAlign: "center", color: theme.text.secondary, fontSize: 14, fontWeight: 500 }}>
          Mobile App UI — UCalgary Room Booking
        </H2>
        <Text tone="tertiary" size="small" style={{ textAlign: "center", fontSize: 11 }}>
          Design mockup matching Libraries &amp; Cultural Resources booking system
        </Text>

        <PhoneFrame>
          <AppHeader />
          <div style={{ maxHeight: 680, overflowY: "auto" }}>
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