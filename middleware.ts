import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

/**
 * Verify JWT using the `jose` library (Edge-compatible, unlike `jsonwebtoken`).
 */
async function verifyJWT(token: string): Promise<{ id: number; role: string; identifier: string } | null> {
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) return null;

    const encoder = new TextEncoder();
    const { payload } = await jwtVerify(token, encoder.encode(secret));

    return {
      id: payload.id as number,
      role: payload.role as string,
      identifier: payload.identifier as string,
    };
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Admin routes ──────────────────────────────────────────────────────────
  if (pathname.startsWith("/admin")) {
    // Allow the admin login page without auth
    if (pathname === "/admin/login") {
      return NextResponse.next();
    }

    const token = request.cookies.get("auth-token")?.value;
    if (!token) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }

    const payload = await verifyJWT(token);
    if (!payload || payload.role !== "admin") {
      const response = NextResponse.redirect(
        new URL("/admin/login", request.url)
      );
      response.cookies.delete("auth-token");
      return response;
    }

    return NextResponse.next();
  }

  // ── Student routes ────────────────────────────────────────────────────────
  if (pathname.startsWith("/student")) {
    // Allow the student login page without auth
    if (pathname === "/student/login") {
      return NextResponse.next();
    }

    const token = request.cookies.get("auth-token")?.value;
    if (!token) {
      return NextResponse.redirect(new URL("/student/login", request.url));
    }

    const payload = await verifyJWT(token);
    if (!payload || payload.role !== "student") {
      const response = NextResponse.redirect(
        new URL("/student/login", request.url)
      );
      response.cookies.delete("auth-token");
      return response;
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/student/:path*"],
};
