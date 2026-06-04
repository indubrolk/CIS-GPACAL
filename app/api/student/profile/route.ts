import { NextRequest, NextResponse } from "next/server";
import { getStudentFromRequest } from "@/lib/studentAuth";
import { db } from "@/lib/db";
import { students } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const student = getStudentFromRequest(req);

  if (!student) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await db
    .select({
      indexNumber: students.indexNumber,
      isFirstLogin: students.isFirstLogin,
    })
    .from(students)
    .where(eq(students.indexNumber, student.identifier))
    .limit(1);

  return NextResponse.json(data[0]);
}