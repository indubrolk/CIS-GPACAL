import { NextRequest } from "next/server";
import { verifyToken, TokenPayload } from "@/lib/auth";

// ─── Helper: Verify Student JWT from Request Cookie ─────────────────────────

/**
 * Extract and verify the student JWT from the `auth-token` cookie.
 * Returns the decoded payload if valid and role === "student", otherwise null.
 */
export function getStudentFromRequest(request: NextRequest): TokenPayload | null {
  const token = request.cookies.get("auth-token")?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload || payload.role !== "student") return null;
  return payload;
}
