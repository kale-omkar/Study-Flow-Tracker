import React, { useMemo } from "react";
import "./DashboardView.css";
import { Icons } from "../Icons";
import { formatDate, getRelativeLabel, addDays } from "../utils";

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

  // The headline states the one thing that actually matters today,
  // instead of a generic "Dashboard" title.
  const headline = useMemo(() => {
    const due = stats.reviewsDueToday;
    const overdue = stats.overdueCount;
    if (due > 0 && overdue > 0) {
      return `${due} review${due === 1 ? "" : "s"} due today, ${overdue} overdue`;
    }
    if (due > 0) return `${due} review${due === 1 ? "" : "s"} due today`;
    if (overdue > 0) return `${overdue} review${overdue === 1 ? "" : "s"} overdue`;
    return "You're all caught up";
  }, [stats.reviewsDueToday, stats.overdueCount]);

  // Bucket the next 7 days of upcoming reviews so the week's
  // workload can be scanned at a glance before diving into the list.
  const dayBuckets = useMemo(() => {
    const buckets = Array.from({ length: 7 }, (_, i) => {
      const date = addDays(today, i);
      const d = new Date(`${date}T00:00:00`);
      return {
        date,
        label: i === 0 ? "Today" : d.toLocaleDateString("en-US", { weekday: "short" }),
        count: 0,
      };
    });
    upcomingReviews.forEach((item) => {
      if (item.daysUntil >= 0 && item.daysUntil <= 6) {
        buckets[item.daysUntil].count += 1;
      }
    });
    return buckets;
  }, [upcomingReviews, today]);

  const maxBucket = Math.max(1, ...dayBuckets.map((b) => b.count));

  return (
    <div className="dash-root">
      {/* ── Header ── */}
      <header className="dash-head">
        <div>
          <h1 className="dash-headline">{headline}</h1>
          <p className="dash-date">{formatDate(today)}</p>
        </div>
        <button className="dash-add-btn" onClick={onAddTopic}>
          {Icons.plus} New topic
        </button>
      </header>

      {/* ── KPI cards — each tinted to what it means, not four
         identical white boxes ── */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <span className="kpi-value">{stats.totalTopics}</span>
          <span className="kpi-label">Topics</span>
        </div>

        <div className="kpi-card kpi-card--green kpi-card--wide">
          <span className="kpi-value">
            {stats.solvedProblems}
            <span className="kpi-denom">/{stats.totalProblems}</span>
          </span>
          <span className="kpi-label">Problems solved</span>
          <div className="kpi-track">
            <div className="kpi-fill" style={{ width: `${solvedPct}%` }} />
          </div>
        </div>

        <div className={`kpi-card ${stats.reviewsDueToday > 0 ? "kpi-card--gold" : ""}`}>
          <span className="kpi-value">{stats.reviewsDueToday}</span>
          <span className="kpi-label">Due today</span>
        </div>

        <div className={`kpi-card ${stats.overdueCount > 0 ? "kpi-card--coral" : ""}`}>
          <span className="kpi-value">{stats.overdueCount}</span>
          <span className="kpi-label">Overdue</span>
        </div>
      </div>

      {/* ── This week ── */}
      <section className="week-strip">
        <span className="week-strip-label">This week</span>
        <div className="week-bars">
          {dayBuckets.map((b, i) => (
            <div className={`week-bar-col ${i === 0 ? "is-today" : ""}`} key={b.date}>
              <span className="week-bar-count">{b.count > 0 ? b.count : ""}</span>
              <div className="week-bar-track">
                <div
                  className="week-bar-fill"
                  style={{ height: `${b.count > 0 ? (b.count / maxBucket) * 100 : 4}%` }}
                />
              </div>
              <span className="week-bar-day">{b.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Two-column body ── */}
      <div className="dash-cols">
        {/* Today's Actions — primary */}
        <section className="panel panel--primary">
          <div className="panel-top">
            <h2 className="panel-h">Today's actions</h2>
            <span className="panel-count">{todaysActions.length}</span>
          </div>

          {todaysActions.length > 0 ? (
            <ul className="task-list">
              {todaysActions.map((action, i) => (
                <li key={i} className="task-row">
                  <span className={`task-icon task-icon--${action.type}`}>
                    {action.type === "note" ? Icons.book : Icons.code}
                  </span>
                  <div className="task-body">
                    <span className="task-label">{action.label}</span>
                    <button
                      className="task-topic"
                      onClick={() => onNavigateToTopic(action.topicId)}
                    >
                      {action.topicTitle}
                    </button>
                  </div>
                  <button
                    className="task-done"
                    title="Mark done"
                    onClick={() => {
                      if (action.type === "note") {
                        onToggleNotePhase(action.topicId, action.phaseKey);
                      } else {
                        onToggleProblemReview(action.topicId, action.problemId, action.phaseKey);
                      }
                    }}
                  >
                    {Icons.check}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="panel-empty">
              <span className="panel-empty-icon">{Icons.check}</span>
              <p>All caught up for today.</p>
            </div>
          )}
        </section>

        {/* Upcoming — secondary */}
        <section className="panel">
          <div className="panel-top">
            <h2 className="panel-h">Upcoming</h2>
            <span className="panel-count">{upcomingReviews.length}</span>
          </div>

          {upcomingReviews.length > 0 ? (
            <ul className="upcoming-list">
              {upcomingReviews.map((item, i) => (
                <li
                  key={i}
                  className="upcoming-row"
                  onClick={() => onNavigateToTopic(item.topicId)}
                >
                  <span className={`upcoming-icon upcoming-icon--${item.type}`}>
                    {item.type === "note" ? Icons.book : Icons.code}
                  </span>
                  <div className="upcoming-body">
                    <span className="upcoming-title">{item.title}</span>
                    <span className="upcoming-meta">
                      {item.phase}
                      {item.topicTitle && item.type === "problem" ? ` · ${item.topicTitle}` : ""}
                    </span>
                  </div>
                  <span className={`upcoming-when ${item.daysUntil === 0 ? "when-today" : ""}`}>
                    {getRelativeLabel(item.daysUntil)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="panel-empty">
              <span className="panel-empty-icon">{Icons.clock}</span>
              <p>Nothing in the next 7 days.</p>
              {topics.length === 0 && (
                <button className="dash-add-btn" onClick={onAddTopic}>
                  {Icons.plus} Add your first topic
                </button>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}