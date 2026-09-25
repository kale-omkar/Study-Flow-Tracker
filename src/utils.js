import { STORAGE_KEY } from "./constants";

// ── Date helpers ───────────────────────────────────
const pad = (v) => String(v).padStart(2, "0");

export const toDateInput = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const getTodayString = () => toDateInput(new Date());

export const parseDate = (s) => new Date(`${s}T00:00:00`);

export const addDays = (s, n) => {
  const d = parseDate(s);
  d.setDate(d.getDate() + n);
  return toDateInput(d);
};

export const formatDate = (s) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(
    parseDate(s)
  );

export const diffInDays = (from, to) =>
  Math.round((parseDate(to) - parseDate(from)) / 86400000);

export const getRelativeLabel = (days) => {
  if (days === 0)  return "Today";
  if (days === 1)  return "Tomorrow";
  if (days === -1) return "Yesterday";
  if (days > 1)   return `In ${days}d`;
  return `${Math.abs(days)}d overdue`;
};

// ── ID generation ──────────────────────────────────
export const createId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

// ── Local storage ──────────────────────────────────
export const loadData = () => {
  if (typeof window === "undefined") return { topics: [], problems: [] };
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return { topics: [], problems: [] };
  try {
    const parsed = JSON.parse(raw);
    return { topics: parsed.topics || [], problems: parsed.problems || [] };
  } catch {
    return { topics: [], problems: [] };
  }
};
