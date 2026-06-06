import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { students, subjects, results, pdfUploads, semesters } from "@/lib/schema";
import { getAdminFromRequest } from "@/lib/adminAuth";
import { calcGPA, calcFGPA, SEMESTER_TOTAL_CREDITS } from "@/lib/grades";
import { eq, count, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

// Force Node.js runtime — jsonwebtoken don't work in Edge
export const runtime = "nodejs";

// ─── GET /api/admin/dashboard/stats ─────────────────────────────────────────

export async function GET(request: NextRequest) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // ── 1. Count totals ─────────────────────────────────────────────────
    const [studentCount] = await db
      .select({ value: count() })
      .from(students);

    const [subjectCount] = await db
      .select({ value: count() })
      .from(subjects);

    const [resultCount] = await db
      .select({ value: count() })
      .from(results);

    // ── 2. Recent uploads (last 5) ──────────────────────────────────────
    const recentUploads = await db
      .select({
        id: pdfUploads.id,
        filename: pdfUploads.filename,
        status: pdfUploads.status,
        processedCount: pdfUploads.processedCount,
        createdAt: pdfUploads.createdAt,
      })
      .from(pdfUploads)
      .orderBy(desc(pdfUploads.createdAt))
      .limit(5);

    // ── 3. Students at risk (FGPA < 2.00) ───────────────────────────────
    // Fetch all results joined with subjects + semesters
    // Include isGpa to exclude non-GPA subjects from FGPA calculation
    const allResults = await db
      .select({
        studentIndex: results.studentIndex,
        gradePoint: results.gradePoint,
        creditPoints: subjects.creditPoints,
        isGpa: subjects.isGpa,
        yearNumber: semesters.yearNumber,
        semesterNumber: semesters.semesterNumber,
      })
      .from(results)
      .innerJoin(subjects, eq(results.subjectId, subjects.id))
      .innerJoin(semesters, eq(subjects.semesterId, semesters.id));

    // Group by student → year → semester → compute FGPA (only GPA subjects)
    const studentMap = new Map<
      string,
      Map<
        number,
        Map<
          number,
          { gp: number; cp: number }[]
        >
      >
    >();

    for (const row of allResults) {
      // Skip non-GPA subjects — they must not affect FGPA
      if (!row.isGpa) continue;

      if (!studentMap.has(row.studentIndex)) {
        studentMap.set(row.studentIndex, new Map());
      }
      const yearMap = studentMap.get(row.studentIndex)!;
      if (!yearMap.has(row.yearNumber)) {
        yearMap.set(row.yearNumber, new Map());
      }
      const semMap = yearMap.get(row.yearNumber)!;
      if (!semMap.has(row.semesterNumber)) {
        semMap.set(row.semesterNumber, []);
      }
      semMap.get(row.semesterNumber)!.push({
        gp: Number(row.gradePoint),
        cp: row.creditPoints,
      });
    }

    let studentsAtRisk = 0;
    studentMap.forEach((yearMap) => {
      const yearGPAs: { year: number; gpa: number }[] = [];
      yearMap.forEach((semMap, year) => {
        let yearDivisor = 0;
        const yearResults: { gp: number; cp: number }[] = [];
        
        Array.from(semMap.entries()).forEach(([semNum, semResults]) => {
          const absSem = (year - 1) * 2 + semNum;
          const fixedSemCredits = SEMESTER_TOTAL_CREDITS[absSem];
          if (semResults.length > 0) {
            if (fixedSemCredits !== undefined) {
              yearDivisor += fixedSemCredits;
            } else {
              yearDivisor += semResults.reduce((sum, s) => sum + s.cp, 0);
            }
            yearResults.push(...semResults);
          }
        });

        yearGPAs.push({ year, gpa: calcGPA(yearResults, yearDivisor) });
      });
      const fgpa = calcFGPA(yearGPAs);
      if (fgpa < 2.0) {
        studentsAtRisk++;
      }
    });

    return NextResponse.json({
      totalStudents: studentCount.value,
      totalSubjects: subjectCount.value,
      totalResults: resultCount.value,
      recentUploads,
      studentsAtRisk,
    });
  } catch (error) {
    console.error("GET /api/admin/dashboard/stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard stats" },
      { status: 500 }
    );
  }
}
