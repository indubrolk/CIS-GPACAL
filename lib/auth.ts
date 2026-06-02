import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

// ─── JWT Secret ─────────────────────────────────────────────────────────────

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is not set");
  }
  return secret;
}

// ─── Token Payload Type ─────────────────────────────────────────────────────

export interface TokenPayload {
  id: number;
  role: "admin" | "student";
  identifier: string; // username for admin, index_number for student
}

// ─── Sign Token ─────────────────────────────────────────────────────────────

/**
 * Create a signed JWT with 24-hour expiry.
 */
export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "24h" });
}

// ─── Verify Token ───────────────────────────────────────────────────────────

/**
 * Verify and decode a JWT. Returns the payload or null if invalid/expired.
 */
export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as TokenPayload;
    return decoded;
  } catch {
    return null;
  }
}

// ─── Password Hashing ───────────────────────────────────────────────────────

/**
 * Hash a plaintext password with bcryptjs (salt rounds: 10).
 */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

/**
 * Compare a plaintext password against a bcrypt hash.
 */
export async function comparePassword(
  plain: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// ─── Default Password ──────────────────────────────────────────────────────

/**
 * Generate the default password hash for new students.
 * Default password: '123456789'
 */
export async function getDefaultPasswordHash(): Promise<string> {
  return hashPassword("123456789");
}
