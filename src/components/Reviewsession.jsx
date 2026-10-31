import React, { useEffect, useState } from "react";
import "./ReviewSession.css";
import { Icons } from "../Icons";
import StudyNotes from "./StudyNotes";

const RATINGS = [
  { key: "forgot", label: "Forgot", hint: "Ask me again", n: "1" },
  { key: "hard",   label: "Hard",   hint: "Barely got it", n: "2" },
  { key: "good",   label: "Good",   hint: "Got it", n: "3" },
  { key: "easy",   label: "Easy",   hint: "No effort", n: "4" },
];

const FIELDS = [
  ["pattern", "Pattern"],
  ["complexity", "Complexity"],
  ["approach", "Approach"],
  ["mistakes", "Mistakes and edge cases"],
];

// Active recall for your due reviews: try to remember first, then check your own
// notes, then rate how it went. Items you forgot come back once before the end.
export default function ReviewSession({ queue, getMeta, onMetaChange, onRate, onClose }) {
  const total = queue.length;
  const [cards, setCards] = useState(() => queue.map((q) => ({ ...q, tries: 0 })));
  const [pos, setPos] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [stats, setStats] = useState({ forgot: 0, hard: 0, good: 0, easy: 0 });
  const [editorKey, setEditorKey] = useState(null);

  const card = cards[pos];
  const done = pos >= cards.length;
  const completed = stats.hard + stats.good + stats.easy;

  const rate = (key) => {
    if (!card) return;
    onRate(card, key);
    setStats((s) => ({ ...s, [key]: s[key] + 1 }));
    if (key === "forgot" && card.tries < 1) setCards((list) => [...list, { ...card, tries: card.tries + 1 }]);
    setPos((p) => p + 1);
    setRevealed(false);
  };

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") { onClose(); return; }
      if (done || e.target.closest?.("a, input, textarea")) return;
      if (!revealed && (e.key === " " || e.key === "Enter")) { e.preventDefault(); reveal(); return; }
      if (revealed) {
        const r = RATINGS.find((x) => x.n === e.key);
        if (r) { e.preventDefault(); rate(r.key); }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }); // re-bound every render so it always sees the current card

  const meta = card && card.type === "problem" ? getMeta(card.name) : null;
  const filled = meta ? FIELDS.filter(([k]) => (meta[k] || "").trim()) : [];

  // A problem with no notes yet gets an editor right in the review: this is the best
  // moment to write them. It stays open for the card even once the first note saves.
  const cardKey = card ? `${card.id}:${card.tries}` : null;
  const editorOpen = revealed && editorKey === cardKey;
  const reveal = () => {
    setRevealed(true);
    if (card.type === "problem" && filled.length === 0 && onMetaChange) setEditorKey(cardKey);
  };

  return (
    <div className="rs-root" role="dialog" aria-modal="true" aria-label="Review session">
      <div className="rs-top">
        <span className="rs-top-title">Review session</span>
        <div className="rs-top-right">
          {!done && <span className="rs-count">{Math.min(completed + 1, total)} of {total}</span>}
          <button className="rs-close" onClick={onClose} aria-label="Close review session">{Icons.close}</button>
        </div>
      </div>
      <div className="rs-progress"><div className="rs-progress-fill" style={{ width: `${(completed / total) * 100}%` }} /></div>

      <div className="rs-stage">
        {!done ? (
          <div className="rs-card" key={`${card.id}-${card.tries}`}>
            <div className="rs-chips">
              <span className={`rs-chip rs-chip--${card.type}`}>{card.type === "note" ? "Notes review" : "Problem review"}</span>
              <span className="rs-chip">{card.phaseLabel}</span>
              {card.overdue > 0 && <span className="rs-chip rs-chip--late">{card.overdue}d overdue</span>}
              {card.tries > 0 && <span className="rs-chip rs-chip--again">Second look</span>}
            </div>

            <h2 className="rs-title">{card.title}</h2>
            {card.type === "problem" && <p className="rs-from">From {card.topicTitle}</p>}

            <p className="rs-prompt">
              {card.type === "note"
                ? "Recall the key ideas of this topic, then check your notes."
                : "Before you peek: what's the pattern, the approach, and the complexity?"}
            </p>

            {!revealed ? (
              <div className="rs-reveal-row">
                <button className="btn-primary rs-reveal" onClick={reveal}>Show my notes</button>
                {card.link && (
                  <a className="btn-ghost" href={card.link} target="_blank" rel="noopener noreferrer">
                    {Icons.link} Open problem
                  </a>
                )}
                <span className="rs-kbd">or press Space</span>
              </div>
            ) : (
              <>
                <div className="rs-answer">
                  {card.type === "note" ? (
                    card.notes && card.notes.trim()
                      ? <p className="rs-notes">{card.notes}</p>
                      : <p className="rs-empty">This topic has no notes yet. Add some from its page so reviews have something to check against.</p>
                  ) : editorOpen ? (
                    <>
                      <p className="rs-empty">No notes saved for this one yet. Capture what you remembered, or what you had to look up, while it's fresh.</p>
                      <StudyNotes key={cardKey} meta={meta || {}} onChange={(patch) => onMetaChange(card.name, patch)} />
                    </>
                  ) : filled.length ? (
                    filled.map(([k, label]) => (
                      <div className="rs-field" key={k}>
                        <span className="rs-field-label">{label}</span>
                        <p className="rs-field-text">{meta[k]}</p>
                      </div>
                    ))
                  ) : (
                    <p className="rs-empty">You haven't saved notes for this problem yet. Open it from the Problems page and add what you learned, so future reviews have something to check against.</p>
                  )}
                </div>

                <div className="rs-rate">
                  {RATINGS.map((r) => (
                    <button key={r.key} className={`rs-rate-btn rs-rate-btn--${r.key}`} onClick={() => rate(r.key)}>
                      <span className="rs-rate-label">{r.label}</span>
                      <span className="rs-rate-hint">{r.hint}</span>
                      <span className="rs-rate-key">{r.n}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="rs-card rs-summary">
            <span className="rs-done-icon">{Icons.check}</span>
            <h2 className="rs-title">Session complete</h2>
            <p className="rs-summary-text">
              {completed} of {total} review{total === 1 ? "" : "s"} done
              {stats.forgot > 0 ? `, ${stats.forgot} marked for more practice` : ""}.
            </p>
            <div className="rs-tally">
              {RATINGS.map((r) => (
                <div key={r.key} className={`rs-tally-item rs-tally-item--${r.key}`}>
                  <strong>{stats[r.key]}</strong>
                  <span>{r.label}</span>
                </div>
              ))}
            </div>
            <button className="btn-primary" onClick={onClose}>Back to dashboard</button>
          </div>
        )}
      </div>
    </div>
  );
}
