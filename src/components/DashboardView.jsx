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
  onStartReview,
  insights,
}) {
  // Two-line headline: the lead in navy, the accent phrase in orange.
  // It states the one thing that matters today instead of a generic "Dashboard".
  const headline = useMemo(() => {
    const due = stats.reviewsDueToday;
    const overdue = stats.overdueCount;
    const reviews = (n) => `review${n === 1 ? "" : "s"}`;
    if (due > 0 && overdue > 0) {
      return { lead: `${due} ${reviews(due)} due today,`, accent: `${overdue} overdue` };
    }
    if (due > 0) return { lead: `${due} ${reviews(due)}`, accent: "due today" };
    if (overdue > 0) return { lead: `${overdue} ${reviews(overdue)}`, accent: "overdue" };
    return { lead: "You're all", accent: "caught up" };
  }, [stats.reviewsDueToday, stats.overdueCount]);

  const lede =
    stats.reviewsDueToday + stats.overdueCount > 0
      ? "Clear today's reviews to keep your notes and solved problems fresh. The 1-7-24 method only works when you show up."
      : "Nothing is due right now. Add a topic or solve a few problems to keep your momentum going.";

  // Bucket the next 7 days of upcoming reviews so the week's
  // workload can be scanned at a glance.
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
      {/* ── Hero: message on the left, today's actions on the right ── */}
      <section className="dash-hero">
        <div className="hero-copy">
          <h1 className="hero-headline">
            <span className="hero-lead">{headline.lead}</span>
            <span className="hero-accent">{headline.accent}</span>
          </h1>
          <p className="hero-sub">{lede}</p>

          <div className="hero-stats">
            <div className="hero-stat hero-stat--blue">
              <span className="hero-stat-num">{stats.totalTopics}</span>
              <span className="hero-stat-label">Topics</span>
            </div>
            <div className="hero-stat hero-stat--green">
              <span className="hero-stat-num">
                {stats.solvedProblems}
                <span className="hero-stat-denom">/{stats.totalProblems}</span>
              </span>
              <span className="hero-stat-label">Solved</span>
            </div>
            <div className={`hero-stat ${stats.reviewsDueToday > 0 ? "hero-stat--amber" : ""}`}>
              <span className="hero-stat-num">{stats.reviewsDueToday}</span>
              <span className="hero-stat-label">Due today</span>
            </div>
            <div className={`hero-stat ${stats.overdueCount > 0 ? "hero-stat--red" : ""}`}>
              <span className="hero-stat-num">{stats.overdueCount}</span>
              <span className="hero-stat-label">Overdue</span>
            </div>
          </div>
        </div>

        <section className="dash-card">
          <div className="card-head">
            <div className="card-titles">
              <h2 className="card-title">
                <span className="card-title-icon">{Icons.target}</span>
                Today's actions
              </h2>
              <p className="card-sub">{formatDate(today)}</p>
            </div>
            <span className="card-count">{todaysActions.length}</span>
          </div>

          {todaysActions.length > 0 ? (
            <>
            <ul className="task-list">
              {todaysActions.map((action, i) => (
                <li key={i} className="task-row">
                  <span className={`task-icon task-icon--${action.type}`}>
                    {action.type === "note" ? Icons.book : Icons.code}
                  </span>
                  <div className="task-body">
                    <span className="task-label">{action.label}</span>
                    <div className="task-meta">
                      <button
                        className="task-topic"
                        onClick={() => onNavigateToTopic(action.topicId)}
                      >
                        {action.topicTitle}
                      </button>
                      {action.overdue > 0 && <span className="task-overdue">{action.overdue}d overdue</span>}
                    </div>
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
            {onStartReview && (
              <button className="btn-primary review-start" onClick={onStartReview}>
                {Icons.play} Start review session
              </button>
            )}
            </>
          ) : (
            <div className="dash-empty">
              <span className="dash-empty-icon">{Icons.check}</span>
              <p>All caught up for today.</p>
            </div>
          )}
        </section>
      </section>

      {insights}

      {/* ── Coming up: the week at a glance, then the list ── */}
      <section className="dash-card dash-week">
        <div className="card-head">
          <div className="card-titles">
            <h2 className="card-title">
              <span className="card-title-icon">{Icons.clock}</span>
              Coming up
            </h2>
            <p className="card-sub">Reviews scheduled over the next 7 days</p>
          </div>
          <span className="card-count">{upcomingReviews.length}</span>
        </div>

        <div className="week-layout">
          <div className="week-bars">
            {dayBuckets.map((b, i) => (
              <div className={`week-bar-col ${i === 0 ? "is-today" : ""}`} key={b.date}>
                <span className="week-bar-count">{b.count > 0 ? b.count : ""}</span>
                <div className="week-bar-track">
                  <div
                    className="week-bar-fill"
                    style={{ height: `${b.count > 0 ? (b.count / maxBucket) * 100 : 3}%` }}
                  />
                </div>
                <span className="week-bar-day">{b.label}</span>
              </div>
            ))}
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
            <div className="dash-empty">
              <span className="dash-empty-icon">{Icons.clock}</span>
              <p>Nothing in the next 7 days.</p>
              {topics.length === 0 && (
                <button className="btn-primary" onClick={onAddTopic}>
                  {Icons.plus} Add your first topic
                </button>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
