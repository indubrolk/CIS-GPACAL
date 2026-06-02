import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { students } from "@/lib/schema";
import { comparePassword, hashPassword, verifyToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    // ── Verify student JWT ──────────────────────────────────────────────
    const token = request.cookies.get("auth-token")?.value;
    if (!token) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);
    if (!payload || payload.role !== "student") {
      return NextResponse.json(
        { error: "Unauthorized — student access only" },
        { status: 403 }
      );
    }

    // ── Parse body ──────────────────────────────────────────────────────
    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Current password and new password are required" },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "New password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // ── Find student ────────────────────────────────────────────────────
    const [student] = await db
      .select()
      .from(students)
      .where(eq(students.indexNumber, payload.identifier))
      .limit(1);

    if (!student) {
      return NextResponse.json(
        { error: "Student not found" },
        { status: 404 }
      );
    }

    // ── Verify current password ─────────────────────────────────────────
    const isValid = await comparePassword(
      currentPassword,
      student.passwordHash
    );
    if (!isValid) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 401 }
      );
    }

    // ── Hash new password and update ────────────────────────────────────
    const newHash = await hashPassword(newPassword);

    await db
      .update(students)
      .set({
        passwordHash: newHash,
        isFirstLogin: false,
      })
      .where(eq(students.indexNumber, payload.identifier));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Change password error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
