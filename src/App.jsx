import { useEffect, useMemo, useState } from "react";
import "./App.css";

const STORAGE_KEY = "study-1-7-24-plans";
const PHASES = [
  { key: "day1", label: "Day 1", offset: 1, hint: "First recall" },
  { key: "day7", label: "Day 7", offset: 7, hint: "Deepen understanding" },
  { key: "day24", label: "Day 24", offset: 24, hint: "Long-term lock" },
];

const pad = (value) => String(value).padStart(2, "0");

const toDateInput = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const getTodayString = () => toDateInput(new Date());

const parseDate = (dateStr) => new Date(`${dateStr}T00:00:00`);
const addDays = (dateStr, days) => {
  const date = parseDate(dateStr);
  date.setDate(date.getDate() + days);
  return toDateInput(date);
};

const formatDate = (dateStr) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(
    parseDate(dateStr),
  );

const diffInDays = (fromDate, toDate) => {
  const ms = parseDate(toDate).getTime() - parseDate(fromDate).getTime();
  return Math.round(ms / 86400000);
};

const getRelativeLabel = (days) => {
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  if (days > 1) return `In ${days} days`;
  return `${Math.abs(days)} days overdue`;
};

const createId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const loadPlans = () => {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
};

const isPlanComplete = (plan) =>
  PHASES.every((phase) => plan.phases[phase.key]);

const getNextPhase = (plan) => PHASES.find((phase) => !plan.phases[phase.key]);

const getPlanStatus = (plan, today) => {
  if (isPlanComplete(plan)) {
    return { label: "Complete", kind: "complete" };
  }
  const nextPhase = getNextPhase(plan);
  if (!nextPhase) return { label: "Complete", kind: "complete" };
  const dueDate = addDays(plan.startDate, nextPhase.offset);
  const days = diffInDays(today, dueDate);
  if (days < 0) return { label: `Overdue ${Math.abs(days)}d`, kind: "overdue" };
  if (days === 0) return { label: "Due today", kind: "due" };
  if (days <= 2) return { label: `Due in ${days}d`, kind: "soon" };
  return { label: `Next in ${days}d`, kind: "ontrack" };
};

function App() {
  const [plans, setPlans] = useState(loadPlans);
  const [filter, setFilter] = useState("active");
  const [form, setForm] = useState({
    title: "",
    startDate: getTodayString(),
    notes: "",
  });

  const today = getTodayString();

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
  }, [plans]);

  const upcoming = useMemo(() => {
    return plans
      .map((plan) => {
        const nextPhase = getNextPhase(plan);
        if (!nextPhase) return null;
        const date = addDays(plan.startDate, nextPhase.offset);
        const daysUntil = diffInDays(today, date);
        return {
          id: plan.id,
          title: plan.title,
          phase: nextPhase.label,
          date,
          daysUntil,
        };
      })
      .filter(Boolean)
      .sort((a, b) => parseDate(a.date) - parseDate(b.date))
      .slice(0, 4);
  }, [plans, today]);

  const stats = useMemo(() => {
    const total = plans.length;
    const completed = plans.filter((plan) => isPlanComplete(plan)).length;
    return {
      total,
      completed,
      active: total - completed,
    };
  }, [plans]);

  const filteredPlans = useMemo(() => {
    if (filter === "completed") {
      return plans.filter((plan) => isPlanComplete(plan));
    }
    if (filter === "active") {
      return plans.filter((plan) => !isPlanComplete(plan));
    }
    return plans;
  }, [plans, filter]);

  const remindersToday = useMemo(() => {
    return plans
      .map((plan) => {
        const nextPhase = getNextPhase(plan);
        if (!nextPhase) return null;
        const date = addDays(plan.startDate, nextPhase.offset);
        if (date !== today) return null;
        return {
          id: plan.id,
          title: plan.title,
          phase: nextPhase.label,
        };
      })
      .filter(Boolean);
  }, [plans, today]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!form.title.trim()) return;

    const newPlan = {
      id: createId(),
      title: form.title.trim(),
      startDate: form.startDate,
      notes: form.notes.trim(),
      createdAt: new Date().toISOString(),
      phases: PHASES.reduce((acc, phase) => {
        acc[phase.key] = false;
        return acc;
      }, {}),
    };

    setPlans((prev) => [newPlan, ...prev]);
    setForm((prev) => ({ ...prev, title: "", notes: "" }));
  };

  const handleFieldChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhaseToggle = (planId, phaseKey) => {
    setPlans((prev) =>
      prev.map((plan) => {
        if (plan.id !== planId) return plan;
        const phaseIndex = PHASES.findIndex((phase) => phase.key === phaseKey);
        const locked =
          phaseIndex > 0 && !plan.phases[PHASES[phaseIndex - 1].key];
        if (locked) return plan;

        const nextPhases = {
          ...plan.phases,
          [phaseKey]: !plan.phases[phaseKey],
        };

        if (plan.phases[phaseKey]) {
          PHASES.slice(phaseIndex + 1).forEach((phase) => {
            nextPhases[phase.key] = false;
          });
        }

        return {
          ...plan,
          phases: nextPhases,
        };
      }),
    );
  };

  const handleRemove = (planId) => {
    setPlans((prev) => prev.filter((plan) => plan.id !== planId));
  };

  return (
    <div className="dashboard-layout">
      {/* LEFT SIDEBAR: Branding & Input */}
      <aside className="sidebar">
        <div className="brand">
          <h1>Study Flow</h1>
          <span className="badge">1-7-24 Method</span>
        </div>

        <p className="sidebar-desc">
          Capture a topic once, let the cadence guide your review to make memory
          stick.
        </p>

        <form className="planner-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <label className="form-field">
              Topic Title
              <input
                type="text"
                name="title"
                placeholder="Eg. Calculus limits"
                value={form.title}
                onChange={handleFieldChange}
                required
              />
            </label>
            <label className="form-field">
              Start Date
              <input
                type="date"
                name="startDate"
                value={form.startDate}
                onChange={handleFieldChange}
                required
              />
            </label>
            <label className="form-field">
              Notes (Optional)
              <textarea
                name="notes"
                placeholder="Key formulas or focus points..."
                rows="3"
                value={form.notes}
                onChange={handleFieldChange}
              />
            </label>
            <button className="btn primary w-full" type="submit">
              + Create Plan
            </button>
          </div>
        </form>
      </aside>

      {/* RIGHT MAIN AREA: Action & Overview */}
      <main className="main-content">
        {/* Priority 1: What to do today */}
        <section className="reminders">
          <div className="section-head">
            <h2>Today's Action Items</h2>
            <span className="date-badge">{formatDate(today)}</span>
          </div>

          <div className="reminder-list">
            {remindersToday.length ? (
              <div className="reminder-group">
                <ul className="reminder-items">
                  {remindersToday.map((item) => (
                    <li key={`${item.id}-${item.phase}`}>
                      <span className="reminder-dot"></span>
                      <div className="reminder-content">
                        <strong>{item.title}</strong>
                        <span className="reminder-phase">
                          {item.phase} Review
                        </span>
                      </div>
                      <button
                        className="btn ghost small"
                        onClick={() =>
                          handlePhaseToggle(
                            item.id,
                            PHASES.find((p) => p.label === item.phase).key,
                          )
                        }
                      >
                        Mark Done
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="empty-card">
                <p>You're all caught up for today. Great job!</p>
              </div>
            )}
          </div>
        </section>

        {/* Priority 2: All Plans Overview */}
        <section className="plans">
          <div className="section-head with-actions">
            <h2>Your Study Plans</h2>
            <div className="filter-group" role="group" aria-label="Plan filter">
              {[
                { key: "active", label: "Active" },
                { key: "completed", label: "Completed" },
                { key: "all", label: "All" },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className="filter-button"
                  aria-pressed={filter === item.key}
                  onClick={() => setFilter(item.key)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="plan-grid">
            {filteredPlans.length ? (
              filteredPlans.map((plan) => {
                const doneCount = PHASES.filter(
                  (phase) => plan.phases[phase.key],
                ).length;
                const progress = Math.round((doneCount / PHASES.length) * 100);
                const status = getPlanStatus(plan, today);

                return (
                  <article key={plan.id} className="plan-card">
                    <div className="plan-top">
                      <div className="plan-header-text">
                        <h3>{plan.title}</h3>
                        <p className="plan-meta">
                          Started {formatDate(plan.startDate)}
                        </p>
                      </div>
                      <span className={`status ${status.kind}`}>
                        {status.label}
                      </span>
                    </div>

                    {plan.notes && <p className="plan-notes">{plan.notes}</p>}

                    <div className="phase-row">
                      {PHASES.map((phase, phaseIndex) => {
                        const isDone = plan.phases[phase.key];
                        const locked =
                          phaseIndex > 0 &&
                          !plan.phases[PHASES[phaseIndex - 1].key];
                        const phaseDate = addDays(plan.startDate, phase.offset);
                        const daysUntil = diffInDays(today, phaseDate);
                        const isOverdue = !isDone && !locked && daysUntil < 0;
                        const isSoon =
                          !isDone &&
                          !locked &&
                          daysUntil <= 2 &&
                          daysUntil >= 0;

                        return (
                          <button
                            key={phase.key}
                            type="button"
                            className={`phase-button ${isDone ? "done" : ""} ${
                              locked ? "locked" : ""
                            } ${isOverdue ? "overdue" : ""} ${
                              isSoon ? "soon" : ""
                            }`}
                            onClick={() =>
                              handlePhaseToggle(plan.id, phase.key)
                            }
                            disabled={locked}
                            aria-pressed={isDone}
                          >
                            <span className="phase-title">{phase.label}</span>
                            <span className="phase-state">
                              {isDone
                                ? "Done"
                                : locked
                                  ? "Locked"
                                  : getRelativeLabel(daysUntil)}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="plan-footer">
                      <div className="progress">
                        <div className="progress-track">
                          <div
                            className="progress-fill"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn text-danger small"
                        onClick={() => handleRemove(plan.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="empty-card">
                <p>No plans match this view. Add a new topic to get started.</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
