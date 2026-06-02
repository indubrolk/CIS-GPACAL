import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import * as schema from "../lib/schema";

// ─── Direct DB Connection for Seeding ───────────────────────────────────────

async function seed() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("❌ DATABASE_URL environment variable is not set.");
    console.error("   Create a .env file with DATABASE_URL=your_neon_connection_string");
    process.exit(1);
  }

  const sql = neon(databaseUrl);
  const db = drizzle(sql, { schema });

  console.log("🌱 Starting database seed...\n");

  // ── 1. Create default admin ─────────────────────────────────────────────

  const adminPassword = await bcrypt.hash("admin123", 10);

  const existingAdmin = await db
    .select()
    .from(schema.admins)
    .where(eq(schema.admins.username, "admin"))
    .limit(1);

  if (existingAdmin.length === 0) {
    await db.insert(schema.admins).values({
      username: "admin",
      passwordHash: adminPassword,
    });
    console.log("✅ Default admin created (username: admin, password: admin123)");
  } else {
    console.log("⏭️  Admin 'admin' already exists, skipping.");
  }

  // ── 2. Insert all 8 semesters ───────────────────────────────────────────

  const semesterData: {
    yearNumber: number;
    semesterNumber: number;
    label: string;
  }[] = [];

  for (let year = 1; year <= 4; year++) {
    for (let sem = 1; sem <= 2; sem++) {
      semesterData.push({
        yearNumber: year,
        semesterNumber: sem,
        label: `Year ${year} - Semester ${sem}`,
      });
    }
  }

  let insertedCount = 0;
  let skippedCount = 0;

  for (const semester of semesterData) {
    const existing = await db
      .select()
      .from(schema.semesters)
      .where(eq(schema.semesters.yearNumber, semester.yearNumber))
      .limit(10);

    const alreadyExists = existing.some(
      (s) => s.semesterNumber === semester.semesterNumber
    );

    if (!alreadyExists) {
      await db.insert(schema.semesters).values(semester);
      insertedCount++;
    } else {
      skippedCount++;
    }
  }

  console.log(
    `✅ Semesters: ${insertedCount} inserted, ${skippedCount} already existed.`
  );

  console.log("\n🎉 Seed completed successfully!");
}

// ─── Run ────────────────────────────────────────────────────────────────────

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  });
