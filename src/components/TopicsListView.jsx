import React, { useState, useMemo } from "react";
import "./TopicDetailView.css";
import { Icons } from "../Icons";
import { formatDate, addDays, diffInDays, getRelativeLabel } from "../utils";
import { REVIEW_PHASES } from "../constants";
import ProblemCard from "./ProblemCard";
import { TopicEditForm, ProblemForm } from "./Forms";

const PROBLEM_FILTERS = [
  { key: "all", label: "All" },
  { key: "solved", label: "Solved" },
  { key: "attempted", label: "Attempted" },
  { key: "unsolved", label: "Unsolved" },
];

export default function TopicDetailView({
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
  onUpdateProblemStatus,
  onToggleProblemReview,
  onDeleteProblem,
  onBack,
}) {
  const problems = topic.problems || [];
  const [problemFilter, setProblemFilter] = useState("all");

  const filteredProblems = useMemo(() => {
    if (problemFilter === "all") return problems;
    return problems.filter((p) => p.status === problemFilter);
  }, [problems, problemFilter]);

  return (
    <div className="td-view">
      {/* ── Header ── */}
      <header className="td-head">
        <div>
          <button className="td-back" onClick={onBack}>
            {Icons.arrowLeft} Topics
          </button>
          <h2 className="td-title">{topic.title}</h2>
          <p className="td-subtitle">Started {formatDate(topic.startDate)}</p>
        </div>
        <div className="td-actions">
          <button
            className="td-btn"
            onClick={() => onSetEditingTopic(editingTopic ? null : topic.id)}
          >
            {Icons.edit} Edit
          </button>
          <button
            className="td-btn td-btn--danger"
            onClick={() => onDeleteTopic(topic.id)}
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

      {/* ── Notes & Revision ── */}
      <section className="td-section">
        <div className="td-section-head">
          <h3 className="td-section-title">
            <span className="td-section-icon td-section-icon--note">{Icons.book}</span>
            Notes &amp; revision
          </h3>
          <span className="td-section-badge">1-7-24 method</span>
        </div>

        <div className="td-section-body">
          {topic.notes && (
            <div className="td-notes">
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
                  <span className="phase-node">
                    {isDone ? Icons.check : locked ? Icons.lock : null}
                  </span>
                  <div className="phase-chip-info">
                    <span className="phase-chip-label">{phase.label}</span>
                    <span className="phase-chip-hint">
                      {isDone ? (
                        "Completed"
                      ) : locked ? (
                        "Complete previous first"
                      ) : (
                        <>
                          <span>{formatDate(due)}</span>
                          <span className="phase-chip-when">{getRelativeLabel(d)}</span>
                        </>
                      )}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Practice Problems ── */}
      <section className="td-section">
        <div className="td-section-head">
          <h3 className="td-section-title">
            <span className="td-section-icon td-section-icon--problem">{Icons.code}</span>
            Practice problems
            <span className="td-section-count">{problems.length}</span>
          </h3>
          <button
            className="td-add-btn"
            onClick={() => onSetShowProblemForm(!showProblemForm)}
          >
            {Icons.plus} Add problem
          </button>
        </div>

        {showProblemForm && (
          <div className="td-section-body td-section-body--form">
            <ProblemForm
              onSubmit={(data) => onAddProblem(topic.id, data)}
              onCancel={() => onSetShowProblemForm(false)}
            />
          </div>
        )}

        {problems.length > 0 && (
          <div className="td-section-body td-section-body--filters">
            <div className="problem-filters">
              {PROBLEM_FILTERS.map((f) => (
                <button
                  key={f.key}
                  className={`filter-chip ${problemFilter === f.key ? "filter-active" : ""}`}
                  onClick={() => setProblemFilter(f.key)}
                >
                  {f.label}
                  {f.key !== "all" && (
                    <span className="filter-count">
                      {problems.filter((p) => p.status === f.key).length}
                    </span>
                  )}
                </button>
              ))}
            </div>
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
            <div className="td-empty">
              <span className="td-empty-icon">{Icons.code}</span>
              <p className="td-empty-title">
                {problems.length === 0 ? "No problems yet" : "No problems match this filter"}
              </p>
              {problems.length === 0 && (
                <p className="td-empty-hint">Add the first problem you're practicing for this topic.</p>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}