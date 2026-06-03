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
// Allows OCR errors in the index number (like digits in letters or letters in digits)
// and handles separators like spaces, colons, vertical bars.
const INDEX_GRADE_REGEX =
  /\b(\d{2}[A-Z0-9|]{2,5}\d{3,6})\s*[|.:\s]*\s*(A\+|A-|AB|A|B\+|B-|B|C\+|C-|C|D\+|D|E)\b/gi;

// ─── Subject Code + Name from Header ────────────────────────────────────────
// Matches: "Code and Title of Paper : IS 2106 System Analysis & Design"
const SUBJECT_HEADER_REGEX =
  /(?:Code\s+(?:and|&)\s+Title\s+of\s+Paper|Paper\s+Code\s*(?:and|&)\s*Title|Code\s*[-–—]\s*Title)\s*[:\-–—]?\s*([A-Z]{2,4}\s*\d{3,4})\s+([^\n\r]+)/i;

// ─── Semester from Header ───────────────────────────────────────────────────
// Matches: "Semester II(Proper -CIS)" or "Semster I(Repeat - FIS)"
const SEMESTER_REGEX =
  /Sem(?:e?s?ter?)?\s*(I{1,3}V?|[1-4])\s*\(?\s*(Proper|Repeat)\s*[-–—\s/]+\s*(CIS|FIS)\s*\)?/i;

/**
 * Normalizes common OCR errors in index numbers.
 * Format is typically: YY[DEPT]NNNN (e.g. 22CIS0123)
 */
function normalizeIndexNumber(rawIndex: string): string {
  // Remove whitespace, dots, colons, vertical bars
  const cleaned = rawIndex.replace(/[\s|.:]/g, "").toUpperCase();

  // Try to match standard parts: 2-digit year, 2-5 chars for dept, 3-6 chars for number
  const match = cleaned.match(/^(\d{2})([A-Z0-9]{2,5})([A-Z0-9]{3,6})$/);
  if (match) {
    const year = match[1];
    let dept = match[2];
    let num = match[3];

    // Normalize Dept letters (replace numbers with corresponding letters)
    dept = dept
      .replace(/1/gi, "I")
      .replace(/0/gi, "O")
      .replace(/5/gi, "S");

    // Normalize Student Number digits (replace letters with corresponding numbers)
    num = num
      .replace(/[OQD]/g, "0")
      .replace(/[ILTG]/g, "1")
      .replace(/S/g, "5")
      .replace(/Z/g, "2")
      .replace(/B/g, "8");

    return `${year}${dept}${num}`;
  }

  return cleaned;
}

/**
 * Normalizes grade text, removing spaces and standardized dashes.
 */
function normalizeText(text: string): string {
  return text
    // Normalize en-dash, em-dash, and underscores in grades (e.g., B – or B — to B-)
    .replace(/([A-E])\s*[–—_]/gi, "$1-")
    // Normalize spacing between letter grade and modifier (e.g., B - to B-, A + to A+)
    .replace(/([A-E])\s*([+\-])/gi, "$1$2");
}

/**
 * Parse raw OCR text from a scanned result sheet PDF.
 * Returns extracted subject info, semester, and all student index+grade pairs.
 */
export function parseOCRText(rawText: string): ParsedSheet {
  const normalizedText = normalizeText(rawText);

  // ── Extract subject code + name from header ─────────────────────────────
  let subjectCodeFromHeader: string | null = null;
  let subjectNameFromHeader: string | null = null;

  const subjectMatch = normalizedText.match(SUBJECT_HEADER_REGEX);
  if (subjectMatch) {
    subjectCodeFromHeader = subjectMatch[1].replace(/\s+/g, "").toUpperCase();
    subjectNameFromHeader = subjectMatch[2].trim();
  } else {
    // Fallback: search for paper code alone if full header match fails
    const codeMatch = normalizedText.match(/\b([A-Z]{2,4})\s*(\d{3,4})\b/i);
    if (codeMatch) {
      subjectCodeFromHeader = `${codeMatch[1]}${codeMatch[2]}`.toUpperCase();
    }
  }

  // ── Extract semester info ───────────────────────────────────────────────
  let semesterFromHeader: string | null = null;

  const semMatch = normalizedText.match(SEMESTER_REGEX);
  if (semMatch) {
    const semNum = semMatch[1].toUpperCase();
    const examType = semMatch[2]; // Proper or Repeat
    const dept = semMatch[3].toUpperCase(); // CIS or FIS
    semesterFromHeader = `Semester ${semNum} (${examType} - ${dept})`;
  }

  // ── Extract all index number + grade pairs ──────────────────────────────
  const results: ParsedResult[] = [];
  const seen = new Set<string>();
  let match: RegExpExecArray | null;

  // Reset regex lastIndex
  INDEX_GRADE_REGEX.lastIndex = 0;

  while ((match = INDEX_GRADE_REGEX.exec(normalizedText)) !== null) {
    const rawIndexNumber = match[1];
    const grade = match[2].toUpperCase();
    const indexNumber = normalizeIndexNumber(rawIndexNumber);

    // Deduplicate: keep first occurrence
    if (indexNumber && !seen.has(indexNumber)) {
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
