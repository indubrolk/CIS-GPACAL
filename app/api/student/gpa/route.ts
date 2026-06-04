import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { results, subjects, semesters } from "@/lib/schema";
import { getStudentFromRequest } from "@/lib/studentAuth";
import { calcGPA, calcFGPA, getClass, isPass } from "@/lib/grades";

export const dynamic = "force-dynamic";

// ─── Types ──────────────────────────────────────────────────────────────────

interface SubjectResult {
  subjectCode: string;
  subjectName: string;
  creditPoints: number;
  grade: string;
  gradePoint: number;
  isRepeat: boolean;
  isGpa: boolean;
  weightedGP: number;
}

interface SemesterData {
  semesterNumber: number;
  semesterLabel: string;
  semesterGPA: number;
  subjects: SubjectResult[];
}

interface YearData {
  yearNumber: number;
  yearGPA: number;
  semesters: SemesterData[];
}

// ─── Recommendation Generator ───────────────────────────────────────────────

function generateRecommendations(
  allSubjects: { grade: string; subjectCode: string }[],
  fgpa: number,
  hasResults: boolean
): string[] {
  const recommendations: string[] = [];

  // No results at all
  if (!hasResults) {
    return ["📋 No results have been uploaded yet. Check back later."];
  }

  // Failed subjects (E or AB)
  const failedSubjects = allSubjects.filter(
    (s) => s.grade === "E" || s.grade === "AB"
  );
  for (const s of failedSubjects) {
    recommendations.push(
      `⚠️ You have a failed subject (${s.subjectCode}). Consider applying for a repeat examination.`
    );
  }

  // FGPA-based recommendations
  if (fgpa < 2.0) {
    recommendations.push(
      "🚨 Your FGPA is below the minimum 2.00. Improving is required to be eligible for a degree certificate."
    );
  } else if (fgpa < 2.7) {
    const needed = Math.round((2.7 - fgpa) * 100) / 100;
    recommendations.push(
      `📈 You are in Pass territory. You need ${needed.toFixed(2)} more points to reach Second Class (Lower Division).`
    );
  } else if (fgpa < 3.3) {
    const needed = Math.round((3.3 - fgpa) * 100) / 100;
    recommendations.push(
      `📘 You are in Second Class (Lower Division). ${needed.toFixed(2)} more points gets you to Upper Division.`
    );
  } else if (fgpa < 3.7) {
    const needed = Math.round((3.7 - fgpa) * 100) / 100;
    recommendations.push(
      `⭐ You are in Second Class (Upper Division). Only ${needed.toFixed(2)} more points to First Class!`
    );
  } else {
    recommendations.push(
      "🏆 Outstanding! You are on track for First Class Honours. Keep up the excellent work!"
    );
  }

  return recommendations;
}

// Force Node.js runtime — jsonwebtoken / bcryptjs don't work in Edge
export const runtime = "nodejs";

// ─── GET /api/student/gpa ───────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  let student;
  try {
    student = getStudentFromRequest(request);
  } catch (authErr) {
    console.error("Auth verification error:", authErr);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

    // ── If no results found ─────────────────────────────────────────────
    if (rows.length === 0) {
      return NextResponse.json({
        indexNumber,
        fgpa: 0,
        degreeClass: "N/A",
        isPassed: false,
        totalSubjects: 0,
        totalCredits: 0,
        bestSemesterGPA: 0,
        recommendations: generateRecommendations([], 0, false),
        years: [],
      });
    }

    // ── Group rows by year → semester → subjects ────────────────────────
    const yearMap = new Map<
      number,
      Map<
        number,
        {
          label: string;
          subjects: {
            subjectCode: string;
            subjectName: string;
            creditPoints: number;
            grade: string;
            gradePoint: number;
            isRepeat: boolean;
            isGpa: boolean;
          }[];
        }
      >
    >();

    for (const row of rows) {
      if (!yearMap.has(row.yearNumber)) {
        yearMap.set(row.yearNumber, new Map());
      }
      const semMap = yearMap.get(row.yearNumber)!;
      if (!semMap.has(row.semesterNumber)) {
        semMap.set(row.semesterNumber, {
          label: row.semesterLabel,
          subjects: [],
        });
      }
      semMap.get(row.semesterNumber)!.subjects.push({
        subjectCode: row.subjectCode,
        subjectName: row.subjectName,
        creditPoints: row.creditPoints,
        grade: row.grade,
        gradePoint: Number(row.gradePoint),
        isRepeat: row.isRepeat,
        isGpa: row.isGpa,
      });
    }

    // ── Build the structured response ───────────────────────────────────
    const yearGPAs: { year: number; gpa: number }[] = [];
    let totalSubjects = 0;
    let totalCredits = 0;
    let bestSemesterGPA = 0;

    const years: YearData[] = Array.from(yearMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([yearNumber, semMap]) => {
        const semesterEntries: SemesterData[] = Array.from(semMap.entries())
          .sort(([a], [b]) => a - b)
          .map(([semesterNumber, semData]) => {
            // Only include GPA subjects in GPA calculation
            const gpaSubjects = semData.subjects.filter((s) => s.isGpa);
            const semesterGPA = calcGPA(
              gpaSubjects.map((s) => ({
                gp: s.gradePoint,
                cp: s.creditPoints,
              }))
            );

            if (semesterGPA > bestSemesterGPA) {
              bestSemesterGPA = semesterGPA;
            }

            totalSubjects += semData.subjects.length;
            // Only count GPA subject credits toward totalCredits
            totalCredits += gpaSubjects.reduce(
              (sum, s) => sum + s.creditPoints,
              0
            );

            return {
              semesterNumber,
              semesterLabel: semData.label,
              semesterGPA,
              subjects: semData.subjects.map((s) => ({
                subjectCode: s.subjectCode,
                subjectName: s.subjectName,
                creditPoints: s.creditPoints,
                grade: s.grade,
                gradePoint: s.gradePoint,
                isRepeat: s.isRepeat,
                isGpa: s.isGpa,
                weightedGP: s.isGpa
                  ? Math.round(s.gradePoint * s.creditPoints * 100) / 100
                  : 0,
              })),
            };
          });

        // Year GPA = GPA across all GPA subjects in all semesters of this year
        const allYearGpaSubjects = semesterEntries
          .flatMap((s) => s.subjects)
          .filter((s) => s.isGpa);
        const yearGPA = calcGPA(
          allYearGpaSubjects.map((s) => ({
            gp: s.gradePoint,
            cp: s.creditPoints,
          }))
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

    // ── Generate recommendations ────────────────────────────────────────
    const allSubjectsFlat = rows.map((r) => ({
      grade: r.grade,
      subjectCode: r.subjectCode,
    }));
    const recommendations = generateRecommendations(
      allSubjectsFlat,
      fgpa,
      true
    );

    return NextResponse.json({
      indexNumber,
      fgpa,
      degreeClass,
      isPassed: passed,
      totalSubjects,
      totalCredits,
      bestSemesterGPA,
      recommendations,
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
