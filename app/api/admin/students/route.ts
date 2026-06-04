import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { students, subjects, results, semesters } from "@/lib/schema";
import { getAdminFromRequest } from "@/lib/adminAuth";
import { calcGPA, calcFGPA, getClass, isPass } from "@/lib/grades";
import { eq, ilike, count } from "drizzle-orm";

export const dynamic = "force-dynamic";

// ─── Types ──────────────────────────────────────────────────────────────────

interface StudentRow {
  indexNumber: string;
  semestersWithData: number;
  fgpa: number;
  degreeClass: string;
  isPassed: boolean;
}

// ─── GET /api/admin/students ────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "20", 10))
    );
    const filter = searchParams.get("filter") || "";

    // ── 1. Fetch matching students (with pagination) ────────────────────
    // First get total count for pagination
    const countQuery = search
      ? db
          .select({ value: count() })
          .from(students)
          .where(ilike(students.indexNumber, `%${search}%`))
      : db.select({ value: count() }).from(students);

    const [totalRow] = await countQuery;

    // Fetch student index numbers for the current page
    const studentQuery = search
      ? db
          .select({ indexNumber: students.indexNumber })
          .from(students)
          .where(ilike(students.indexNumber, `%${search}%`))
          .orderBy(students.indexNumber)
      : db
          .select({ indexNumber: students.indexNumber })
          .from(students)
          .orderBy(students.indexNumber);

    const allStudentRows = await studentQuery;

    // ── 2. Fetch all results with subject + semester info ────────────────
    const allResults = await db
      .select({
        studentIndex: results.studentIndex,
        grade: results.grade,
        gradePoint: results.gradePoint,
        creditPoints: subjects.creditPoints,
        isGpa: subjects.isGpa,
        yearNumber: semesters.yearNumber,
        semesterId: subjects.semesterId,
      })
      .from(results)
      .innerJoin(subjects, eq(results.subjectId, subjects.id))
      .innerJoin(semesters, eq(subjects.semesterId, semesters.id));

    // ── 3. Group results by student ─────────────────────────────────────
    const resultsByStudent = new Map<
      string,
      {
        grades: { grade: string }[];
        byYear: Map<number, { gp: number; cp: number }[]>;
        semesterIds: Set<number>;
      }
    >();

    for (const row of allResults) {
      if (!resultsByStudent.has(row.studentIndex)) {
        resultsByStudent.set(row.studentIndex, {
          grades: [],
          byYear: new Map(),
          semesterIds: new Set(),
        });
      }
      const studentData = resultsByStudent.get(row.studentIndex)!;
      studentData.grades.push({ grade: row.grade });
      studentData.semesterIds.add(row.semesterId);

      // Only include GPA subjects in the FGPA calculation
      if (!row.isGpa) continue;

      if (!studentData.byYear.has(row.yearNumber)) {
        studentData.byYear.set(row.yearNumber, []);
      }
      studentData.byYear.get(row.yearNumber)!.push({
        gp: Number(row.gradePoint),
        cp: row.creditPoints,
      });
    }

    // ── 4. Compute GPA data for each student ────────────────────────────
    const enrichedStudents: StudentRow[] = allStudentRows.map((s) => {
      const data = resultsByStudent.get(s.indexNumber);
      if (!data || data.grades.length === 0) {
        return {
          indexNumber: s.indexNumber,
          semestersWithData: 0,
          fgpa: 0,
          degreeClass: getClass(0),
          isPassed: false,
        };
      }

      const yearGPAs = Array.from(data.byYear.entries()).map(
        ([year, yearResults]) => ({
          year,
          gpa: calcGPA(yearResults),
        })
      );

      const fgpa = calcFGPA(yearGPAs);
      const degreeClass = getClass(fgpa);
      const passed = isPass(data.grades, fgpa);

      return {
        indexNumber: s.indexNumber,
        semestersWithData: data.semesterIds.size,
        fgpa,
        degreeClass,
        isPassed: passed,
      };
    });

    // ── 5. Apply filter ─────────────────────────────────────────────────
    let filtered = enrichedStudents;
    if (filter === "at-risk") {
      filtered = enrichedStudents.filter(
        (s) => s.semestersWithData > 0 && s.fgpa < 2.0
      );
    } else if (filter === "first-class") {
      filtered = enrichedStudents.filter(
        (s) => s.degreeClass === "First Class"
      );
    } else if (filter === "pass-only") {
      filtered = enrichedStudents.filter((s) => s.isPassed);
    }

    // ── 6. Paginate filtered results ────────────────────────────────────
    const total = filtered.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const paginatedStudents = filtered.slice(offset, offset + limit);

    return NextResponse.json({
      students: paginatedStudents,
      total,
      page,
      totalPages,
    });
  } catch (error) {
    console.error("GET /api/admin/students error:", error);
    return NextResponse.json(
      { error: "Failed to fetch students" },
      { status: 500 }
    );
  }
}
