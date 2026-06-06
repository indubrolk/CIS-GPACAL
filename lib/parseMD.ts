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
 * Clean up leading bullets, colons, or other formatting from a raw index string.
 */
function cleanSimpleLine(line: string): string {
  return line
    .trim()
    // Remove leading list bullets: - or * or numbers followed by dot/parenthesis
    .replace(/^[\s\-*•+]+\s*/, "")
    .replace(/^\d+[\s.)\-]+\s*/, "");
}

/**
 * Normalize an index number: trim, uppercase, remove punctuation/slashes, and fix common typos.
 */
function normalizeIndex(raw: string): string {
  // Remove space, dots, colons, vertical bars, hyphens, and slashes
  const cleaned = raw.replace(/[\s|.:\-\/]/g, "").toUpperCase();

  // A valid cleaned index number has length between 8 and 11
  if (cleaned.length < 8 || cleaned.length > 11) {
    return cleaned;
  }

  const year = cleaned.substring(0, 2);
  const rest = cleaned.substring(2);

  // Default to 3-letter dept (CIS/FIS)
  let deptLen = 3;

  // Check prefix to see if it's CIS/FIS/IT
  const first3 = rest.substring(0, 3)
    .replace(/1/g, "I")
    .replace(/0/g, "O")
    .replace(/5/g, "S");

  const first2 = rest.substring(0, 2)
    .replace(/1/g, "I")
    .replace(/0/g, "O")
    .replace(/5/g, "S");

  if (first3 === "CIS" || first3 === "FIS") {
    deptLen = 3;
  } else if (first2 === "IT") {
    deptLen = 2;
  } else {
    // Fallback split logic
    if (rest.length === 6) {
      deptLen = 2;
    } else if (rest.length === 7) {
      deptLen = 3;
    } else {
      deptLen = rest.length - 4; // default student number is 4 digits
      if (deptLen < 2) deptLen = 2;
      if (deptLen > 4) deptLen = 4;
    }
  }

  let dept = rest.substring(0, deptLen);
  let num = rest.substring(deptLen);

  // Normalize Dept letters (replace numbers with corresponding letters)
  dept = dept
    .replace(/1/g, "I")
    .replace(/0/g, "O")
    .replace(/5/g, "S");

  // Normalize Student Number digits (replace letters with corresponding numbers)
  num = num
    .replace(/[OQD]/g, "0")
    .replace(/[ILTG]/g, "1")
    .replace(/S/g, "5")
    .replace(/Z/g, "2")
    .replace(/B/g, "8");

  return `${year}${dept}${num}`;
}

/**
 * Normalize a grade string: trim, uppercase, normalize dashes, remove trailing dots.
 */
function normalizeGrade(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    // Normalize en-dash, em-dash, underscore to hyphen
    .replace(/[–—_]/g, "-")
    // Remove any trailing dots (e.g. "AB." -> "AB")
    .replace(/\.$/, "")
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
  const cleanedLine = cleanSimpleLine(line);
  if (!cleanedLine || cleanedLine.startsWith("#") || cleanedLine.startsWith("//") || cleanedLine.startsWith("<!--")) {
    return null; // Skip comments, headings, blank lines
  }

  // Split by colon, comma, tab, or multiple spaces
  const parts = cleanedLine
    .split(/[:,\t]|\s{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  // If split didn't work, try single space split
  if (parts.length < 2) {
    const spaceParts = cleanedLine.split(/\s+/).filter(Boolean);
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
  let tableHeaderParsed = false;
  // Track all column pairs mapping { indexCol, gradeCol }
  let columnPairs: { indexCol: number; gradeCol: number }[] = [{ indexCol: 0, gradeCol: 1 }];

  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum];
    const trimmedLine = line.trim();

    // Skip empty lines & reset header parsing
    if (!trimmedLine) {
      tableHeaderParsed = false;
      continue;
    }

    // Skip markdown headings & reset header parsing
    if (trimmedLine.startsWith("#")) {
      tableHeaderParsed = false;
      continue;
    }

    // Skip HTML comments
    if (trimmedLine.startsWith("<!--")) continue;

    // ── Try Table Format ──────────────────────────────────────────────
    const tableCells = parseTableRow(trimmedLine);

    if (tableCells) {
      // Skip separator rows (|---|---|)
      if (isSeparatorRow(trimmedLine)) continue;

      // Check if it's a header row
      if (!tableHeaderParsed && isHeaderRow(tableCells)) {
        tableHeaderParsed = true;
        columnPairs = [];

        // Detect column order from header labels
        for (let i = 0; i < tableCells.length; i++) {
          const cell = tableCells[i].toLowerCase();
          if (/index|student|number|reg|id/.test(cell)) {
            // Find the closest subsequent grade column that hasn't been paired yet
            for (let j = i + 1; j < tableCells.length; j++) {
              const nextCell = tableCells[j].toLowerCase();
              if (/grade|result|mark|score/.test(nextCell)) {
                if (!columnPairs.some((p) => p.gradeCol === j)) {
                  columnPairs.push({ indexCol: i, gradeCol: j });
                  break;
                }
              }
            }
          }
        }

        // If no pairs were found, default to 0 and 1
        if (columnPairs.length === 0) {
          columnPairs.push({ indexCol: 0, gradeCol: 1 });
        }
        continue;
      }

      // Data row
      if (tableCells.length >= 2) {
        for (const { indexCol, gradeCol } of columnPairs) {
          const rawIndex = tableCells[indexCol] || "";
          const rawGrade = tableCells[gradeCol] || "";

          // Skip if the raw cell is empty or has a standard placeholder like "-"
          if (rawIndex.trim() === "" || rawIndex.trim() === "-") continue;

          const indexNumber = normalizeIndex(rawIndex);
          const grade = normalizeGrade(rawGrade);

          // Validate
          if (!indexNumber) continue;

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
      }
      continue;
    }

    // ── Try Simple Line Format (fallback for any non-table line) ──────
    const parsed = parseSimpleLine(trimmedLine);
    if (!parsed) continue;

    // Filter out obvious noise: must look like it starts with an index
    if (!/\d{2}[A-Z0-9]{5,8}/i.test(parsed.index)) {
      continue;
    }

    const indexNumber = normalizeIndex(parsed.index);
    const grade = normalizeGrade(parsed.grade);

    if (!INDEX_NUMBER_REGEX.test(indexNumber)) {
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

  return {
    subjectCodeFromHeader: null,
    subjectNameFromHeader: null,
    semesterFromHeader: null,
    results,
    totalFound: results.length,
    parseErrors,
  };
}
