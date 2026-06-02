// ─── Grade Points Map ────────────────────────────────────────────────────────

export const GRADE_POINTS: Record<string, number> = {
  "A+": 4.0,
  A: 4.0,
  "A-": 3.7,
  "B+": 3.3,
  B: 3.0,
  "B-": 2.7,
  "C+": 2.3,
  C: 2.0,
  "C-": 1.7,
  "D+": 1.3,
  D: 1.0,
  E: 0.0,
  AB: 0.0,
};

// ─── Year Weights for FGPA ──────────────────────────────────────────────────

const YEAR_WEIGHTS: Record<number, number> = {
  1: 0.2,
  2: 0.2,
  3: 0.3,
  4: 0.3,
};

// ─── GPA Calculation ─────────────────────────────────────────────────────────

/**
 * Calculate GPA from an array of results.
 * GPA = Σ(gradePoint × creditPoints) / Σ(creditPoints), rounded to 2 dp.
 */
export function calcGPA(
  results: { gp: number; cp: number }[]
): number {
  if (results.length === 0) return 0;

  const totalWeighted = results.reduce(
    (sum, r) => sum + r.gp * r.cp,
    0
  );
  const totalCredits = results.reduce((sum, r) => sum + r.cp, 0);

  if (totalCredits === 0) return 0;

  return Math.round((totalWeighted / totalCredits) * 100) / 100;
}

// ─── Final GPA Calculation ──────────────────────────────────────────────────

/**
 * Calculate Final GPA (FGPA) from yearly GPAs.
 * FGPA = Y1×0.20 + Y2×0.20 + Y3×0.30 + Y4×0.30
 */
export function calcFGPA(
  yearGPAs: { year: number; gpa: number }[]
): number {
  const fgpa = yearGPAs.reduce((sum, { year, gpa }) => {
    const weight = YEAR_WEIGHTS[year] ?? 0;
    return sum + gpa * weight;
  }, 0);

  return Math.round(fgpa * 100) / 100;
}

// ─── Degree Classification ──────────────────────────────────────────────────

/**
 * Determine degree classification from FGPA.
 */
export function getClass(fgpa: number): string {
  if (fgpa >= 3.7) return "First Class";
  if (fgpa >= 3.3) return "Second Class (Upper Division)";
  if (fgpa >= 2.7) return "Second Class (Lower Division)";
  if (fgpa >= 2.0) return "Pass";
  return "Fail";
}

// ─── Pass Check ─────────────────────────────────────────────────────────────

/**
 * A student passes if they have no E or AB grades AND FGPA ≥ 2.00.
 */
export function isPass(
  results: { grade: string }[],
  fgpa: number
): boolean {
  const hasFailGrade = results.some(
    (r) => r.grade === "E" || r.grade === "AB"
  );
  return !hasFailGrade && fgpa >= 2.0;
}
