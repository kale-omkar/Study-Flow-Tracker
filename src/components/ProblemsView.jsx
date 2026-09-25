import React, { useState, useMemo, useRef } from "react";
import "./ProblemsView.css";
import { Icons } from "../Icons";

export default function ProblemsView({ problems, onImportXlsx, onUpdateStatus, onDelete }) {
  const fileInputRef = useRef(null);
  const [search, setSearch] = useState("");
  const [diffFilter, setDiffFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [topicFilter, setTopicFilter] = useState("all");
  const [statusTab, setStatusTab] = useState("all");

  const platforms = useMemo(() => {
    const s = new Set(problems.map((p) => p.platform).filter(Boolean));
    return Array.from(s).sort();
  }, [problems]);

  const topics = useMemo(() => {
    const s = new Set(problems.map((p) => p.topic).filter(Boolean));
    return Array.from(s).sort();
  }, [problems]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return problems.filter((p) => {
      if (statusTab !== "all" && p.status !== statusTab) return false;
      if (diffFilter !== "all" && p.difficulty !== diffFilter) return false;
      if (platformFilter !== "all" && p.platform !== platformFilter) return false;
      if (topicFilter !== "all" && p.topic !== topicFilter) return false;
      if (q && !p.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [problems, search, diffFilter, platformFilter, topicFilter, statusTab]);

  const counts = useMemo(() => ({
    all:          problems.length,
    unsolved:     problems.filter((p) => p.status === "unsolved").length,
    attempted:    problems.filter((p) => p.status === "attempted").length,
    solved:       problems.filter((p) => p.status === "solved").length,
    easy:         problems.filter((p) => p.difficulty === "Easy").length,
    medium:       problems.filter((p) => p.difficulty === "Medium").length,
    hard:         problems.filter((p) => p.difficulty === "Hard").length,
    easySolved:   problems.filter((p) => p.difficulty === "Easy"   && p.status === "solved").length,
    mediumSolved: problems.filter((p) => p.difficulty === "Medium" && p.status === "solved").length,
    hardSolved:   problems.filter((p) => p.difficulty === "Hard"   && p.status === "solved").length,
  }), [problems]);

  const cycleStatus = (p) => {
    const order = ["unsolved", "attempted", "solved"];
    const next = order[(order.indexOf(p.status) + 1) % order.length];
    onUpdateStatus(p.id, next);
  };

  return (
    <div className="view-content prob-view">
      {/* ── Header ── */}
      <div className="prob-view-header">
        <div>
          <h2 className="view-title">Problems</h2>
          <p className="view-subtitle">{counts.all} problems imported</p>
        </div>
        <button className="btn-import" onClick={() => fileInputRef.current?.click()}>
          {Icons.upload}
          <span>Import XLSX</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          style={{ display: "none" }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) { onImportXlsx(f); e.target.value = ""; }
          }}
        />
      </div>

      {/* ── Stats Row ── */}
      {counts.all > 0 && (
        <div className="prob-stats-row">
          <div className="prob-stat-pill diff-easy-pill">
            <span className="psp-label">Easy</span>
            <span className="psp-value">{counts.easySolved}/{counts.easy}</span>
          </div>
          <div className="prob-stat-pill diff-medium-pill">
            <span className="psp-label">Medium</span>
            <span className="psp-value">{counts.mediumSolved}/{counts.medium}</span>
          </div>
          <div className="prob-stat-pill diff-hard-pill">
            <span className="psp-label">Hard</span>
            <span className="psp-value">{counts.hardSolved}/{counts.hard}</span>
          </div>
          <div className="prob-stat-pill total-pill">
            <span className="psp-label">Solved</span>
            <span className="psp-value">{counts.solved}/{counts.all}</span>
          </div>
        </div>
      )}

      {/* ── Controls ── */}
      <div className="prob-controls">
        <div className="prob-search-wrap">
          <svg className="prob-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            className="prob-search-input"
            placeholder="Search by name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && <button className="prob-search-clear" onClick={() => setSearch("")}>✕</button>}
        </div>
        <div className="prob-filter-group">
          <div className="diff-pills">
            {["all", "Easy", "Medium", "Hard"].map((d) => (
              <button
                key={d}
                className={`diff-pill ${d === "Easy" ? "dp-easy" : d === "Medium" ? "dp-medium" : d === "Hard" ? "dp-hard" : "dp-all"} ${diffFilter === d ? "dp-active" : ""}`}
                onClick={() => setDiffFilter(d)}
              >
                {d === "all" ? "All" : d}
              </button>
            ))}
          </div>
          {platforms.length > 0 && (
            <select className="prob-filter-select" value={platformFilter} onChange={(e) => setPlatformFilter(e.target.value)}>
              <option value="all">All Platforms</option>
              {platforms.map((pl) => <option key={pl} value={pl}>{pl}</option>)}
            </select>
          )}
          {topics.length > 0 && (
            <select className="prob-filter-select" value={topicFilter} onChange={(e) => setTopicFilter(e.target.value)}>
              <option value="all">All Topics</option>
              {topics.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* ── Status Tabs ── */}
      <div className="prob-status-tabs">
        {[
          { key: "all",       label: "All",       count: counts.all },
          { key: "unsolved",  label: "Unsolved",  count: counts.unsolved },
          { key: "attempted", label: "Attempted", count: counts.attempted },
          { key: "solved",    label: "Solved",    count: counts.solved },
        ].map((tab) => (
          <button
            key={tab.key}
            className={`pst-btn ${statusTab === tab.key ? "pst-active" : ""}`}
            onClick={() => setStatusTab(tab.key)}
          >
            {tab.label}
            <span className={`pst-count ${statusTab === tab.key ? "pst-count-active" : ""}`}>{tab.count}</span>
          </button>
        ))}
        {filtered.length !== counts.all && (
          <span className="prob-filter-hint">{filtered.length} shown</span>
        )}
      </div>

      {/* ── Table ── */}
      {filtered.length > 0 ? (
        <div className="prob-list-wrap">
          <div className="prob-list-head">
            <span className="plh-num">#</span>
            <span className="plh-name">Problem</span>
            <span className="plh-topic">Topic</span>
            <span className="plh-platform">Platform</span>
            <span className="plh-diff">Difficulty</span>
            <span className="plh-status">Status</span>
            <span className="plh-action"></span>
          </div>
          {filtered.map((p, idx) => {
            const diffClass = p.difficulty === "Easy" ? "d-easy" : p.difficulty === "Hard" ? "d-hard" : "d-medium";
            const statusNext = { unsolved: "attempted", attempted: "solved", solved: "unsolved" }[p.status];
            return (
              <div key={p.id} className={`prob-list-row prow-${p.status}`}>
                <span className="plr-num">{idx + 1}</span>
                <span className="plr-name">
                  <span className="plr-name-text" title={p.name}>{p.name}</span>
                  {p.link && (
                    <a href={p.link} target="_blank" rel="noopener noreferrer" className="plr-link" onClick={(e) => e.stopPropagation()} title="Open problem">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                        <polyline points="15 3 21 3 21 9"/>
                        <line x1="10" y1="14" x2="21" y2="3"/>
                      </svg>
                    </a>
                  )}
                </span>
                <span className="plr-topic" title={p.topic}>{p.topic || "—"}</span>
                <span className={`plr-platform plat-${(p.platform || "other").toLowerCase().replace(/[^a-z]/g, "")}`}>{p.platform}</span>
                <span className={`plr-diff ${diffClass}`}>{p.difficulty}</span>
                <button className={`plr-status pstatus-${p.status}`} onClick={() => cycleStatus(p)} title={`Click to mark as ${statusNext}`}>
                  {p.status === "solved" ? "✓ Solved" : p.status === "attempted" ? "◐ Attempted" : "○ Unsolved"}
                </button>
                <button className="plr-del" onClick={() => onDelete(p.id)} title="Remove">
                  {Icons.trash}
                </button>
              </div>
            );
          })}
        </div>
      ) : counts.all === 0 ? (
        <div className="prob-empty">
          <div className="prob-empty-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
            </svg>
          </div>
          <h3>No problems yet</h3>
          <p>Import your .xlsx file to populate this list</p>
          <button className="btn-primary" onClick={() => fileInputRef.current?.click()}>
            {Icons.upload} Import XLSX
          </button>
        </div>
      ) : (
        <div className="prob-empty">
          <h3>No results</h3>
          <p>Try clearing some filters</p>
          <button className="btn-ghost" onClick={() => { setSearch(""); setDiffFilter("all"); setPlatformFilter("all"); setTopicFilter("all"); setStatusTab("all"); }}>
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
}
