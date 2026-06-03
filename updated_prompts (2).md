# Updated Prompts 3–6 — GPA Calculator

> **Context to paste at the top of EVERY prompt below:**
> ```
> Project: Next.js 14 (App Router, TypeScript), Tailwind CSS, shadcn/ui, Neon PostgreSQL,
> Drizzle ORM, JWT auth in httpOnly cookies. Hosted on Netlify.
> Phase 1 (schema, db, auth utils, middleware) and Phase 2 (auth API routes + login pages)
> are already complete and working.
> ```

---

## PROMPT 3 — PDF Upload with Free OCR (No Claude API)

```
Continuing the GPA Calculator project. Phases 1 and 2 are complete.

## Context about the result sheet PDF format (IMPORTANT):
- PDFs are scanned images produced by CamScanner — NOT selectable text PDFs
- Each PDF covers exactly ONE subject
- The header contains: subject code + name (e.g. "IS 2106 System Analysis & Design")
  and semester info (e.g. "Semster II(Proper -CIS) - Jun/Jul: 2025")
- The body has a 3-column layout, each column = Index Number | Grade pairs
- Index number format: 22FIS0447, 22CIS0123 — pattern: [2-digit year][2-3 letter code][4 digits]
- Valid grades: A+, A, A-, B+, B, B-, C+, C, C-, D+, D, E, AB
- No AI API is used — OCR + regex handles everything for free

## Packages to install first:
npm install tesseract.js pdfjs-dist

## Task: Build the following files completely

---

### 1. `lib/parsePDF.ts`

Export these types and functions:

```typescript
export interface ParsedResult {
  indexNumber: string;
  grade: string;
}

export interface ParsedSheet {
  subjectCodeFromHeader: string | null;
  subjectNameFromHeader: string | null;
  semesterFromHeader: string | null;
  results: ParsedResult[];
  totalFound: number;
}
```

Function `parseOCRText(rawText: string): ParsedSheet`:
- Use this regex to find all index+grade pairs (order matters — check longer matches first):
  `/(\d{2}[A-Z]{2,3}\d{4,5})\s+(A\+|A-|AB|A|B\+|B-|B|C\+|C-|C|D\+|D|E)\b/g`
- Deduplicate by index number (keep first occurrence)
- Extract subject code+name from header using:
  `/Code and Title of Paper\s*[:\-]\s*([A-Z]{2,3}\s*\d{3,4})\s+([^\n\r]+)/i`
- Extract semester info using:
  `/Sem(?:e?s?ter?)\s*(I{1,3}V?|[1-4])\s*\((Proper|Repeat)\s*[-–]\s*(CIS|FIS)\)/i`
- Return ParsedSheet with all extracted data

---

### 2. `lib/hooks/usePDFOCR.ts`

A React hook that runs the full OCR pipeline CLIENT-SIDE (no server needed).
Pipeline: PDF file → pdfjs-dist renders each page to canvas → Tesseract.js reads canvas → parseOCRText

```typescript
export type OCRStatus =
  | 'idle'
  | 'loading_pdf'
  | 'rendering'
  | 'ocr_page'
  | 'parsing'
  | 'done'
  | 'error';

export interface OCRProgress {
  status: OCRStatus;
  percent: number;
  currentPage: number;
  totalPages: number;
  statusMessage: string;
}
```

Hook: `usePDFOCR()` returns `{ processFile, progress, result, error, reset }`

Implementation details:
- Import pdfjs-dist and set worker:
  `pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'`
- For each page: `getViewport({ scale: 2.5 })` for high-res rendering
- Render to an offscreen canvas using `page.render({ canvasContext, viewport }).promise`
- Create a fresh Tesseract worker per page, language 'eng', then terminate after use
- Concatenate all pages' text, then call `parseOCRText`
- Status messages to show user:
  - loading_pdf: "Loading PDF..."
  - rendering: "Rendering page X of Y..."
  - ocr_page: "Reading text from page X of Y..."
  - parsing: "Extracting student results..."
  - done: "Found Z student results"
  - error: "OCR failed: [error message]"
- Calculate percent: rendering phase = 0–50%, ocr phase = 50–90%, parsing = 90–100%

---

### 3. `app/api/admin/subjects/route.ts`

GET (admin JWT required):
- Return all subjects joined with semester info
- Response: { subjects: [{ id, subjectCode, subjectName, creditPoints, yearNumber, semesterNumber, semesterLabel }] }

POST (admin JWT required):
- Body: { subjectCode: string, subjectName: string, creditPoints: number, yearNumber: number, semesterNumber: number }
- Normalize subjectCode: uppercase, remove spaces (IS 2106 → IS2106)
- Check if subjectCode already exists → if yes, return existing with { isNew: false }
- Find semester row by yearNumber+semesterNumber, create if missing
- Insert subject
- Return: { subject, isNew: boolean }

---

### 4. `app/api/admin/results/save/route.ts`

POST (admin JWT required):
Body:
```json
{
  "subjectId": 5,
  "uploadMeta": { "filename": "IS2106.pdf", "semesterLabel": "Year 2 Semester 1" },
  "students": [
    { "indexNumber": "22FIS0447", "grade": "B-" }
  ]
}
```

Logic per student:
1. Compute gradePoint from GRADE_POINTS map in lib/grades.ts
2. Upsert student: INSERT INTO students(index_number, password_hash, is_first_login)
   ON CONFLICT(index_number) DO NOTHING
   (use the pre-hashed default password '123456789' from auth.ts)
3. Check for existing result for this student+subject:
   - No existing: INSERT result normally
   - Existing AND new grade passes (grade != 'E' and grade != 'AB'):
     INSERT/UPDATE with is_repeat=true, grade_point=2.00 (award C per university repeat rule)
   - Existing AND new grade is E or AB: skip, keep old record
4. Log to pdf_uploads table with status='completed'
5. Return: { saved: number, created: number, skipped: number, errors: string[] }

---

### 5. `app/admin/upload/page.tsx`

A 4-step wizard. Show a step indicator (1→2→3→4) at the top throughout.

**Step 1 — Subject Details:**
Form fields:
- Subject Code (text input, uppercase automatically) — on blur, call GET /api/admin/subjects
  and check if this code already exists. Show green "✓ Existing subject — details pre-filled"
  or blue "New subject — please fill in details below"
- Subject Name (text input, pre-filled if existing)
- Credit Points (select: 1, 2, 3, 4 — pre-filled if existing)
- Year (select: Year 1, Year 2, Year 3, Year 4)
- Semester (select: Semester 1, Semester 2)
- Exam Type (radio: Proper / Repeat)
- "Next: Upload PDF →" button (disabled until all fields filled)

**Step 2 — Upload & OCR:**
- PDF drag-and-drop zone (dashed border, cloud icon, "Drop result sheet PDF here")
- Accept only PDF, max 20MB — validate on client
- On file drop/select: automatically call `processFile(file)` from usePDFOCR hook
- Show animated progress bar with live status message from OCRProgress
- If OCR detects a subject code in the header AND it doesn't match Step 1 input:
  show yellow warning: "⚠️ Header says [X] but you entered [Y]. Please verify."
- On done: automatically advance to Step 3
- Show "Try Again" button on error

**Step 3 — Review & Edit:**
Summary bar: "Found [N] students | [SubjectCode] [SubjectName] | [SemesterLabel] | [Proper/Repeat]"

Editable table columns: # | Index Number | Grade | Grade Point | Remove
- Grade column: dropdown showing all valid grades (A+, A, A-, B+, B, B-, C+, C, C-, D+, D, E, AB)
  Grade point column updates automatically when grade changes
- Index Number column: inline editable text (for OCR correction)
- Rows where index doesn't match pattern `\d{2}[A-Z]{2,3}\d{4,5}`:
  highlight in yellow, show ⚠️ icon, tooltip "Unusual index format — please verify"
- "＋ Add Row" button at bottom to manually add missed students
- Grade distribution summary below table: horizontal bar showing count per grade letter group
  (A grades: X, B grades: Y, C grades: Z, D grades: W, E/AB: V)
- "Save All Results →" button → opens confirmation dialog:
  "Save [N] results for [SubjectName]? This will create accounts for any new students."
  → "Confirm" button calls POST /api/admin/results/save

**Step 4 — Success:**
- Large green checkmark icon
- "Results Saved!" heading
- Stats: "[N] results saved", "[X] new student accounts created", "[Y] skipped (repeat/no improvement)"
- Two buttons: "Upload Another Subject" (→ Step 1, reset state) | "View Students" (→ /admin/students)

Use shadcn: Card, Input, Select, RadioGroup, Button, Progress, Table, Badge, Alert,
AlertDialog, Tooltip. Consistent blue/slate admin theme.
```

---

## PROMPT 4 — Admin Dashboard & Student Management

```
Continuing the GPA Calculator project. Phases 1, 2, and 3 are complete.
The upload, OCR parsing, and results saving are all working.

## Task: Build admin dashboard, student list, and student detail pages

---

### 1. `app/api/admin/dashboard/stats/route.ts` — GET (admin JWT required)

Query and return:
{
  totalStudents: number,
  totalSubjects: number,
  totalResults: number,
  recentUploads: [{ id, filename, status, processedCount, createdAt }],  // last 5
  studentsAtRisk: number  // students where calculated FGPA < 2.00 (exclude students with 0 results)
}

For studentsAtRisk: join students → results → subjects → semesters,
group by student, compute weighted FGPA per the formula in lib/grades.ts,
count those below 2.00.

---

### 2. `app/api/admin/students/route.ts` — GET (admin JWT required)

Query params: ?search=22FIS&page=1&limit=20

For each student, compute:
- semestersWithData: count of distinct semesters that have results
- fgpa: calculated Final GPA using calcFGPA from lib/grades.ts
- degreeClass: getClass(fgpa) from lib/grades.ts
- isPassed: isPass(results, fgpa) from lib/grades.ts

Return: { students: [...], total, page, totalPages }

---

### 3. `app/api/admin/students/[index]/route.ts` — GET (admin JWT required)

Return the full academic record for one student:
{
  indexNumber: string,
  fgpa: number,
  degreeClass: string,
  isPassed: boolean,
  years: [
    {
      yearNumber: number,
      yearGPA: number,
      semesters: [
        {
          semesterNumber: number,
          semesterLabel: string,
          semesterGPA: number,
          subjects: [
            {
              subjectCode: string,
              subjectName: string,
              creditPoints: number,
              grade: string,
              gradePoint: number,
              isRepeat: boolean,
              weightedGP: number  // gradePoint × creditPoints
            }
          ]
        }
      ]
    }
  ]
}

---

### 4. `components/admin/AdminSidebar.tsx`

Reusable sidebar for all admin pages. Links:
- 📊 Dashboard → /admin/dashboard
- 📤 Upload Results → /admin/upload
- 👥 Students → /admin/students
- 🚪 Logout (calls POST /api/auth/logout then redirects to /admin/login)

Highlight active link. Show university logo/name at top. Fixed on desktop, drawer on mobile.

---

### 5. `app/admin/dashboard/page.tsx`

Layout: AdminSidebar + main content

4 stat cards in a grid:
- 🎓 Total Students (blue)
- 📚 Total Subjects (green)
- 📋 Results Entered (purple)
- ⚠️ Students at Risk — FGPA < 2.00 (red, clickable → /admin/students?filter=at-risk)

Recent Uploads table: Filename | Status badge (green=completed, red=failed, yellow=processing) | Records | Date
Quick action buttons: "Upload New Results" | "Browse Students"

---

### 6. `app/admin/students/page.tsx`

Layout: AdminSidebar + main content

Search bar: filter by index number (live search, debounced 300ms)
Filter toggle: All | At Risk (FGPA < 2.00) | First Class | Pass Only

Data table columns:
Index Number | Subjects Done | FGPA | Class Badge | Pass/Fail Badge | Action

Class badge colors:
- First Class → gold/amber
- Second Class Upper → silver/slate
- Second Class Lower → bronze/orange  
- Pass → green
- Fail → red

"View" button on each row → /admin/students/[index]
Pagination controls at bottom.

---

### 7. `app/admin/students/[index]/page.tsx`

Layout: AdminSidebar + main content

Header card:
- Large index number heading
- FGPA badge (color-coded by class)
- Class label
- Pass/Fail chip with icon (✅ or ❌)

FGPA breakdown card:
- Show the formula: FGPA = (0.2 × Y1) + (0.2 × Y2) + (0.3 × Y3) + (0.3 × Y4)
- Fill in actual year GPA values with their weights
- Highlight which years have data vs missing

Academic record — Accordion grouped by Year:
- Year header: "Year [N]" + Year GPA badge
- Each semester is a collapsible panel inside the year:
  - Semester header: "Semester [N]" + Semester GPA
  - Table: Subject Code | Subject Name | Credits | Grade (colored badge) | GP | Credits × GP
  - Footer row: Total Credits | | Semester GPA

Grade badge colors:
- A+, A, A- → green
- B+, B, B- → blue
- C+, C, C- → yellow/amber
- D+, D → orange
- E, AB → red
- Repeat result → show 🔁 icon next to grade

Back button → /admin/students
```

---

## PROMPT 5 — Student Portal

```
Continuing the GPA Calculator project. Phases 1–4 are complete.

## Task: Build the complete student-facing portal

---

### 1. `app/api/student/gpa/route.ts` — GET (student JWT required)

Get indexNumber from JWT cookie.
Fetch all results for this student joined with subjects and semesters.

Compute:
- Per semester: semesterGPA using calcGPA from lib/grades.ts
- Per year: yearGPA using calcGPA across all subjects in that year
- FGPA: calcFGPA([{year, gpa}, ...]) from lib/grades.ts
- degreeClass: getClass(fgpa)
- isPassed: isPass(allResults, fgpa)

Return:
{
  indexNumber: string,
  fgpa: number,
  degreeClass: string,
  isPassed: boolean,
  totalSubjects: number,
  totalCredits: number,
  bestSemesterGPA: number,
  recommendations: string[],   // generated server-side (logic below)
  years: [
    {
      yearNumber: number,
      yearGPA: number,
      semesters: [
        {
          semesterNumber: number,
          semesterLabel: string,
          semesterGPA: number,
          subjects: [
            {
              subjectCode, subjectName, creditPoints,
              grade, gradePoint, isRepeat, weightedGP
            }
          ]
        }
      ]
    }
  ]
}

Recommendations logic (generate as array of strings):
- No results at all → ["📋 No results have been uploaded yet. Check back later."]
- Has E or AB grade → "⚠️ You have a failed subject ([code]). Consider applying for a repeat examination."
- FGPA < 2.00 → "🚨 Your FGPA is below the minimum 2.00. Improving is required to be eligible for a degree certificate."
- FGPA 2.00–2.69 → "📈 You are in Pass territory. You need [X] more points to reach Second Class (Lower Division)."
- FGPA 2.70–3.29 → "📘 You are in Second Class (Lower Division). [X] more points gets you to Upper Division."
- FGPA 3.30–3.69 → "⭐ You are in Second Class (Upper Division). Only [X] more points to First Class!"
- FGPA ≥ 3.70 → "🏆 Outstanding! You are on track for First Class Honours. Keep up the excellent work!"
- Calculate X values dynamically (round to 2dp).

---

### 2. `app/student/dashboard/page.tsx`

Mobile-first layout. No sidebar — use a top navbar with:
- Left: "GPA Portal" logo/name
- Right: student index number + dropdown (Change Password, Logout)

**Hero Section — GPA Card:**
A large, prominent card at the top. Show:
- "Your Final GPA" label
- FGPA in very large bold font (e.g. 3.45)
- Progress bar: fill = fgpa/4.00, color matches class
- Class badge (styled by tier):
  - First Class → gold gradient, ★ icon
  - Second Class Upper → silver, ▲ icon
  - Second Class Lower → bronze, ◆ icon
  - Pass → green, ✓ icon
  - Fail → red, ✗ icon
- Pass/Fail status text below the badge
- If no results yet: show placeholder card with "Awaiting results" message

**Summary Stats Row (3 cards):**
- Subjects Completed: [N]
- Total Credits Earned: [N]
- Best Semester GPA: [X.XX]

**Recommendations Section:**
- Heading: "📌 Academic Recommendations"
- Each recommendation in its own alert box, colored by type:
  - 🚨 danger → red alert
  - ⚠️ warning → yellow alert
  - 📈/📘/⭐ improvement → blue alert
  - 🏆 excellent → green alert

**Academic Results Section:**
- Heading: "📚 Results by Semester"
- Accordion grouped by Year (Year 1, Year 2, etc.)
  - Year header shows: "Year [N]  —  Year GPA: [X.XX]"
  - Inside each year: semester panels (collapsible)
    - Semester header: "Semester [N]  —  GPA: [X.XX]"
    - Table: Subject | Grade | GP | Credits
    - Grade shown as colored badge (same color scheme as admin portal)
    - Repeat results: show small "Repeat" chip next to grade
    - Footer: "Semester GPA: [X.XX] (based on [N] subjects, [C] credits)"

On load: show skeleton loader while fetching. If API returns error, show retry button.

---

### 3. `app/student/change-password/page.tsx`

If is_first_login = true (from JWT): show banner "Welcome! Please set a new password before continuing."
Form:
- Current Password (if not first login) or skip if first login
- New Password (min 8 characters, show strength indicator)
- Confirm New Password
- "Save Password" button
On success: redirect to /student/dashboard with toast "Password updated successfully"
```

---

## PROMPT 6 — Final Polish & Netlify Deployment

```
Continuing the GPA Calculator project. All core features (Phases 1–5) are complete.

## Task: Deployment config, polish, and finishing touches

---

### 1. `netlify.toml`
[build]
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"

[build.environment]
  NODE_VERSION = "20"

---

### 2. `next.config.ts`
- No standalone output (Netlify plugin handles it)
- Add this webpack config to handle pdfjs-dist and tesseract.js in Next.js:

```typescript
webpack: (config, { isServer }) => {
  if (isServer) {
    config.externals.push('canvas'); // tesseract.js canvas dep
  }
  config.resolve.alias.canvas = false;
  return config;
}
```

Also add to package.json scripts:
"db:push": "drizzle-kit push",
"db:seed": "tsx db/seed.ts",
"db:studio": "drizzle-kit studio"

---

### 3. `.env.example`
```
# Neon PostgreSQL connection string (get from neon.tech dashboard)
DATABASE_URL=postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require

# JWT secret — generate with: openssl rand -base64 32
JWT_SECRET=

# App display name
NEXT_PUBLIC_APP_NAME=Department GPA Calculator
NEXT_PUBLIC_UNIVERSITY_NAME=Sabaragamuwa University of Sri Lanka
NEXT_PUBLIC_FACULTY_NAME=Faculty of Computing
```

---

### 4. `app/page.tsx` — Landing Page

A clean, professional landing page:
- University name, faculty name, degree program name at top
- University crest/logo placeholder (circular)
- Two large portal buttons centered on page:
  - "Admin Portal" (blue, lock icon) → /admin/login
  - "Student Portal" (green, graduation cap icon) → /student/login
- Footer: "© [year] Faculty of Computing — Sabaragamuwa University of Sri Lanka"
- Mobile responsive

---

### 5. `app/not-found.tsx`
Branded 404 page with university name, message "Page not found", and a "Go Home" button.

---

### 6. Loading skeletons
- `app/admin/dashboard/loading.tsx` — skeleton for stat cards and table
- `app/admin/students/loading.tsx` — skeleton for search bar and table rows
- `app/student/dashboard/loading.tsx` — skeleton for GPA hero card and accordion

---

### 7. `app/error.tsx`
Global error boundary. Show friendly message, "Try Again" button, and support note.

---

### 8. Security review — verify ALL of these before finishing:
- All /admin/* API routes check JWT role === 'admin', return 401 otherwise
- All /student/* API routes check JWT role === 'student', return 401 otherwise
- JWT cookie set with: httpOnly: true, secure: true, sameSite: 'strict', path: '/'
- Passwords never appear in any API response body
- PDF upload validates file type (must be application/pdf) and size (max 20MB)
- All DB queries use parameterized Drizzle queries (no raw string interpolation)
- Student can only fetch their OWN results (index from JWT, not from request body)

---

### 9. `README.md`

Include:
## Setup
1. Clone the repo
2. Copy .env.example to .env.local and fill in values
3. Create a Neon project at neon.tech, copy the DATABASE_URL
4. npm install
5. npm run db:push   (creates tables in Neon)
6. npm run db:seed   (creates default admin + semesters)
7. npm run dev

## Default Credentials
- Admin: username = admin, password = admin123
- Students: index number as username, password = 123456789 (first login, must change)

## Deploying to Netlify
1. Push to GitHub
2. Connect repo in Netlify dashboard
3. Add env vars: DATABASE_URL, JWT_SECRET, NEXT_PUBLIC_APP_NAME,
   NEXT_PUBLIC_UNIVERSITY_NAME, NEXT_PUBLIC_FACULTY_NAME
4. Deploy — Netlify auto-detects Next.js via the plugin

## How to Upload Results
1. Log in as admin
2. Go to Upload Results
3. Fill in subject details (code, name, credits, year, semester)
4. Drop the scanned PDF result sheet
5. Wait for OCR to complete (~30 seconds per page)
6. Review extracted results, fix any OCR errors
7. Click Save

Output complete, working code for every file listed above.
```

---

## Quick Reference — Prompt Order

| # | Prompt | Status |
|---|--------|--------|
| 1 | Project setup, DB schema, grade utils, auth utils, middleware | ✅ Done |
| 2 | Auth API routes + login/change-password pages | ✅ Done |
| 3 | PDF OCR pipeline + subject/results API + upload wizard | ▶️ Run next |
| 4 | Admin dashboard + student list + student detail | ⏳ After 3 |
| 5 | Student portal dashboard + GPA display | ⏳ After 4 |
| 6 | Deployment config + polish + README | ⏳ Last |
