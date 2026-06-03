# 🎓 GPA Calculator Portal

A full-stack, responsive GPA Calculator and Student Portal built using **Next.js 14 (App Router & TypeScript)**, **Tailwind CSS**, **shadcn/ui**, and **Neon PostgreSQL with Drizzle ORM**. It features an automated OCR pipeline for parsing results sheets, student management, and smart recommendations.

---
---

## 🚀 Features

### 👤 Student Portal
- **Dashboard**: Interactive display of final GPA, degree class honors tier, and pass/fail eligibility.
- **Detailed Results**: Expandable accordion view showing grade lists grouped by academic year and semester.
- **Smart Recommendations**: Dynamic hints generated using Anthropic Claude API advising students on repeats, credits, and GPA targets.
- **First-Time Password Change**: Forces students to set a secure password on their first login.

### 🛡️ Admin Portal
- **Dashboard**: Displays stats on total students, subjects, total result records, and at-risk students.
- **Browse Students**: Searchable list of students with pagination and filters (At Risk, First Class, Pass Only).
- **OCR PDF Upload Wizard**: 4-step wizard to upload computing department result sheet PDFs:
  1. Upload PDF file
  2. Parse details (Academic Year, Semester, Course Code, Credits)
  3. OCR/Text-Parsing extraction (Extracting Student Indices and Letter Grades)
  4. Review and Save directly into Neon PostgreSQL Database.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router, React 18, TypeScript)
- **Database**: Neon serverless PostgreSQL
- **ORM**: Drizzle ORM & Drizzle Kit
- **Styling**: Tailwind CSS & Lucide React
- **Auth**: JWT Session Cookies with `bcryptjs` hashing
- **AI/LLM**: Anthropic Claude SDK (for student recommendations)
- **PDF & OCR**: `pdfjs-dist` (client-side render) & `tesseract.js` (client-side OCR)

---

## 📦 Getting Started

### 1. Prerequisites
Ensure you have **Node.js (v18.x or v20.x)** and `npm` installed.

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Setup
Create a `.env` file in the root directory:
```env
# Database Connection
DATABASE_URL=postgresql://[user]:[password]@[neon-host]/[dbname]?sslmode=require

# Authentication JWT Secret
JWT_SECRET=your_super_secret_jwt_key_here

# Anthropic Claude API Key (Required for AI academic recommendations)
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

### 4. Database Schema Migrations & Seeding
Push the database schema to your Neon Database instance:
```bash
# Push schema structure
npm run db:push

# Seed default admin user and semesters
npm run db:seed
```

The database seeder initializes:
- **Default Admin Account**:
  - **Username**: `admin`
  - **Password**: `admin123`
- **Academic Semesters**: Years 1-4, Semesters 1-2.

### 5. Running the Application
Run the local Next.js development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to access the landing page.

---

## 🗃️ Database Commands

- `npm run db:push`: Pushes changes in `lib/schema.ts` directly to Neon.
- `npm run db:seed`: Seeds database with semesters and the default admin user.
- `npm run db:studio`: Opens Drizzle Studio to browse database tables in a GUI interface.

---

## 🌐 Netlify Deployment Config

The project is preconfigured for deployment on Netlify using the `@netlify/plugin-nextjs` plugin.

- **`netlify.toml`** specifies build settings and Node.js version 20 runtime.
- Environment variables (`DATABASE_URL`, `JWT_SECRET`, `ANTHROPIC_API_KEY`) must be added in the Netlify site dashboard under **Site configuration > Environment variables**.
