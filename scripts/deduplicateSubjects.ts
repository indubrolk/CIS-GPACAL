/**
 * deduplicateSubjects.ts
 *
 * The DB has duplicate subject rows (same subjectCode, multiple IDs).
 * This script keeps the lowest-ID row for each code and deletes the rest.
 * It first re-parents any results rows pointing to duplicate IDs,
 * then deletes the duplicates.
 */

import "dotenv/config";
import { db } from "@/lib/db";
import { subjects, results } from "@/lib/schema";
import { eq, inArray } from "drizzle-orm";

async function dedup() {
  console.log("🔍  Scanning for duplicate subjects…\n");

  const allSubjects = await db.select().from(subjects);

  // Group by subjectCode
  const byCode = new Map<string, typeof allSubjects>();
  for (const sub of allSubjects) {
    const group = byCode.get(sub.subjectCode) ?? [];
    group.push(sub);
    byCode.set(sub.subjectCode, group);
  }

  let totalDuplicates = 0;

  for (const [code, group] of Array.from(byCode.entries())) {
    if (group.length <= 1) continue;

    // Keep the row with the lowest id (original seed entry)
    group.sort((a, b) => a.id - b.id);
    const [keep, ...duplicates] = group;
    const dupIds = duplicates.map((d) => d.id);

    console.log(`📌  ${code}: keeping id=${keep.id}, removing ids=[${dupIds.join(", ")}]`);

    // Re-parent any results that point to a duplicate subject id → point to keeper
    for (const dupId of dupIds) {
      const affected = await db
        .update(results)
        .set({ subjectId: keep.id })
        .where(eq(results.subjectId, dupId));
      // @ts-ignore rowCount may not be typed
      const count = (affected as any)?.rowCount ?? "?";
      if (count !== "?" && Number(count) > 0) {
        console.log(`   ↳  Re-parented ${count} result row(s) from id=${dupId} → id=${keep.id}`);
      }
    }

    // Delete duplicates
    await db.delete(subjects).where(inArray(subjects.id, dupIds));
    totalDuplicates += dupIds.length;
  }

  if (totalDuplicates === 0) {
    console.log("✅  No duplicates found — DB is clean.");
  } else {
    console.log(`\n✅  Removed ${totalDuplicates} duplicate subject row(s).`);
  }

  process.exit(0);
}

dedup().catch((err) => {
  console.error("Dedup error:", err);
  process.exit(1);
});
