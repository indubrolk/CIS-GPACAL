import {
  pgTable,
  serial,
  varchar,
  text,
  boolean,
  integer,
  decimal,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

// ─── Students ────────────────────────────────────────────────────────────────

export const students = pgTable("students", {
  id: serial("id").primaryKey(),
  indexNumber: varchar("index_number", { length: 50 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  isFirstLogin: boolean("is_first_login").notNull().default(true),
  // ── Profile fields (editable by student) ─────────────────────────────
  fullName: varchar("full_name", { length: 200 }),
  email: varchar("email", { length: 200 }),
  phone: varchar("phone", { length: 30 }),
  address: text("address"),
  dateOfBirth: varchar("date_of_birth", { length: 20 }),
  faculty: varchar("faculty", { length: 200 }),
  department: varchar("department", { length: 200 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─── Admins ──────────────────────────────────────────────────────────────────

export const admins = pgTable("admins", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 100 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─── Semesters ───────────────────────────────────────────────────────────────

export const semesters = pgTable(
  "semesters",
  {
    id: serial("id").primaryKey(),
    yearNumber: integer("year_number").notNull(), // 1-4
    semesterNumber: integer("semester_number").notNull(), // 1-2
    label: varchar("label", { length: 50 }).notNull(),
  },
  (table) => ({
    uniqueYearSem: unique("uq_year_sem").on(
      table.yearNumber,
      table.semesterNumber
    ),
  })
);

// ─── Subjects ────────────────────────────────────────────────────────────────

export const subjects = pgTable("subjects", {
  id: serial("id").primaryKey(),
  subjectCode: varchar("subject_code", { length: 20 }).notNull(),
  subjectName: varchar("subject_name", { length: 200 }).notNull(),
  creditPoints: integer("credit_points").notNull(),
  isGpa: boolean("is_gpa").notNull().default(true),
  semesterId: integer("semester_id")
    .notNull()
    .references(() => semesters.id, { onDelete: "cascade" }),
});

// ─── Results ─────────────────────────────────────────────────────────────────

export const results = pgTable(
  "results",
  {
    id: serial("id").primaryKey(),
    studentIndex: varchar("student_index", { length: 50 })
      .notNull()
      .references(() => students.indexNumber, { onDelete: "cascade" }),
    subjectId: integer("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    grade: varchar("grade", { length: 5 }).notNull(),
    gradePoint: decimal("grade_point", { precision: 3, scale: 2 }).notNull(),
    isRepeat: boolean("is_repeat").notNull().default(false),
    pdfUploadId: integer("pdf_upload_id")
      .references(() => pdfUploads.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    uniqueStudentSubject: unique("uq_student_subject").on(
      table.studentIndex,
      table.subjectId
    ),
  })
);

// ─── PDF Uploads ─────────────────────────────────────────────────────────────

export const pdfUploads = pgTable("pdf_uploads", {
  id: serial("id").primaryKey(),
  filename: varchar("filename", { length: 500 }).notNull(),
  adminId: integer("admin_id")
    .notNull()
    .references(() => admins.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  processedCount: integer("processed_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
