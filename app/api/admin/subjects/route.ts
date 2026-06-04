import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { subjects, semesters } from "@/lib/schema";
import { verifyToken } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

// ─── Helper: Verify Admin JWT ───────────────────────────────────────────────

function getAdminFromRequest(request: NextRequest) {
  const token = request.cookies.get("auth-token")?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload || payload.role !== "admin") return null;
  return payload;
}

// ─── GET /api/admin/subjects ────────────────────────────────────────────────
// Returns all subjects joined with semester info.

export async function GET(request: NextRequest) {
  // No admin verification needed for public subject lookup

  try {
    const rows = await db
      .select({
        id: subjects.id,
        subjectCode: subjects.subjectCode,
        subjectName: subjects.subjectName,
        creditPoints: subjects.creditPoints,
        isGpa: subjects.isGpa,
        semesterId: subjects.semesterId,
        yearNumber: semesters.yearNumber,
        semesterNumber: semesters.semesterNumber,
        semesterLabel: semesters.label,
      })
      .from(subjects)
      .innerJoin(semesters, eq(subjects.semesterId, semesters.id));

    return NextResponse.json({ subjects: rows });
  } catch (error) {
    console.error("GET /api/admin/subjects error:", error);
    return NextResponse.json(
      { error: "Failed to fetch subjects" },
      { status: 500 }
    );
  }
}

// ─── POST /api/admin/subjects ───────────────────────────────────────────────
// Create a new subject or return existing if subjectCode already exists.

export async function POST(request: NextRequest) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      subjectCode: rawCode,
      subjectName,
      creditPoints,
      yearNumber,
      semesterNumber,
      isGpa,
    } = body;

    // creditPoints can be 0 for Non-GPA subjects — check for null/undefined explicitly
    if (!rawCode || !subjectName || creditPoints == null || !yearNumber || !semesterNumber) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Normalize subject code: uppercase, remove spaces (IS 2106 → IS2106)
    const subjectCode = rawCode.toUpperCase().replace(/\s+/g, "");

    // Check if subject already exists
    const existing = await db
      .select({
        id: subjects.id,
        subjectCode: subjects.subjectCode,
        subjectName: subjects.subjectName,
        creditPoints: subjects.creditPoints,
        isGpa: subjects.isGpa,
        semesterId: subjects.semesterId,
        yearNumber: semesters.yearNumber,
        semesterNumber: semesters.semesterNumber,
        semesterLabel: semesters.label,
      })
      .from(subjects)
      .innerJoin(semesters, eq(subjects.semesterId, semesters.id))
      .where(eq(subjects.subjectCode, subjectCode))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json({
        subject: existing[0],
        isNew: false,
      });
    }

    // Find semester row by yearNumber + semesterNumber, create if missing
    let semesterRows = await db
      .select()
      .from(semesters)
      .where(
        and(
          eq(semesters.yearNumber, yearNumber),
          eq(semesters.semesterNumber, semesterNumber)
        )
      )
      .limit(1);

    if (semesterRows.length === 0) {
      const label = `Year ${yearNumber} - Semester ${semesterNumber}`;
      semesterRows = await db
        .insert(semesters)
        .values({ yearNumber, semesterNumber, label })
        .returning();
    }

    const semesterId = semesterRows[0].id;

    // Insert subject
    const [newSubject] = await db
      .insert(subjects)
      .values({
        subjectCode,
        subjectName,
        creditPoints,
        isGpa: isGpa !== undefined ? isGpa : true,
        semesterId,
      })
      .returning();

    return NextResponse.json({
      subject: {
        ...newSubject,
        yearNumber,
        semesterNumber,
        semesterLabel: semesterRows[0].label,
      },
      isNew: true,
    });
  } catch (error) {
    console.error("POST /api/admin/subjects error:", error);
    return NextResponse.json(
      { error: "Failed to create subject" },
      { status: 500 }
    );
  }
}
