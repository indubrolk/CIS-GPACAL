import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { students } from "@/lib/schema";
import { comparePassword, signToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { indexNumber, password } = body;

    // ── Validate input ──────────────────────────────────────────────────
    if (!indexNumber || !password) {
      return NextResponse.json(
        { error: "Index number and password are required" },
        { status: 400 }
      );
    }

    // ── Find student ────────────────────────────────────────────────────
    const [student] = await db
      .select()
      .from(students)
      .where(eq(students.indexNumber, indexNumber))
      .limit(1);

    if (!student) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // ── Verify password ─────────────────────────────────────────────────
    const isValid = await comparePassword(password, student.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // ── Sign JWT ────────────────────────────────────────────────────────
    const token = signToken({
      id: student.id,
      role: "student",
      identifier: student.indexNumber,
    });

    // ── Determine redirect based on first login ─────────────────────────
    const isFirstLogin = student.isFirstLogin;
    const redirect = isFirstLogin
      ? "/student/change-password"
      : "/student/dashboard";

    // ── Set httpOnly cookie and respond ─────────────────────────────────
    const response = NextResponse.json({
      success: true,
      isFirstLogin,
      redirect,
    });

    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24, // 24 hours
    });

    return response;
  } catch (error) {
    console.error("Student login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
