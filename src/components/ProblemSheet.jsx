import React, { useEffect } from "react";
import "./ProblemSheet.css";
import { Icons } from "../Icons";
import StudyNotes from "./StudyNotes";

const STATUSES = [
  { key: "unsolved",  label: "Unsolved",  icon: Icons.circle },
  { key: "attempted", label: "Attempted", icon: Icons.circleHalf },
  { key: "solved",    label: "Solved",    icon: Icons.check },
];

// Everything about one problem in one place: start a timed attempt, set its
// status, and keep your study notes. Opened from the Problems list and from
// the "Practice next" suggestions.
export default function ProblemSheet({ item, meta, timerActive, onClose, onMetaChange, onStatus, onSolve }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="ps-overlay" onClick={onClose}>
      <div className="ps-sheet" role="dialog" aria-modal="true" aria-label={item.name} onClick={(e) => e.stopPropagation()}>
        <div className="ps-head">
          <div className="ps-titles">
            <h3 className="ps-title">{item.name}</h3>
            <div className="ps-chips">
              {item.platform && <span className="ps-chip">{item.platform}</span>}
              {item.difficulty && (
                <span className={`ps-chip ps-chip--${item.difficulty.toLowerCase()}`}>{item.difficulty}</span>
              )}
              {item.group && <span className="ps-chip">{item.group}</span>}
            </div>
          </div>
          <button className="ps-close" onClick={onClose} aria-label="Close">{Icons.close}</button>
        </div>

        <div className="ps-actions">
          <button className="btn-primary" disabled={timerActive} onClick={() => onSolve(item)}>
            {Icons.play} {timerActive ? "Timer running" : "Solve with timer"}
          </button>
          {item.link && (
            <a className="btn-ghost" href={item.link} target="_blank" rel="noopener noreferrer">
              {Icons.link} Open problem
            </a>
          )}
        </div>

        <div className="ps-section">
          <span className="ps-label">Status</span>
          <div className="ps-status">
            {STATUSES.map((s) => (
              <button
                key={s.key}
                className={`ps-status-btn ps-status-btn--${s.key} ${item.status === s.key ? "is-active" : ""}`}
                onClick={() => onStatus(item, s.key)}
              >
                {s.icon} {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="ps-section">
          <StudyNotes key={item.key} meta={meta} onChange={(patch) => onMetaChange(item.name, patch)} />
        </div>
      </div>
    </div>
  );
}
