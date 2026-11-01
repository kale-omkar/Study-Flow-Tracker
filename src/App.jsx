import React, { useEffect, useMemo, useState, useCallback } from "react";
import "./App.css";

import { STORAGE_KEY, REVIEW_PHASES } from "./constants";
import {
  loadData,
  createId,
  getTodayString,
  addDays,
  diffInDays,
} from "./utils";
import { parseXlsx } from "./xlsxParser";
import { Icons } from "./Icons";

import DashboardView from "./components/DashboardView.jsx";
import TopicsListView from "./components/TopicsListView.jsx";
import TopicDetailView from "./components/TopicDetailView.jsx";
import ProblemsView from "./components/ProblemsView.jsx";
import LibraryView from "./components/LibraryView.jsx";
import ReviewSession from "./components/Reviewsession.jsx";
import PracticeTimer from "./components/Practicetimer.jsx";
import ProblemSheet from "./components/problemsheet.jsx";
import StudyInsights from "./components/StudyInsights.jsx";
import { ConfirmDialog } from "./components/Forms.jsx";

import { useStudyStore, buildPool, metaKey } from "./study/store";
import { ROADMAP, leetcodeUrl, topicNotesFor } from "./study/roadmap";

// ──────────────────────────────────────────────────
//  App — state, handlers, routing, sidebar only
// ──────────────────────────────────────────────────
export default function App() {
  const [data, setData] = useState(loadData);
  const [activeView, setActiveView] = useState("dashboard");
  const [selectedTopicId, setSelectedTopicId] = useState(null);
  const [showTopicForm, setShowTopicForm] = useState(false);
  const [showProblemForm, setShowProblemForm] = useState(false);
  const [editingTopic, setEditingTopic] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const study = useStudyStore();
  const [reviewQueue, setReviewQueue] = useState(null);
  const [sheetKey, setSheetKey] = useState(null);

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
    [],
  );

  const setProblems = useCallback(
    (updater) =>
      setData((prev) => ({
        ...prev,
        problems:
          typeof updater === "function"
            ? updater(prev.problems || [])
            : updater,
      })),
    [],
  );

  const selectedTopic = useMemo(
    () => topics.find((t) => t.id === selectedTopicId) || null,
    [topics, selectedTopicId],
  );

  // ── Everything due for review ───────────────────
  // One list covering topic notes, problems inside topics, and problems from the
  // imported list. (d < 0 means overdue, d === 0 means due today.)
  const reviewItems = useMemo(() => {
    const items = [];
    const phaseRows = (done, startDate, make) =>
      REVIEW_PHASES.forEach((phase, i) => {
        if (done[phase.key]) return;
        if (i > 0 && !done[REVIEW_PHASES[i - 1].key]) return;
        const due = addDays(startDate, phase.offset);
        items.push({
          ...make(phase),
          phaseKey: phase.key,
          phaseLabel: phase.label,
          due,
          d: diffInDays(today, due),
        });
      });

    topics.forEach((topic) => {
      phaseRows(topic.notePhases, topic.startDate, () => ({
        type: "note",
        topicId: topic.id,
        problemId: null,
        title: topic.title,
        topicTitle: topic.title,
        notes: topic.notes || "",
      }));
      (topic.problems || []).forEach((p) => {
        if (p.status !== "solved" || !p.reviewPhases) return;
        phaseRows(p.reviewPhases, p.solvedDate || topic.startDate, () => ({
          type: "problem",
          topicId: topic.id,
          problemId: p.id,
          name: p.name,
          title: p.name,
          topicTitle: topic.title,
          link: p.link,
        }));
      });
    });

    const solvedImported = new Map(
      problems.filter((p) => p.status === "solved").map((p) => [p.id, p]),
    );
    Object.entries(study.state.globalReviews).forEach(([problemId, review]) => {
      const p = solvedImported.get(problemId);
      if (!p) return;
      phaseRows(review.phases, review.startDate, () => ({
        type: "problem",
        topicId: null,
        problemId,
        name: p.name,
        title: p.name,
        topicTitle: p.topic || "Problems list",
        link: p.link,
      }));
    });
    return items;
  }, [topics, problems, study.state.globalReviews, today]);

  // Due today AND anything overdue, so a missed review stays visible until it's done.
  const todaysActions = useMemo(
    () =>
      reviewItems
        .filter((i) => i.d <= 0)
        .sort((a, b) => a.d - b.d)
        .map((i) => ({
          ...i,
          id: `${i.type}:${i.topicId || "imported"}:${i.problemId || ""}:${i.phaseKey}`,
          overdue: i.d < 0 ? -i.d : 0,
          label:
            i.type === "note"
              ? `Revise Notes — ${i.phaseLabel}`
              : `Review "${i.title}" — ${i.phaseLabel}`,
        })),
    [reviewItems],
  );

  const stats = useMemo(() => {
    const completedNotes = topics.filter((t) =>
      REVIEW_PHASES.every((p) => t.notePhases[p.key]),
    ).length;
    return {
      totalTopics: topics.length,
      completedNotes,
      totalProblems: problems.length,
      solvedProblems: problems.filter((p) => p.status === "solved").length,
      reviewsDueToday: reviewItems.filter((i) => i.d === 0).length,
      overdueCount: reviewItems.filter((i) => i.d < 0).length,
    };
  }, [topics, problems, reviewItems]);

  const upcomingReviews = useMemo(
    () =>
      reviewItems
        .filter((i) => i.d >= 0 && i.d <= 7)
        .map((i) => ({
          type: i.type,
          topicId: i.topicId,
          problemId: i.problemId,
          title: i.title,
          topicTitle: i.topicTitle,
          phase: i.phaseLabel,
          date: i.due,
          daysUntil: i.d,
        }))
        .sort((a, b) => a.daysUntil - b.daysUntil),
    [reviewItems],
  );

  // Everything you can practice, from topics and the imported list alike.
  const pool = useMemo(() => buildPool(topics, problems), [topics, problems]);

  // ── Handlers ────────────────────────────────────
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
      prev.map((t) => (t.id === topicId ? { ...t, ...updates } : t)),
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

  const requestDeleteTopic = (topicId) => {
    const topic = topics.find((t) => t.id === topicId);
    if (!topic) return;
    const count = (topic.problems || []).length;
    const problemsPart =
      count > 0 ? ` and its ${count} problem${count === 1 ? "" : "s"}` : "";
    setConfirmAction({
      title: "Delete this topic?",
      message: `"${topic.title}"${problemsPart} will be permanently deleted. This can't be undone.`,
      confirmLabel: "Delete topic",
      onConfirm: () => handleDeleteTopic(topicId),
    });
  };

  const handleToggleNotePhase = (topicId, phaseKey) => {
    setTopics((prev) =>
      prev.map((topic) => {
        if (topic.id !== topicId) return topic;
        const idx = REVIEW_PHASES.findIndex((p) => p.key === phaseKey);
        if (idx > 0 && !topic.notePhases[REVIEW_PHASES[idx - 1].key])
          return topic;
        const next = {
          ...topic.notePhases,
          [phaseKey]: !topic.notePhases[phaseKey],
        };
        if (topic.notePhases[phaseKey])
          REVIEW_PHASES.slice(idx + 1).forEach((p) => (next[p.key] = false));
        return { ...topic, notePhases: next };
      }),
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
        t.id === topicId ? { ...t, problems: [newProblem, ...t.problems] } : t,
      ),
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
      }),
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
            if (idx > 0 && !p.reviewPhases[REVIEW_PHASES[idx - 1].key])
              return p;
            const next = {
              ...p.reviewPhases,
              [phaseKey]: !p.reviewPhases[phaseKey],
            };
            if (p.reviewPhases[phaseKey])
              REVIEW_PHASES.slice(idx + 1).forEach(
                (ph) => (next[ph.key] = false),
              );
            return { ...p, reviewPhases: next };
          }),
        };
      }),
    );
  };

  const handleDeleteProblem = (topicId, problemId) => {
    setTopics((prev) =>
      prev.map((t) =>
        t.id === topicId
          ? { ...t, problems: t.problems.filter((p) => p.id !== problemId) }
          : t,
      ),
    );
  };

  const requestDeleteProblem = (topicId, problemId) => {
    const topic = topics.find((t) => t.id === topicId);
    const problem = topic?.problems.find((p) => p.id === problemId);
    setConfirmAction({
      title: "Remove this problem?",
      message: `"${problem?.name}" will be removed from ${topic?.title}.`,
      confirmLabel: "Remove",
      onConfirm: () => handleDeleteProblem(topicId, problemId),
    });
  };

  const handleImportXlsx = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = parseXlsx(new Uint8Array(e.target.result));
        if (parsed.length === 0) {
          alert(
            "No problems found. Check that the file has a 'Problem' column.",
          );
          return;
        }
        setProblems((prev) => {
          const existingNames = new Set(prev.map((p) => p.name.toLowerCase()));
          const newProblems = parsed
            .filter((row) => !existingNames.has(row.name.toLowerCase()))
            .map((row) => {
              const status = row.importedStatus || "unsolved";
              return {
                id: createId(),
                name: row.name,
                platform: row.platform,
                difficulty: row.difficulty,
                link: row.link,
                topic: row.topic,
                track: row.track || "dsa",
                status,
                solvedDate: status === "solved" ? getTodayString() : null,
                addedAt: new Date().toISOString(),
              };
            });
          const dsaCount = newProblems.filter((p) => p.track === "dsa").length;
          const sqlCount = newProblems.filter((p) => p.track === "sql").length;
          const trackSummary = sqlCount > 0 ? ` (${dsaCount} DSA, ${sqlCount} SQL)` : "";
          alert(
            `Imported ${newProblems.length} problems${trackSummary}. (${parsed.length - newProblems.length} duplicates skipped)`,
          );
          return [...prev, ...newProblems];
        });
      } catch (err) {
        console.error(err);
        alert(
          "Failed to parse the file. Make sure it's a valid .xlsx/.xls file.",
        );
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
          : p,
      ),
    );
  };

  const handleDeleteGlobalProblem = (problemId) => {
    setProblems((prev) => prev.filter((p) => p.id !== problemId));
  };

  const requestDeleteGlobalProblem = (problemId) => {
    const problem = problems.find((p) => p.id === problemId);
    setConfirmAction({
      title: "Remove this problem?",
      message: `"${problem?.name}" will be removed from your problems list.`,
      confirmLabel: "Remove",
      onConfirm: () => handleDeleteGlobalProblem(problemId),
    });
  };

  const requestClearAllGlobalProblems = () => {
    if (!problems.length) return;
    setConfirmAction({
      title: "Remove all problems?",
      message: `All ${problems.length} imported problems will be removed from your problems list. Topics will not be affected.`,
      confirmLabel: "Remove all",
      onConfirm: () => setProblems([]),
    });
  };

  const navigateToTopic = (topicId) => {
    setSelectedTopicId(topicId);
    setActiveView("topic-detail");
  };

  const openNewTopic = () => {
    setActiveView("topics");
    setShowTopicForm(true);
  };

  // ── Study features ──────────────────────────────
  const getMeta = (name) => study.state.meta[metaKey(name)] || {};
  const timerActive = !!study.state.timer;

  const findTopicItem = (topicId, problemId) =>
    pool.find(
      (p) =>
        p.source === "topic" && p.topicId === topicId && p.id === problemId,
    );
  const findImportedItem = (problemId) =>
    pool.find((p) => p.source === "global" && p.id === problemId);

  // The one place a problem's status changes. It also keeps the activity log
  // (for streaks) and the imported-problem review schedule in step.
  const applyStatus = (item, status, extra = {}) => {
    const { force, ...logExtra } = extra;
    if (item.source === "topic")
      handleUpdateProblemStatus(item.topicId, item.id, status);
    else handleUpdateGlobalProblemStatus(item.id, status);

    const changed = status !== item.status;
    if (!changed && !force) return;
    const base = { name: item.name, difficulty: item.difficulty, ...logExtra };
    if (status === "solved") {
      study.log("solve", base);
      if (item.source === "global") study.startGlobalReview(item.id);
    } else if (status === "attempted") {
      study.log("attempt", base);
    }
    if (
      changed &&
      item.status === "solved" &&
      status !== "solved" &&
      item.source === "global"
    ) {
      study.stopGlobalReview(item.id);
    }
  };

  const handleProblemStatus = (topicId, problemId, status) => {
    const item = findTopicItem(topicId, problemId);
    if (item) applyStatus(item, status);
    else handleUpdateProblemStatus(topicId, problemId, status);
  };

  const handleImportedStatus = (problemId, status) => {
    const item = findImportedItem(problemId);
    if (item) applyStatus(item, status);
    else handleUpdateGlobalProblemStatus(problemId, status);
  };

  // Review toggles. `only` makes them one-way (mark done, never undo), which is
  // what a review session needs.
  const toggleNote = (topicId, phaseKey, extra = {}) => {
    const { only, ...logExtra } = extra;
    const topic = topics.find((t) => t.id === topicId);
    const wasDone = !!topic?.notePhases?.[phaseKey];
    if (only && wasDone) return;
    handleToggleNotePhase(topicId, phaseKey);
    if (topic && !wasDone)
      study.log("review", { name: topic.title, ...logExtra });
  };

  const toggleProblemReview = (topicId, problemId, phaseKey, extra = {}) => {
    const { only, ...logExtra } = extra;
    if (topicId == null) {
      const wasDone =
        !!study.state.globalReviews[problemId]?.phases?.[phaseKey];
      if (only && wasDone) return;
      study.toggleGlobalReview(problemId, phaseKey);
      if (!wasDone)
        study.log("review", {
          name: problems.find((p) => p.id === problemId)?.name,
          ...logExtra,
        });
      return;
    }
    const problem = topics
      .find((t) => t.id === topicId)
      ?.problems.find((p) => p.id === problemId);
    const wasDone = !!problem?.reviewPhases?.[phaseKey];
    if (only && wasDone) return;
    handleToggleProblemReview(topicId, problemId, phaseKey);
    if (problem && !wasDone)
      study.log("review", { name: problem.name, ...logExtra });
  };

  // Review session
  const startReview = () => {
    if (todaysActions.length)
      setReviewQueue(todaysActions.map((a) => ({ ...a })));
  };
  const handleReviewRate = (card, rating) => {
    const name = card.type === "note" ? card.title : card.name;
    if (rating === "forgot") {
      study.log("review", { name, rating });
      return;
    }
    if (card.type === "note")
      toggleNote(card.topicId, card.phaseKey, { rating, only: true });
    else {
      toggleProblemReview(card.topicId, card.problemId, card.phaseKey, {
        rating,
        only: true,
      });
      study.setMeta(card.name, {
        confidence: { hard: 1, good: 2, easy: 3 }[rating],
      });
    }
  };

  // Practice timer
  const startPractice = (item) => {
    if (!item || study.state.timer) return;
    study.startTimer(item);
    if (item.link) window.open(item.link, "_blank", "noopener,noreferrer");
  };
  const finishPractice = (outcome, minutes) => {
    const t = study.state.timer;
    if (!t) return;
    study.cancelTimer();
    const item = pool.find(
      (p) =>
        p.source === t.source &&
        p.id === t.id &&
        (t.source === "global" || p.topicId === t.topicId),
    );
    if (!item) return;
    applyStatus(item, outcome === "unfinished" ? "attempted" : "solved", {
      minutes,
      force: true,
      ...(outcome === "hints" ? { hints: true } : {}),
    });
  };

  // Problem sheet (notes + timer for one problem)
  const sheetItem = sheetKey ? pool.find((p) => p.key === sheetKey) : null;

  // Library: create a topic, with its problems, from a roadmap pattern
  const addedTitles = useMemo(
    () => new Set(topics.map((t) => t.title.trim().toLowerCase())),
    [topics],
  );
  const handleAddRoadmapTopic = (group) => {
    const nowIso = new Date().toISOString();
    setTopics((prev) => [
      {
        id: createId(),
        title: group.title,
        startDate: today,
        notes: topicNotesFor(group),
        createdAt: nowIso,
        notePhases: REVIEW_PHASES.reduce((acc, p) => {
          acc[p.key] = false;
          return acc;
        }, {}),
        problems: group.problems.map((p) => ({
          id: createId(),
          name: p.name,
          platform: "LeetCode",
          difficulty: p.difficulty,
          link: leetcodeUrl(p.slug),
          status: "unsolved",
          solvedDate: null,
          addedAt: nowIso,
          reviewPhases: null,
        })),
      },
      ...prev,
    ]);
  };
  const viewTopicByTitle = (title) => {
    const t = topics.find(
      (x) => x.title.trim().toLowerCase() === title.trim().toLowerCase(),
    );
    if (t) navigateToTopic(t.id);
  };

  // ── Render ──────────────────────────────────────
  return (
    <div className={`app-shell ${timerActive ? "has-timer" : ""}`}>
      {/* ── Top navigation ── */}
      <header className="topbar">
        <div className="topbar-inner">
          <button className="brand" onClick={() => setActiveView("dashboard")}>
            Study Flow
          </button>

          <nav className="topbar-links" aria-label="Main">
            <button
              className={`nav-item ${activeView === "dashboard" ? "active" : ""}`}
              onClick={() => setActiveView("dashboard")}
            >
              Dashboard
              {stats.reviewsDueToday + stats.overdueCount > 0 && (
                <span className="nav-badge">
                  {stats.reviewsDueToday + stats.overdueCount}
                </span>
              )}
            </button>
            <button
              className={`nav-item ${activeView === "topics" || activeView === "topic-detail" ? "active" : ""}`}
              onClick={() => setActiveView("topics")}
            >
              Topics
            </button>
            <button
              className={`nav-item ${activeView === "problems" ? "active" : ""}`}
              onClick={() => setActiveView("problems")}
            >
              Problems
            </button>
            <button
              className={`nav-item ${activeView === "library" ? "active" : ""}`}
              onClick={() => setActiveView("library")}
            >
              Library
            </button>
          </nav>

          {activeView !== "topics" && activeView !== "topic-detail" && (
            <button className="btn-primary topbar-cta" onClick={openNewTopic}>
              {Icons.plus} New topic
            </button>
          )}
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="main-area">
        {activeView === "dashboard" && (
          <DashboardView
            stats={stats}
            todaysActions={todaysActions}
            upcomingReviews={upcomingReviews}
            topics={topics}
            today={today}
            onToggleNotePhase={toggleNote}
            onToggleProblemReview={toggleProblemReview}
            onNavigateToTopic={(id) =>
              id ? navigateToTopic(id) : setActiveView("problems")
            }
            onAddTopic={openNewTopic}
            onStartReview={startReview}
            insights={
              <StudyInsights
                pool={pool}
                activity={study.state.activity}
                today={today}
                timerActive={timerActive}
                onStart={startPractice}
                onOpen={(item) => setSheetKey(item.key)}
                onGoLibrary={() => setActiveView("library")}
                onGoProblems={() => setActiveView("problems")}
              />
            }
          />
        )}

        {activeView === "topics" && (
          <TopicsListView
            topics={topics}
            today={today}
            showForm={showTopicForm}
            onShowForm={setShowTopicForm}
            onAddTopic={handleAddTopic}
            onDeleteTopic={requestDeleteTopic}
            onSelectTopic={navigateToTopic}
          />
        )}

        {activeView === "problems" && (
          <ProblemsView
            problems={problems}
            onImportXlsx={handleImportXlsx}
            onUpdateStatus={handleImportedStatus}
            onDelete={requestDeleteGlobalProblem}
            onClearAll={requestClearAllGlobalProblems}
            onOpenProblem={(p) => setSheetKey(`g:${p.id}`)}
          />
        )}

        {activeView === "library" && (
          <LibraryView
            groups={ROADMAP}
            addedTitles={addedTitles}
            onAdd={handleAddRoadmapTopic}
            onViewTopic={viewTopicByTitle}
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
            onDeleteTopic={requestDeleteTopic}
            onToggleNotePhase={toggleNote}
            onAddProblem={handleAddProblem}
            onUpdateProblemStatus={handleProblemStatus}
            onToggleProblemReview={toggleProblemReview}
            onDeleteProblem={requestDeleteProblem}
            onBack={() => setActiveView("topics")}
            getMeta={getMeta}
            onMetaChange={study.setMeta}
            onSolveProblem={(t, p) => startPractice(findTopicItem(t.id, p.id))}
            timerActive={timerActive}
          />
        )}
      </main>

      <PracticeTimer
        timer={study.state.timer}
        onPause={study.pauseTimer}
        onResume={study.resumeTimer}
        onCancel={study.cancelTimer}
        onFinish={finishPractice}
      />

      {sheetItem && (
        <ProblemSheet
          item={sheetItem}
          meta={getMeta(sheetItem.name)}
          timerActive={timerActive}
          onClose={() => setSheetKey(null)}
          onMetaChange={study.setMeta}
          onStatus={applyStatus}
          onSolve={(item) => {
            setSheetKey(null);
            startPractice(item);
          }}
        />
      )}

      {reviewQueue && (
        <ReviewSession
          queue={reviewQueue}
          getMeta={getMeta}
          onMetaChange={study.setMeta}
          onRate={handleReviewRate}
          onClose={() => setReviewQueue(null)}
        />
      )}

      {confirmAction && (
        <ConfirmDialog
          title={confirmAction.title}
          message={confirmAction.message}
          confirmLabel={confirmAction.confirmLabel}
          onConfirm={() => {
            confirmAction.onConfirm();
            setConfirmAction(null);
          }}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  );
}
