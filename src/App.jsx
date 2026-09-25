import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import * as XLSX from "xlsx";
import "./App.css";

// ──────────────────────────────────────────────────
//  Constants & Helpers
// ──────────────────────────────────────────────────
const STORAGE_KEY = "study-flow-v2";

const REVIEW_PHASES = [
  { key: "day1", label: "Day 1", offset: 1, hint: "First recall" },
  { key: "day7", label: "Day 7", offset: 7, hint: "Deepen understanding" },
  { key: "day24", label: "Day 24", offset: 24, hint: "Long-term lock" },
];

const PLATFORMS = [
  "LeetCode",
  "HackerRank",
  "Codeforces",
  "CodeChef",
  "GeeksforGeeks",
  "InterviewBit",
  "Other",
];

const DIFFICULTY = ["Easy", "Medium", "Hard"];

const STATUS_OPTIONS = [
  { value: "solved", label: "Solved", icon: "✓" },
  { value: "attempted", label: "Attempted", icon: "◐" },
  { value: "unsolved", label: "Unsolved", icon: "○" },
];

const pad = (v) => String(v).padStart(2, "0");
const toDateInput = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const getTodayString = () => toDateInput(new Date());
const parseDate = (s) => new Date(`${s}T00:00:00`);
const addDays = (s, n) => {
  const d = parseDate(s);
  d.setDate(d.getDate() + n);
  return toDateInput(d);
};
const formatDate = (s) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(
    parseDate(s)
  );
const diffInDays = (from, to) =>
  Math.round((parseDate(to) - parseDate(from)) / 86400000);

const createId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const loadData = () => {
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


const getRelativeLabel = (days) => {
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  if (days > 1) return `In ${days}d`;
  return `${Math.abs(days)}d overdue`;
};

// ──────────────────────────────────────────────────
//  XLSX Parser
// ──────────────────────────────────────────────────
const normalizeHeader = (h) => String(h).trim().toLowerCase().replace(/[^a-z]/g, "");

const HEADER_MAP = {
  problem: ["problem", "problemname", "name", "title", "question"],
  platform: ["platform", "source", "site", "website", "origin"],
  difficulty: ["difficulty", "diff", "level"],
  link: ["link", "url", "problemlink", "problemurl"],
  topic: ["topic", "category", "tag", "subject"],
};

const matchHeader = (header) => {
  const h = normalizeHeader(header);
  for (const [field, aliases] of Object.entries(HEADER_MAP)) {
    if (aliases.some((a) => h.includes(a))) return field;
  }
  return null;
};

const matchPlatform = (raw) => {
  if (!raw) return "Other";
  const lower = raw.toLowerCase();
  return (
    PLATFORMS.find((p) => lower.includes(p.toLowerCase())) || "Other"
  );
};

const matchDifficulty = (raw) => {
  if (!raw) return "Medium";
  const lower = raw.toLowerCase();
  if (lower.includes("easy") || lower.includes("basic")) return "Easy";
  if (lower.includes("hard") || lower.includes("advance")) return "Hard";
  return "Medium";
};

const parseXlsx = (buffer) => {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];

  // Read as raw 2D array so we can find the real header row
  const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  if (rawRows.length === 0) return [];

  // Find header row: needs ≥2 SHORT cells that exactly match known column aliases.
  // "Short" = ≤30 chars, which rules out description sentences like
  // "113 problems, 111 with a direct link..." containing the word "problem".
  const isExactHeaderCell = (cell) => {
    const s = String(cell).trim();
    if (!s || s.length > 30) return false; // too long → not a column header
    const n = normalizeHeader(s);
    return Object.values(HEADER_MAP).some((aliases) =>
      aliases.some((a) => n === a || n.startsWith(a))
    );
  };

  let headerRowIdx = -1;
  for (let i = 0; i < rawRows.length; i++) {
    const matchCount = rawRows[i].filter(isExactHeaderCell).length;
    if (matchCount >= 2) {
      headerRowIdx = i;
      break;
    }
  }

  if (headerRowIdx === -1) return []; // no recognisable header found

  const headerRow = rawRows[headerRowIdx];

  // Build column index map from the confirmed header row
  const colMap = {};
  headerRow.forEach((cell, idx) => {
    const field = matchHeader(String(cell));
    if (field && !(field in colMap)) colMap[field] = idx;
  });

  // Fallback: if no "problem" column matched, assume column B (index 1)
  if (colMap.problem === undefined && headerRow.length >= 2) {
    colMap.problem = 1;
  }
  if (colMap.problem === undefined) return [];

  // Parse data rows (everything after the header row)
  const dataRows = rawRows.slice(headerRowIdx + 1);

  return dataRows
    .map((row) => ({
      name: String(row[colMap.problem] ?? "").trim(),
      platform: matchPlatform(colMap.platform !== undefined ? String(row[colMap.platform] || "") : ""),
      difficulty: matchDifficulty(colMap.difficulty !== undefined ? String(row[colMap.difficulty] || "") : ""),
      link: colMap.link !== undefined ? String(row[colMap.link] || "").trim() : "",
      topic: colMap.topic !== undefined ? String(row[colMap.topic] || "").trim() : "",
    }))
    .filter((row) => {
      // Skip empty, pure-number rows (leftover row indices), and header-like names
      if (!row.name) return false;
      if (/^\d+$/.test(row.name)) return false;
      const n = row.name.toLowerCase();
      if (n === "problem" || n === "name" || n === "title" || n === "#") return false;
      return true;
    });
};



// ──────────────────────────────────────────────────
//  Icons (inline SVGs)
// ──────────────────────────────────────────────────
const Icons = {
  book: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
  ),
  code: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
  ),
  refresh: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
  ),
  plus: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
  ),
  trash: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
  ),
  check: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
  ),
  link: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
  ),
  chevronDown: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
  ),
  chevronRight: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
  ),
  dashboard: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>
  ),
  edit: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
  ),
  clock: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
  ),
  target: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
  ),
  upload: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
  ),
};

// ──────────────────────────────────────────────────
//  App Component
// ──────────────────────────────────────────────────
export default function App() {
  const [data, setData] = useState(loadData);
  const [activeView, setActiveView] = useState("dashboard"); // dashboard | topics | topic-detail
  const [selectedTopicId, setSelectedTopicId] = useState(null);
  const [showTopicForm, setShowTopicForm] = useState(false);
  const [showProblemForm, setShowProblemForm] = useState(false);
  const [editingTopic, setEditingTopic] = useState(null);

  const today = getTodayString();
  const topics = data.topics || [];
  const problems = data.problems || [];

  // Persist
  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  const setTopics = useCallback(
    (updater) =>
      setData((prev) => ({
        ...prev,
        topics: typeof updater === "function" ? updater(prev.topics) : updater,
      })),
    []
  );

  const setProblems = useCallback(
    (updater) =>
      setData((prev) => ({
        ...prev,
        problems: typeof updater === "function" ? updater(prev.problems || []) : updater,
      })),
    []
  );

  // Selected topic
  const selectedTopic = useMemo(
    () => topics.find((t) => t.id === selectedTopicId) || null,
    [topics, selectedTopicId]
  );

  // ── Aggregated today's actions ──
  const todaysActions = useMemo(() => {
    const actions = [];
    topics.forEach((topic) => {
      // Note revision phases due today
      REVIEW_PHASES.forEach((phase, i) => {
        if (topic.notePhases[phase.key]) return; // already done
        if (i > 0 && !topic.notePhases[REVIEW_PHASES[i - 1].key]) return; // locked
        const due = addDays(topic.startDate, phase.offset);
        if (due === today) {
          actions.push({
            type: "note",
            topicId: topic.id,
            topicTitle: topic.title,
            label: `Revise Notes — ${phase.label}`,
            phaseKey: phase.key,
          });
        }
      });
      // Problem reviews due today
      (topic.problems || []).forEach((problem) => {
        if (problem.status !== "solved") return;
        REVIEW_PHASES.forEach((phase, i) => {
          if (!problem.reviewPhases) return;
          if (problem.reviewPhases[phase.key]) return;
          if (i > 0 && !problem.reviewPhases[REVIEW_PHASES[i - 1].key]) return;
          const due = addDays(problem.solvedDate || topic.startDate, phase.offset);
          if (due === today) {
            actions.push({
              type: "problem",
              topicId: topic.id,
              problemId: problem.id,
              topicTitle: topic.title,
              label: `Review "${problem.name}" — ${phase.label}`,
              phaseKey: phase.key,
            });
          }
        });
      });
    });
    return actions;
  }, [topics, today]);

  // ── Stats ──
  const stats = useMemo(() => {
    let totalTopics = topics.length;
    let completedNotes = 0;
    let totalProblems = problems.length;
    let solvedProblems = problems.filter((p) => p.status === "solved").length;
    let reviewsDueToday = 0;
    let overdueCount = 0;

    topics.forEach((topic) => {
      if (REVIEW_PHASES.every((p) => topic.notePhases[p.key])) completedNotes++;

      // Check overdue
      REVIEW_PHASES.forEach((phase, i) => {
        if (topic.notePhases[phase.key]) return;
        if (i > 0 && !topic.notePhases[REVIEW_PHASES[i - 1].key]) return;
        const due = addDays(topic.startDate, phase.offset);
        const d = diffInDays(today, due);
        if (d < 0) overdueCount++;
        if (d === 0) reviewsDueToday++;
      });
    });

    return { totalTopics, completedNotes, totalProblems, solvedProblems, reviewsDueToday, overdueCount };
  }, [topics, problems, today]);

  // ── Upcoming reviews (next 7 days) ──
  const upcomingReviews = useMemo(() => {
    const items = [];
    topics.forEach((topic) => {
      REVIEW_PHASES.forEach((phase, i) => {
        if (topic.notePhases[phase.key]) return;
        if (i > 0 && !topic.notePhases[REVIEW_PHASES[i - 1].key]) return;
        const due = addDays(topic.startDate, phase.offset);
        const d = diffInDays(today, due);
        if (d >= 0 && d <= 7) {
          items.push({
            type: "note",
            topicId: topic.id,
            title: topic.title,
            phase: phase.label,
            date: due,
            daysUntil: d,
          });
        }
      });
      (topic.problems || []).forEach((prob) => {
        if (prob.status !== "solved" || !prob.reviewPhases) return;
        REVIEW_PHASES.forEach((phase, i) => {
          if (prob.reviewPhases[phase.key]) return;
          if (i > 0 && !prob.reviewPhases[REVIEW_PHASES[i - 1].key]) return;
          const due = addDays(prob.solvedDate || topic.startDate, phase.offset);
          const d = diffInDays(today, due);
          if (d >= 0 && d <= 7) {
            items.push({
              type: "problem",
              topicId: topic.id,
              problemId: prob.id,
              title: `${prob.name}`,
              topicTitle: topic.title,
              phase: phase.label,
              date: due,
              daysUntil: d,
            });
          }
        });
      });
    });
    items.sort((a, b) => a.daysUntil - b.daysUntil);
    return items.slice(0, 8);
  }, [topics, today]);

  // ── Handlers ──
  const handleAddTopic = (formData) => {
    const newTopic = {
      id: createId(),
      title: formData.title.trim(),
      startDate: formData.startDate,
      notes: formData.notes.trim(),
      createdAt: new Date().toISOString(),
      notePhases: REVIEW_PHASES.reduce((acc, p) => {
        acc[p.key] = false;
        return acc;
      }, {}),
      problems: [],
    };
    setTopics((prev) => [newTopic, ...prev]);
    setShowTopicForm(false);
  };

  const handleUpdateTopic = (topicId, updates) => {
    setTopics((prev) =>
      prev.map((t) => (t.id === topicId ? { ...t, ...updates } : t))
    );
    setEditingTopic(null);
  };

  const handleDeleteTopic = (topicId) => {
    setTopics((prev) => prev.filter((t) => t.id !== topicId));
    if (selectedTopicId === topicId) {
      setSelectedTopicId(null);
      setActiveView("topics");
    }
  };

  const handleToggleNotePhase = (topicId, phaseKey) => {
    setTopics((prev) =>
      prev.map((topic) => {
        if (topic.id !== topicId) return topic;
        const idx = REVIEW_PHASES.findIndex((p) => p.key === phaseKey);
        if (idx > 0 && !topic.notePhases[REVIEW_PHASES[idx - 1].key]) return topic;
        const next = { ...topic.notePhases, [phaseKey]: !topic.notePhases[phaseKey] };
        if (topic.notePhases[phaseKey]) {
          REVIEW_PHASES.slice(idx + 1).forEach((p) => (next[p.key] = false));
        }
        return { ...topic, notePhases: next };
      })
    );
  };

  const handleAddProblem = (topicId, formData) => {
    const newProblem = {
      id: createId(),
      name: formData.name.trim(),
      platform: formData.platform,
      difficulty: formData.difficulty,
      link: formData.link.trim(),
      status: formData.status,
      solvedDate: formData.status === "solved" ? today : null,
      addedAt: new Date().toISOString(),
      reviewPhases:
        formData.status === "solved"
          ? REVIEW_PHASES.reduce((acc, p) => {
              acc[p.key] = false;
              return acc;
            }, {})
          : null,
    };
    setTopics((prev) =>
      prev.map((t) =>
        t.id === topicId ? { ...t, problems: [newProblem, ...t.problems] } : t
      )
    );
    setShowProblemForm(false);
  };

  const handleUpdateProblemStatus = (topicId, problemId, newStatus) => {
    setTopics((prev) =>
      prev.map((t) => {
        if (t.id !== topicId) return t;
        return {
          ...t,
          problems: t.problems.map((p) => {
            if (p.id !== problemId) return p;
            const updated = { ...p, status: newStatus };
            if (newStatus === "solved" && !p.solvedDate) {
              updated.solvedDate = today;
              updated.reviewPhases = REVIEW_PHASES.reduce((acc, ph) => {
                acc[ph.key] = false;
                return acc;
              }, {});
            }
            if (newStatus !== "solved") {
              updated.reviewPhases = null;
              updated.solvedDate = null;
            }
            return updated;
          }),
        };
      })
    );
  };

  const handleToggleProblemReview = (topicId, problemId, phaseKey) => {
    setTopics((prev) =>
      prev.map((t) => {
        if (t.id !== topicId) return t;
        return {
          ...t,
          problems: t.problems.map((p) => {
            if (p.id !== problemId || !p.reviewPhases) return p;
            const idx = REVIEW_PHASES.findIndex((ph) => ph.key === phaseKey);
            if (idx > 0 && !p.reviewPhases[REVIEW_PHASES[idx - 1].key]) return p;
            const next = { ...p.reviewPhases, [phaseKey]: !p.reviewPhases[phaseKey] };
            if (p.reviewPhases[phaseKey]) {
              REVIEW_PHASES.slice(idx + 1).forEach((ph) => (next[ph.key] = false));
            }
            return { ...p, reviewPhases: next };
          }),
        };
      })
    );
  };

  const handleDeleteProblem = (topicId, problemId) => {
    setTopics((prev) =>
      prev.map((t) =>
        t.id === topicId
          ? { ...t, problems: t.problems.filter((p) => p.id !== problemId) }
          : t
      )
    );
  };

  // handleImportXlsx — writes to global problems[], topic column is DISPLAY TEXT ONLY
  const handleImportXlsx = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = parseXlsx(new Uint8Array(e.target.result));
        if (parsed.length === 0) {
          alert("No problems found. Check that the file has a 'Problem' column.");
          return;
        }
        setProblems((prev) => {
          const existingNames = new Set(prev.map((p) => p.name.toLowerCase()));
          const newProblems = parsed
            .filter((row) => !existingNames.has(row.name.toLowerCase()))
            .map((row) => ({
              id: createId(),
              name: row.name,
              platform: row.platform,
              difficulty: row.difficulty,
              link: row.link,
              topic: row.topic, // metadata only — not a foreign key
              status: "unsolved",
              solvedDate: null,
              addedAt: new Date().toISOString(),
            }));
          alert(`Imported ${newProblems.length} problems. (${parsed.length - newProblems.length} duplicates skipped)`);
          return [...prev, ...newProblems];
        });
      } catch (err) {
        console.error(err);
        alert("Failed to parse the file. Make sure it's a valid .xlsx/.xls file.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleUpdateGlobalProblemStatus = (problemId, status) => {
    setProblems((prev) =>
      prev.map((p) =>
        p.id === problemId
          ? {
              ...p,
              status,
              solvedDate: status === "solved" ? getTodayString() : null,
            }
          : p
      )
    );
  };

  const handleDeleteGlobalProblem = (problemId) => {
    setProblems((prev) => prev.filter((p) => p.id !== problemId));
  };


  const navigateToTopic = (topicId) => {
    setSelectedTopicId(topicId);
    setActiveView("topic-detail");
  };

  // ──────────────────────────────────────────────────
  //  Render
  // ──────────────────────────────────────────────────
  return (
    <div className="app-shell">
      {/* ── Sidebar ── */}
      <nav className="sidebar" role="navigation">
        <div className="sidebar-brand">
          <div className="brand-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <div>
            <h1 className="brand-title">Study Flow</h1>
          </div>
        </div>

        <div className="sidebar-nav">
          <button
            className={`nav-item ${activeView === "dashboard" ? "active" : ""}`}
            onClick={() => setActiveView("dashboard")}
          >
            {Icons.dashboard}
            <span>Dashboard</span>
            {stats.reviewsDueToday + stats.overdueCount > 0 && (
              <span className="nav-badge">{stats.reviewsDueToday + stats.overdueCount}</span>
            )}
          </button>
          <button
            className={`nav-item ${activeView === "topics" || activeView === "topic-detail" ? "active" : ""}`}
            onClick={() => setActiveView("topics")}
          >
            {Icons.book}
            <span>Topics</span>
            <span className="nav-count">{stats.totalTopics}</span>
          </button>
          <button
            className={`nav-item ${activeView === "problems" ? "active" : ""}`}
            onClick={() => setActiveView("problems")}
          >
            {Icons.code}
            <span>Problems</span>
            <span className="nav-count">{stats.totalProblems}</span>
          </button>
        </div>

        <div className="sidebar-stats">
          <div className="stat-mini">
            <span className="stat-mini-value">{stats.totalProblems}</span>
            <span className="stat-mini-label">Problems</span>
          </div>
          <div className="stat-mini">
            <span className="stat-mini-value">{stats.solvedProblems}</span>
            <span className="stat-mini-label">Solved</span>
          </div>
          <div className="stat-mini">
            <span className="stat-mini-value">{stats.completedNotes}</span>
            <span className="stat-mini-label">Mastered</span>
          </div>
        </div>
      </nav>

      {/* ── Main Content ── */}
      <main className="main-area">
        {activeView === "dashboard" && (
          <DashboardView
            stats={stats}
            todaysActions={todaysActions}
            upcomingReviews={upcomingReviews}
            topics={topics}
            today={today}
            onToggleNotePhase={handleToggleNotePhase}
            onToggleProblemReview={handleToggleProblemReview}
            onNavigateToTopic={navigateToTopic}
            onAddTopic={() => {
              setActiveView("topics");
              setShowTopicForm(true);
            }}
          />
        )}

        {activeView === "topics" && (
          <TopicsListView
            topics={topics}
            today={today}
            showForm={showTopicForm}
            onShowForm={setShowTopicForm}
            onAddTopic={handleAddTopic}
            onDeleteTopic={handleDeleteTopic}
            onSelectTopic={navigateToTopic}
          />
        )}

        {activeView === "problems" && (
          <ProblemsView
            problems={problems}
            onImportXlsx={handleImportXlsx}
            onUpdateStatus={handleUpdateGlobalProblemStatus}
            onDelete={handleDeleteGlobalProblem}
          />
        )}

        {activeView === "topic-detail" && selectedTopic && (
          <TopicDetailView
            topic={selectedTopic}
            today={today}
            editingTopic={editingTopic}
            showProblemForm={showProblemForm}
            onSetEditingTopic={setEditingTopic}
            onSetShowProblemForm={setShowProblemForm}
            onUpdateTopic={handleUpdateTopic}
            onDeleteTopic={handleDeleteTopic}
            onToggleNotePhase={handleToggleNotePhase}
            onAddProblem={handleAddProblem}
            onUpdateProblemStatus={handleUpdateProblemStatus}
            onToggleProblemReview={handleToggleProblemReview}
            onDeleteProblem={handleDeleteProblem}
            onBack={() => setActiveView("topics")}
          />
        )}
      </main>
    </div>
  );
}

// ══════════════════════════════════════════════════
//  PROBLEMS VIEW
// ══════════════════════════════════════════════════
function ProblemsView({ problems, onImportXlsx, onUpdateStatus, onDelete }) {
  const fileInputRef = useRef(null);
  const [search, setSearch] = useState("");
  const [diffFilter, setDiffFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [topicFilter, setTopicFilter] = useState("all");
  const [statusTab, setStatusTab] = useState("all");

  const platforms = useMemo(() => {
    const s = new Set(problems.map((p) => p.platform).filter(Boolean));
    return Array.from(s).sort();
  }, [problems]);

  const topics = useMemo(() => {
    const s = new Set(problems.map((p) => p.topic).filter(Boolean));
    return Array.from(s).sort();
  }, [problems]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return problems.filter((p) => {
      if (statusTab !== "all" && p.status !== statusTab) return false;
      if (diffFilter !== "all" && p.difficulty !== diffFilter) return false;
      if (platformFilter !== "all" && p.platform !== platformFilter) return false;
      if (topicFilter !== "all" && p.topic !== topicFilter) return false;
      if (q && !p.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [problems, search, diffFilter, platformFilter, topicFilter, statusTab]);

  const counts = useMemo(() => ({
    all: problems.length,
    unsolved: problems.filter((p) => p.status === "unsolved").length,
    attempted: problems.filter((p) => p.status === "attempted").length,
    solved: problems.filter((p) => p.status === "solved").length,
    easy: problems.filter((p) => p.difficulty === "Easy").length,
    medium: problems.filter((p) => p.difficulty === "Medium").length,
    hard: problems.filter((p) => p.difficulty === "Hard").length,
    easySolved: problems.filter((p) => p.difficulty === "Easy" && p.status === "solved").length,
    mediumSolved: problems.filter((p) => p.difficulty === "Medium" && p.status === "solved").length,
    hardSolved: problems.filter((p) => p.difficulty === "Hard" && p.status === "solved").length,
  }), [problems]);

  const cycleStatus = (p) => {
    const order = ["unsolved", "attempted", "solved"];
    const next = order[(order.indexOf(p.status) + 1) % order.length];
    onUpdateStatus(p.id, next);
  };

  return (
    <div className="view-content prob-view">
      {/* ── Header ── */}
      <div className="prob-view-header">
        <div>
          <h2 className="view-title">Problems</h2>
          <p className="view-subtitle">{counts.all} problems imported</p>
        </div>
        <button className="btn-import" onClick={() => fileInputRef.current?.click()}>
          {Icons.upload}
          <span>Import XLSX</span>
        </button>
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls" style={{ display: "none" }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) { onImportXlsx(f); e.target.value = ""; } }}
        />
      </div>

      {/* ── Stats Row ── */}
      {counts.all > 0 && (
        <div className="prob-stats-row">
          <div className="prob-stat-pill diff-easy-pill">
            <span className="psp-label">Easy</span>
            <span className="psp-value">{counts.easySolved}/{counts.easy}</span>
          </div>
          <div className="prob-stat-pill diff-medium-pill">
            <span className="psp-label">Medium</span>
            <span className="psp-value">{counts.mediumSolved}/{counts.medium}</span>
          </div>
          <div className="prob-stat-pill diff-hard-pill">
            <span className="psp-label">Hard</span>
            <span className="psp-value">{counts.hardSolved}/{counts.hard}</span>
          </div>
          <div className="prob-stat-pill total-pill">
            <span className="psp-label">Solved</span>
            <span className="psp-value">{counts.solved}/{counts.all}</span>
          </div>
        </div>
      )}

      {/* ── Controls ── */}
      <div className="prob-controls">
        <div className="prob-search-wrap">
          <svg className="prob-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input className="prob-search-input" placeholder="Search by name…" value={search} onChange={(e) => setSearch(e.target.value)} />
          {search && <button className="prob-search-clear" onClick={() => setSearch("")}>✕</button>}
        </div>
        <div className="prob-filter-group">
          {/* Difficulty pills */}
          <div className="diff-pills">
            {["all", "Easy", "Medium", "Hard"].map((d) => (
              <button key={d}
                className={`diff-pill ${d === "Easy" ? "dp-easy" : d === "Medium" ? "dp-medium" : d === "Hard" ? "dp-hard" : "dp-all"} ${diffFilter === d ? "dp-active" : ""}`}
                onClick={() => setDiffFilter(d)}
              >
                {d === "all" ? "All" : d}
              </button>
            ))}
          </div>
          {platforms.length > 0 && (
            <select className="prob-filter-select" value={platformFilter} onChange={(e) => setPlatformFilter(e.target.value)}>
              <option value="all">All Platforms</option>
              {platforms.map((pl) => <option key={pl} value={pl}>{pl}</option>)}
            </select>
          )}
          {topics.length > 0 && (
            <select className="prob-filter-select" value={topicFilter} onChange={(e) => setTopicFilter(e.target.value)}>
              <option value="all">All Topics</option>
              {topics.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* ── Status Tabs ── */}
      <div className="prob-status-tabs">
        {[
          { key: "all", label: "All", count: counts.all },
          { key: "unsolved", label: "Unsolved", count: counts.unsolved },
          { key: "attempted", label: "Attempted", count: counts.attempted },
          { key: "solved", label: "Solved", count: counts.solved },
        ].map((tab) => (
          <button key={tab.key}
            className={`pst-btn ${statusTab === tab.key ? "pst-active" : ""}`}
            onClick={() => setStatusTab(tab.key)}
          >
            {tab.label}
            <span className={`pst-count ${statusTab === tab.key ? "pst-count-active" : ""}`}>{tab.count}</span>
          </button>
        ))}
        {filtered.length !== counts.all && (
          <span className="prob-filter-hint">{filtered.length} shown</span>
        )}
      </div>

      {/* ── Table ── */}
      {filtered.length > 0 ? (
        <div className="prob-list-wrap">
          <div className="prob-list-head">
            <span className="plh-num">#</span>
            <span className="plh-name">Problem</span>
            <span className="plh-topic">Topic</span>
            <span className="plh-platform">Platform</span>
            <span className="plh-diff">Difficulty</span>
            <span className="plh-status">Status</span>
            <span className="plh-action"></span>
          </div>
          {filtered.map((p, idx) => {
            const diffClass = p.difficulty === "Easy" ? "d-easy" : p.difficulty === "Hard" ? "d-hard" : "d-medium";
            const statusNext = { unsolved: "attempted", attempted: "solved", solved: "unsolved" }[p.status];
            return (
              <div key={p.id} className={`prob-list-row prow-${p.status}`}>
                <span className="plr-num">{idx + 1}</span>
                <span className="plr-name">
                  <span className="plr-name-text" title={p.name}>{p.name}</span>
                  {p.link && (
                    <a href={p.link} target="_blank" rel="noopener noreferrer" className="plr-link" onClick={(e) => e.stopPropagation()} title="Open problem">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                    </a>
                  )}
                </span>
                <span className="plr-topic" title={p.topic}>{p.topic || "—"}</span>
                <span className={`plr-platform plat-${(p.platform || "other").toLowerCase().replace(/[^a-z]/g,"")}`}>{p.platform}</span>
                <span className={`plr-diff ${diffClass}`}>{p.difficulty}</span>
                <button className={`plr-status pstatus-${p.status}`} onClick={() => cycleStatus(p)} title={`Click to mark as ${statusNext}`}>
                  {p.status === "solved" ? "✓ Solved" : p.status === "attempted" ? "◐ Attempted" : "○ Unsolved"}
                </button>
                <button className="plr-del" onClick={() => onDelete(p.id)} title="Remove">
                  {Icons.trash}
                </button>
              </div>
            );
          })}
        </div>
      ) : counts.all === 0 ? (
        <div className="prob-empty">
          <div className="prob-empty-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
          </div>
          <h3>No problems yet</h3>
          <p>Import your .xlsx file to populate this list</p>
          <button className="btn-primary" onClick={() => fileInputRef.current?.click()}>{Icons.upload} Import XLSX</button>
        </div>
      ) : (
        <div className="prob-empty">
          <h3>No results</h3>
          <p>Try clearing some filters</p>
          <button className="btn-ghost" onClick={() => { setSearch(""); setDiffFilter("all"); setPlatformFilter("all"); setTopicFilter("all"); setStatusTab("all"); }}>Clear all filters</button>
        </div>
      )}
    </div>
  );
}


// ══════════════════════════════════════════════════
//  DASHBOARD VIEW
// ══════════════════════════════════════════════════
function DashboardView({
  stats,
  todaysActions,
  upcomingReviews,
  topics,
  today,
  onToggleNotePhase,
  onToggleProblemReview,
  onNavigateToTopic,
  onAddTopic,
}) {
  const solvedPct = stats.totalProblems > 0
    ? Math.round((stats.solvedProblems / stats.totalProblems) * 100)
    : 0;

  return (
    <div className="dash-root">
      {/* ── Page header ── */}
      <div className="dash-header">
        <div>
          <h1 className="dash-title">Dashboard</h1>
          <p className="dash-subtitle">{formatDate(today)} — Your study overview</p>
        </div>
      </div>

      {/* ── KPI row ── */}
      <div className="kpi-row">
        <div className="kpi-card">
          <span className="kpi-label">Topics</span>
          <span className="kpi-value">{stats.totalTopics}</span>
        </div>
        <div className="kpi-card kpi-card--wide">
          <span className="kpi-label">Problems Solved</span>
          <div className="kpi-value-row">
            <span className="kpi-value">{stats.solvedProblems}</span>
            <span className="kpi-denom">/ {stats.totalProblems}</span>
          </div>
          {/* inline progress bar */}
          <div className="kpi-progress">
            <div className="kpi-progress-fill" style={{ width: `${solvedPct}%` }} />
          </div>
          <span className="kpi-pct">{solvedPct}% complete</span>
        </div>
        <div className={`kpi-card ${stats.reviewsDueToday > 0 ? 'kpi-card--warn' : ''}`}>
          <span className="kpi-label">Due Today</span>
          <span className="kpi-value">{stats.reviewsDueToday}</span>
        </div>
        <div className={`kpi-card ${stats.overdueCount > 0 ? 'kpi-card--danger' : ''}`}>
          <span className="kpi-label">Overdue</span>
          <span className="kpi-value">{stats.overdueCount}</span>
        </div>
      </div>

      {/* ── Two-column body ── */}
      <div className="dash-body">

        {/* Today's Actions */}
        <section className="dash-panel">
          <div className="panel-head">
            <span className="panel-title">Today's Actions</span>
            <span className="panel-pill">{todaysActions.length}</span>
          </div>

          {todaysActions.length > 0 ? (
            <ul className="action-rows">
              {todaysActions.map((action, i) => (
                <li key={i} className="action-row">
                  <span className={`action-type-dot ${action.type === 'note' ? 'dot--orange' : 'dot--blue'}`} />
                  <div className="action-text">
                    <span className="action-name">{action.label}</span>
                    <button
                      className="action-link"
                      onClick={() => onNavigateToTopic(action.topicId)}
                    >
                      {action.topicTitle}
                    </button>
                  </div>
                  <button
                    className="action-done-btn"
                    onClick={() => {
                      if (action.type === 'note') {
                        onToggleNotePhase(action.topicId, action.phaseKey);
                      } else {
                        onToggleProblemReview(action.topicId, action.problemId, action.phaseKey);
                      }
                    }}
                  >
                    {Icons.check} Mark done
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="panel-empty">
              <div className="panel-empty-emoji">🎉</div>
              <p className="panel-empty-text">All caught up for today!</p>
              <span className="panel-empty-sub">Keep up the great work</span>
            </div>
          )}
        </section>

        {/* Upcoming Reviews */}
        <section className="dash-panel">
          <div className="panel-head">
            <span className="panel-title">Upcoming Reviews</span>
            <span className="panel-pill">{upcomingReviews.length}</span>
          </div>

          {upcomingReviews.length > 0 ? (
            <ul className="review-rows">
              {upcomingReviews.map((item, i) => (
                <li
                  key={i}
                  className="review-row"
                  onClick={() => onNavigateToTopic(item.topicId)}
                >
                  <div className={`review-badge ${item.type === 'note' ? 'badge--note' : 'badge--prob'}`}>
                    {item.type === 'note' ? Icons.book : Icons.code}
                  </div>
                  <div className="review-info">
                    <span className="review-title">{item.title}</span>
                    <span className="review-meta">{item.phase} Review{item.topicTitle && item.type === 'problem' ? ` · ${item.topicTitle}` : ''}</span>
                  </div>
                  <span className={`review-when ${item.daysUntil === 0 ? 'when--today' : item.daysUntil < 0 ? 'when--late' : ''}`}>
                    {getRelativeLabel(item.daysUntil)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="panel-empty">
              <div className="panel-empty-emoji">📅</div>
              <p className="panel-empty-text">No reviews in the next 7 days</p>
              {topics.length === 0 && (
                <button className="btn-primary" onClick={onAddTopic} style={{ marginTop: 16 }}>
                  {Icons.plus} Add Your First Topic
                </button>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════
//  TOPICS LIST VIEW
// ══════════════════════════════════════════════════
function TopicsListView({
  topics,
  today,
  showForm,
  onShowForm,
  onAddTopic,
  onDeleteTopic,
  onSelectTopic,
}) {
  return (
    <div className="view-content">
      <header className="view-header">
        <div>
          <h2 className="view-title">Topics</h2>
          <p className="view-subtitle">Your study topics with notes and practice problems</p>
        </div>
        <button className="btn-primary" onClick={() => onShowForm(!showForm)}>
          {Icons.plus} New Topic
        </button>
      </header>

      {showForm && (
        <TopicForm
          onSubmit={onAddTopic}
          onCancel={() => onShowForm(false)}
          today={today}
        />
      )}

      <div className="topics-grid">
        {topics.length > 0 ? (
          topics.map((topic) => {
            const doneCount = REVIEW_PHASES.filter((p) => topic.notePhases[p.key]).length;
            const progress = Math.round((doneCount / REVIEW_PHASES.length) * 100);
            const problemCount = (topic.problems || []).length;
            const solvedCount = (topic.problems || []).filter((p) => p.status === "solved").length;
            const isComplete = doneCount === REVIEW_PHASES.length;

            // Get next note phase status
            let noteStatus = null;
            if (!isComplete) {
              const nextPhase = REVIEW_PHASES.find((p) => !topic.notePhases[p.key]);
              if (nextPhase) {
                const due = addDays(topic.startDate, nextPhase.offset);
                const d = diffInDays(today, due);
                if (d < 0) noteStatus = { text: `${Math.abs(d)}d overdue`, kind: "overdue" };
                else if (d === 0) noteStatus = { text: "Due today", kind: "due" };
                else if (d <= 2) noteStatus = { text: `Due in ${d}d`, kind: "soon" };
                else noteStatus = { text: `In ${d}d`, kind: "ontrack" };
              }
            } else {
              noteStatus = { text: "Mastered", kind: "complete" };
            }

            return (
              <article
                key={topic.id}
                className="topic-card"
                onClick={() => onSelectTopic(topic.id)}
              >
                <div className="topic-card-top">
                  <h3 className="topic-card-title">{topic.title}</h3>
                  {noteStatus && (
                    <span className={`status-pill status-${noteStatus.kind}`}>
                      {noteStatus.text}
                    </span>
                  )}
                </div>
                <p className="topic-card-meta">{Icons.clock} Started {formatDate(topic.startDate)}</p>
                {topic.notes && (
                  <div className="topic-card-notes-wrapper">
                    <p className="topic-card-notes">{topic.notes.length > 80 ? topic.notes.slice(0, 80) + "…" : topic.notes}</p>
                  </div>
                )}
                
                <div className="topic-card-stats-grid">
                  <div className="topic-card-stat-box">
                    <span className="stat-box-label">{Icons.book} Notes Review</span>
                    <span className="stat-box-value">{progress}%</span>
                  </div>
                  <div className="topic-card-stat-box">
                    <span className="stat-box-label">{Icons.code} Problems</span>
                    <span className="stat-box-value">{solvedCount}<span style={{fontSize: "0.75rem", color: "#9ca3af"}}>/{problemCount}</span></span>
                  </div>
                </div>

                <div className="progress-bar">
                  <div
                    className="progress-bar-fill"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                
                <div className="topic-card-actions" onClick={(e) => e.stopPropagation()}>
                  <button
                    className="btn-icon btn-icon-danger"
                    onClick={() => onDeleteTopic(topic.id)}
                    title="Delete topic"
                  >
                    {Icons.trash}
                  </button>
                </div>
              </article>
            );
          })
        ) : (
          <div className="empty-state wide">
            <div className="empty-icon">📚</div>
            <h3>No topics yet</h3>
            <p>Create your first study topic to get started with the Notes → Practice → Review workflow.</p>
            <button className="btn-primary" onClick={() => onShowForm(true)}>
              {Icons.plus} Create Topic
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════
//  TOPIC DETAIL VIEW
// ══════════════════════════════════════════════════
function TopicDetailView({
  topic,
  today,
  editingTopic,
  showProblemForm,
  onSetEditingTopic,
  onSetShowProblemForm,
  onUpdateTopic,
  onDeleteTopic,
  onToggleNotePhase,
  onAddProblem,
  onImportXlsx,
  onUpdateProblemStatus,
  onToggleProblemReview,
  onDeleteProblem,
  onBack,
}) {
  const problems = topic.problems || [];
  const [problemFilter, setProblemFilter] = useState("all");
  const fileInputRef = useRef(null);

  const filteredProblems = useMemo(() => {
    if (problemFilter === "all") return problems;
    return problems.filter((p) => p.status === problemFilter);
  }, [problems, problemFilter]);

  return (
    <div className="view-content">
      <header className="view-header">
        <div>
          <button className="breadcrumb" onClick={onBack}>
            ← Topics
          </button>
          <h2 className="view-title">{topic.title}</h2>
          <p className="view-subtitle">Started {formatDate(topic.startDate)}</p>
        </div>
        <div className="header-actions">
          <button
            className="btn-ghost"
            onClick={() => onSetEditingTopic(editingTopic ? null : topic.id)}
          >
            {Icons.edit} Edit
          </button>
          <button
            className="btn-ghost btn-ghost-danger"
            onClick={() => {
              onDeleteTopic(topic.id);
            }}
          >
            {Icons.trash} Delete
          </button>
        </div>
      </header>

      {editingTopic === topic.id && (
        <TopicEditForm
          topic={topic}
          onSave={(updates) => onUpdateTopic(topic.id, updates)}
          onCancel={() => onSetEditingTopic(null)}
        />
      )}

      {/* ── SECTION 1: Notes & Revision ── */}
      <section className="content-section">
        <div className="section-header">
          <h3>{Icons.book} Notes & Revision</h3>
          <span className="section-badge">1-7-24 Method</span>
        </div>

        {topic.notes && (
          <div className="notes-block">
            <p>{topic.notes}</p>
          </div>
        )}

        <div className="phase-timeline">
          {REVIEW_PHASES.map((phase, i) => {
            const isDone = topic.notePhases[phase.key];
            const locked = i > 0 && !topic.notePhases[REVIEW_PHASES[i - 1].key];
            const due = addDays(topic.startDate, phase.offset);
            const d = diffInDays(today, due);
            const isOverdue = !isDone && !locked && d < 0;
            const isDueToday = !isDone && !locked && d === 0;

            return (
              <button
                key={phase.key}
                className={`phase-chip ${isDone ? "phase-done" : ""} ${locked ? "phase-locked" : ""} ${isOverdue ? "phase-overdue" : ""} ${isDueToday ? "phase-today" : ""}`}
                onClick={() => onToggleNotePhase(topic.id, phase.key)}
                disabled={locked}
              >
                <span className="phase-chip-icon">
                  {isDone ? Icons.check : locked ? "🔒" : "○"}
                </span>
                <div className="phase-chip-info">
                  <span className="phase-chip-label">{phase.label}</span>
                  <span className="phase-chip-hint">
                    {isDone
                      ? "Completed"
                      : locked
                        ? "Complete previous first"
                        : `${formatDate(due)} · ${getRelativeLabel(d)}`}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── SECTION 2: Practice Problems ── */}
      <section className="content-section">
        <div className="section-header">
          <h3>{Icons.code} Practice Problems</h3>
          <div className="section-header-actions">
            <button
              className="btn-sm btn-ghost-sm"
              onClick={() => fileInputRef.current?.click()}
              title="Import from .xlsx file"
            >
              {Icons.upload} Import XLSX
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  onImportXlsx(topic.id, file);
                  e.target.value = "";
                }
              }}
            />
            <button className="btn-sm btn-accent" onClick={() => onSetShowProblemForm(!showProblemForm)}>
              {Icons.plus} Add Problem
            </button>
          </div>
        </div>

        {showProblemForm && (
          <ProblemForm
            onSubmit={(data) => onAddProblem(topic.id, data)}
            onCancel={() => onSetShowProblemForm(false)}
          />
        )}

        {problems.length > 0 && (
          <div className="problem-filters">
            {[
              { key: "all", label: "All" },
              { key: "solved", label: "Solved" },
              { key: "attempted", label: "Attempted" },
              { key: "unsolved", label: "Unsolved" },
            ].map((f) => (
              <button
                key={f.key}
                className={`filter-chip ${problemFilter === f.key ? "filter-active" : ""}`}
                onClick={() => setProblemFilter(f.key)}
              >
                {f.label}
                {f.key !== "all" && (
                  <span className="filter-count">
                    {problems.filter((p) => f.key === "all" || p.status === f.key).length}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        <div className="problems-list">
          {filteredProblems.length > 0 ? (
            filteredProblems.map((problem) => (
              <ProblemCard
                key={problem.id}
                problem={problem}
                topicId={topic.id}
                today={today}
                onUpdateStatus={onUpdateProblemStatus}
                onToggleReview={onToggleProblemReview}
                onDelete={onDeleteProblem}
              />
            ))
          ) : (
            <div className="empty-state">
              <p>
                {problems.length === 0
                  ? "No problems added yet. Start practicing!"
                  : "No problems match this filter."}
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

// ══════════════════════════════════════════════════
//  PROBLEM CARD
// ══════════════════════════════════════════════════
function ProblemCard({ problem, topicId, today, onUpdateStatus, onToggleReview, onDelete }) {
  const [expanded, setExpanded] = useState(false);

  const difficultyClass = problem.difficulty === "Easy" ? "diff-easy" : problem.difficulty === "Medium" ? "diff-medium" : "diff-hard";
  const statusObj = STATUS_OPTIONS.find((s) => s.value === problem.status);

  return (
    <div className={`problem-card ${expanded ? "problem-expanded" : ""}`}>
      <div className="problem-main" onClick={() => setExpanded(!expanded)}>
        <div className="problem-left">
          <span className={`problem-status-icon status-${problem.status}`}>
            {statusObj?.icon}
          </span>
          <div className="problem-info">
            <span className="problem-name">{problem.name}</span>
            <div className="problem-tags">
              <span className="tag tag-platform">{problem.platform}</span>
              <span className={`tag tag-diff ${difficultyClass}`}>{problem.difficulty}</span>
            </div>
          </div>
        </div>
        <div className="problem-right">
          {problem.link && (
            <a
              href={problem.link}
              target="_blank"
              rel="noopener noreferrer"
              className="problem-link"
              onClick={(e) => e.stopPropagation()}
            >
              {Icons.link}
            </a>
          )}
          <span className="expand-icon">{expanded ? Icons.chevronDown : Icons.chevronRight}</span>
        </div>
      </div>

      {expanded && (
        <div className="problem-details">
          {/* Status Selector */}
          <div className="detail-row">
            <label className="detail-label">Status</label>
            <div className="status-selector">
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s.value}
                  className={`status-option ${problem.status === s.value ? "status-selected" : ""}`}
                  onClick={() => onUpdateStatus(topicId, problem.id, s.value)}
                >
                  {s.icon} {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Review Phases (only if solved) */}
          {problem.status === "solved" && problem.reviewPhases && (
            <div className="detail-row">
              <label className="detail-label">Review Progress (1-7-24)</label>
              <div className="review-phases">
                {REVIEW_PHASES.map((phase, i) => {
                  const isDone = problem.reviewPhases[phase.key];
                  const locked = i > 0 && !problem.reviewPhases[REVIEW_PHASES[i - 1].key];
                  const due = addDays(problem.solvedDate || today, phase.offset);
                  const d = diffInDays(today, due);

                  return (
                    <button
                      key={phase.key}
                      className={`review-chip ${isDone ? "review-done" : ""} ${locked ? "review-locked" : ""} ${!isDone && !locked && d < 0 ? "review-overdue" : ""} ${!isDone && !locked && d === 0 ? "review-today" : ""}`}
                      onClick={() => onToggleReview(topicId, problem.id, phase.key)}
                      disabled={locked}
                    >
                      <span>{isDone ? "✓" : phase.label}</span>
                      <span className="review-chip-hint">
                        {isDone ? "Done" : locked ? "Locked" : getRelativeLabel(d)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="detail-actions">
            <button className="btn-sm btn-danger" onClick={() => onDelete(topicId, problem.id)}>
              {Icons.trash} Remove
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════
//  FORMS
// ══════════════════════════════════════════════════
function TopicForm({ onSubmit, onCancel, today }) {
  const [form, setForm] = useState({
    title: "",
    startDate: today,
    notes: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <form
      className="form-card"
      onSubmit={(e) => {
        e.preventDefault();
        if (!form.title.trim()) return;
        onSubmit(form);
      }}
    >
      <h4 className="form-title">New Topic</h4>
      <div className="form-grid-2">
        <label className="form-field">
          <span>Topic Title</span>
          <input
            type="text"
            name="title"
            placeholder="e.g. Dynamic Programming"
            value={form.title}
            onChange={handleChange}
            required
            autoFocus
          />
        </label>
        <label className="form-field">
          <span>Start Date</span>
          <input
            type="date"
            name="startDate"
            value={form.startDate}
            onChange={handleChange}
            required
          />
        </label>
      </div>
      <label className="form-field">
        <span>Notes (optional)</span>
        <textarea
          name="notes"
          placeholder="Key concepts, formulas, or focus areas..."
          rows="3"
          value={form.notes}
          onChange={handleChange}
        />
      </label>
      <div className="form-actions">
        <button type="submit" className="btn-primary">
          {Icons.plus} Create Topic
        </button>
        <button type="button" className="btn-ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function TopicEditForm({ topic, onSave, onCancel }) {
  const [form, setForm] = useState({
    title: topic.title,
    notes: topic.notes,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <form
      className="form-card"
      onSubmit={(e) => {
        e.preventDefault();
        if (!form.title.trim()) return;
        onSave({ title: form.title.trim(), notes: form.notes.trim() });
      }}
    >
      <h4 className="form-title">Edit Topic</h4>
      <label className="form-field">
        <span>Title</span>
        <input type="text" name="title" value={form.title} onChange={handleChange} required autoFocus />
      </label>
      <label className="form-field">
        <span>Notes</span>
        <textarea name="notes" rows="4" value={form.notes} onChange={handleChange} />
      </label>
      <div className="form-actions">
        <button type="submit" className="btn-primary">Save Changes</button>
        <button type="button" className="btn-ghost" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

function ProblemForm({ onSubmit, onCancel }) {
  const [form, setForm] = useState({
    name: "",
    platform: PLATFORMS[0],
    difficulty: DIFFICULTY[1],
    link: "",
    status: "unsolved",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <form
      className="form-card"
      onSubmit={(e) => {
        e.preventDefault();
        if (!form.name.trim()) return;
        onSubmit(form);
      }}
    >
      <h4 className="form-title">Add Problem</h4>
      <div className="form-grid-2">
        <label className="form-field">
          <span>Problem Name</span>
          <input
            type="text"
            name="name"
            placeholder="e.g. Two Sum"
            value={form.name}
            onChange={handleChange}
            required
            autoFocus
          />
        </label>
        <label className="form-field">
          <span>Link</span>
          <input
            type="url"
            name="link"
            placeholder="https://..."
            value={form.link}
            onChange={handleChange}
          />
        </label>
      </div>
      <div className="form-grid-3">
        <label className="form-field">
          <span>Platform</span>
          <select name="platform" value={form.platform} onChange={handleChange}>
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </label>
        <label className="form-field">
          <span>Difficulty</span>
          <select name="difficulty" value={form.difficulty} onChange={handleChange}>
            {DIFFICULTY.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </label>
        <label className="form-field">
          <span>Status</span>
          <select name="status" value={form.status} onChange={handleChange}>
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="form-actions">
        <button type="submit" className="btn-primary">
          {Icons.plus} Add Problem
        </button>
        <button type="button" className="btn-ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
