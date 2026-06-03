# 🎓 Department GPA Calculator — Full Project Plan

---

## 1. Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                     Next.js 14 (App Router)                   │
│                                                                │
│  ┌─────────────────────┐     ┌──────────────────────────┐    │
│  │    ADMIN PORTAL      │     │     STUDENT PORTAL        │    │
│  │  /admin/*            │     │  /student/*               │    │
│  │  - Login             │     │  - Login (Index No.)      │    │
│  │  - Upload PDF        │     │  - Dashboard (GPA/Class)  │    │
│  │  - Review Extracted  │     │  - Results by Semester    │    │
│  │    Results           │     │  - Change Password        │    │
│  │  - Assign Subjects   │     └──────────────────────────┘    │
│  │  - Student List      │                                      │
│  └─────────────────────┘                                      │
└──────────────────────────────────────────────────────────────┘
                          │
              ┌───────────┴────────────┐
              │   Next.js API Routes   │
              │  (Netlify Functions)   │
              └───────────┬────────────┘
                          │
        ┌─────────────────┼──────────────────┐
        │                 │                  │
 ┌──────┴──────┐  ┌───────┴──────┐  ┌───────┴──────┐
 │    Neon     │  │  Anthropic   │  │  pdf-parse   │
 │ PostgreSQL  │  │  Claude Opus │  │  (text extr) │
 └─────────────┘  └──────────────┘  └──────────────┘
```

---

## 2. Tech Stack

| Layer | Tool |
|-------|------|
| Framework | Next.js 14 (App Router + TypeScript) |
| UI | Tailwind CSS + shadcn/ui |
| Database | Neon PostgreSQL (`@neondatabase/serverless`) |
| ORM | Drizzle ORM |
| Authentication | Custom JWT in httpOnly cookies |
| PDF Text Extract | `pdf-parse` |
| PDF AI Analysis | Anthropic Claude Opus API |
| Passwords | `bcryptjs` |
| Hosting | Netlify (with `@netlify/plugin-nextjs`) |

---

## 3. Database Schema (Drizzle / SQL)

```sql
-- Students
CREATE TABLE students (
  id            SERIAL PRIMARY KEY,
  index_number  VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,  -- default: hash('123456789')
  is_first_login BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Admins
CREATE TABLE admins (
  id            SERIAL PRIMARY KEY,
  username      VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Semesters (Year 1–4, Sem 1–2)
CREATE TABLE semesters (
  id              SERIAL PRIMARY KEY,
  year_number     INTEGER NOT NULL CHECK (year_number BETWEEN 1 AND 4),
  semester_number INTEGER NOT NULL CHECK (semester_number BETWEEN 1 AND 2),
  label           VARCHAR(50),  -- e.g. "Year 1 - Semester 1"
  UNIQUE (year_number, semester_number)
);

-- Subjects
CREATE TABLE subjects (
  id            SERIAL PRIMARY KEY,
  subject_code  VARCHAR(50),
  subject_name  VARCHAR(255) NOT NULL,
  credit_points INTEGER NOT NULL,
  semester_id   INTEGER REFERENCES semesters(id),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Results (one row per student per subject)
CREATE TABLE results (
  id             SERIAL PRIMARY KEY,
  student_index  VARCHAR(50) REFERENCES students(index_number) ON DELETE CASCADE,
  subject_id     INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
  grade          VARCHAR(5)     NOT NULL,  -- A+, A, A-, B+, B, B-, C+, C, C-, D+, D, E, AB
  grade_point    DECIMAL(3,2)   NOT NULL,
  is_repeat      BOOLEAN DEFAULT FALSE,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (student_index, subject_id)     -- upsert on repeat exams
);

-- Upload logs
CREATE TABLE pdf_uploads (
  id              SERIAL PRIMARY KEY,
  filename        VARCHAR(255),
  admin_id        INTEGER REFERENCES admins(id),
  status          VARCHAR(20) DEFAULT 'pending',  -- pending|processing|completed|failed
  processed_count INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 4. Grade Points & Business Rules

```typescript
// lib/grades.ts
export const GRADE_POINTS: Record<string, number> = {
  'A+': 4.00, 'A': 4.00, 'A-': 3.70,
  'B+': 3.30, 'B': 3.00, 'B-': 2.70,
  'C+': 2.30, 'C': 2.00, 'C-': 1.70,
  'D+': 1.30, 'D': 1.00,
  'E':  0.00, 'AB': 0.00
};

// Semester / Year GPA
export function calcGPA(results: { gp: number; cp: number }[]): number {
  const sumWeighted = results.reduce((s, r) => s + r.gp * r.cp, 0);
  const sumCredits  = results.reduce((s, r) => s + r.cp, 0);
  return sumCredits > 0 ? Math.round((sumWeighted / sumCredits) * 100) / 100 : 0;
}

// Final GPA — weights: Y1=0.2, Y2=0.2, Y3=0.3, Y4=0.3
export function calcFGPA(yearGPAs: { year: number; gpa: number }[]): number {
  const W: Record<number, number> = { 1: 0.2, 2: 0.2, 3: 0.3, 4: 0.3 };
  const fgpa = yearGPAs.reduce((s, y) => s + (W[y.year] ?? 0) * y.gpa, 0);
  return Math.round(fgpa * 100) / 100;
}

// Class determination
export function getClass(fgpa: number): string {
  if (fgpa >= 3.70) return 'First Class';
  if (fgpa >= 3.30) return 'Second Class (Upper Division)';
  if (fgpa >= 2.70) return 'Second Class (Lower Division)';
  if (fgpa >= 2.00) return 'Pass';
  return 'Fail';
}

// Pass check: every subject must be ≥ D, and FGPA ≥ 2.00
export function isPass(results: { grade: string }[], fgpa: number): boolean {
  const hasFailure = results.some(r => r.grade === 'E' || r.grade === 'AB');
  return !hasFailure && fgpa >= 2.00;
}

// Repeat exam rule: replace with grade "C" (2.00 GP) for pass, eliminate old lower grade
export function applyRepeatRule(oldGP: number, newGrade: string): number {
  if (GRADE_POINTS[newGrade] > oldGP) return 2.00; // award C for pass
  return oldGP; // keep old if new is worse
}
```

---

## 5. PDF Analysis Flow (Admin Upload)

```
Admin uploads PDF
      │
      ▼
pdf-parse extracts raw text
      │
      ▼
Claude Opus receives text + prompt:
"Extract all student index numbers and their grades per subject.
 Return ONLY valid JSON: { students: [{ indexNumber, results: [{ subjectCode, subjectName, grade }] }] }"
      │
      ▼
Claude returns structured JSON
      │
      ▼
Admin sees review table:
  - Pre-filled index numbers and grades
  - For each NEW subject: admin fills in credit points + semester
  - Admin can edit any cell
      │
      ▼
Admin clicks "Save All" → DB insert/upsert
```

---

## 6. Folder Structure

```
/
├── app/
│   ├── (admin)/
│   │   ├── admin/login/page.tsx
│   │   ├── admin/dashboard/page.tsx
│   │   ├── admin/upload/page.tsx
│   │   └── admin/students/[index]/page.tsx
│   ├── (student)/
│   │   ├── student/login/page.tsx
│   │   ├── student/dashboard/page.tsx
│   │   └── student/change-password/page.tsx
│   └── api/
│       ├── auth/admin/login/route.ts
│       ├── auth/student/login/route.ts
│       ├── auth/logout/route.ts
│       ├── auth/student/change-password/route.ts
│       ├── admin/pdf/upload/route.ts
│       ├── admin/pdf/analyze/route.ts
│       ├── admin/results/save/route.ts
│       ├── admin/subjects/route.ts
│       ├── admin/students/route.ts
│       └── student/gpa/route.ts
├── lib/
│   ├── db.ts          (Neon + Drizzle setup)
│   ├── auth.ts        (JWT helpers)
│   ├── grades.ts      (grade constants + GPA formulas)
│   └── pdf.ts         (pdf-parse wrapper)
├── middleware.ts       (route protection)
├── .env.local
└── drizzle.config.ts
```

---

## 7. Environment Variables

```env
# .env.local
DATABASE_URL=postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
ANTHROPIC_API_KEY=sk-ant-api03-...
JWT_SECRET=your-256-bit-random-secret-here
NEXT_PUBLIC_APP_NAME=Department GPA Calculator
```

---

## 8. Build Prompts for Claude Opus

Use these **in sequence** — each phase builds on the previous.

---

### PROMPT 1 — Project Setup & Database

```
You are a senior full-stack developer. I am building a GPA Calculator for a university computing department using Next.js 14 (App Router, TypeScript), Tailwind CSS, shadcn/ui, Neon PostgreSQL with Drizzle ORM, and hosting on Netlify.

## Task
Set up the complete project foundation:

1. Generate package.json with ALL required dependencies:
   - next, react, react-dom, typescript
   - @neondatabase/serverless, drizzle-orm, drizzle-kit
   - @anthropic-ai/sdk
   - pdf-parse, @types/pdf-parse
   - bcryptjs, @types/bcryptjs
   - jsonwebtoken, @types/jsonwebtoken
   - shadcn/ui (button, card, table, badge, input, label, toast, accordion, dialog, alert)
   - tailwindcss, postcss, autoprefixer

2. Generate the Drizzle ORM schema file at `lib/schema.ts` with these tables:
   - students (id, index_number UNIQUE, password_hash, is_first_login boolean, created_at)
   - admins (id, username UNIQUE, password_hash, created_at)
   - semesters (id, year_number 1-4, semester_number 1-2, label, UNIQUE(year,sem))
   - subjects (id, subject_code, subject_name, credit_points, semester_id FK)
   - results (id, student_index FK students.index_number, subject_id FK, grade VARCHAR(5), grade_point DECIMAL(3,2), is_repeat boolean, created_at, UNIQUE(student_index, subject_id))
   - pdf_uploads (id, filename, admin_id FK, status, processed_count, created_at)

3. Generate `lib/db.ts` — Neon serverless connection + Drizzle instance.

4. Generate `lib/grades.ts`:
   - GRADE_POINTS constant: A+=4.00, A=4.00, A-=3.70, B+=3.30, B=3.00, B-=2.70, C+=2.30, C=2.00, C-=1.70, D+=1.30, D=1.00, E=0.00, AB=0.00
   - calcGPA(results: {gp,cp}[]): number — Σ(gp×cp)/Σcp, rounded to 2dp
   - calcFGPA(yearGPAs: {year,gpa}[]): number — Y1×0.2 + Y2×0.2 + Y3×0.3 + Y4×0.3
   - getClass(fgpa): string — "First Class" ≥3.70, "Second Class (Upper Division)" ≥3.30, "Second Class (Lower Division)" ≥2.70, "Pass" ≥2.00, "Fail" <2.00
   - isPass(results, fgpa): boolean — no E or AB grades AND fgpa ≥ 2.00

5. Generate `lib/auth.ts`:
   - signToken(payload): string — JWT, 24h expiry, using JWT_SECRET
   - verifyToken(token): payload | null
   - hashPassword(plain): Promise<string> — bcryptjs, salt 10
   - comparePassword(plain, hash): Promise<boolean>
   - DEFAULT_PASSWORD_HASH = hash of '123456789' (generate at setup)

6. Generate `middleware.ts`:
   - Routes under /admin/* require valid JWT with role:'admin'
   - Routes under /student/* require valid JWT with role:'student'
   - Redirect unauthorized to respective login pages
   - JWT is read from httpOnly cookie named 'auth-token'

7. Generate `drizzle.config.ts` for migrations.

8. Generate a `db/seed.ts` that:
   - Creates one default admin: username='admin', password='admin123'
   - Inserts all 8 semesters (Year 1-4, Sem 1-2) with labels

Generate complete, working TypeScript code for every file. Do not use placeholder comments.
```

---

### PROMPT 2 — Authentication API Routes

```
Continuing the GPA Calculator project (Next.js 14, TypeScript, Drizzle + Neon, JWT in httpOnly cookie).

The schema, grade utils, and auth utils are already set up from Phase 1.

## Task: Generate all authentication API routes

1. `app/api/auth/admin/login/route.ts` — POST
   - Body: { username, password }
   - Validate against admins table using bcryptjs
   - On success: set httpOnly cookie 'auth-token' with JWT { role:'admin', id, username }
   - Return: { success: true, redirect: '/admin/dashboard' }
   - On fail: 401 with { error: 'Invalid credentials' }

2. `app/api/auth/student/login/route.ts` — POST
   - Body: { indexNumber, password }
   - Validate against students table
   - On success: set httpOnly cookie 'auth-token' with JWT { role:'student', indexNumber, isFirstLogin }
   - Return: { success: true, isFirstLogin: boolean, redirect: '/student/dashboard' OR '/student/change-password' }
   - On fail: 401

3. `app/api/auth/logout/route.ts` — POST
   - Clear 'auth-token' cookie
   - Return: { success: true }

4. `app/api/auth/student/change-password/route.ts` — POST (protected: student JWT required)
   - Body: { currentPassword, newPassword }
   - Verify currentPassword
   - Hash newPassword, update students table, set is_first_login = false
   - Return: { success: true }

Also generate:
- `app/admin/login/page.tsx` — Clean login form (username + password), calls API, redirects on success. Use shadcn Card, Input, Button, toast for errors.
- `app/student/login/page.tsx` — Login form (Index Number + Password), same pattern. Show hint: "First-time login password is 123456789".
- `app/student/change-password/page.tsx` — Change password form, enforces min 8 chars, redirects to dashboard on success.

Make all pages fully responsive, with a department branding header ("Department of Computing — GPA Portal").
```

---

### PROMPT 3 — Admin PDF Upload & Claude Analysis

```
Continuing the GPA Calculator project. Auth is complete.

## Task: Build the PDF upload and AI analysis feature

### API Routes:

1. `app/api/admin/pdf/upload/route.ts` — POST (admin JWT required)
   - Accept multipart/form-data with a PDF file
   - Use pdf-parse to extract text from the uploaded buffer
   - Log the upload to pdf_uploads table with status='processing'
   - Return: { uploadId, extractedText }

2. `app/api/admin/pdf/analyze/route.ts` — POST (admin JWT required)
   - Body: { uploadId, extractedText }
   - Call Anthropic Claude claude-opus-4-5 with this system prompt and user message:
   
   SYSTEM: "You are a data extraction assistant. Extract student examination results from university result sheets. Always return ONLY valid JSON with no markdown, no explanation."
   
   USER: `Extract all student index numbers and their subject grades from this text. Return JSON in exactly this format:
   {
     "students": [
       {
         "indexNumber": "string",
         "results": [
           { "subjectCode": "string", "subjectName": "string", "grade": "string" }
         ]
       }
     ]
   }
   Valid grades are: A+, A, A-, B+, B, B-, C+, C, C-, D+, D, E, AB.
   Text to analyze:
   [extractedText]`
   
   - Parse the JSON response
   - Cross-reference subjectCodes/Names against existing subjects table
   - Return: { students[], newSubjects[] (subjects not yet in DB), existingSubjects[] }
   - Update pdf_uploads status to 'completed' or 'failed'

3. `app/api/admin/subjects/route.ts` — POST (admin JWT required)
   - Body: { subjectCode, subjectName, creditPoints, yearNumber, semesterNumber }
   - Find or create semester, insert subject
   - Return: { subject }

4. `app/api/admin/results/save/route.ts` — POST (admin JWT required)
   - Body: { students: [{ indexNumber, results: [{ subjectId, grade }] }] }
   - For each student: upsert into students table (create if not exists, with default hashed password)
   - For each result: upsert into results table (ON CONFLICT (student_index, subject_id) DO UPDATE grade, grade_point, is_repeat=true)
   - Apply repeat exam rule: if new grade > old grade, update; award grade_point of 2.00 (C) on pass
   - Return: { saved: count, created: newStudentCount }

### Admin Pages:

`app/admin/upload/page.tsx`:
- Step 1: File drop zone (accept PDF only), upload button
- Step 2: Loading state with "Analyzing with AI..." message while Claude processes
- Step 3: Review table showing:
  - All extracted student index numbers and their grades
  - Highlighted rows for unrecognized students (will be auto-created)
  - Section for NEW subjects found: for each, show inline form asking for Subject Name (pre-filled), Credit Points (number input 1-4), Year (1-4), Semester (1-2)
  - Editable grade cells in case of extraction errors
- Step 4: "Save All Results" button → confirmation dialog → save → success toast with summary
- Error handling: show Claude's raw output if JSON parsing fails, allow manual fix

Use a multi-step wizard UI with progress indicator. Use shadcn Table, Dialog, Badge, Alert components.
```

---

### PROMPT 4 — Admin Dashboard & Student Management

```
Continuing the GPA Calculator project.

## Task: Admin dashboard, student list, and student detail view

### API Routes:

1. `app/api/admin/dashboard/stats/route.ts` — GET (admin JWT required)
   Return: { totalStudents, totalSubjects, totalResults, recentUploads: last5, studentsAtRisk: count(fgpa<2.00) }

2. `app/api/admin/students/route.ts` — GET (admin JWT required)
   - Query param: ?search=indexNumber
   - Return paginated list: [{ indexNumber, semesterCount, latestGPA, class }]

3. `app/api/admin/students/[index]/route.ts` — GET (admin JWT required)
   Return full student data: index, all results grouped by year/semester, semester GPAs, year GPAs, FGPA, class, pass/fail

### Admin Pages:

`app/admin/dashboard/page.tsx`:
- Stats cards: Total Students, Total Subjects, Results Entered, Students at Risk
- Quick actions: Upload PDF button, View Students button
- Recent uploads table with status badges (completed/failed/processing)
- Navigation sidebar with: Dashboard, Upload Results, Students, Logout

`app/admin/students/page.tsx`:
- Search bar (by index number)
- Data table: Index No. | Semesters with Data | Current FGPA | Class | Action
- "View Details" link for each student

`app/admin/students/[index]/page.tsx`:
- Student header: Index number, FGPA badge, Class badge, Pass/Fail badge
- Results accordion grouped by Year > Semester
- Each semester: table of Subject | Grade | Grade Point | Credits | Weighted GP
- Each semester shows Semester GPA at bottom
- Each year shows Year GPA
- Final FGPA calculation shown with the weighted formula breakdown

Use consistent layout with the same sidebar navigation from dashboard.
```

---

### PROMPT 5 — Student Portal

```
Continuing the GPA Calculator project.

## Task: Complete student portal

### API Routes:

1. `app/api/student/gpa/route.ts` — GET (student JWT required)
   - Get student index from JWT
   - Fetch all results with subject info (name, credits, semester, year)
   - Calculate: per-semester GPA, per-year GPA, FGPA
   - Return:
   {
     indexNumber,
     fgpa,
     class: string,
     isPassed: boolean,
     years: [
       {
         yearNumber,
         yearGPA,
         semesters: [
           {
             semesterNumber,
             semesterGPA,
             subjects: [{ name, code, grade, gradePoint, credits }]
           }
         ]
       }
     ]
   }

### Student Pages:

`app/student/dashboard/page.tsx`:
- Top section: Welcome header with index number
- GPA Hero card (large, prominent):
  - FGPA displayed in large bold text (e.g., "3.45")
  - Class badge: color-coded (Gold=First Class, Silver=Upper Second, Bronze=Lower Second, Green=Pass, Red=Fail)
  - Pass/Fail status with icon
  - Progress bar showing FGPA out of 4.00
- Academic Summary section — 3 stat cards:
  - Subjects Completed, Total Credits, Best Semester GPA
- Results section — Accordion grouped by Year:
  - Year header shows Year GPA
  - Each semester expandable: shows subject table (Name | Grade | GP | Credits)
  - Semester GPA shown at bottom of each semester table
  - Color-code grade badges: A grades=green, B grades=blue, C grades=yellow, D=orange, E/AB=red
- Recommendations section (see below)
- Navigation: header with logout button and change password link

### Recommendations Engine (static logic in the API):
Generate recommendation messages based on data:
- If any grade is E or AB: "⚠️ You have failed subjects. Consider applying for a repeat examination."
- If FGPA < 2.00: "🚨 Your FGPA is below 2.00. You must improve to be eligible for a degree certificate."
- If FGPA between 2.00-2.69: "📈 You are currently in Pass territory. Improving by [X] points would move you to Lower Second Class."
- If FGPA between 3.30-3.69: "⭐ You are in Upper Second Class. [X] more points would achieve First Class!"
- If FGPA >= 3.70: "🏆 Excellent! You are on track for First Class Honours. Keep it up!"
- If no results yet: "📋 No results have been uploaded yet. Check back later."

Make the student dashboard mobile-first, clean, and motivating. Use a university-appropriate blue/green color scheme.
```

---

### PROMPT 6 — Final Polish & Deployment Config

```
Continuing the GPA Calculator project. All features are built.

## Task: Deployment configuration and final polish

1. Generate `netlify.toml`:
   [build]
     command = "npm run build"
     publish = ".next"
   [[plugins]]
     package = "@netlify/plugin-nextjs"

2. Generate `next.config.ts` with:
   - output: 'standalone' option removed (Netlify handles it)
   - Any needed image domain config

3. Generate `.env.example` with all required env vars and descriptions

4. Generate `app/not-found.tsx` — branded 404 page

5. Generate `app/page.tsx` — Landing page with two portal buttons:
   - "Admin Portal" → /admin/login
   - "Student Portal" → /student/login
   - Department branding, simple and professional

6. Add loading.tsx files for major routes (admin/dashboard, student/dashboard)

7. Add error.tsx files with user-friendly messages

8. Generate README.md with:
   - Project overview
   - Local setup steps
   - Database migration steps (drizzle-kit push)
   - Neon setup guide
   - Netlify deployment steps
   - Default credentials (admin: admin/admin123, students: indexNo/123456789)
   - How to add first admin via seed script

9. Review and ensure:
   - All forms have proper validation
   - All API routes return consistent { success, data } or { error } shapes
   - Passwords are never returned in API responses
   - JWT cookie is httpOnly, Secure, SameSite=Strict
   - PDF file size is limited to 20MB server-side

Output the complete code for each file.
```

---

## 9. Setup & Deploy Checklist

```
□ 1. Create Neon project at neon.tech → copy DATABASE_URL
□ 2. Create Anthropic account → get API key
□ 3. npx create-next-app@latest gpa-calculator --typescript --tailwind --app
□ 4. Install dependencies (from package.json in Prompt 1)
□ 5. Add all .env.local values
□ 6. npx drizzle-kit push (runs schema against Neon)
□ 7. npx tsx db/seed.ts (creates admin + semesters)
□ 8. npm run dev — test locally
□ 9. Push to GitHub
□ 10. Connect GitHub repo to Netlify
□ 11. Add env vars in Netlify Site Settings → Environment Variables
□ 12. Deploy — Netlify auto-detects Next.js
```

---

## 10. My Recommendations for Extra Features

- **Email notifications** — notify students when new results are uploaded (Resend or Nodemailer)
- **Result dispute** — let students flag a result they believe is incorrect
- **GPA trend chart** — show semester-by-semester GPA progression using Recharts
- **Bulk student import** — CSV import of index numbers for pre-registration
- **PDF preview** — show the uploaded PDF alongside extracted results for admin verification
- **Audit log** — track who changed what result and when (important for academic integrity)
- **Export** — student can download their result sheet as PDF (using `react-pdf`)
- **Dark mode** — students appreciate this for late-night grade-checking
