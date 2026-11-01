import React, { useState, useMemo, useRef } from "react";
import "./ProblemsView.css";
import { Icons } from "../Icons";

export default function ProblemsView({
  problems,
  onImportXlsx,
  onUpdateStatus,
  onDelete,
  onClearAll,
  onOpenProblem,
}) {
  const fileInputRef = useRef(null);
  const [search, setSearch] = useState("");
  const [trackFilter, setTrackFilter] = useState("all"); // "all" | "dsa" | "sql"
  const [diffFilter, setDiffFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [topicFilter, setTopicFilter] = useState("all");
  const [statusTab, setStatusTab] = useState("all");

  // Track breakdown counts across all loaded problems
  const trackCounts = useMemo(() => {
    let dsa = 0;
    let sql = 0;
    problems.forEach((p) => {
      if (p.track === "sql") sql++;
      else dsa++;
    });
    return { all: problems.length, dsa, sql };
  }, [problems]);

  // Problems filtered by the active track (All / DSA / SQL)
  const trackProblems = useMemo(() => {
    if (trackFilter === "all") return problems;
    return problems.filter((p) => (p.track || "dsa") === trackFilter);
  }, [problems, trackFilter]);

  // Platforms and topics are contextual to the active track
  const platforms = useMemo(() => {
    const s = new Set(trackProblems.map((p) => p.platform).filter(Boolean));
    return Array.from(s).sort();
  }, [trackProblems]);

  const topics = useMemo(() => {
    const s = new Set();
    trackProblems.forEach((p) => {
      if (!p.topic) return;
      p.topic.split(",").forEach((t) => {
        const trimmed = t.trim();
        if (trimmed) s.add(trimmed);
      });
    });
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [trackProblems]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return trackProblems.filter((p) => {
      if (statusTab !== "all" && p.status !== statusTab) return false;
      if (diffFilter !== "all" && p.difficulty !== diffFilter) return false;
      if (platformFilter !== "all" && p.platform !== platformFilter) return false;
      if (topicFilter !== "all") {
        if (!p.topic) return false;
        const itemTopics = p.topic.split(",").map((t) => t.trim().toLowerCase());
        if (!itemTopics.includes(topicFilter.toLowerCase())) return false;
      }
      if (q && !p.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [trackProblems, search, diffFilter, platformFilter, topicFilter, statusTab]);

  // Counts for the active track
  const counts = useMemo(() => ({
    all:          trackProblems.length,
    unsolved:     trackProblems.filter((p) => p.status === "unsolved").length,
    attempted:    trackProblems.filter((p) => p.status === "attempted").length,
    solved:       trackProblems.filter((p) => p.status === "solved").length,
    easy:         trackProblems.filter((p) => p.difficulty === "Easy").length,
    medium:       trackProblems.filter((p) => p.difficulty === "Medium").length,
    hard:         trackProblems.filter((p) => p.difficulty === "Hard").length,
    easySolved:   trackProblems.filter((p) => p.difficulty === "Easy"   && p.status === "solved").length,
    mediumSolved: trackProblems.filter((p) => p.difficulty === "Medium" && p.status === "solved").length,
    hardSolved:   trackProblems.filter((p) => p.difficulty === "Hard"   && p.status === "solved").length,
  }), [trackProblems]);

  const cycleStatus = (p) => {
    const order = ["unsolved", "attempted", "solved"];
    const next = order[(order.indexOf(p.status) + 1) % order.length];
    onUpdateStatus(p.id, next);
  };

  const handleTrackChange = (newTrack) => {
    setTrackFilter(newTrack);
    setTopicFilter("all");
    setPlatformFilter("all");
  };

  return (
    <div className="problems-view">
      {/* ── Header ── */}
      <div className="problems-head">
        <div>
          <h2 className="problems-title">Problems</h2>
          <p className="problems-subtitle">
            {trackCounts.all} problems loaded
            {trackCounts.sql > 0 && (
              <span className="problems-subtitle-breakdown">
                {" "}({trackCounts.dsa} DSA, {trackCounts.sql} SQL)
              </span>
            )}
          </p>
        </div>
        <div className="problems-head-actions">
          {trackCounts.all > 0 && onClearAll && (
            <button
              className="btn-ghost problems-clear-all-btn"
              type="button"
              onClick={onClearAll}
              title="Remove all imported problems"
            >
              {Icons.trash} Clear all
            </button>
          )}
          <button
            className="problems-import-btn"
            type="button"
            onClick={() => fileInputRef.current?.click()}
          >
            {Icons.upload}
            <span>Import XLSX</span>
          </button>
        </div>
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

      {/* ── Track Selector (DSA vs SQL Tabs) ── */}
      {trackCounts.sql > 0 && (
        <div className="problems-track-bar" role="tablist" aria-label="Question Track">
          <button
            type="button"
            role="tab"
            aria-selected={trackFilter === "all"}
            className={`track-tab ${trackFilter === "all" ? "track-tab--active" : ""}`}
            onClick={() => handleTrackChange("all")}
          >
            <span>All Questions</span>
            <span className="track-tab-count">{trackCounts.all}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={trackFilter === "dsa"}
            className={`track-tab ${trackFilter === "dsa" ? "track-tab--active" : ""}`}
            onClick={() => handleTrackChange("dsa")}
          >
            <span className="track-tab-icon">{Icons.code}</span>
            <span>DSA &amp; Algorithms</span>
            <span className="track-tab-count">{trackCounts.dsa}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={trackFilter === "sql"}
            className={`track-tab ${trackFilter === "sql" ? "track-tab--active" : ""}`}
            onClick={() => handleTrackChange("sql")}
          >
            <span className="track-tab-icon">{Icons.database}</span>
            <span>SQL &amp; Databases</span>
            <span className="track-tab-count">{trackCounts.sql}</span>
          </button>
        </div>
      )}

      {/* ── Stats Row ── */}
      {counts.all > 0 && (
        <div className="problems-stats">
          <div className="problems-stat problems-stat--easy">
            <span className="problems-stat-label">Easy</span>
            <span className="problems-stat-value">{counts.easySolved}<span className="problems-stat-denom">/{counts.easy}</span></span>
          </div>
          <div className="problems-stat problems-stat--medium">
            <span className="problems-stat-label">Medium</span>
            <span className="problems-stat-value">{counts.mediumSolved}<span className="problems-stat-denom">/{counts.medium}</span></span>
          </div>
          <div className="problems-stat problems-stat--hard">
            <span className="problems-stat-label">Hard</span>
            <span className="problems-stat-value">{counts.hardSolved}<span className="problems-stat-denom">/{counts.hard}</span></span>
          </div>
          <div className="problems-stat">
            <span className="problems-stat-label">Solved</span>
            <span className="problems-stat-value">{counts.solved}<span className="problems-stat-denom">/{counts.all}</span></span>
          </div>
        </div>
      )}

      {/* ── Controls ── */}
      <div className="problems-controls">
        <div className="problems-search-wrap">
          <span className="problems-search-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </span>
          <input
            className="problems-search-input"
            placeholder={`Search ${trackFilter === "sql" ? "SQL queries" : trackFilter === "dsa" ? "DSA problems" : "problems"} by name…`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="problems-search-clear" type="button" onClick={() => setSearch("")} title="Clear search">
              ×
            </button>
          )}
        </div>
        <div className="problems-filter-group">
          <div className="diff-pills">
            {["all", "Easy", "Medium", "Hard"].map((d) => (
              <button
                key={d}
                type="button"
                className={`diff-pill ${d === "Easy" ? "dp-easy" : d === "Medium" ? "dp-medium" : d === "Hard" ? "dp-hard" : "dp-all"} ${diffFilter === d ? "dp-active" : ""}`}
                onClick={() => setDiffFilter(d)}
              >
                {d === "all" ? "All" : d}
              </button>
            ))}
          </div>
          {platforms.length > 0 && (
            <select
              className="problems-filter-select"
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
            >
              <option value="all">All platforms</option>
              {platforms.map((pl) => <option key={pl} value={pl}>{pl}</option>)}
            </select>
          )}
          {topics.length > 0 && (
            <select
              className="problems-filter-select"
              value={topicFilter}
              onChange={(e) => setTopicFilter(e.target.value)}
            >
              <option value="all">All topics</option>
              {topics.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* ── Status Tabs ── */}
      <div className="problems-tabs">
        {[
          { key: "all",       label: "All",       count: counts.all },
          { key: "unsolved",  label: "Unsolved",  count: counts.unsolved },
          { key: "attempted", label: "Attempted", count: counts.attempted },
          { key: "solved",    label: "Solved",    count: counts.solved },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`pst-btn ${statusTab === tab.key ? "pst-active" : ""}`}
            onClick={() => setStatusTab(tab.key)}
          >
            {tab.label}
            <span className={`pst-count ${statusTab === tab.key ? "pst-count-active" : ""}`}>{tab.count}</span>
          </button>
        ))}
        {filtered.length !== counts.all && (
          <span className="problems-filter-hint">{filtered.length} shown</span>
        )}
      </div>

      {/* ── List ── */}
      {filtered.length > 0 ? (
        <div className="problems-list-wrap">
          <div className="problems-list-head">
            <span className="plh-num">#</span>
            <span className="plh-name">Problem</span>
            <span className="plh-topic">Topic / Category</span>
            <span className="plh-platform">Platform</span>
            <span className="plh-diff">Difficulty</span>
            <span className="plh-status">Status</span>
            <span className="plh-action"></span>
          </div>
          {filtered.map((p, idx) => {
            const diffClass = p.difficulty === "Easy" ? "d-easy" : p.difficulty === "Hard" ? "d-hard" : "d-medium";
            const statusNext = { unsolved: "attempted", attempted: "solved", solved: "unsolved" }[p.status];
            return (
              <div key={p.id} className={`problems-list-row prow-${p.status}`}>
                <span className="plr-num">{idx + 1}</span>
                <span className="plr-name">
                  {onOpenProblem ? (
                    <button
                      className="plr-name-text plr-name-btn"
                      type="button"
                      title={`${p.name} (open notes and timer)`}
                      onClick={() => onOpenProblem(p)}
                    >
                      {p.name}
                    </button>
                  ) : (
                    <span className="plr-name-text" title={p.name}>{p.name}</span>
                  )}
                  {p.track === "sql" && (
                    <span className="plr-track-badge plr-track-badge--sql" title="SQL Challenge">
                      SQL
                    </span>
                  )}
                  {p.link && (
                    <a
                      href={p.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="plr-link"
                      onClick={(e) => e.stopPropagation()}
                      title="Open problem"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                        <polyline points="15 3 21 3 21 9"/>
                        <line x1="10" y1="14" x2="21" y2="3"/>
                      </svg>
                    </a>
                  )}
                </span>
                <span className="plr-topic" title={p.topic}>{p.topic || "—"}</span>
                <span className="plr-platform">{p.platform || "—"}</span>
                <span className={`plr-diff ${diffClass}`}>{p.difficulty}</span>
                <button
                  type="button"
                  className={`plr-status pstatus-${p.status}`}
                  onClick={() => cycleStatus(p)}
                  title={`Click to mark as ${statusNext}`}
                >
                  {p.status === "solved" ? "Solved" : p.status === "attempted" ? "Attempted" : "Unsolved"}
                </button>
                <button
                  type="button"
                  className="plr-del"
                  onClick={() => onDelete(p.id)}
                  title="Remove"
                >
                  {Icons.trash}
                </button>
              </div>
            );
          })}
        </div>
      ) : counts.all === 0 ? (
        <div className="problems-empty">
          <div className="problems-empty-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
            </svg>
          </div>
          <h3>No problems yet</h3>
          <p>Import your multi-tab Excel file to populate DSA and SQL questions.</p>
          <button className="problems-import-btn" type="button" onClick={() => fileInputRef.current?.click()}>
            {Icons.upload} Import XLSX
          </button>
        </div>
      ) : (
        <div className="problems-empty">
          <h3>No results found</h3>
          <p>Try adjusting your search or clearing some filters.</p>
          <button
            className="problems-clear-btn"
            type="button"
            onClick={() => {
              setSearch("");
              setDiffFilter("all");
              setPlatformFilter("all");
              setTopicFilter("all");
              setStatusTab("all");
            }}
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
}
