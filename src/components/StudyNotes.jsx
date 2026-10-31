import React, { useEffect, useId, useRef, useState } from "react";
import "./StudyNotes.css";
import { PATTERNS } from "../study/store";

// Autosaving notes for one problem: the pattern, the key insight, the complexity,
// and the mistakes to avoid. These are what a review session shows you when you
// reveal the answer, so they're worth filling in while the solution is fresh.
export default function StudyNotes({ meta = {}, onChange }) {
  const listId = useId();
  const [draft, setDraft] = useState(() => ({
    pattern: meta.pattern || "",
    approach: meta.approach || "",
    complexity: meta.complexity || "",
    mistakes: meta.mistakes || "",
  }));
  const [saved, setSaved] = useState(false);

  const latest = useRef(draft);
  const pending = useRef(false);
  const saveTimer = useRef(null);
  const hideTimer = useRef(null);
  const mounted = useRef(true);
  const changeRef = useRef(onChange);
  changeRef.current = onChange;

  const flush = () => {
    clearTimeout(saveTimer.current);
    if (!pending.current) return false;
    pending.current = false;
    changeRef.current(latest.current);
    return true;
  };

  // Closing the panel right after typing must not lose the last edit.
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      clearTimeout(hideTimer.current);
      flush();
    };
  }, []);

  const edit = (field) => (e) => {
    const next = { ...latest.current, [field]: e.target.value };
    latest.current = next;
    setDraft(next);
    pending.current = true;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      if (flush() && mounted.current) {
        setSaved(true);
        clearTimeout(hideTimer.current);
        hideTimer.current = setTimeout(() => mounted.current && setSaved(false), 1600);
      }
    }, 500);
  };

  return (
    <div className="sn">
      <div className="sn-head">
        <span className="sn-title">Study notes</span>
        <span className={`sn-saved ${saved ? "is-on" : ""}`}>Saved</span>
      </div>

      <div className="sn-grid">
        <label className="sn-field">
          <span>Pattern</span>
          <input
            list={listId}
            value={draft.pattern}
            onChange={edit("pattern")}
            placeholder="e.g. Sliding Window"
          />
        </label>
        <label className="sn-field">
          <span>Complexity</span>
          <input
            value={draft.complexity}
            onChange={edit("complexity")}
            placeholder="e.g. O(n) time, O(1) space"
          />
        </label>
      </div>

      <label className="sn-field">
        <span>Approach</span>
        <textarea
          rows={3}
          value={draft.approach}
          onChange={edit("approach")}
          placeholder="The key insight, in your own words"
        />
      </label>

      <label className="sn-field">
        <span>Mistakes and edge cases</span>
        <textarea
          rows={2}
          value={draft.mistakes}
          onChange={edit("mistakes")}
          placeholder="What tripped you up, so you don't repeat it"
        />
      </label>

      <datalist id={listId}>
        {PATTERNS.map((p) => <option key={p} value={p} />)}
      </datalist>
    </div>
  );
}
