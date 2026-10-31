// Study data that lives next to (not inside) the main topics/problems data:
// notes per problem, an activity log, review schedules for imported problems,
// and the practice timer. It has its own storage key so it can never interfere
// with, or be wiped by, the existing saved data.
import { useCallback, useEffect, useState } from "react";
import { createId, getTodayString, addDays, diffInDays } from "../utils";
import { REVIEW_PHASES } from "../constants";

const KEY = "study-flow-study-v1";
const MAX_LOG = 4000;

// Typical interview pacing, used as the timer's target.
export const TARGET_MINUTES = { Easy: 20, Medium: 30, Hard: 45 };

export const PATTERNS = [
  "Arrays & Hashing", "Two Pointers", "Sliding Window", "Stack", "Monotonic Stack",
  "Binary Search", "Linked List", "Fast & Slow Pointers", "Trees", "Binary Search Tree",
  "Heap / Priority Queue", "Backtracking", "Graphs (BFS / DFS)", "Topological Sort",
  "Union Find", "Trie", "Dynamic Programming", "Greedy", "Intervals", "Prefix Sum",
  "Bit Manipulation", "Math & Geometry",
];

// Notes follow the problem, not the list it's tracked in: "Two Sum" in a topic
// and "Two Sum" in the imported list share one set of notes.
export const metaKey = (name) => String(name || "").trim().toLowerCase();

const blank = () => ({ meta: {}, activity: [], globalReviews: {}, timer: null });

function load() {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return blank();
    const p = JSON.parse(raw);
    return {
      ...blank(),
      ...p,
      meta: p.meta || {},
      activity: Array.isArray(p.activity) ? p.activity : [],
      globalReviews: p.globalReviews || {},
    };
  } catch {
    return blank();
  }
}

const noPhases = () => REVIEW_PHASES.reduce((a, p) => { a[p.key] = false; return a; }, {});

export function useStudyStore() {
  const [state, setState] = useState(load);

  useEffect(() => {
    try { window.localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage unavailable */ }
  }, [state]);

  const log = useCallback((kind, data = {}) => {
    setState((s) => ({
      ...s,
      activity: [...s.activity, { id: createId(), date: getTodayString(), ts: Date.now(), kind, ...data }].slice(-MAX_LOG),
    }));
  }, []);

  const setMeta = useCallback((name, patch) => {
    const k = metaKey(name);
    if (!k) return;
    setState((s) => ({ ...s, meta: { ...s.meta, [k]: { ...(s.meta[k] || {}), ...patch, updatedAt: Date.now() } } }));
  }, []);

  // Review schedules for problems from the imported list (topic problems already have one).
  const startGlobalReview = useCallback((problemId) => {
    setState((s) =>
      s.globalReviews[problemId]
        ? s
        : { ...s, globalReviews: { ...s.globalReviews, [problemId]: { startDate: getTodayString(), phases: noPhases() } } }
    );
  }, []);

  const stopGlobalReview = useCallback((problemId) => {
    setState((s) => {
      if (!s.globalReviews[problemId]) return s;
      const next = { ...s.globalReviews };
      delete next[problemId];
      return { ...s, globalReviews: next };
    });
  }, []);

  const toggleGlobalReview = useCallback((problemId, phaseKey) => {
    setState((s) => {
      const r = s.globalReviews[problemId];
      if (!r) return s;
      const idx = REVIEW_PHASES.findIndex((p) => p.key === phaseKey);
      if (idx > 0 && !r.phases[REVIEW_PHASES[idx - 1].key]) return s;
      const next = { ...r.phases, [phaseKey]: !r.phases[phaseKey] };
      if (r.phases[phaseKey]) REVIEW_PHASES.slice(idx + 1).forEach((p) => { next[p.key] = false; });
      return { ...s, globalReviews: { ...s.globalReviews, [problemId]: { ...r, phases: next } } };
    });
  }, []);

  // Practice timer. Based on timestamps, so it stays accurate across refreshes and tab switches.
  const startTimer = useCallback((item) => {
    setState((s) => ({
      ...s,
      timer: {
        source: item.source, topicId: item.topicId, id: item.id, name: item.name,
        link: item.link, difficulty: item.difficulty, accMs: 0, startedAt: Date.now(),
      },
    }));
  }, []);
  const pauseTimer = useCallback(() => {
    setState((s) => (!s.timer || !s.timer.startedAt ? s
      : { ...s, timer: { ...s.timer, accMs: s.timer.accMs + (Date.now() - s.timer.startedAt), startedAt: null } }));
  }, []);
  const resumeTimer = useCallback(() => {
    setState((s) => (!s.timer || s.timer.startedAt ? s : { ...s, timer: { ...s.timer, startedAt: Date.now() } }));
  }, []);
  const cancelTimer = useCallback(() => setState((s) => ({ ...s, timer: null })), []);

  return {
    state, log, setMeta,
    startGlobalReview, stopGlobalReview, toggleGlobalReview,
    startTimer, pauseTimer, resumeTimer, cancelTimer,
  };
}

// ── Pure helpers ────────────────────────────────────────────

// One flat list of everything you can practice: problems inside topics + the imported list.
export function buildPool(topics, problems) {
  const out = [];
  topics.forEach((t) =>
    (t.problems || []).forEach((p) =>
      out.push({
        key: `t:${t.id}:${p.id}`, source: "topic", topicId: t.id, id: p.id, name: p.name,
        difficulty: p.difficulty, platform: p.platform, link: p.link, status: p.status,
        solvedDate: p.solvedDate, group: t.title,
      })
    )
  );
  problems.forEach((p) =>
    out.push({
      key: `g:${p.id}`, source: "global", topicId: null, id: p.id, name: p.name,
      difficulty: p.difficulty, platform: p.platform, link: p.link, status: p.status,
      solvedDate: p.solvedDate, group: p.topic || "Uncategorized",
    })
  );
  return out;
}

export function elapsedMs(timer, now = Date.now()) {
  if (!timer) return 0;
  return timer.accMs + (timer.startedAt ? now - timer.startedAt : 0);
}

export function formatClock(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const pad = (n) => String(n).padStart(2, "0");
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

// date -> number of things done that day. Problems solved before the activity
// log existed are backfilled from their solvedDate so the history isn't empty.
export function activityCounts(activity, pool) {
  const counts = new Map();
  const bump = (d) => counts.set(d, (counts.get(d) || 0) + 1);
  const loggedSolves = new Set();
  activity.forEach((a) => {
    bump(a.date);
    if (a.kind === "solve") loggedSolves.add(`${metaKey(a.name)}|${a.date}`);
  });
  pool.forEach((p) => {
    if (p.status === "solved" && p.solvedDate && !loggedSolves.has(`${metaKey(p.name)}|${p.solvedDate}`)) bump(p.solvedDate);
  });
  return counts;
}

export function computeStreak(counts, today) {
  const has = (d) => (counts.get(d) || 0) > 0;
  const yesterday = addDays(today, -1);
  let cursor = has(today) ? today : has(yesterday) ? yesterday : null;
  let current = 0;
  while (cursor && has(cursor)) { current++; cursor = addDays(cursor, -1); }

  const dates = [...counts.keys()].filter(has).sort();
  let longest = 0, run = 0, prev = null;
  dates.forEach((d) => {
    run = prev && diffInDays(prev, d) === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = d;
  });
  return { current, longest: Math.max(longest, current), activeToday: has(today) };
}

// Sunday-first weeks, ending with the week that contains today.
export function buildHeatmap(counts, today, weeks = 12) {
  const dow = new Date(`${today}T00:00:00`).getDay();
  const first = addDays(today, -(dow + (weeks - 1) * 7));
  const cols = [];
  let total = 0;
  for (let w = 0; w < weeks; w++) {
    const col = [];
    for (let d = 0; d < 7; d++) {
      const date = addDays(first, w * 7 + d);
      const future = date > today;
      const n = future ? 0 : counts.get(date) || 0;
      total += n;
      col.push({ date, count: n, future, today: date === today, level: n === 0 ? 0 : n === 1 ? 1 : n === 2 ? 2 : n <= 4 ? 3 : 4 });
    }
    cols.push(col);
  }
  return { cols, total };
}

export function solveTimeStats(activity) {
  const acc = { Easy: { n: 0, sum: 0, best: null }, Medium: { n: 0, sum: 0, best: null }, Hard: { n: 0, sum: 0, best: null } };
  activity.forEach((a) => {
    const s = acc[a.difficulty];
    if (a.kind === "solve" && a.minutes && s) {
      s.n++; s.sum += a.minutes; s.best = s.best == null ? a.minutes : Math.min(s.best, a.minutes);
    }
  });
  const out = {};
  Object.keys(acc).forEach((k) => { out[k] = { n: acc[k].n, avg: acc[k].n ? Math.round(acc[k].sum / acc[k].n) : null, best: acc[k].best }; });
  return out;
}

export function todayTally(activity, today) {
  const t = { solved: 0, attempted: 0, reviewed: 0 };
  activity.forEach((a) => {
    if (a.date !== today) return;
    if (a.kind === "solve") t.solved++;
    else if (a.kind === "attempt") t.attempted++;
    else if (a.kind === "review") t.reviewed++;
  });
  return t;
}

// Suggest what to practice next, one pick per topic/group so it isn't all one area:
// finish what you've started, otherwise climb Easy -> Medium -> Hard within a group,
// starting with the groups you've made the least progress in.
export function recommend(pool, count = 3) {
  const groups = new Map();
  pool.forEach((p) => {
    const g = groups.get(p.group) || { total: 0, solved: 0, byDiff: { Easy: 0, Medium: 0, Hard: 0 } };
    g.total++;
    if (p.status === "solved") { g.solved++; if (g.byDiff[p.difficulty] != null) g.byDiff[p.difficulty]++; }
    groups.set(p.group, g);
  });

  const picks = [];
  groups.forEach((g, name) => {
    const rest = pool.filter((p) => p.group === name && p.status !== "solved");
    if (!rest.length) return;
    const attempted = rest.find((p) => p.status === "attempted");
    let item, reason;
    if (attempted) {
      item = attempted; reason = "Finish what you started";
    } else {
      const want = g.byDiff.Easy < 2 ? "Easy" : g.byDiff.Medium < 3 ? "Medium" : "Hard";
      const order = { Easy: ["Easy", "Medium", "Hard"], Medium: ["Medium", "Easy", "Hard"], Hard: ["Hard", "Medium", "Easy"] }[want];
      item = order.map((d) => rest.find((p) => p.difficulty === d)).find(Boolean) || rest[0];
      reason = item.difficulty === "Easy" ? "Warm-up" : item.difficulty === "Medium" ? "Build up" : "Stretch";
    }
    const ratio = g.total ? g.solved / g.total : 0;
    picks.push({ item, reason, group: name, score: (attempted ? 100 : 0) + (1 - ratio) * 10 });
  });
  return picks.sort((a, b) => b.score - a.score).slice(0, count);
}
