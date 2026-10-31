import React, { useMemo, useState, useCallback } from "react";
import "./Studyinsights.css";
import { Icons } from "../Icons";
import {
  TARGET_MINUTES, activityCounts, buildHeatmap, computeStreak,
  recommend, solveTimeStats, todayTally,
} from "../study/store";

// Unbiased Fisher-Yates shuffle to pick k random unique elements
function getRandomPicks(items, count = 4) {
  if (!items || items.length === 0) return [];
  const pool = [...items];
  const n = Math.min(count, pool.length);
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(Math.random() * (pool.length - i));
    const temp = pool[i];
    pool[i] = pool[j];
    pool[j] = temp;
  }
  return pool.slice(0, n);
}

// Two cards for the dashboard: what to practice next, and how consistent you've been.
export default function StudyInsights({
  pool, activity, today, timerActive, onStart, onOpen, onGoLibrary, onGoProblems,
}) {
  const picks = useMemo(() => recommend(pool, 4), [pool]);
  const counts = useMemo(() => activityCounts(activity, pool), [activity, pool]);
  const streak = useMemo(() => computeStreak(counts, today), [counts, today]);
  const heat = useMemo(() => buildHeatmap(counts, today, 12), [counts, today]);
  const times = useMemo(() => solveTimeStats(activity), [activity]);
  const tally = useMemo(() => todayTally(activity, today), [activity, today]);

  const unsolved = useMemo(() => pool.filter((p) => p.status !== "solved"), [pool]);
  const [surpriseKeys, setSurpriseKeys] = useState(null);

  const surprise = useCallback(() => {
    if (!unsolved.length) return;
    const randomChoices = getRandomPicks(unsolved, 4);
    setSurpriseKeys(randomChoices.map((p) => p.key));
  }, [unsolved]);

  const rows = useMemo(() => {
    if (surpriseKeys) {
      // Look up current items for the surprise keys
      const currentMap = new Map(unsolved.map((p) => [p.key, p]));
      const activePicks = surpriseKeys
        .map((k) => currentMap.get(k))
        .filter(Boolean);

      // If some picked items were solved, replenish from remaining unsolved to maintain 4 items
      if (activePicks.length < 4 && unsolved.length > activePicks.length) {
        const activeKeySet = new Set(activePicks.map((p) => p.key));
        const remaining = unsolved.filter((p) => !activeKeySet.has(p.key));
        const extra = getRandomPicks(remaining, 4 - activePicks.length);
        activePicks.push(...extra);
      }

      if (activePicks.length > 0) {
        return activePicks.map((item) => ({
          item,
          reason: item.status === "attempted" ? "Finish what you started" : "Surprise pick",
          group: item.group,
        }));
      }
    }
    return picks;
  }, [surpriseKeys, unsolved, picks]);

  const hasTimes = Object.values(times).some((t) => t.n > 0);
  const subtitle = streak.activeToday
    ? `Today: ${tally.solved} solved, ${tally.reviewed} reviewed`
    : streak.current > 0
    ? "Do one thing today to keep your streak alive"
    : "Solve or review one thing today to start a streak";

  return (
    <div className="si-row">
      {/* ── Practice next ── */}
      <section className="si-card">
        <div className="si-head">
          <div>
            <h2 className="si-title"><span className="si-icon">{Icons.target}</span>Practice next</h2>
            <p className="si-sub">Picked from your topics and imported problems</p>
          </div>
          {unsolved.length > 0 && (
            <button className="si-ghost" type="button" onClick={surprise}>{Icons.refresh} Surprise me</button>
          )}
        </div>

        {rows.length > 0 ? (
          <ul className="si-picks">
            {rows.map(({ item, reason, group }) => (
              <li key={item.key} className="si-pick">
                <span className={`si-diff si-diff--${(item.difficulty || "").toLowerCase()}`}>{item.difficulty}</span>
                <div className="si-pick-body">
                  <button className="si-pick-name" type="button" onClick={() => onOpen(item)} title={item.name}>{item.name}</button>
                  <span className="si-pick-meta">
                    <span className="si-reason">{reason}</span>
                    <span className="si-group">{group}</span>
                  </span>
                </div>
                <button className="si-start" type="button" disabled={timerActive} onClick={() => onStart(item)} title={timerActive ? "Finish the running timer first" : "Start the timer and open the problem"}>
                  {Icons.play} Start
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="si-empty">
            <p>
              {pool.length === 0
                ? "Nothing to practice yet. Import your problems, or add a pattern from the Library."
                : "You've solved everything on your list. Add more from the Library."}
            </p>
            <div className="si-empty-actions">
              <button className="btn-primary" type="button" onClick={onGoLibrary}>Open Library</button>
              {pool.length === 0 && <button className="btn-ghost" type="button" onClick={onGoProblems}>Import problems</button>}
            </div>
          </div>
        )}

        {rows.length > 0 && (
          <p className="si-foot">
            Want a structured path?{" "}
            <button className="si-link" type="button" onClick={onGoLibrary}>Browse the Library</button>
          </p>
        )}
      </section>

      {/* ── Consistency ── */}
      <section className="si-card">
        <div className="si-head">
          <div>
            <h2 className="si-title"><span className="si-icon">{Icons.clock}</span>Consistency</h2>
            <p className="si-sub">{subtitle}</p>
          </div>
        </div>

        <div className="si-streaks">
          <div className="si-stat si-stat--blue"><strong>{streak.current}</strong><span>day streak</span></div>
          <div className="si-stat"><strong>{streak.longest}</strong><span>longest</span></div>
          <div className="si-stat si-stat--green"><strong>{heat.total}</strong><span>in 12 weeks</span></div>
        </div>

        <div className="si-heat" role="img" aria-label="Activity over the last 12 weeks">
          {heat.cols.map((col, i) => (
            <div className="si-heat-col" key={i}>
              {col.map((c) => (
                <span
                  key={c.date}
                  className={`si-cell lvl-${c.level} ${c.future ? "is-future" : ""} ${c.today ? "is-today" : ""}`}
                  title={c.future ? "" : `${c.date}: ${c.count} ${c.count === 1 ? "action" : "actions"}`}
                />
              ))}
            </div>
          ))}
        </div>
        <div className="si-legend">
          <span>Less</span>
          {[0, 1, 2, 3, 4].map((l) => <span key={l} className={`si-cell si-cell--legend lvl-${l}`} />)}
          <span>More</span>
        </div>

        <div className="si-times">
          <span className="si-times-label">Average solve time</span>
          {hasTimes ? (
            <div className="si-times-row">
              {["Easy", "Medium", "Hard"].map((d) => (
                <div className="si-time" key={d}>
                  <span className="si-time-diff">{d}</span>
                  <strong>{times[d].avg != null ? `${times[d].avg} min` : "No data"}</strong>
                  <span className="si-time-target">target {TARGET_MINUTES[d]}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="si-times-empty">Use "Start" on a problem to time yourself and compare your pace with interview targets.</p>
          )}
        </div>
      </section>
    </div>
  );
}
