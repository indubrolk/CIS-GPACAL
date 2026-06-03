import { NextRequest } from "next/server";
import { verifyToken, TokenPayload } from "@/lib/auth";

// ─── Helper: Verify Admin JWT from Request Cookie ───────────────────────────

/**
 * Extract and verify the admin JWT from the `auth-token` cookie.
 * Returns the decoded payload if valid and role === "admin", otherwise null.
 */
export function getAdminFromRequest(request: NextRequest): TokenPayload | null {
  const token = request.cookies.get("auth-token")?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload || payload.role !== "admin") return null;
  return payload;
}
