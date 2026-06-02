// ─── PDF OCR Text Parser ────────────────────────────────────────────────────
// Parses raw OCR text from scanned CamScanner result sheet PDFs.
// Extracts index number + grade pairs, subject info, and semester from header.

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
}

// ─── Index + Grade Regex ────────────────────────────────────────────────────
// Matches patterns like: 22FIS0447 B-  or  22CIS0123 A+
// Order matters — longer grade tokens (A+, A-, AB) checked before single letters.

const INDEX_GRADE_REGEX =
  /(\d{2}[A-Z]{2,3}\d{4,5})\s+(A\+|A-|AB|A|B\+|B-|B|C\+|C-|C|D\+|D|E)\b/g;

// ─── Subject Code + Name from Header ────────────────────────────────────────
// Matches: "Code and Title of Paper : IS 2106 System Analysis & Design"

const SUBJECT_HEADER_REGEX =
  /Code and Title of Paper\s*[:\-]\s*([A-Z]{2,3}\s*\d{3,4})\s+([^\n\r]+)/i;

// ─── Semester from Header ───────────────────────────────────────────────────
// Matches: "Semester II(Proper -CIS)" or "Semster I(Repeat - FIS)"

const SEMESTER_REGEX =
  /Sem(?:e?s?ter?)\s*(I{1,3}V?|[1-4])\s*\((Proper|Repeat)\s*[-–]\s*(CIS|FIS)\)/i;

/**
 * Parse raw OCR text from a scanned result sheet PDF.
 * Returns extracted subject info, semester, and all student index+grade pairs.
 */
export function parseOCRText(rawText: string): ParsedSheet {
  // ── Extract subject code + name from header ─────────────────────────────
  let subjectCodeFromHeader: string | null = null;
  let subjectNameFromHeader: string | null = null;

  const subjectMatch = rawText.match(SUBJECT_HEADER_REGEX);
  if (subjectMatch) {
    subjectCodeFromHeader = subjectMatch[1].replace(/\s+/g, "").toUpperCase();
    subjectNameFromHeader = subjectMatch[2].trim();
  }

  // ── Extract semester info ───────────────────────────────────────────────
  let semesterFromHeader: string | null = null;

  const semMatch = rawText.match(SEMESTER_REGEX);
  if (semMatch) {
    const semNum = semMatch[1];
    const examType = semMatch[2]; // Proper or Repeat
    const dept = semMatch[3]; // CIS or FIS
    semesterFromHeader = `Semester ${semNum} (${examType} - ${dept})`;
  }

  // ── Extract all index number + grade pairs ──────────────────────────────
  const results: ParsedResult[] = [];
  const seen = new Set<string>();
  let match: RegExpExecArray | null;

  // Reset regex lastIndex
  INDEX_GRADE_REGEX.lastIndex = 0;

  while ((match = INDEX_GRADE_REGEX.exec(rawText)) !== null) {
    const indexNumber = match[1];
    const grade = match[2];

    // Deduplicate: keep first occurrence
    if (!seen.has(indexNumber)) {
      seen.add(indexNumber);
      results.push({ indexNumber, grade });
    }
  }

  return {
    subjectCodeFromHeader,
    subjectNameFromHeader,
    semesterFromHeader,
    results,
    totalFound: results.length,
  };
}
