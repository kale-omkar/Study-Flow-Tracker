import React, { useEffect, useMemo, useState, useCallback } from "react";
import "./App.css";

import { STORAGE_KEY, REVIEW_PHASES } from "./constants";
import { loadData, createId, getTodayString, addDays, diffInDays } from "./utils";
import { parseXlsx } from "./xlsxParser";
import { Icons } from "./Icons";

import DashboardView     from "./components/DashboardView";
import TopicsListView    from "./components/TopicsListView";
import TopicDetailView   from "./components/TopicDetailView";
import ProblemsView      from "./components/ProblemsView";

// ──────────────────────────────────────────────────
//  App — state, handlers, routing, sidebar only
// ──────────────────────────────────────────────────
export default function App() {
  const [data, setData]                   = useState(loadData);
  const [activeView, setActiveView]       = useState("dashboard");
  const [selectedTopicId, setSelectedTopicId] = useState(null);
  const [showTopicForm, setShowTopicForm] = useState(false);
  const [showProblemForm, setShowProblemForm] = useState(false);
  const [editingTopic, setEditingTopic]   = useState(null);

  const today    = getTodayString();
  const topics   = data.topics   || [];
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

  const selectedTopic = useMemo(
    () => topics.find((t) => t.id === selectedTopicId) || null,
    [topics, selectedTopicId]
  );

  // ── Aggregated today's actions ──────────────────
  const todaysActions = useMemo(() => {
    const actions = [];
    topics.forEach((topic) => {
      REVIEW_PHASES.forEach((phase, i) => {
        if (topic.notePhases[phase.key]) return;
        if (i > 0 && !topic.notePhases[REVIEW_PHASES[i - 1].key]) return;
        const due = addDays(topic.startDate, phase.offset);
        if (due === today) {
          actions.push({
            type: "note", topicId: topic.id, topicTitle: topic.title,
            label: `Revise Notes — ${phase.label}`, phaseKey: phase.key,
          });
        }
      });
      (topic.problems || []).forEach((problem) => {
        if (problem.status !== "solved") return;
        REVIEW_PHASES.forEach((phase, i) => {
          if (!problem.reviewPhases) return;
          if (problem.reviewPhases[phase.key]) return;
          if (i > 0 && !problem.reviewPhases[REVIEW_PHASES[i - 1].key]) return;
          const due = addDays(problem.solvedDate || topic.startDate, phase.offset);
          if (due === today) {
            actions.push({
              type: "problem", topicId: topic.id, problemId: problem.id,
              topicTitle: topic.title, label: `Review "${problem.name}" — ${phase.label}`,
              phaseKey: phase.key,
            });
          }
        });
      });
    });
    return actions;
  }, [topics, today]);

  // ── Stats ───────────────────────────────────────
  const stats = useMemo(() => {
    let totalTopics = topics.length, completedNotes = 0;
    let totalProblems = problems.length;
    let solvedProblems = problems.filter((p) => p.status === "solved").length;
    let reviewsDueToday = 0, overdueCount = 0;

    topics.forEach((topic) => {
      if (REVIEW_PHASES.every((p) => topic.notePhases[p.key])) completedNotes++;
      REVIEW_PHASES.forEach((phase, i) => {
        if (topic.notePhases[phase.key]) return;
        if (i > 0 && !topic.notePhases[REVIEW_PHASES[i - 1].key]) return;
        const due = addDays(topic.startDate, phase.offset);
        const d = diffInDays(today, due);
        if (d < 0)  overdueCount++;
        if (d === 0) reviewsDueToday++;
      });
    });

    return { totalTopics, completedNotes, totalProblems, solvedProblems, reviewsDueToday, overdueCount };
  }, [topics, problems, today]);

  // ── Upcoming reviews (next 7 days) ──────────────
  const upcomingReviews = useMemo(() => {
    const items = [];
    topics.forEach((topic) => {
      REVIEW_PHASES.forEach((phase, i) => {
        if (topic.notePhases[phase.key]) return;
        if (i > 0 && !topic.notePhases[REVIEW_PHASES[i - 1].key]) return;
        const due = addDays(topic.startDate, phase.offset);
        const d = diffInDays(today, due);
        if (d >= 0 && d <= 7)
          items.push({ type: "note", topicId: topic.id, title: topic.title, phase: phase.label, date: due, daysUntil: d });
      });
      (topic.problems || []).forEach((prob) => {
        if (prob.status !== "solved" || !prob.reviewPhases) return;
        REVIEW_PHASES.forEach((phase, i) => {
          if (prob.reviewPhases[phase.key]) return;
          if (i > 0 && !prob.reviewPhases[REVIEW_PHASES[i - 1].key]) return;
          const due = addDays(prob.solvedDate || topic.startDate, phase.offset);
          const d = diffInDays(today, due);
          if (d >= 0 && d <= 7)
            items.push({ type: "problem", topicId: topic.id, problemId: prob.id, title: prob.name, topicTitle: topic.title, phase: phase.label, date: due, daysUntil: d });
        });
      });
    });
    items.sort((a, b) => a.daysUntil - b.daysUntil);
    return items.slice(0, 8);
  }, [topics, today]);

  // ── Handlers ────────────────────────────────────
  const handleAddTopic = (formData) => {
    const newTopic = {
      id: createId(), title: formData.title.trim(), startDate: formData.startDate,
      notes: formData.notes.trim(), createdAt: new Date().toISOString(),
      notePhases: REVIEW_PHASES.reduce((acc, p) => { acc[p.key] = false; return acc; }, {}),
      problems: [],
    };
    setTopics((prev) => [newTopic, ...prev]);
    setShowTopicForm(false);
  };

  const handleUpdateTopic = (topicId, updates) => {
    setTopics((prev) => prev.map((t) => (t.id === topicId ? { ...t, ...updates } : t)));
    setEditingTopic(null);
  };

  const handleDeleteTopic = (topicId) => {
    setTopics((prev) => prev.filter((t) => t.id !== topicId));
    if (selectedTopicId === topicId) { setSelectedTopicId(null); setActiveView("topics"); }
  };

  const handleToggleNotePhase = (topicId, phaseKey) => {
    setTopics((prev) =>
      prev.map((topic) => {
        if (topic.id !== topicId) return topic;
        const idx = REVIEW_PHASES.findIndex((p) => p.key === phaseKey);
        if (idx > 0 && !topic.notePhases[REVIEW_PHASES[idx - 1].key]) return topic;
        const next = { ...topic.notePhases, [phaseKey]: !topic.notePhases[phaseKey] };
        if (topic.notePhases[phaseKey]) REVIEW_PHASES.slice(idx + 1).forEach((p) => (next[p.key] = false));
        return { ...topic, notePhases: next };
      })
    );
  };

  const handleAddProblem = (topicId, formData) => {
    const newProblem = {
      id: createId(), name: formData.name.trim(), platform: formData.platform,
      difficulty: formData.difficulty, link: formData.link.trim(), status: formData.status,
      solvedDate: formData.status === "solved" ? today : null,
      addedAt: new Date().toISOString(),
      reviewPhases: formData.status === "solved"
        ? REVIEW_PHASES.reduce((acc, p) => { acc[p.key] = false; return acc; }, {})
        : null,
    };
    setTopics((prev) =>
      prev.map((t) => t.id === topicId ? { ...t, problems: [newProblem, ...t.problems] } : t)
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
              updated.reviewPhases = REVIEW_PHASES.reduce((acc, ph) => { acc[ph.key] = false; return acc; }, {});
            }
            if (newStatus !== "solved") { updated.reviewPhases = null; updated.solvedDate = null; }
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
            if (p.reviewPhases[phaseKey]) REVIEW_PHASES.slice(idx + 1).forEach((ph) => (next[ph.key] = false));
            return { ...p, reviewPhases: next };
          }),
        };
      })
    );
  };

  const handleDeleteProblem = (topicId, problemId) => {
    setTopics((prev) =>
      prev.map((t) =>
        t.id === topicId ? { ...t, problems: t.problems.filter((p) => p.id !== problemId) } : t
      )
    );
  };

  const handleImportXlsx = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = parseXlsx(new Uint8Array(e.target.result));
        if (parsed.length === 0) { alert("No problems found. Check that the file has a 'Problem' column."); return; }
        setProblems((prev) => {
          const existingNames = new Set(prev.map((p) => p.name.toLowerCase()));
          const newProblems = parsed
            .filter((row) => !existingNames.has(row.name.toLowerCase()))
            .map((row) => ({
              id: createId(), name: row.name, platform: row.platform,
              difficulty: row.difficulty, link: row.link, topic: row.topic,
              status: "unsolved", solvedDate: null, addedAt: new Date().toISOString(),
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
          ? { ...p, status, solvedDate: status === "solved" ? getTodayString() : null }
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

  // ── Render ──────────────────────────────────────
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
            onAddTopic={() => { setActiveView("topics"); setShowTopicForm(true); }}
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
