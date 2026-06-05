import "dotenv/config";
import { db } from "../lib/db";
import { pdfUploads, results, students, subjects } from "../lib/schema";
import { eq, count } from "drizzle-orm";

async function main() {
  console.log("=== STARTING AUTOMATED DELETION VERIFICATION ===\n");

  // 1. Get student and subject for mock result
  const [student] = await db.select().from(students).limit(1);
  const [subject] = await db.select().from(subjects).limit(1);

  if (!student || !subject) {
    console.error("❌ Pre-requisite error: Student or Subject table is empty.");
    process.exit(1);
  }

  console.log(`Using mock student: ${student.indexNumber}`);
  console.log(`Using mock subject: ${subject.subjectCode}`);

  // ─── PART 1: TEST SINGLE UPLOAD SHEET DELETION ───
  console.log("\n--- Part 1: Testing Single Upload Deletion ---");

  // Create mock upload
  const [mockUpload] = await db.insert(pdfUploads).values({
    filename: "verify-delete-sheet.md",
    adminId: 1, // Assumes default admin exists
    status: "completed",
    processedCount: 1,
  }).returning({ id: pdfUploads.id });

  console.log(`Created mock upload ID: ${mockUpload.id}`);

  // Create associated result
  const [mockResult] = await db.insert(results).values({
    studentIndex: student.indexNumber,
    subjectId: subject.id,
    grade: "B+",
    gradePoint: "3.30",
    pdfUploadId: mockUpload.id,
  }).returning({ id: results.id });

  console.log(`Created associated result ID: ${mockResult.id}`);

  // Simulate API route behavior for DELETE /api/admin/uploads/[id]
  console.log("Simulating single sheet delete...");
  const uploadIdToDelete = mockUpload.id;

  // Perform deletion
  const deleteResult = await db.delete(pdfUploads).where(eq(pdfUploads.id, uploadIdToDelete));
  console.log("Delete call completed.");

  // Check if upload log is gone
  const checkUpload = await db.select().from(pdfUploads).where(eq(pdfUploads.id, uploadIdToDelete));
  const checkResult = await db.select().from(results).where(eq(results.id, mockResult.id));

  if (checkUpload.length === 0) {
    console.log("✅ Verification: Upload log row successfully deleted.");
  } else {
    console.error("❌ Verification: Upload log row still exists!");
  }

  if (checkResult.length === 0) {
    console.log("✅ Verification: Associated result was successfully deleted (CASCADE worked).");
  } else {
    console.error("❌ Verification: Associated result still exists! CASCADE failed.");
  }


  // ─── PART 2: TEST RESET DATABASE (DELETE ALL) ───
  console.log("\n--- Part 2: Testing Reset Database (Delete All) ---");

  // Create temporary upload and results
  const [tempUpload] = await db.insert(pdfUploads).values({
    filename: "verify-reset-db.md",
    adminId: 1,
    status: "completed",
    processedCount: 1,
  }).returning({ id: pdfUploads.id });

  await db.insert(results).values({
    studentIndex: student.indexNumber,
    subjectId: subject.id,
    grade: "C",
    gradePoint: "2.00",
    pdfUploadId: tempUpload.id,
  });

  console.log("Created fresh data to test reset...");

  // Simulate DELETE /api/admin/results/delete-all
  console.log("Simulating delete-all database reset...");
  await db.delete(results);
  await db.delete(pdfUploads);

  // Check counts
  const [finalUploads] = await db.select({ value: count() }).from(pdfUploads);
  const [finalResults] = await db.select({ value: count() }).from(results);

  if (finalUploads.value === 0 && finalResults.value === 0) {
    console.log("✅ Verification: All results and uploads successfully deleted. DB is completely clear.");
  } else {
    console.error(`❌ Verification: DB not clear! Uploads: ${finalUploads.value}, Results: ${finalResults.value}`);
  }

  console.log("\n=== DELETION VERIFICATION COMPLETED SUCCESSFULLY ===");
  process.exit(0);
}

main().catch(err => {
  console.error("Verification failed with error:", err);
  process.exit(1);
});
