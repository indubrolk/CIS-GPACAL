/**
 * fixIsGpa.ts
 *
 * Any subject with creditPoints = 0 must be Non-GPA (isGpa = false).
 * This script finds all such subjects and corrects them.
 */

import "dotenv/config";
import { db } from "@/lib/db";
import { subjects } from "@/lib/schema";
import { eq } from "drizzle-orm";

async function fix() {
  console.log("🔍  Checking for 0-credit subjects incorrectly marked as GPA…\n");

  const allSubjects = await db.select().from(subjects);

  let fixed = 0;
  let alreadyCorrect = 0;

  for (const sub of allSubjects) {
    if (sub.creditPoints === 0) {
      if (sub.isGpa) {
        await db
          .update(subjects)
          .set({ isGpa: false })
          .where(eq(subjects.id, sub.id));
        console.log(`✅  Fixed ${sub.subjectCode}: creditPoints=0 → isGpa set to false`);
        fixed++;
      } else {
        console.log(`☑️  ${sub.subjectCode}: already isGpa=false (correct)`);
        alreadyCorrect++;
      }
    }
  }

  console.log(`\n📊  Summary: ${fixed} fixed, ${alreadyCorrect} already correct.`);

  if (fixed === 0 && alreadyCorrect === 0) {
    console.log("ℹ️  No 0-credit subjects found in DB.");
  }

  process.exit(0);
}

fix().catch((err) => {
  console.error("Fix error:", err);
  process.exit(1);
});
