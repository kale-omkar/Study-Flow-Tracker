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
    <div className="topics-view">
      <header className="topics-head">
        <div>
          <h2 className="topics-title">Topics</h2>
          <p className="topics-subtitle">Your study topics with notes and practice problems</p>
        </div>
        <button className="topics-add-btn" onClick={() => onShowForm(!showForm)}>
          {Icons.plus} New topic
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
                  <p className="topic-card-notes">
                    {topic.notes.length > 80 ? topic.notes.slice(0, 80) + "…" : topic.notes}
                  </p>
                )}

                <div className="topic-card-stats">
                  <div className="topic-stat">
                    <span className="topic-stat-label">{Icons.book} Notes review</span>
                    <span className="topic-stat-value">{progress}%</span>
                  </div>
                  <div className="topic-stat">
                    <span className="topic-stat-label">{Icons.code} Problems</span>
                    <span className="topic-stat-value">
                      {solvedCount}<span className="topic-stat-denom">/{problemCount}</span>
                    </span>
                  </div>
                </div>

                <div className="topic-progress-track">
                  <div className="topic-progress-fill" style={{ width: `${progress}%` }} />
                </div>

                <button
                  className="topic-delete-btn"
                  onClick={(e) => { e.stopPropagation(); onDeleteTopic(topic.id); }}
                  title="Delete topic"
                >
                  {Icons.trash}
                </button>
              </article>
            );
          })
        ) : (
          <div className="topics-empty">
            <span className="topics-empty-icon">{Icons.book}</span>
            <h3>No topics yet</h3>
            <p>Create your first study topic to get started with the notes → practice → review workflow.</p>
            <button className="topics-add-btn" onClick={() => onShowForm(true)}>
              {Icons.plus} Create topic
            </button>
          </div>
        )}
      </div>
    </div>
  );
}