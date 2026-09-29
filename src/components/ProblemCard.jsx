import React, { useState } from "react";
import "./ProblemCard.css";
import { Icons } from "../Icons";
import { REVIEW_PHASES, STATUS_OPTIONS } from "../constants";
import { addDays, diffInDays, getRelativeLabel } from "../utils";

// Status glyphs are drawn here (rather than taken from STATUS_OPTIONS) so
// they always match the icon set, whatever the constants file contains.
const STATUS_ICONS = {
  unsolved: Icons.circle,
  attempted: Icons.circleHalf,
  solved: Icons.check,
};

export default function ProblemCard({
  problem,
  topicId,
  today,
  onUpdateStatus,
  onToggleReview,
  onDelete,
}) {
  const [expanded, setExpanded] = useState(false);

  const difficultyClass =
    problem.difficulty === "Easy"
      ? "diff-easy"
      : problem.difficulty === "Medium"
        ? "diff-medium"
        : "diff-hard";

  return (
    <div className={`problem-card ${expanded ? "problem-expanded" : ""}`}>
      <div className="problem-main" onClick={() => setExpanded(!expanded)}>
        <div className="problem-left">
          <span className={`problem-status-icon status-${problem.status}`}>
            {STATUS_ICONS[problem.status]}
          </span>
          <div className="problem-info">
            <span className="problem-name">{problem.name}</span>
            <div className="problem-tags">
              {problem.platform && <span className="tag tag-platform">{problem.platform}</span>}
              <span className={`tag tag-diff ${difficultyClass}`}>{problem.difficulty}</span>
            </div>
          </div>
        </div>
        <div className="problem-right">
          {problem.link && (
            <a
              href={problem.link}
              target="_blank"
              rel="noopener noreferrer"
              className="problem-link"
              onClick={(e) => e.stopPropagation()}
              title="Open problem"
            >
              {Icons.link}
            </a>
          )}
          <span className="expand-icon">
            {expanded ? Icons.chevronDown : Icons.chevronRight}
          </span>
        </div>
      </div>

      {expanded && (
        <div className="problem-details">
          {/* Status selector */}
          <div className="detail-row">
            <span className="detail-label">Status</span>
            <div className="status-selector">
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s.value}
                  className={`status-option status-option--${s.value} ${problem.status === s.value ? "status-selected" : ""}`}
                  onClick={() => onUpdateStatus(topicId, problem.id, s.value)}
                >
                  {STATUS_ICONS[s.value]} {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Review phases (only once solved) */}
          {problem.status === "solved" && problem.reviewPhases && (
            <div className="detail-row">
              <span className="detail-label">Review progress (1-7-24)</span>
              <div className="review-phases">
                {REVIEW_PHASES.map((phase, i) => {
                  const isDone = problem.reviewPhases[phase.key];
                  const locked = i > 0 && !problem.reviewPhases[REVIEW_PHASES[i - 1].key];
                  const due = addDays(problem.solvedDate || today, phase.offset);
                  const d = diffInDays(today, due);

                  return (
                    <button
                      key={phase.key}
                      className={`review-chip ${isDone ? "review-done" : ""} ${locked ? "review-locked" : ""} ${!isDone && !locked && d < 0 ? "review-overdue" : ""} ${!isDone && !locked && d === 0 ? "review-today" : ""}`}
                      onClick={() => onToggleReview(topicId, problem.id, phase.key)}
                      disabled={locked}
                    >
                      <span className="review-chip-label">
                        {isDone && Icons.check}
                        {phase.label}
                      </span>
                      <span className="review-chip-hint">
                        {isDone ? "Done" : locked ? "Locked" : getRelativeLabel(d)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="detail-actions">
            <button
              className="detail-remove-btn"
              onClick={() => onDelete(topicId, problem.id)}
            >
              {Icons.trash} Remove
            </button>
          </div>
        </div>
      )}
    </div>
  );
}