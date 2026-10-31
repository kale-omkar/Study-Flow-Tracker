import React, { useState } from "react";
import "./LibraryView.css";
import { Icons } from "../Icons";
import { leetcodeUrl } from "../study/roadmap";

const mix = (g) => ({
  Easy: g.problems.filter((p) => p.difficulty === "Easy").length,
  Medium: g.problems.filter((p) => p.difficulty === "Medium").length,
  Hard: g.problems.filter((p) => p.difficulty === "Hard").length,
});

export default function LibraryView({ groups, addedTitles, onAdd, onViewTopic }) {
  const [openId, setOpenId] = useState(null);

  return (
    <div className="lib-view">
      <header className="lib-head">
        <h2 className="lib-title">Library</h2>
        <p className="lib-subtitle">
          Twelve core patterns, each with a short guide and a curated problem list.
          Add one to your topics and it joins your review schedule.
        </p>
      </header>

      <div className="lib-grid">
        {groups.map((g) => {
          const added = addedTitles.has(g.title.toLowerCase());
          const isOpen = openId === g.id;
          const m = mix(g);
          return (
            <article key={g.id} className={`lib-card ${isOpen ? "is-open" : ""}`}>
              <div className="lib-card-top">
                <h3 className="lib-card-title">{g.title}</h3>
                <span className="lib-count">{g.problems.length} problems</span>
              </div>
              <p className="lib-tagline">{g.tagline}</p>

              <div className="lib-mix">
                {m.Easy > 0 && <span className="lib-pill lib-pill--easy">{m.Easy} Easy</span>}
                {m.Medium > 0 && <span className="lib-pill lib-pill--medium">{m.Medium} Medium</span>}
                {m.Hard > 0 && <span className="lib-pill lib-pill--hard">{m.Hard} Hard</span>}
              </div>

              <div className="lib-actions">
                {added ? (
                  <button className="btn-ghost lib-added" onClick={() => onViewTopic(g.title)}>
                    {Icons.check} Added, view topic
                  </button>
                ) : (
                  <button className="btn-primary" onClick={() => onAdd(g)}>
                    {Icons.plus} Add to my topics
                  </button>
                )}
                <button
                  className="lib-toggle"
                  onClick={() => setOpenId(isOpen ? null : g.id)}
                  aria-expanded={isOpen}
                >
                  {isOpen ? "Hide guide" : "Read the guide"}
                  <span className={`lib-chev ${isOpen ? "is-open" : ""}`}>{Icons.chevronDown}</span>
                </button>
              </div>

              {isOpen && (
                <div className="lib-guide">
                  <div className="lib-guide-cols">
                    <div>
                      <h4 className="lib-h">Recognize it when</h4>
                      <ul className="lib-list">{g.recognize.map((r) => <li key={r}>{r}</li>)}</ul>
                    </div>
                    <div>
                      <h4 className="lib-h">Approach</h4>
                      <ol className="lib-list lib-list--num">{g.approach.map((a) => <li key={a}>{a}</li>)}</ol>
                    </div>
                  </div>

                  <h4 className="lib-h">Template</h4>
                  <pre className="lib-code"><code>{g.template}</code></pre>
                  <p className="lib-complexity"><strong>Complexity:</strong> {g.complexity}</p>

                  <h4 className="lib-h">Problems</h4>
                  <ul className="lib-problems">
                    {g.problems.map((p) => (
                      <li key={p.slug} className="lib-problem">
                        <span className={`lib-diff lib-diff--${p.difficulty.toLowerCase()}`}>{p.difficulty}</span>
                        <a href={leetcodeUrl(p.slug)} target="_blank" rel="noopener noreferrer">{p.name}</a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
