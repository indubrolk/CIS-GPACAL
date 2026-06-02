import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { admins } from "@/lib/schema";
import { comparePassword, signToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    // ── Validate input ──────────────────────────────────────────────────
    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    // ── Find admin ──────────────────────────────────────────────────────
    const [admin] = await db
      .select()
      .from(admins)
      .where(eq(admins.username, username))
      .limit(1);

    if (!admin) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // ── Verify password ─────────────────────────────────────────────────
    const isValid = await comparePassword(password, admin.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // ── Sign JWT ────────────────────────────────────────────────────────
    const token = signToken({
      id: admin.id,
      role: "admin",
      identifier: admin.username,
    });

    // ── Set httpOnly cookie and respond ─────────────────────────────────
    const response = NextResponse.json({
      success: true,
      redirect: "/admin/dashboard",
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
    console.error("Admin login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
