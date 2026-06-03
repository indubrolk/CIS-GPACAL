import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { results, subjects, semesters } from "@/lib/schema";
import { getStudentFromRequest } from "@/lib/studentAuth";
import { calcGPA, calcFGPA, getClass, isPass } from "@/lib/grades";

// ─── GET /api/student/gpa ───────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const student = getStudentFromRequest(request);
  if (!student) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const indexNumber = student.identifier;

  try {
    // ── Fetch all results for this student with subject + semester info ──
    const rows = await db
      .select({
        subjectName: subjects.subjectName,
        subjectCode: subjects.subjectCode,
        creditPoints: subjects.creditPoints,
        grade: results.grade,
        gradePoint: results.gradePoint,
        yearNumber: semesters.yearNumber,
        semesterNumber: semesters.semesterNumber,
      })
      .from(results)
      .innerJoin(subjects, eq(results.subjectId, subjects.id))
      .innerJoin(semesters, eq(subjects.semesterId, semesters.id))
      .where(eq(results.studentIndex, indexNumber));

    // ── If no results found ─────────────────────────────────────────────
    if (rows.length === 0) {
      return NextResponse.json({
        indexNumber,
        fgpa: 0,
        class: "N/A",
        isPassed: false,
        years: [],
      });
    }

    // ── Group rows by year → semester → subjects ────────────────────────
    const yearMap = new Map<
      number,
      Map<
        number,
        {
          name: string;
          code: string;
          grade: string;
          gradePoint: number;
          credits: number;
        }[]
      >
    >();

    for (const row of rows) {
      if (!yearMap.has(row.yearNumber)) {
        yearMap.set(row.yearNumber, new Map());
      }
      const semMap = yearMap.get(row.yearNumber)!;
      if (!semMap.has(row.semesterNumber)) {
        semMap.set(row.semesterNumber, []);
      }
      semMap.get(row.semesterNumber)!.push({
        name: row.subjectName,
        code: row.subjectCode,
        grade: row.grade,
        gradePoint: Number(row.gradePoint),
        credits: row.creditPoints,
      });
    }

    // ── Build the structured response ───────────────────────────────────
    const yearGPAs: { year: number; gpa: number }[] = [];

    const years = Array.from(yearMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([yearNumber, semMap]) => {
        // Build semesters for this year
        const semesterEntries = Array.from(semMap.entries())
          .sort(([a], [b]) => a - b)
          .map(([semesterNumber, subjectList]) => {
            const semesterGPA = calcGPA(
              subjectList.map((s) => ({ gp: s.gradePoint, cp: s.credits }))
            );

            return {
              semesterNumber,
              semesterGPA,
              subjects: subjectList,
            };
          });

        // Year GPA = GPA across all subjects in all semesters of this year
        const allYearSubjects = semesterEntries.flatMap((s) => s.subjects);
        const yearGPA = calcGPA(
          allYearSubjects.map((s) => ({ gp: s.gradePoint, cp: s.credits }))
        );

        yearGPAs.push({ year: yearNumber, gpa: yearGPA });

        return {
          yearNumber,
          yearGPA,
          semesters: semesterEntries,
        };
      });

    // ── Calculate FGPA and classification ────────────────────────────────
    const fgpa = calcFGPA(yearGPAs);
    const degreeClass = getClass(fgpa);
    const passed = isPass(
      rows.map((r) => ({ grade: r.grade })),
      fgpa
    );

    return NextResponse.json({
      indexNumber,
      fgpa,
      class: degreeClass,
      isPassed: passed,
      years,
    });
  } catch (error) {
    console.error("GET /api/student/gpa error:", error);
    return NextResponse.json(
      { error: "Failed to fetch GPA data" },
      { status: 500 }
    );
  }
}
