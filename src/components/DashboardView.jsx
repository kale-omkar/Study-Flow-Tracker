import React from "react";
import { Icons } from "../Icons";
import { formatDate, getRelativeLabel } from "../utils";

export default function DashboardView({
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
  const solvedPct =
    stats.totalProblems > 0
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
          <div className="kpi-progress">
            <div className="kpi-progress-fill" style={{ width: `${solvedPct}%` }} />
          </div>
          <span className="kpi-pct">{solvedPct}% complete</span>
        </div>
        <div className={`kpi-card ${stats.reviewsDueToday > 0 ? "kpi-card--warn" : ""}`}>
          <span className="kpi-label">Due Today</span>
          <span className="kpi-value">{stats.reviewsDueToday}</span>
        </div>
        <div className={`kpi-card ${stats.overdueCount > 0 ? "kpi-card--danger" : ""}`}>
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
                  <span
                    className={`action-type-dot ${
                      action.type === "note" ? "dot--orange" : "dot--blue"
                    }`}
                  />
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
                      if (action.type === "note") {
                        onToggleNotePhase(action.topicId, action.phaseKey);
                      } else {
                        onToggleProblemReview(
                          action.topicId,
                          action.problemId,
                          action.phaseKey
                        );
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
                  <div
                    className={`review-badge ${
                      item.type === "note" ? "badge--note" : "badge--prob"
                    }`}
                  >
                    {item.type === "note" ? Icons.book : Icons.code}
                  </div>
                  <div className="review-info">
                    <span className="review-title">{item.title}</span>
                    <span className="review-meta">
                      {item.phase} Review
                      {item.topicTitle && item.type === "problem"
                        ? ` · ${item.topicTitle}`
                        : ""}
                    </span>
                  </div>
                  <span
                    className={`review-when ${
                      item.daysUntil === 0
                        ? "when--today"
                        : item.daysUntil < 0
                        ? "when--late"
                        : ""
                    }`}
                  >
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
                <button
                  className="btn-primary"
                  onClick={onAddTopic}
                  style={{ marginTop: 16 }}
                >
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
