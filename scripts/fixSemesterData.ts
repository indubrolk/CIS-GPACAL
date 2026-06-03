/**
 * fixSemesterData.ts
 *
 * The original seed used yearNumber=1-8 (treating each absolute semester as a "year")
 * and semesterNumber=1 for everything.
 *
 * The CORRECT DB structure is:
 *   yearNumber  1-4
 *   semesterNumber  1-2  (relative within the year)
 *
 * Absolute semester → correct (yearNumber, semesterNumber):
 *   1 → (1,1)   2 → (1,2)
 *   3 → (2,1)   4 → (2,2)
 *   5 → (3,1)   6 → (3,2)
 *   7 → (4,1)   8 → (4,2)
 *
 * This script:
 *  1. Works out the correct semester for every subject from its subject code.
 *  2. Ensures the correct semester row exists.
 *  3. Updates each subject's semesterId.
 *  4. Removes orphaned (now-unused) semester rows.
 */

import "dotenv/config";
import { db } from "@/lib/db";
import { subjects, semesters } from "@/lib/schema";
import { eq, and, notInArray } from "drizzle-orm";

// ─── helpers ─────────────────────────────────────────────────────────────────

function getCorrectSemester(
  code: string
): { yearNumber: number; semesterNumber: number; label: string } | null {
  // Special English-pathway codes: IS-EXX-YYZZ
  // YY encodes  decade = year (1-4), unit = semester within year (1-2)
  const specialMatch = code.match(/^IS-[A-Z]+-(\d)(\d)/);
  if (specialMatch) {
    const yearNumber = parseInt(specialMatch[1]);
    const semesterNumber = parseInt(specialMatch[2]);
    if (yearNumber >= 1 && yearNumber <= 4 && semesterNumber >= 1 && semesterNumber <= 2) {
      return { yearNumber, semesterNumber, label: `Year ${yearNumber} - Semester ${semesterNumber}` };
    }
  }

  // Regular codes: IS{absSem}xxx  e.g. IS3101 → absSem=3
  const regularMatch = code.match(/^IS(\d)/);
  if (regularMatch) {
    const absSem = parseInt(regularMatch[1]); // 1-8
    if (absSem < 1 || absSem > 8) return null;
    const yearNumber = Math.ceil(absSem / 2);           // 1→1, 2→1, 3→2, 4→2, 5→3, 6→3, 7→4, 8→4
    const semesterNumber = absSem % 2 === 0 ? 2 : 1;   // even→2, odd→1
    return { yearNumber, semesterNumber, label: `Year ${yearNumber} - Semester ${semesterNumber}` };
  }

  return null;
}

async function ensureSemester(yearNumber: number, semesterNumber: number, label: string): Promise<number> {
  const existing = await db
    .select()
    .from(semesters)
    .where(and(eq(semesters.yearNumber, yearNumber), eq(semesters.semesterNumber, semesterNumber)))
    .limit(1);

  if (existing.length > 0) return existing[0].id;

  const [inserted] = await db
    .insert(semesters)
    .values({ yearNumber, semesterNumber, label })
    .returning();
  return inserted.id;
}

// ─── main ────────────────────────────────────────────────────────────────────

async function fix() {
  console.log("🔧  Fixing semester data…\n");

  const allSubjects = await db.select().from(subjects);
  const usedSemesterIds = new Set<number>();

  for (const sub of allSubjects) {
    const correct = getCorrectSemester(sub.subjectCode);
    if (!correct) {
      console.warn(`⚠️  Cannot determine semester for ${sub.subjectCode} — skipping`);
      continue;
    }

    const correctSemId = await ensureSemester(correct.yearNumber, correct.semesterNumber, correct.label);
    usedSemesterIds.add(correctSemId);

    if (sub.semesterId !== correctSemId) {
      await db.update(subjects).set({ semesterId: correctSemId }).where(eq(subjects.id, sub.id));
      console.log(`✅  ${sub.subjectCode}: semester → Year ${correct.yearNumber}, Sem ${correct.semesterNumber}`);
    } else {
      console.log(`☑️  ${sub.subjectCode}: already correct`);
    }
  }

  // Remove orphaned semester rows that no subject uses
  const allSems = await db.select().from(semesters);
  for (const sem of allSems) {
    if (!usedSemesterIds.has(sem.id)) {
      await db.delete(semesters).where(eq(semesters.id, sem.id));
      console.log(`🗑️  Removed orphan semester (id=${sem.id}, year=${sem.yearNumber}, sem=${sem.semesterNumber})`);
    }
  }

  console.log("\n✅  Fix complete!");
  process.exit(0);
}

fix().catch((err) => {
  console.error("Fix error:", err);
  process.exit(1);
});
