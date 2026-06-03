import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { students, subjects, results, pdfUploads } from "@/lib/schema";
import { verifyToken, getDefaultPasswordHash } from "@/lib/auth";
import { GRADE_POINTS } from "@/lib/grades";
import { eq, and, inArray } from "drizzle-orm";

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

    const isGpaSubject = subjectRows[0].isGpa;

    // Pre-hash the default password once
    const defaultPasswordHash = await getDefaultPasswordHash();

    let saved = 0;
    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    // ── Validate all entries first ─────────────────────────────────────
    const validEntries: { indexNumber: string; grade: string; gradePoint: number }[] = [];
    for (const entry of studentEntries) {
      const { indexNumber, grade } = entry;
      const gradePoint = GRADE_POINTS[grade];
      if (gradePoint === undefined) {
        errors.push(`Invalid grade "${grade}" for ${indexNumber}`);
        continue;
      }
      // For non-GPA subjects, store 0.00 grade point
      validEntries.push({
        indexNumber,
        grade,
        gradePoint: isGpaSubject ? gradePoint : 0,
      });
    }

    if (validEntries.length === 0) {
      return NextResponse.json({ saved, created, skipped, errors });
    }

    const allIndexNumbers = validEntries.map((e) => e.indexNumber);

    // ── 1. Batch-fetch existing students ────────────────────────────────
    const existingStudentRows = await db
      .select({ indexNumber: students.indexNumber })
      .from(students)
      .where(inArray(students.indexNumber, allIndexNumbers));

    const existingStudentSet = new Set(
      existingStudentRows.map((s) => s.indexNumber)
    );

    // ── 2. Batch-insert new students ────────────────────────────────────
    const newStudentIndexes = allIndexNumbers.filter(
      (idx) => !existingStudentSet.has(idx)
    );

    // Remove duplicates within the batch
    const uniqueNewStudents = Array.from(new Set(newStudentIndexes));

    if (uniqueNewStudents.length > 0) {
      // Insert in chunks to avoid query size limits
      const CHUNK_SIZE = 50;
      for (let i = 0; i < uniqueNewStudents.length; i += CHUNK_SIZE) {
        const chunk = uniqueNewStudents.slice(i, i + CHUNK_SIZE);
        try {
          await db.insert(students).values(
            chunk.map((indexNumber) => ({
              indexNumber,
              passwordHash: defaultPasswordHash,
              isFirstLogin: true,
            }))
          );
        } catch (insertErr) {
          // Handle race condition: some students may have been created concurrently
          // Fall back to individual inserts for this chunk
          for (const indexNumber of chunk) {
            try {
              await db.insert(students).values({
                indexNumber,
                passwordHash: defaultPasswordHash,
                isFirstLogin: true,
              });
            } catch {
              // Already exists — ignore
            }
          }
        }
      }
      created = uniqueNewStudents.length;
    }

    // ── 3. Log to pdf_uploads table (status: processing) ────────────────
    let pdfUploadId: number | null = null;
    try {
      const [insertedUpload] = await db
        .insert(pdfUploads)
        .values({
          filename: uploadMeta?.filename || "unknown.pdf",
          adminId: admin.id,
          status: "processing",
          processedCount: 0,
        })
        .returning({ id: pdfUploads.id });
      pdfUploadId = insertedUpload.id;
    } catch (logErr) {
      console.error("Failed to log PDF upload:", logErr);
    }

    // ── 4. Batch-fetch existing results for this subject ────────────────
    const existingResultRows = await db
      .select({
        id: results.id,
        studentIndex: results.studentIndex,
        grade: results.grade,
      })
      .from(results)
      .where(
        and(
          inArray(results.studentIndex, allIndexNumbers),
          eq(results.subjectId, subjectId)
        )
      );

    const existingResultMap = new Map(
      existingResultRows.map((r) => [r.studentIndex, r])
    );

    // ── 5. Process results: batch insert new, update existing ───────────
    const toInsert: {
      studentIndex: string;
      subjectId: number;
      grade: string;
      gradePoint: string;
      isRepeat: boolean;
      pdfUploadId: number | null;
    }[] = [];

    for (const entry of validEntries) {
      const existing = existingResultMap.get(entry.indexNumber);

      if (!existing) {
        // New result — add to batch insert
        toInsert.push({
          studentIndex: entry.indexNumber,
          subjectId,
          grade: entry.grade,
          gradePoint: entry.gradePoint.toFixed(2),
          isRepeat: false,
          pdfUploadId,
        });
        saved++;
      } else {
        // Existing result — handle repeat logic
        const isNewPassing = entry.grade !== "E" && entry.grade !== "AB";

        if (isNewPassing) {
          // Repeat pass: award C grade (2.00 GP) per university repeat rule (unless Non-GPA)
          try {
            await db
              .update(results)
              .set({
                grade: entry.grade,
                gradePoint: isGpaSubject ? "2.00" : "0.00",
                isRepeat: true,
                pdfUploadId,
              })
              .where(eq(results.id, existing.id));
            saved++;
          } catch (updateErr) {
            const msg =
              updateErr instanceof Error ? updateErr.message : "Unknown error";
            errors.push(`Error updating ${entry.indexNumber}: ${msg}`);
          }
        } else {
          // New grade is E or AB: skip, keep old record
          skipped++;
        }
      }
    }

    // Batch insert new results in chunks
    if (toInsert.length > 0) {
      const CHUNK_SIZE = 50;
      for (let i = 0; i < toInsert.length; i += CHUNK_SIZE) {
        const chunk = toInsert.slice(i, i + CHUNK_SIZE);
        try {
          await db.insert(results).values(chunk);
        } catch (insertErr) {
          // Fall back to individual inserts for this chunk
          for (const row of chunk) {
            try {
              await db.insert(results).values(row);
            } catch (singleErr) {
              const msg =
                singleErr instanceof Error
                  ? singleErr.message
                  : "Unknown error";
              errors.push(`Error saving result for ${row.studentIndex}: ${msg}`);
              saved--; // Undo the pre-counted save
            }
          }
        }
      }
    }

    // ── 6. Update status in pdf_uploads table ───────────────────────────
    if (pdfUploadId) {
      try {
        await db
          .update(pdfUploads)
          .set({
            status: "completed",
            processedCount: saved,
          })
          .where(eq(pdfUploads.id, pdfUploadId));
      } catch (updateUploadErr) {
        console.error("Failed to update PDF upload status:", updateUploadErr);
      }
    }

    return NextResponse.json({
      saved,
      created,
      skipped,
      errors,
    });
  } catch (error) {
    console.error("POST /api/admin/results/save error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to save results";
    return NextResponse.json(
      { error: `Failed to save results: ${message}` },
      { status: 500 }
    );
  }
}
