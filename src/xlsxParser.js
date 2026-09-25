import * as XLSX from "xlsx";
import { PLATFORMS } from "./constants";

const normalizeHeader = (h) => String(h).trim().toLowerCase().replace(/[^a-z]/g, "");

const HEADER_MAP = {
  problem:  ["problem", "problemname", "name", "title", "question"],
  platform: ["platform", "source", "site", "website", "origin"],
  difficulty: ["difficulty", "diff", "level"],
  link:     ["link", "url", "problemlink", "problemurl"],
  topic:    ["topic", "category", "tag", "subject"],
};

const matchHeader = (header) => {
  const h = normalizeHeader(header);
  for (const [field, aliases] of Object.entries(HEADER_MAP)) {
    if (aliases.some((a) => h.includes(a))) return field;
  }
  return null;
};

const matchPlatform = (raw) => {
  if (!raw) return "Other";
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

const isExactHeaderCell = (cell) => {
  const s = String(cell).trim();
  if (!s || s.length > 30) return false;
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

  let headerRowIdx = -1;
  for (let i = 0; i < rawRows.length; i++) {
    const matchCount = rawRows[i].filter(isExactHeaderCell).length;
    if (matchCount >= 2) { headerRowIdx = i; break; }
  }
  if (headerRowIdx === -1) return [];

  const headerRow = rawRows[headerRowIdx];
  const colMap = {};
  headerRow.forEach((cell, idx) => {
    const field = matchHeader(String(cell));
    if (field && !(field in colMap)) colMap[field] = idx;
  });

  if (colMap.problem === undefined && headerRow.length >= 2) colMap.problem = 1;
  if (colMap.problem === undefined) return [];

  return rawRows
    .slice(headerRowIdx + 1)
    .map((row) => ({
      name:       String(row[colMap.problem] ?? "").trim(),
      platform:   matchPlatform(colMap.platform !== undefined ? String(row[colMap.platform] || "") : ""),
      difficulty: matchDifficulty(colMap.difficulty !== undefined ? String(row[colMap.difficulty] || "") : ""),
      link:       colMap.link !== undefined ? String(row[colMap.link] || "").trim() : "",
      topic:      colMap.topic !== undefined ? String(row[colMap.topic] || "").trim() : "",
    }))
    .filter((row) => {
      if (!row.name) return false;
      if (/^\d+$/.test(row.name)) return false;
      const n = row.name.toLowerCase();
      if (n === "problem" || n === "name" || n === "title" || n === "#") return false;
      return true;
    });
};
