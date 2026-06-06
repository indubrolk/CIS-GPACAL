import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { results, subjects, semesters, students } from "@/lib/schema";
import { getAdminFromRequest } from "@/lib/adminAuth";
import { calcGPA, calcFGPA, getClass, isPass, SEMESTER_TOTAL_CREDITS } from "@/lib/grades";
import { eq } from "drizzle-orm";
import { getDefaultPasswordHash } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Force Node.js runtime — jsonwebtoken don't work in Edge
export const runtime = "nodejs";

// ─── GET /api/admin/students/[index] ────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: { index: string } }
) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const indexNumber = decodeURIComponent(params.index);

    // Fetch all results for this student, joined with subjects + semesters
    const studentResults = await db
      .select({
        subjectCode: subjects.subjectCode,
        subjectName: subjects.subjectName,
        creditPoints: subjects.creditPoints,
        isGpa: subjects.isGpa,
        grade: results.grade,
        gradePoint: results.gradePoint,
        isRepeat: results.isRepeat,
        yearNumber: semesters.yearNumber,
        semesterNumber: semesters.semesterNumber,
        semesterLabel: semesters.label,
      })
      .from(results)
      .innerJoin(subjects, eq(results.subjectId, subjects.id))
      .innerJoin(semesters, eq(subjects.semesterId, semesters.id))
      .where(eq(results.studentIndex, indexNumber));

    if (studentResults.length === 0) {
      return NextResponse.json(
        { error: "No results found for this student" },
        { status: 404 }
      );
    }

    // ── Group by year → semester → subjects ─────────────────────────────
    const yearMap = new Map<
      number,
      Map<
        number,
        {
          semesterLabel: string;
          subjects: {
            subjectCode: string;
            subjectName: string;
            creditPoints: number;
            grade: string;
            gradePoint: number;
            isRepeat: boolean;
            isGpa: boolean;
            weightedGP: number;
          }[];
        }
      >
    >();

    const allGrades: { grade: string }[] = [];

    for (const row of studentResults) {
      allGrades.push({ grade: row.grade });

      if (!yearMap.has(row.yearNumber)) {
        yearMap.set(row.yearNumber, new Map());
      }
      const semMap = yearMap.get(row.yearNumber)!;

      if (!semMap.has(row.semesterNumber)) {
        semMap.set(row.semesterNumber, {
          semesterLabel: row.semesterLabel,
          subjects: [],
        });
      }

      const gp = Number(row.gradePoint);
      semMap.get(row.semesterNumber)!.subjects.push({
        subjectCode: row.subjectCode,
        subjectName: row.subjectName,
        creditPoints: row.creditPoints,
        grade: row.grade,
        gradePoint: gp,
        isRepeat: row.isRepeat,
        isGpa: row.isGpa,
        weightedGP: row.isGpa ? Math.round(gp * row.creditPoints * 100) / 100 : 0,
      });
    }

    // ── Build nested structure ──────────────────────────────────────────
    const yearGPAs: { year: number; gpa: number }[] = [];

    const years = Array.from(yearMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([yearNumber, semMap]) => {
        // Compute year-level results for GPA
        const yearResults: { gp: number; cp: number }[] = [];

        const semesters = Array.from(semMap.entries())
          .sort(([a], [b]) => a - b)
          .map(([semesterNumber, semData]) => {
            // Only include GPA subjects in GPA calculation
            const gpaSubjects = semData.subjects.filter((s) => s.isGpa);
            const semResults = gpaSubjects.map((s) => ({
              gp: s.gradePoint,
              cp: s.creditPoints,
            }));
            yearResults.push(...semResults);

            const absSem = (yearNumber - 1) * 2 + semesterNumber;
            const fixedSemCredits = SEMESTER_TOTAL_CREDITS[absSem];
            const semesterGPA = calcGPA(semResults, fixedSemCredits);

            return {
              semesterNumber,
              semesterLabel: semData.semesterLabel,
              semesterGPA,
              subjects: semData.subjects,
            };
          });

        let yearDivisor = 0;
        Array.from(semMap.entries()).forEach(([semNum, sData]) => {
          const absSem = (yearNumber - 1) * 2 + semNum;
          const fixedSemCredits = SEMESTER_TOTAL_CREDITS[absSem];
          const hasGpaSubjects = sData.subjects.some((s) => s.isGpa);
          if (hasGpaSubjects) {
            if (fixedSemCredits !== undefined) {
              yearDivisor += fixedSemCredits;
            } else {
              yearDivisor += sData.subjects
                .filter((s) => s.isGpa)
                .reduce((sum, s) => sum + s.creditPoints, 0);
            }
          }
        });

        const yearGPA = calcGPA(yearResults, yearDivisor);
        yearGPAs.push({ year: yearNumber, gpa: yearGPA });

        return {
          yearNumber,
          yearGPA,
          semesters,
        };
      });

    const fgpa = calcFGPA(yearGPAs);
    const degreeClass = getClass(fgpa);
    const isPassed = isPass(allGrades, fgpa);

    return NextResponse.json({
      indexNumber,
      fgpa,
      degreeClass,
      isPassed,
      years,
    });
  } catch (error) {
    console.error("GET /api/admin/students/[index] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch student record" },
      { status: 500 }
    );
  }
}

// ─── POST /api/admin/students/[index] (Reset Password) ──────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: { index: string } }
) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const indexNumber = decodeURIComponent(params.index);

    // Verify if the student exists first
    const studentRows = await db
      .select()
      .from(students)
      .where(eq(students.indexNumber, indexNumber))
      .limit(1);

    if (studentRows.length === 0) {
      return NextResponse.json(
        { error: "Student not found" },
        { status: 404 }
      );
    }

    const defaultPasswordHash = await getDefaultPasswordHash();

    // Reset password to default hash and set isFirstLogin to true
    await db
      .update(students)
      .set({
        passwordHash: defaultPasswordHash,
        isFirstLogin: true,
      })
      .where(eq(students.indexNumber, indexNumber));

    return NextResponse.json({
      success: true,
      message: `Password for student ${indexNumber} has been reset to default (123456789) successfully.`,
    });
  } catch (error) {
    console.error("POST /api/admin/students/[index] error:", error);
    return NextResponse.json(
      { error: "Failed to reset student password" },
      { status: 500 }
    );
  }
}

