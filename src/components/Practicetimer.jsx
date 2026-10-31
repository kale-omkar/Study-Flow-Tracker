import React, { useEffect, useState } from "react";
import "./PracticeTimer.css";
import { Icons } from "../Icons";
import { TARGET_MINUTES, elapsedMs, formatClock } from "../study/store";

const OUTCOMES = [
  { key: "solved",     title: "Solved on my own",  desc: "Marks it solved and starts its review schedule" },
  { key: "hints",      title: "Solved with hints", desc: "Marks it solved. Worth another look soon" },
  { key: "unfinished", title: "Didn't finish",     desc: "Saves it as attempted so you can come back" },
];

// A floating stopwatch with an interview-pace target, so practice feels like the real thing.
export default function PracticeTimer({ timer, onPause, onResume, onCancel, onFinish }) {
  const [now, setNow] = useState(Date.now());
  const [sheet, setSheet] = useState(null); // { minutes } while the finish sheet is open

  const running = !!timer?.startedAt;

  useEffect(() => {
    if (!running) return undefined;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [running]);

  useEffect(() => { if (!timer) setSheet(null); }, [timer]);

  useEffect(() => {
    if (!sheet) return undefined;
    const onKey = (e) => { if (e.key === "Escape") closeSheet(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [sheet]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!timer) return null;

  const ms = elapsedMs(timer, now);
  const target = TARGET_MINUTES[timer.difficulty] || 30;
  const over = ms > target * 60000;
  const pct = Math.min(100, (ms / (target * 60000)) * 100);

  const openFinish = () => {
    const minutes = Math.max(1, Math.round(ms / 60000));
    if (running) onPause();
    setSheet({ minutes });
  };
  const closeSheet = () => { setSheet(null); onResume(); };

  return (
    <>
      <div className="pt-bar" role="status">
        <div className="pt-main">
          <span className={`pt-dot ${running ? "is-running" : ""}`} />
          <div className="pt-info">
            <span className="pt-name" title={timer.name}>{timer.name}</span>
            <span className="pt-sub">{timer.difficulty}, target {target} min</span>
          </div>
        </div>

        <div className="pt-clock">
          <span className={`pt-time ${over ? "is-over" : ""}`}>{formatClock(ms)}</span>
          <div className="pt-track">
            <div className={`pt-fill ${over ? "is-over" : ""}`} style={{ width: `${pct}%` }} />
          </div>
        </div>

        <div className="pt-actions">
          <button className="pt-btn" onClick={running ? onPause : onResume}>
            {running ? "Pause" : "Resume"}
          </button>
          {timer.link && (
            <a className="pt-btn" href={timer.link} target="_blank" rel="noopener noreferrer">
              {Icons.link} Open
            </a>
          )}
          <button className="pt-btn pt-btn--finish" onClick={openFinish}>Finish</button>
          <button className="pt-icon-btn" onClick={onCancel} title="Cancel timer" aria-label="Cancel timer">
            {Icons.close}
          </button>
        </div>
      </div>

      {sheet && (
        <div className="pt-overlay" onClick={closeSheet}>
          <div className="pt-sheet" role="dialog" aria-modal="true" aria-label="How did it go?" onClick={(e) => e.stopPropagation()}>
            <h3 className="pt-sheet-title">How did it go?</h3>
            <p className="pt-sheet-sub">{timer.name}, {sheet.minutes} min</p>
            <div className="pt-opts">
              {OUTCOMES.map((o) => (
                <button key={o.key} className={`pt-opt pt-opt--${o.key}`} onClick={() => onFinish(o.key, sheet.minutes)}>
                  <span className="pt-opt-title">{o.title}</span>
                  <span className="pt-opt-desc">{o.desc}</span>
                </button>
              ))}
            </div>
            <button className="pt-keep" onClick={closeSheet}>Keep working</button>
          </div>
        </div>
      )}
    </>
  );
}
