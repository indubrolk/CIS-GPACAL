import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { subjects } from "@/lib/schema";
import { getAdminFromRequest } from "@/lib/adminAuth";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// ─── Canonical subject credit data ──────────────────────────────────────────
// Source of truth for credit points, matching the official curriculum.

const SUBJECT_CREDITS: Record<string, { creditPoints: number; isGpa: boolean }> = {
  // Semester I
  "IS1101": { creditPoints: 2, isGpa: true },
  "IS1102": { creditPoints: 2, isGpa: true },
  "IS1103": { creditPoints: 1, isGpa: true },
  "IS1104": { creditPoints: 2, isGpa: true },
  "IS1105": { creditPoints: 2, isGpa: true },
  "IS1106": { creditPoints: 2, isGpa: true },
  "IS1107": { creditPoints: 1, isGpa: true },
  "IS1108": { creditPoints: 2, isGpa: true },
  "IS1109": { creditPoints: 2, isGpa: true },
  "IS1110": { creditPoints: 0, isGpa: false },
  "IS1111": { creditPoints: 0, isGpa: false },
  "IS-EGP-1101": { creditPoints: 0, isGpa: false },
  // Semester II
  "IS2101": { creditPoints: 2, isGpa: true },
  "IS2102": { creditPoints: 1, isGpa: true },
  "IS2103": { creditPoints: 1, isGpa: true },
  "IS2104": { creditPoints: 2, isGpa: true },
  "IS2105": { creditPoints: 1, isGpa: true },
  "IS2106": { creditPoints: 1, isGpa: true },
  "IS2107": { creditPoints: 1, isGpa: true },
  "IS2108": { creditPoints: 2, isGpa: true },
  "IS2109": { creditPoints: 2, isGpa: true },
  "IS2110": { creditPoints: 1, isGpa: true },
  "IS2111": { creditPoints: 2, isGpa: true },
  "IS2112": { creditPoints: 0, isGpa: false },
  "IS-EGP-1201": { creditPoints: 0, isGpa: false },
  // Semester III
  "IS3101": { creditPoints: 2, isGpa: true },
  "IS3102": { creditPoints: 2, isGpa: true },
  "IS3103": { creditPoints: 2, isGpa: true },
  "IS3104": { creditPoints: 2, isGpa: true },
  "IS3105": { creditPoints: 2, isGpa: true },
  "IS3106": { creditPoints: 1, isGpa: true },
  "IS3107": { creditPoints: 2, isGpa: true },
  "IS3108": { creditPoints: 1, isGpa: true },
  "IS3109": { creditPoints: 2, isGpa: true },
  "IS-EAP-2101": { creditPoints: 0, isGpa: false },
  // Semester IV
  "IS4101": { creditPoints: 2, isGpa: true },
  "IS4102": { creditPoints: 2, isGpa: true },
  "IS4103": { creditPoints: 2, isGpa: true },
  "IS4104": { creditPoints: 2, isGpa: true },
  "IS4105": { creditPoints: 1, isGpa: true },
  "IS4106": { creditPoints: 2, isGpa: true },
  "IS4107": { creditPoints: 1, isGpa: true },
  "IS4108": { creditPoints: 1, isGpa: true },
  "IS4109": { creditPoints: 2, isGpa: true },
  "IS4110": { creditPoints: 2, isGpa: true },
  "IS-EAP-2201": { creditPoints: 0, isGpa: false },
  // Semester V
  "IS5101": { creditPoints: 1, isGpa: true },
  "IS5102": { creditPoints: 1, isGpa: true },
  "IS5103": { creditPoints: 2, isGpa: true },
  "IS5104": { creditPoints: 1, isGpa: true },
  "IS5105": { creditPoints: 2, isGpa: true },
  "IS5106": { creditPoints: 1, isGpa: true },
  "IS5107": { creditPoints: 1, isGpa: true },
  "IS5108": { creditPoints: 2, isGpa: true },
  "IS5109": { creditPoints: 1, isGpa: true },
  "IS5110": { creditPoints: 2, isGpa: true },
  "IS5111": { creditPoints: 2, isGpa: true },
  "IS5112": { creditPoints: 2, isGpa: true },
  "IS5113": { creditPoints: 2, isGpa: true },
  "IS5114": { creditPoints: 2, isGpa: true },
  "IS-EBP-3101": { creditPoints: 0, isGpa: false },
  // Semester VI
  "IS6101": { creditPoints: 6, isGpa: true },
  // Semester VII
  "IS7101": { creditPoints: 2, isGpa: true },
  "IS7102": { creditPoints: 1, isGpa: true },
  "IS7103": { creditPoints: 2, isGpa: true },
  "IS7104": { creditPoints: 2, isGpa: true },
  "IS7105": { creditPoints: 1, isGpa: true },
  "IS7106": { creditPoints: 2, isGpa: true },
  "IS7107": { creditPoints: 1, isGpa: true },
  "IS7108": { creditPoints: 2, isGpa: true },
  "IS7109": { creditPoints: 2, isGpa: true },
  "IS7110": { creditPoints: 1, isGpa: true },
  "IS7111": { creditPoints: 1, isGpa: true },
  "IS7112": { creditPoints: 2, isGpa: true },
  // Semester VIII
  "IS8101": { creditPoints: 8, isGpa: true },
  "IS8102": { creditPoints: 2, isGpa: true },
  "IS8103": { creditPoints: 2, isGpa: true },
  "IS8104": { creditPoints: 1, isGpa: true },
  "IS8105": { creditPoints: 2, isGpa: true },
  "IS8106": { creditPoints: 2, isGpa: true },
  "IS8107": { creditPoints: 2, isGpa: true },
  "IS8108": { creditPoints: 2, isGpa: true },
  "IS8109": { creditPoints: 2, isGpa: true },
  "IS8110": { creditPoints: 1, isGpa: true },
  "IS8111": { creditPoints: 2, isGpa: true },
};

// ─── POST /api/admin/subjects/sync ──────────────────────────────────────────
// Syncs all subject credit values in the database to match canonical data.

export async function POST(request: NextRequest) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const updated: string[] = [];
    const skipped: string[] = [];
    const notFound: string[] = [];

    for (const [code, canonical] of Object.entries(SUBJECT_CREDITS)) {
      const existing = await db
        .select({
          id: subjects.id,
          subjectCode: subjects.subjectCode,
          creditPoints: subjects.creditPoints,
          isGpa: subjects.isGpa,
        })
        .from(subjects)
        .where(eq(subjects.subjectCode, code))
        .limit(1);

      if (existing.length === 0) {
        notFound.push(code);
        continue;
      }

      const current = existing[0];
      if (
        current.creditPoints !== canonical.creditPoints ||
        current.isGpa !== canonical.isGpa
      ) {
        await db
          .update(subjects)
          .set({
            creditPoints: canonical.creditPoints,
            isGpa: canonical.isGpa,
          })
          .where(eq(subjects.subjectCode, code));
        updated.push(
          `${code}: credits ${current.creditPoints} → ${canonical.creditPoints}`
        );
      } else {
        skipped.push(code);
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        updated: updated.length,
        skipped: skipped.length,
        notFound: notFound.length,
      },
      details: { updated, notFound },
    });
  } catch (error) {
    console.error("POST /api/admin/subjects/sync error:", error);
    return NextResponse.json(
      { error: "Failed to sync subject credits" },
      { status: 500 }
    );
  }
}
