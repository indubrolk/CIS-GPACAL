import { NextRequest, NextResponse } from "next/server";
import { getStudentFromRequest } from "@/lib/studentAuth";
import { db } from "@/lib/db";
import { students } from "@/lib/schema";
import { eq } from "drizzle-orm";

// ─── GET: Fetch student profile ─────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const student = getStudentFromRequest(req);

  if (!student) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await db
    .select({
      id: students.id,
      indexNumber: students.indexNumber,
      fullName: students.fullName,
      email: students.email,
      phone: students.phone,
      address: students.address,
      dateOfBirth: students.dateOfBirth,
      faculty: students.faculty,
      department: students.department,
      isFirstLogin: students.isFirstLogin,
      createdAt: students.createdAt,
    })
    .from(students)
    .where(eq(students.indexNumber, student.identifier))
    .limit(1);

  if (!data[0]) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  return NextResponse.json(data[0]);
}

// ─── PUT: Update student profile ────────────────────────────────────────────

const ALLOWED_FIELDS = [
  "fullName",
  "email",
  "phone",
  "address",
  "dateOfBirth",
  "faculty",
  "department",
] as const;

type AllowedField = (typeof ALLOWED_FIELDS)[number];

export async function PUT(req: NextRequest) {
  const student = getStudentFromRequest(req);

  if (!student) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Build an update object with only allowed fields
  const updates: Partial<Record<AllowedField, string | null>> = {};

  for (const field of ALLOWED_FIELDS) {
    if (field in body) {
      const val = body[field];
      if (val === null || val === "") {
        updates[field] = null;
      } else if (typeof val === "string") {
        updates[field] = val.trim();
      }
    }
  }

  // Validate email format if provided
  if (updates.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updates.email)) {
    return NextResponse.json(
      { error: "Invalid email format" },
      { status: 400 }
    );
  }

  // Validate phone if provided (allow digits, spaces, dashes, plus)
  if (updates.phone && !/^[\d\s\-+()]{7,30}$/.test(updates.phone)) {
    return NextResponse.json(
      { error: "Invalid phone number format" },
      { status: 400 }
    );
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "No valid fields to update" },
      { status: 400 }
    );
  }

  await db
    .update(students)
    .set(updates)
    .where(eq(students.indexNumber, student.identifier));

  // Fetch and return updated profile
  const updated = await db
    .select({
      id: students.id,
      indexNumber: students.indexNumber,
      fullName: students.fullName,
      email: students.email,
      phone: students.phone,
      address: students.address,
      dateOfBirth: students.dateOfBirth,
      faculty: students.faculty,
      department: students.department,
      isFirstLogin: students.isFirstLogin,
      createdAt: students.createdAt,
    })
    .from(students)
    .where(eq(students.indexNumber, student.identifier))
    .limit(1);

  return NextResponse.json(updated[0]);
}