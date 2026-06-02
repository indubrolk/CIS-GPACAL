import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { students, subjects, results, pdfUploads } from "@/lib/schema";
import { verifyToken, getDefaultPasswordHash } from "@/lib/auth";
import { GRADE_POINTS } from "@/lib/grades";
import { eq, and } from "drizzle-orm";

// ─── Helper: Verify Admin JWT ───────────────────────────────────────────────

function getAdminFromRequest(request: NextRequest) {
  const token = request.cookies.get("auth-token")?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload || payload.role !== "admin") return null;
  return payload;
}

// ─── POST /api/admin/results/save ───────────────────────────────────────────

export async function POST(request: NextRequest) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { subjectId, uploadMeta, students: studentEntries } = body;

    if (!subjectId || !studentEntries || !Array.isArray(studentEntries)) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Verify subject exists
    const subjectRows = await db
      .select()
      .from(subjects)
      .where(eq(subjects.id, subjectId))
      .limit(1);

    if (subjectRows.length === 0) {
      return NextResponse.json(
        { error: "Subject not found" },
        { status: 404 }
      );
    }

    // Pre-hash the default password once
    const defaultPasswordHash = await getDefaultPasswordHash();

    let saved = 0;
    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const entry of studentEntries) {
      const { indexNumber, grade } = entry;

      try {
        // Compute grade point
        const gradePoint = GRADE_POINTS[grade];
        if (gradePoint === undefined) {
          errors.push(`Invalid grade "${grade}" for ${indexNumber}`);
          continue;
        }

        // ── 1. Upsert student ───────────────────────────────────────────
        // Insert student with default password, skip if already exists
        const existingStudents = await db
          .select()
          .from(students)
          .where(eq(students.indexNumber, indexNumber))
          .limit(1);

        if (existingStudents.length === 0) {
          await db.insert(students).values({
            indexNumber,
            passwordHash: defaultPasswordHash,
            isFirstLogin: true,
          });
          created++;
        }

        // ── 2. Check for existing result for this student + subject ─────
        const existingResults = await db
          .select()
          .from(results)
          .where(
            and(
              eq(results.studentIndex, indexNumber),
              eq(results.subjectId, subjectId)
            )
          )
          .limit(1);

        if (existingResults.length === 0) {
          // No existing result: INSERT normally
          await db.insert(results).values({
            studentIndex: indexNumber,
            subjectId,
            grade,
            gradePoint: gradePoint.toFixed(2),
            isRepeat: false,
          });
          saved++;
        } else {
          // Existing result found
          const isNewPassing = grade !== "E" && grade !== "AB";

          if (isNewPassing) {
            // Repeat pass: award C grade (2.00 GP) per university repeat rule
            await db
              .update(results)
              .set({
                grade,
                gradePoint: "2.00",
                isRepeat: true,
              })
              .where(eq(results.id, existingResults[0].id));
            saved++;
          } else {
            // New grade is E or AB: skip, keep old record
            skipped++;
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        errors.push(`Error processing ${indexNumber}: ${msg}`);
      }
    }

    // ── 3. Log to pdf_uploads table ─────────────────────────────────────
    try {
      await db.insert(pdfUploads).values({
        filename: uploadMeta?.filename || "unknown.pdf",
        adminId: admin.id,
        status: "completed",
        processedCount: saved,
      });
    } catch (logErr) {
      console.error("Failed to log PDF upload:", logErr);
      // Non-fatal — don't fail the whole request
    }

    return NextResponse.json({
      saved,
      created,
      skipped,
      errors,
    });
  } catch (error) {
    console.error("POST /api/admin/results/save error:", error);
    return NextResponse.json(
      { error: "Failed to save results" },
      { status: 500 }
    );
  }
}
