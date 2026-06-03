// ─── Markdown Results Parser ────────────────────────────────────────────────
// Parses .md files containing student index numbers and grades.
// Supports multiple formats:
//   1. Markdown tables:  | 22CIS0001 | A+ |
//   2. Simple lines:     22CIS0001 A+
//   3. CSV-style:        22CIS0001, A+
//   4. Tab-separated:    22CIS0001	A+

export interface ParsedResult {
  indexNumber: string;
  grade: string;
}

export interface ParsedSheet {
  subjectCodeFromHeader: string | null;
  subjectNameFromHeader: string | null;
  semesterFromHeader: string | null;
  results: ParsedResult[];
  totalFound: number;
  parseErrors: string[];
}

// ─── Valid Grades ────────────────────────────────────────────────────────────

const VALID_GRADES = new Set([
  "A+", "A", "A-",
  "B+", "B", "B-",
  "C+", "C", "C-",
  "D+", "D",
  "E", "AB",
]);

// ─── Index Number Validation ────────────────────────────────────────────────
// Standard format: 2-digit year + 2-3 letter dept + 4-5 digit number
// Examples: 22CIS0001, 22FIS0447, 23IT01234

const INDEX_NUMBER_REGEX = /^\d{2}[A-Z]{2,4}\d{3,5}$/;

/**
 * Normalize an index number: trim, uppercase, remove stray whitespace.
 */
function normalizeIndex(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

/**
 * Normalize a grade string: trim, uppercase, normalize dashes.
 */
function normalizeGrade(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    // Normalize en-dash, em-dash, underscore to hyphen
    .replace(/[–—_]/g, "-")
    // Remove any spaces between letter and modifier (e.g. "A +" → "A+")
    .replace(/([A-E])\s+([+-])/g, "$1$2");
}

// ─── Table Row Parser ───────────────────────────────────────────────────────

/**
 * Try to parse a markdown table row: | value1 | value2 | ...
 * Returns array of cell values, or null if not a table row.
 */
function parseTableRow(line: string): string[] | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|")) return null;

  // Split by pipe, remove first/last empty elements
  const cells = trimmed
    .split("|")
    .map((c) => c.trim())
    .filter((_, i, arr) => i > 0 && i < arr.length); // skip first/last empty from leading/trailing |

  return cells.length >= 2 ? cells : null;
}

/**
 * Check if a table row is a separator row (e.g. |---|---|)
 */
function isSeparatorRow(line: string): boolean {
  const trimmed = line.trim();
  return /^\|[\s\-:|]+\|$/.test(trimmed);
}

/**
 * Check if a row is a header row (contains known header labels)
 */
function isHeaderRow(cells: string[]): boolean {
  const headerPatterns = [
    /index/i, /student/i, /number/i, /reg/i, /id/i,
    /grade/i, /result/i, /mark/i, /score/i,
  ];
  return cells.some((cell) =>
    headerPatterns.some((pattern) => pattern.test(cell))
  );
}

// ─── Line Parser (non-table formats) ────────────────────────────────────────

/**
 * Try to extract index + grade from a non-table line.
 * Supports: "22CIS0001 A+", "22CIS0001, A+", "22CIS0001	A+"
 */
function parseSimpleLine(line: string): { index: string; grade: string } | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("//") || trimmed.startsWith("<!--")) {
    return null; // Skip comments, headings, blank lines
  }

  // Split by comma, tab, or multiple spaces
  const parts = trimmed
    .split(/[,\t]|\s{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  // If comma/tab split didn't work, try single space split
  if (parts.length < 2) {
    const spaceParts = trimmed.split(/\s+/).filter(Boolean);
    if (spaceParts.length >= 2) {
      // Last part is grade, everything before (joined) is index
      const grade = spaceParts[spaceParts.length - 1];
      const index = spaceParts.slice(0, -1).join("");
      return { index, grade };
    }
    return null;
  }

  // First part = index, last meaningful part = grade
  return { index: parts[0], grade: parts[parts.length - 1] };
}

// ─── Main Parser ────────────────────────────────────────────────────────────

/**
 * Parse a markdown file containing student results.
 * Returns extracted results and any parsing errors.
 */
export function parseMDText(rawText: string): ParsedSheet {
  const lines = rawText.split(/\r?\n/);
  const results: ParsedResult[] = [];
  const seen = new Set<string>();
  const parseErrors: string[] = [];

  // Detect if the file uses markdown table format
  let isTableFormat = false;
  let tableHeaderParsed = false;
  // Track which column has the index and which has the grade
  let indexCol = 0;
  let gradeCol = 1;

  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum];
    const trimmedLine = line.trim();

    // Skip empty lines
    if (!trimmedLine) continue;

    // Skip markdown headings (could contain subject info later)
    if (trimmedLine.startsWith("#")) continue;

    // Skip HTML comments
    if (trimmedLine.startsWith("<!--")) continue;

    // ── Try Table Format ──────────────────────────────────────────────
    const tableCells = parseTableRow(trimmedLine);

    if (tableCells) {
      isTableFormat = true;

      // Skip separator rows (|---|---|)
      if (isSeparatorRow(trimmedLine)) continue;

      // Check if it's a header row
      if (!tableHeaderParsed && isHeaderRow(tableCells)) {
        tableHeaderParsed = true;

        // Detect column order from header labels
        for (let i = 0; i < tableCells.length; i++) {
          const cell = tableCells[i].toLowerCase();
          if (/index|student|number|reg|id/.test(cell)) {
            indexCol = i;
          }
          if (/grade|result|mark/.test(cell)) {
            gradeCol = i;
          }
        }
        continue;
      }

      // Data row
      if (tableCells.length >= 2) {
        const rawIndex = tableCells[indexCol] || "";
        const rawGrade = tableCells[gradeCol] || "";

        const indexNumber = normalizeIndex(rawIndex);
        const grade = normalizeGrade(rawGrade);

        // Validate
        if (!indexNumber) continue; // skip empty rows

        if (!INDEX_NUMBER_REGEX.test(indexNumber)) {
          parseErrors.push(
            `Line ${lineNum + 1}: Invalid index number "${rawIndex}" → "${indexNumber}"`
          );
          continue;
        }

        if (!VALID_GRADES.has(grade)) {
          parseErrors.push(
            `Line ${lineNum + 1}: Invalid grade "${rawGrade}" for ${indexNumber}`
          );
          continue;
        }

        // Deduplicate: keep first occurrence
        if (!seen.has(indexNumber)) {
          seen.add(indexNumber);
          results.push({ indexNumber, grade });
        } else {
          parseErrors.push(
            `Line ${lineNum + 1}: Duplicate index ${indexNumber} (skipped)`
          );
        }
      }
      continue;
    }

    // ── Try Simple Line Format (only if we haven't detected a table) ──
    if (!isTableFormat) {
      const parsed = parseSimpleLine(trimmedLine);
      if (!parsed) continue;

      const indexNumber = normalizeIndex(parsed.index);
      const grade = normalizeGrade(parsed.grade);

      if (!INDEX_NUMBER_REGEX.test(indexNumber)) {
        // Only report as error if it looks like it might be data
        if (/\d{2}/.test(parsed.index)) {
          parseErrors.push(
            `Line ${lineNum + 1}: Invalid index number "${parsed.index}" → "${indexNumber}"`
          );
        }
        continue;
      }

      if (!VALID_GRADES.has(grade)) {
        parseErrors.push(
          `Line ${lineNum + 1}: Invalid grade "${parsed.grade}" for ${indexNumber}`
        );
        continue;
      }

      if (!seen.has(indexNumber)) {
        seen.add(indexNumber);
        results.push({ indexNumber, grade });
      } else {
        parseErrors.push(
          `Line ${lineNum + 1}: Duplicate index ${indexNumber} (skipped)`
        );
      }
    }
  }

  return {
    subjectCodeFromHeader: null,
    subjectNameFromHeader: null,
    semesterFromHeader: null,
    results,
    totalFound: results.length,
    parseErrors,
  };
}
