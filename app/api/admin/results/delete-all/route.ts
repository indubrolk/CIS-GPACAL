import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { results, pdfUploads, students } from "@/lib/schema";
import { verifyToken } from "@/lib/auth";
import { sql } from "drizzle-orm";

// Force Node.js runtime
export const runtime = "nodejs";

// ─── Helper: Verify Admin JWT ───────────────────────────────────────────────

function getAdminFromRequest(request: NextRequest) {
  const token = request.cookies.get("auth-token")?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload || payload.role !== "admin") return null;
  return payload;
}

// ─── DELETE /api/admin/results/delete-all ────────────────────────────────────
// Deletes ALL results and upload logs from the database.
// Optionally also deletes all student accounts (except admin).

export async function DELETE(request: NextRequest) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const deleteStudents = body.deleteStudents === true;

    // Count before deletion for reporting
    const [resultCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(results);
    const [uploadCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(pdfUploads);

    // 1. Delete all results first (has FK to students and subjects)
    await db.delete(results);

    // 2. Delete all upload logs
    await db.delete(pdfUploads);

    let studentsDeleted = 0;

    // 3. Optionally delete all student accounts
    if (deleteStudents) {
      const [studentCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(students);
      await db.delete(students);
      studentsDeleted = Number(studentCount.count);
    }

    return NextResponse.json({
      success: true,
      deleted: {
        results: Number(resultCount.count),
        uploads: Number(uploadCount.count),
        students: studentsDeleted,
      },
    });
  } catch (error) {
    console.error("DELETE /api/admin/results/delete-all error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to delete results";
    return NextResponse.json(
      { error: `Failed to delete: ${message}` },
      { status: 500 }
    );
  }
}
