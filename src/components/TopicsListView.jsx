import React from "react";
import "./TopicsListView.css";
import { Icons } from "../Icons";
import { REVIEW_PHASES } from "../constants";
import { addDays, diffInDays, formatDate } from "../utils";
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

            let noteStatus = null;
            if (!isComplete) {
              const nextPhase = REVIEW_PHASES.find((p) => !topic.notePhases[p.key]);
              if (nextPhase) {
                const due = addDays(topic.startDate, nextPhase.offset);
                const d = diffInDays(today, due);
                if (d < 0)      noteStatus = { text: `${Math.abs(d)}d overdue`, kind: "overdue" };
                else if (d === 0) noteStatus = { text: "Due today", kind: "due" };
                else if (d <= 2)  noteStatus = { text: `Due in ${d}d`, kind: "soon" };
                else              noteStatus = { text: `In ${d}d`, kind: "ontrack" };
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
                    <p className="topic-card-notes">
                      {topic.notes.length > 80 ? topic.notes.slice(0, 80) + "…" : topic.notes}
                    </p>
                  </div>
                )}

                <div className="topic-card-stats-grid">
                  <div className="topic-card-stat-box">
                    <span className="stat-box-label">{Icons.book} Notes Review</span>
                    <span className="stat-box-value">{progress}%</span>
                  </div>
                  <div className="topic-card-stat-box">
                    <span className="stat-box-label">{Icons.code} Problems</span>
                    <span className="stat-box-value">
                      {solvedCount}
                      <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>/{problemCount}</span>
                    </span>
                  </div>
                </div>

                <div className="progress-bar">
                  <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
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
