import React from "react";
import "./TopicsListView.css";
import { Icons } from "../Icons";
import { formatDate, diffInDays, addDays } from "../utils";
import { REVIEW_PHASES } from "../constants";
import { TopicForm } from "./Forms";

export default function TopicsListView({
  topics,
  today,
  showForm,
  onShowForm,
  onAddTopic,
  onDeleteTopic,
  onSelectTopic,
}) {
  return (
    <div className="topics-view">
      {/* ── Header ── */}
      <header className="topics-head">
        <div>
          <h2 className="topics-title">Topics</h2>
          <p className="topics-subtitle">
            {topics.length === 0
              ? "No topics yet — add your first one"
              : `${topics.length} topic${topics.length === 1 ? "" : "s"}`}
          </p>
        </div>
        {topics.length > 0 && !showForm && (
          <button className="btn-primary" onClick={() => onShowForm(true)}>
            {Icons.plus} New topic
          </button>
        )}
      </header>

      {/* ── New-topic form ── */}
      {showForm && (
        <TopicForm
          onSubmit={onAddTopic}
          onCancel={() => onShowForm(false)}
        />
      )}

      {/* ── Topic cards ── */}
      <div className="topics-grid">
        {topics.length === 0 ? (
          <div className="topics-empty">
            <span className="topics-empty-icon">{Icons.book}</span>
            <h3>No topics yet</h3>
            <p>
              Create a topic for each concept you're studying (e.g. "Arrays",
              "Dynamic Programming").
            </p>
            {!showForm && (
              <button className="btn-primary" onClick={() => onShowForm(true)}>
                {Icons.plus} New topic
              </button>
            )}
          </div>
        ) : (
          topics.map((topic) => {
            const problems = topic.problems || [];
            const solved = problems.filter((p) => p.status === "solved").length;
            const total = problems.length;

            // Next pending review phase
            const nextPhase = REVIEW_PHASES.find((p) => !topic.notePhases[p.key]);
            const nextDue = nextPhase
              ? addDays(topic.startDate, nextPhase.offset)
              : null;
            const daysUntil = nextDue ? diffInDays(today, nextDue) : null;
            const isOverdue = daysUntil !== null && daysUntil < 0;
            const isDueToday = daysUntil === 0;
            const allDone = !nextPhase;

            const pillClass = allDone
              ? "status-complete"
              : isOverdue
              ? "status-overdue"
              : isDueToday
              ? "status-due"
              : "status-ontrack";

            const pillLabel = allDone
              ? "All reviewed"
              : isOverdue
              ? `Overdue by ${-daysUntil}d`
              : isDueToday
              ? "Review today"
              : `Review in ${daysUntil}d`;

            return (
              <div
                key={topic.id}
                className="topic-card"
                onClick={() => onSelectTopic(topic.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && onSelectTopic(topic.id)}
              >
                {/* Delete button */}
                <button
                  className="topic-delete-btn"
                  title="Delete topic"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteTopic(topic.id);
                  }}
                >
                  {Icons.trash}
                </button>

                <div className="topic-card-top">
                  <h3 className="topic-card-title">{topic.title}</h3>
                  <span className={`status-pill ${pillClass}`}>{pillLabel}</span>
                </div>

                <p className="topic-card-meta">
                  {Icons.clock} Started {formatDate(topic.startDate)}
                </p>

                {topic.notes && (
                  <p className="topic-card-notes" title={topic.notes}>
                    {topic.notes.length > 100
                      ? topic.notes.slice(0, 100) + "…"
                      : topic.notes}
                  </p>
                )}

                <div className="topic-card-stats">
                  <div className="topic-stat">
                    <span className="topic-stat-label">{Icons.code} Problems</span>
                    <span className="topic-stat-value">
                      {solved}
                      <span className="topic-stat-denom">/{total}</span>
                    </span>
                  </div>
                  <div className="topic-stat">
                    <span className="topic-stat-label">{Icons.check} Reviews done</span>
                    <span className="topic-stat-value">
                      {REVIEW_PHASES.filter((p) => topic.notePhases[p.key]).length}
                      <span className="topic-stat-denom">/{REVIEW_PHASES.length}</span>
                    </span>
                  </div>
                </div>

                {total > 0 && (
                  <div className="topic-progress-track">
                    <div
                      className="topic-progress-fill"
                      style={{ width: `${Math.round((solved / total) * 100)}%` }}
                    />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
