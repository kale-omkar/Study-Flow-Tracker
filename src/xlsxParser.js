import * as XLSX from "xlsx";
import { PLATFORMS } from "./constants";

const normalizeHeader = (h) => String(h).trim().toLowerCase().replace(/[^a-z]/g, "");

// ── Column aliases (normalized, lowercase, letters only) ────────────────────
const HEADER_MAP = {
  number:     ["number", "num", "problemno", "problemnum", "no", "id"],
  problem:    ["problem", "problemname", "name", "title", "question"],
  platform:   ["platform", "source", "site", "website", "origin"],
  difficulty: ["difficulty", "diff", "level"],
  link:       ["link", "url", "problemlink", "problemurl"],
  topic:      ["topic", "category", "tag", "subject"],
  status:     ["status", "state", "progress", "completion"],
};

const matchHeader = (header) => {
  const h = normalizeHeader(header);
  for (const [field, aliases] of Object.entries(HEADER_MAP)) {
    if (aliases.some((a) => h === a || h.startsWith(a))) return field;
  }
  return null;
};

const matchPlatform = (raw) => {
  if (!raw) return "LeetCode";
  const lower = raw.toLowerCase();
  return PLATFORMS.find((p) => lower.includes(p.toLowerCase())) || "Other";
};

const matchDifficulty = (raw) => {
  if (!raw) return "Medium";
  const lower = raw.toLowerCase();
  if (lower.includes("easy") || lower.includes("basic")) return "Easy";
  if (lower.includes("hard") || lower.includes("advance")) return "Hard";
  return "Medium";
};

// Map the STATUS column value (from the sheet) → internal status string
const matchStatus = (raw) => {
  if (!raw) return "unsolved";
  const lower = String(raw).toLowerCase().trim();
  if (lower.includes("not started") || lower === "unsolved") return "unsolved";
  if (lower.includes("solved") || lower === "done" || lower === "completed") return "solved";
  if (
    lower.includes("progress") ||
    lower.includes("attempted") ||
    lower === "started" ||
    lower.includes("in progress")
  )
    return "attempted";
  return "unsolved";
};

// Build a LeetCode URL slug from a problem name:
//   "Two Sum" → "two-sum", "Add Two Numbers" → "add-two-numbers"
const slugify = (name) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "-");

// Returns true if a row cell looks like one of our recognised header words
const isHeaderCell = (cell) => {
  const s = String(cell).trim();
  if (!s || s.length > 40) return false;
  const n = normalizeHeader(s);
  return Object.values(HEADER_MAP).some((aliases) =>
    aliases.some((a) => n === a || n.startsWith(a))
  );
};

export const parseXlsx = (buffer) => {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  if (rawRows.length === 0) return [];

  // Find the header row: the first row that matches >= 2 known header words
  let headerRowIdx = -1;
  for (let i = 0; i < rawRows.length; i++) {
    const matchCount = rawRows[i].filter(isHeaderCell).length;
    if (matchCount >= 2) { headerRowIdx = i; break; }
  }
  if (headerRowIdx === -1) return [];

  // Map column names → column indices
  const headerRow = rawRows[headerRowIdx];
  const colMap = {};
  headerRow.forEach((cell, idx) => {
    const field = matchHeader(String(cell));
    if (field && !(field in colMap)) colMap[field] = idx;
  });

  // Fallback: if no "problem" column found, assume column index 1
  if (colMap.problem === undefined && headerRow.length >= 2) colMap.problem = 1;
  if (colMap.problem === undefined) return [];

  return rawRows
    .slice(headerRowIdx + 1)
    .map((row) => {
      const name = String(row[colMap.problem] ?? "").trim();
      const platform =
        colMap.platform !== undefined
          ? matchPlatform(String(row[colMap.platform] || ""))
          : "LeetCode";

      // Build link: use explicit link column if present, otherwise generate
      // a LeetCode URL from the problem name (works for this sheet's format)
      let link = "";
      if (colMap.link !== undefined) {
        link = String(row[colMap.link] || "").trim();
      }
      if (!link && platform === "LeetCode" && name) {
        link = `https://leetcode.com/problems/${slugify(name)}/`;
      }

      // Merge multiple topics (comma-separated) from the TOPIC column
      const topic =
        colMap.topic !== undefined
          ? String(row[colMap.topic] || "").trim()
          : "";

      return {
        name,
        platform,
        difficulty: matchDifficulty(
          colMap.difficulty !== undefined ? String(row[colMap.difficulty] || "") : ""
        ),
        link,
        topic,
        // importedStatus lets App.jsx pre-set the status from the sheet
        importedStatus:
          colMap.status !== undefined
            ? matchStatus(String(row[colMap.status] || ""))
            : "unsolved",
      };
    })
    .filter((row) => {
      if (!row.name) return false;
      // Skip rows where the "problem" cell is just a number (row counter)
      if (/^\d+$/.test(row.name)) return false;
      const n = row.name.toLowerCase();
      // Skip header-like ghost rows
      if (["problem", "name", "title", "#", "question"].includes(n)) return false;
      return true;
    });
};
