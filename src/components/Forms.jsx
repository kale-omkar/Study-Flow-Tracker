import React from "react";
import { Icons } from "../Icons";
import { PLATFORMS, DIFFICULTY, STATUS_OPTIONS } from "../constants";

// ── TopicForm ─────────────────────────────────────
export function TopicForm({ onSubmit, onCancel, today }) {
  const [form, setForm] = React.useState({ title: "", startDate: today, notes: "" });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <form
      className="form-card"
      onSubmit={(e) => {
        e.preventDefault();
        if (!form.title.trim()) return;
        onSubmit(form);
      }}
    >
      <h4 className="form-title">New Topic</h4>
      <div className="form-grid-2">
        <label className="form-field">
          <span>Topic Title</span>
          <input
            type="text"
            name="title"
            placeholder="e.g. Dynamic Programming"
            value={form.title}
            onChange={handleChange}
            required
            autoFocus
          />
        </label>
        <label className="form-field">
          <span>Start Date</span>
          <input
            type="date"
            name="startDate"
            value={form.startDate}
            onChange={handleChange}
            required
          />
        </label>
      </div>
      <label className="form-field">
        <span>Notes (optional)</span>
        <textarea
          name="notes"
          placeholder="Key concepts, formulas, or focus areas..."
          rows="3"
          value={form.notes}
          onChange={handleChange}
        />
      </label>
      <div className="form-actions">
        <button type="submit" className="btn-primary">
          {Icons.plus} Create Topic
        </button>
        <button type="button" className="btn-ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

// ── TopicEditForm ─────────────────────────────────
export function TopicEditForm({ topic, onSave, onCancel }) {
  const [form, setForm] = React.useState({ title: topic.title, notes: topic.notes });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <form
      className="form-card"
      onSubmit={(e) => {
        e.preventDefault();
        if (!form.title.trim()) return;
        onSave({ title: form.title.trim(), notes: form.notes.trim() });
      }}
    >
      <h4 className="form-title">Edit Topic</h4>
      <label className="form-field">
        <span>Title</span>
        <input type="text" name="title" value={form.title} onChange={handleChange} required autoFocus />
      </label>
      <label className="form-field">
        <span>Notes</span>
        <textarea name="notes" rows="4" value={form.notes} onChange={handleChange} />
      </label>
      <div className="form-actions">
        <button type="submit" className="btn-primary">Save Changes</button>
        <button type="button" className="btn-ghost" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

// ── ProblemForm ────────────────────────────────────
export function ProblemForm({ onSubmit, onCancel }) {
  const [form, setForm] = React.useState({
    name: "",
    platform: PLATFORMS[0],
    difficulty: DIFFICULTY[1],
    link: "",
    status: "unsolved",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <form
      className="form-card"
      onSubmit={(e) => {
        e.preventDefault();
        if (!form.name.trim()) return;
        onSubmit(form);
      }}
    >
      <h4 className="form-title">Add Problem</h4>
      <div className="form-grid-2">
        <label className="form-field">
          <span>Problem Name</span>
          <input
            type="text"
            name="name"
            placeholder="e.g. Two Sum"
            value={form.name}
            onChange={handleChange}
            required
            autoFocus
          />
        </label>
        <label className="form-field">
          <span>Link</span>
          <input
            type="url"
            name="link"
            placeholder="https://..."
            value={form.link}
            onChange={handleChange}
          />
        </label>
      </div>
      <div className="form-grid-3">
        <label className="form-field">
          <span>Platform</span>
          <select name="platform" value={form.platform} onChange={handleChange}>
            {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>
        <label className="form-field">
          <span>Difficulty</span>
          <select name="difficulty" value={form.difficulty} onChange={handleChange}>
            {DIFFICULTY.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </label>
        <label className="form-field">
          <span>Status</span>
          <select name="status" value={form.status} onChange={handleChange}>
            {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </label>
      </div>
      <div className="form-actions">
        <button type="submit" className="btn-primary">
          {Icons.plus} Add Problem
        </button>
        <button type="button" className="btn-ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
