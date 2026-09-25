import React, { useState, useMemo, useRef } from "react";
import "./TopicDetailView.css";
import { Icons } from "../Icons";
import { formatDate, addDays, diffInDays, getRelativeLabel } from "../utils";
import { REVIEW_PHASES } from "../constants";
import ProblemCard from "./ProblemCard";
import { TopicEditForm, ProblemForm } from "./Forms";

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
      <section className="content-section">
        <div className="section-header">
          <h3>{Icons.book} Notes &amp; Revision</h3>
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

      {/* ── Practice Problems ── */}
      <section className="content-section">
        <div className="section-header">
          <h3>{Icons.code} Practice Problems</h3>
          <div className="section-header-actions">
            <button
              className="btn-sm btn-accent"
              onClick={() => onSetShowProblemForm(!showProblemForm)}
            >
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
              { key: "all",       label: "All" },
              { key: "solved",    label: "Solved" },
              { key: "attempted", label: "Attempted" },
              { key: "unsolved",  label: "Unsolved" },
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
