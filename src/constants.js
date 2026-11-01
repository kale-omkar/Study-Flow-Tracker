// ── Constants ──────────────────────────────────────
export const STORAGE_KEY = "study-flow-v3";

export const REVIEW_PHASES = [
  { key: "day1",  label: "Day 1",  offset: 1,  hint: "First recall" },
  { key: "day7",  label: "Day 7",  offset: 7,  hint: "Deepen understanding" },
  { key: "day24", label: "Day 24", offset: 24, hint: "Long-term lock" },
];

export const PLATFORMS = [
  "LeetCode",
  "LeetCode Premium",
  "HackerRank",
  "Codeforces",
  "CodeChef",
  "GeeksforGeeks",
  "InterviewBit",
  "Other",
];

export const DIFFICULTY = ["Easy", "Medium", "Hard"];

export const TRACKS = [
  { key: "all", label: "All Questions" },
  { key: "dsa", label: "DSA & Algorithms" },
  { key: "sql", label: "SQL & Databases" },
];

export const STATUS_OPTIONS = [
  { value: "solved",    label: "Solved",    icon: "✓" },
  { value: "attempted", label: "Attempted", icon: "◐" },
  { value: "unsolved",  label: "Unsolved",  icon: "○" },
];
