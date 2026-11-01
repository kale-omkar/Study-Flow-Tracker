import * as XLSX from "xlsx";
import { PLATFORMS } from "./constants.js";

const normalizeHeader = (h) => String(h).trim().toLowerCase().replace(/[^a-z]/g, "");

// ── Column aliases (normalized, lowercase, letters only) ────────────────────
const HEADER_MAP = {
  number:     ["number", "num", "problemno", "problemnum", "no", "id"],
  problem:    ["problem", "problemname", "name", "title", "question"],
  platform:   ["platform", "source", "site", "website", "origin"],
  difficulty: ["difficulty", "diff", "level"],
  link:       ["link", "url", "problemlink", "problemurl"],
  topic:      ["topic", "category", "tag", "subject", "topiccategory"],
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
  const lower = raw.toLowerCase().trim();
  if (lower.includes("hackerrank")) return "HackerRank";
  if (lower.includes("premium")) return "LeetCode Premium";
  if (lower.includes("leetcode")) return "LeetCode";
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

// Build URL slugs for LeetCode and HackerRank
const slugify = (name) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "-");

const isHeaderCell = (cell) => {
  const s = String(cell).trim();
  if (!s || s.length > 40) return false;
  const n = normalizeHeader(s);
  return Object.values(HEADER_MAP).some((aliases) =>
    aliases.some((a) => n === a || n.startsWith(a))
  );
};

// Check if a sheet is an informational / dashboard sheet rather than a problem list
const isIgnoredSheet = (sheetName) => {
  const s = sheetName.toLowerCase();
  return (
    s.includes("dashboard") ||
    s.includes("analytics") ||
    s.includes("trade-off") ||
    s.includes("tradeoff") ||
    s.includes("guide") ||
    s.includes("sync") ||
    s.includes("script") ||
    s.includes("readme") ||
    s.includes("instruction") ||
    s.includes("catalog") ||    // Skip duplicate master catalog sheets
    s.includes("master list")   // Skip other duplicate list sheets
  );
};

export const parseXlsx = (buffer) => {
  const workbook = XLSX.read(buffer, { type: "array" });
  const allProblems = [];

  // Iterate over all sheets in the workbook to handle multi-tab files (DSA, SQL, etc.)
  for (const sheetName of workbook.SheetNames) {
    if (isIgnoredSheet(sheetName)) continue;

    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;
    const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
    if (rawRows.length === 0) continue;

    // Find the header row (matches >= 2 known header columns)
    let headerRowIdx = -1;
    for (let i = 0; i < Math.min(rawRows.length, 15); i++) {
      const matchCount = rawRows[i].filter(isHeaderCell).length;
      if (matchCount >= 2) {
        headerRowIdx = i;
        break;
      }
    }
    if (headerRowIdx === -1) continue;

    const headerRow = rawRows[headerRowIdx];
    const colMap = {};
    headerRow.forEach((cell, idx) => {
      const field = matchHeader(String(cell));
      if (field && !(field in colMap)) colMap[field] = idx;
    });

    if (colMap.problem === undefined && headerRow.length >= 2) colMap.problem = 1;
    if (colMap.problem === undefined) continue;

    const lowerSheet = sheetName.toLowerCase();
    const isSqlSheet =
      lowerSheet.includes("sql") ||
      lowerSheet.includes("database") ||
      lowerSheet.includes("query");

    const sheetProblems = rawRows
      .slice(headerRowIdx + 1)
      .map((row) => {
        const name = String(row[colMap.problem] ?? "").trim();
        const platform =
          colMap.platform !== undefined
            ? matchPlatform(String(row[colMap.platform] || ""))
            : "LeetCode";

        let link = "";
        if (colMap.link !== undefined) {
          link = String(row[colMap.link] || "").trim();
        }
        if (!link && name) {
          if (platform === "HackerRank") {
            link = `https://www.hackerrank.com/challenges/${slugify(name)}/problem`;
          } else {
            link = `https://leetcode.com/problems/${slugify(name)}/`;
          }
        }

        const topic =
          colMap.topic !== undefined
            ? String(row[colMap.topic] || "").trim()
            : "";

        // Track is determined solely by which sheet the problem came from.
        // We do NOT use topic content to classify track — a DSA problem about
        // "Database" (e.g. Design a Key-Value Store) is still a DSA problem.
        const track = isSqlSheet ? "sql" : "dsa";

        return {
          name,
          platform,
          difficulty: matchDifficulty(
            colMap.difficulty !== undefined ? String(row[colMap.difficulty] || "") : ""
          ),
          link,
          topic,
          track,
          sheetName,
          importedStatus:
            colMap.status !== undefined
              ? matchStatus(String(row[colMap.status] || ""))
              : "unsolved",
        };
      })
      .filter((row) => {
        if (!row.name) return false;
        if (/^\d+$/.test(row.name)) return false;
        const n = row.name.toLowerCase();
        if (["problem", "name", "title", "#", "question"].includes(n)) return false;
        return true;
      });

    allProblems.push(...sheetProblems);
  }

  // Deduplicate within each track independently.
  // A DSA problem and an SQL problem with the same name are kept as two separate entries
  // (e.g. "Find Median from Data Stream" can be in both the DSA and SQL lists).
  // Within the same track, combine name + platform as the key so that the same problem
  // appearing on multiple platforms (e.g. "Binary Tree Nodes" on LeetCode AND HackerRank)
  // is counted as two distinct entries.
  const seen = new Map();
  for (const item of allProblems) {
    const key = `${item.track}|${(item.platform || "").toLowerCase()}|${item.name.toLowerCase()}`;
    if (!seen.has(key)) {
      seen.set(key, item);
    }
  }

  return Array.from(seen.values());
};
