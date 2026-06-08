import "dotenv/config";
import { db } from "@/lib/db";
import { subjects, semesters } from "@/lib/schema";
import { eq, and } from "drizzle-orm";

/**
 * Subject data with CORRECT year/semester mapping:
 *
 *  Absolute Sem 1 (Year 1, Sem 1) → IS1xxx  (Semester I)
 *  Absolute Sem 2 (Year 1, Sem 2) → IS2xxx  (Semester II)
 *  Absolute Sem 3 (Year 2, Sem 1) → IS3xxx  (Semester III)
 *  Absolute Sem 4 (Year 2, Sem 2) → IS4xxx  (Semester IV)
 *  Absolute Sem 5 (Year 3, Sem 1) → IS5xxx  (Semester V)
 *  Absolute Sem 6 (Year 3, Sem 2) → IS6xxx  (Semester VI)
 *  Absolute Sem 7 (Year 4, Sem 1) → IS7xxx  (Semester VII)
 *  Absolute Sem 8 (Year 4, Sem 2) → IS8xxx  (Semester VIII)
 */
const subjectData = [
  // ── Semester I  (Year 1, Sem 1) ──────────────────────────────────────────
  { subjectCode: "IS1101", subjectName: "Fundamentals of Information Systems",             creditPoints: 2, yearNumber: 1, semesterNumber: 1, isGpa: true },
  { subjectCode: "IS1102", subjectName: "Structured Programming Techniques",               creditPoints: 2, yearNumber: 1, semesterNumber: 1, isGpa: true },
  { subjectCode: "IS1103", subjectName: "Structured Programming Practicum",                creditPoints: 1, yearNumber: 1, semesterNumber: 1, isGpa: true },
  { subjectCode: "IS1104", subjectName: "Theories of Information Systems",                 creditPoints: 2, yearNumber: 1, semesterNumber: 1, isGpa: true },
  { subjectCode: "IS1105", subjectName: "Computer System Organization",                   creditPoints: 2, yearNumber: 1, semesterNumber: 1, isGpa: true },
  { subjectCode: "IS1106", subjectName: "Foundations of Web Technologies",                creditPoints: 2, yearNumber: 1, semesterNumber: 1, isGpa: true },
  { subjectCode: "IS1107", subjectName: "Personal Productivity with Information Technology", creditPoints: 1, yearNumber: 1, semesterNumber: 1, isGpa: true },
  { subjectCode: "IS1108", subjectName: "Fundamentals of Mathematics",                    creditPoints: 2, yearNumber: 1, semesterNumber: 1, isGpa: true },
  { subjectCode: "IS1109", subjectName: "Statistics & Probability Theory",                creditPoints: 2, yearNumber: 1, semesterNumber: 1, isGpa: true },
  { subjectCode: "IS1110", subjectName: "Communication Skills I",                         creditPoints: 0, yearNumber: 1, semesterNumber: 1, isGpa: false },
  { subjectCode: "IS1111", subjectName: "Academic Integrity",                              creditPoints: 0, yearNumber: 1, semesterNumber: 1, isGpa: false },
  { subjectCode: "IS-EGP-1101", subjectName: "General English I",                         creditPoints: 0, yearNumber: 1, semesterNumber: 1, isGpa: false },

  // ── Semester II  (Year 1, Sem 2) ─────────────────────────────────────────
  { subjectCode: "IS2101", subjectName: "Object Oriented Programming",                    creditPoints: 2, yearNumber: 1, semesterNumber: 2, isGpa: true },
  { subjectCode: "IS2102", subjectName: "Object Oriented Programming Practicum",          creditPoints: 1, yearNumber: 1, semesterNumber: 2, isGpa: true },
  { subjectCode: "IS2103", subjectName: "Emerging IS Technologies",                       creditPoints: 1, yearNumber: 1, semesterNumber: 2, isGpa: true },
  { subjectCode: "IS2104", subjectName: "Database Systems",                               creditPoints: 2, yearNumber: 1, semesterNumber: 2, isGpa: true },
  { subjectCode: "IS2105", subjectName: "Database Management Systems Practicum",          creditPoints: 1, yearNumber: 1, semesterNumber: 2, isGpa: true },
  { subjectCode: "IS2106", subjectName: "System Analysis & Design",                       creditPoints: 1, yearNumber: 1, semesterNumber: 2, isGpa: true },
  { subjectCode: "IS2107", subjectName: "Social & Professional Issues",                   creditPoints: 1, yearNumber: 1, semesterNumber: 2, isGpa: true },
  { subjectCode: "IS2108", subjectName: "Human Computer Interaction",                     creditPoints: 2, yearNumber: 1, semesterNumber: 2, isGpa: true },
  { subjectCode: "IS2109", subjectName: "Information Assurance & Security",               creditPoints: 2, yearNumber: 1, semesterNumber: 2, isGpa: true },
  { subjectCode: "IS2110", subjectName: "Software Project Initiation & Planning",         creditPoints: 1, yearNumber: 1, semesterNumber: 2, isGpa: true },
  { subjectCode: "IS2111", subjectName: "Advanced Mathematics",                           creditPoints: 2, yearNumber: 1, semesterNumber: 2, isGpa: true },
  { subjectCode: "IS2112", subjectName: "Communication Skills II",                        creditPoints: 0, yearNumber: 1, semesterNumber: 2, isGpa: false },
  { subjectCode: "IS-EGP-1201", subjectName: "General English II",                        creditPoints: 0, yearNumber: 1, semesterNumber: 2, isGpa: false },

  // ── Semester III  (Year 2, Sem 1) ────────────────────────────────────────
  { subjectCode: "IS3101", subjectName: "Object Oriented Analysis & Design",              creditPoints: 2, yearNumber: 2, semesterNumber: 1, isGpa: true },
  { subjectCode: "IS3102", subjectName: "Data Structures & Algorithms",                   creditPoints: 2, yearNumber: 2, semesterNumber: 1, isGpa: true },
  { subjectCode: "IS3103", subjectName: "IT Governance",                                  creditPoints: 2, yearNumber: 2, semesterNumber: 1, isGpa: true },
  { subjectCode: "IS3104", subjectName: "Software Engineering",                           creditPoints: 2, yearNumber: 2, semesterNumber: 1, isGpa: true },
  { subjectCode: "IS3105", subjectName: "IS Risk Management",                             creditPoints: 2, yearNumber: 2, semesterNumber: 1, isGpa: true },
  { subjectCode: "IS3106", subjectName: "IS Sustainability",                              creditPoints: 1, yearNumber: 2, semesterNumber: 1, isGpa: true },
  { subjectCode: "IS3107", subjectName: "Management Information Systems",                 creditPoints: 2, yearNumber: 2, semesterNumber: 1, isGpa: true },
  { subjectCode: "IS3108", subjectName: "E-Business",                                     creditPoints: 1, yearNumber: 2, semesterNumber: 1, isGpa: true },
  { subjectCode: "IS3109", subjectName: "Digital Innovation",                             creditPoints: 2, yearNumber: 2, semesterNumber: 1, isGpa: true },
  { subjectCode: "IS-EAP-2101", subjectName: "Academic English I",                        creditPoints: 0, yearNumber: 2, semesterNumber: 1, isGpa: false },

  // ── Semester IV  (Year 2, Sem 2) ─────────────────────────────────────────
  { subjectCode: "IS4101", subjectName: "IT Auditing",                                    creditPoints: 2, yearNumber: 2, semesterNumber: 2, isGpa: true },
  { subjectCode: "IS4102", subjectName: "Web Application Development",                    creditPoints: 2, yearNumber: 2, semesterNumber: 2, isGpa: true },
  { subjectCode: "IS4103", subjectName: "Operating Systems",                              creditPoints: 2, yearNumber: 2, semesterNumber: 2, isGpa: true },
  { subjectCode: "IS4104", subjectName: "System Administration and Maintenance",          creditPoints: 2, yearNumber: 2, semesterNumber: 2, isGpa: true },
  { subjectCode: "IS4105", subjectName: "IT Procurement Management",                      creditPoints: 1, yearNumber: 2, semesterNumber: 2, isGpa: true },
  { subjectCode: "IS4106", subjectName: "Software Architecture",                          creditPoints: 2, yearNumber: 2, semesterNumber: 2, isGpa: true },
  { subjectCode: "IS4107", subjectName: "Professionalism & Ethics in Computing",          creditPoints: 1, yearNumber: 2, semesterNumber: 2, isGpa: true },
  { subjectCode: "IS4108", subjectName: "IS Strategies",                                  creditPoints: 1, yearNumber: 2, semesterNumber: 2, isGpa: true },
  { subjectCode: "IS4109", subjectName: "Agile Software Development",                     creditPoints: 2, yearNumber: 2, semesterNumber: 2, isGpa: true },
  { subjectCode: "IS4110", subjectName: "Capstone Project",                               creditPoints: 2, yearNumber: 2, semesterNumber: 2, isGpa: true },
  { subjectCode: "IS-EAP-2201", subjectName: "Academic English II",                       creditPoints: 0, yearNumber: 2, semesterNumber: 2, isGpa: false },

  // ── Semester V  (Year 3, Sem 1) ──────────────────────────────────────────
  { subjectCode: "IS5101", subjectName: "Entrepreneurship & Innovation",                  creditPoints: 1, yearNumber: 3, semesterNumber: 1, isGpa: true },
  { subjectCode: "IS5102", subjectName: "Enterprise Architecture",                        creditPoints: 1, yearNumber: 3, semesterNumber: 1, isGpa: true },
  { subjectCode: "IS5103", subjectName: "High Performance Computing",                     creditPoints: 2, yearNumber: 3, semesterNumber: 1, isGpa: true },
  { subjectCode: "IS5104", subjectName: "Software Process Management",                    creditPoints: 1, yearNumber: 3, semesterNumber: 1, isGpa: true },
  { subjectCode: "IS5105", subjectName: "Business Process Management",                    creditPoints: 2, yearNumber: 3, semesterNumber: 1, isGpa: true },
  { subjectCode: "IS5106", subjectName: "UI/UX Practicum",                                creditPoints: 1, yearNumber: 3, semesterNumber: 1, isGpa: true },
  { subjectCode: "IS5107", subjectName: "Project Management Practicum",                   creditPoints: 1, yearNumber: 3, semesterNumber: 1, isGpa: true },
  { subjectCode: "IS5108", subjectName: "Business Intelligence",                          creditPoints: 2, yearNumber: 3, semesterNumber: 1, isGpa: true },
  { subjectCode: "IS5109", subjectName: "IS Project for Community",                       creditPoints: 1, yearNumber: 3, semesterNumber: 1, isGpa: true },
  { subjectCode: "IS5110", subjectName: "Advanced Database Systems",                      creditPoints: 2, yearNumber: 3, semesterNumber: 1, isGpa: true },
  { subjectCode: "IS5111", subjectName: "Data Communication & Networks",                  creditPoints: 2, yearNumber: 3, semesterNumber: 1, isGpa: true },
  { subjectCode: "IS5112", subjectName: "Design Patterns & Anti-patterns",                creditPoints: 2, yearNumber: 3, semesterNumber: 1, isGpa: true },
  { subjectCode: "IS5113", subjectName: "Software Quality Assurance",                     creditPoints: 2, yearNumber: 3, semesterNumber: 1, isGpa: true },
  { subjectCode: "IS5114", subjectName: "Data Mining & Analytics",                        creditPoints: 2, yearNumber: 3, semesterNumber: 1, isGpa: true },
  { subjectCode: "IS-EBP-3101", subjectName: "Business English",                          creditPoints: 0, yearNumber: 3, semesterNumber: 1, isGpa: false },

  // ── Semester VI  (Year 3, Sem 2) ─────────────────────────────────────────
  { subjectCode: "IS6101", subjectName: "Professional Practice",                          creditPoints: 6, yearNumber: 3, semesterNumber: 2, isGpa: true },

  // ── Semester VII  (Year 4, Sem 1) ────────────────────────────────────────
  { subjectCode: "IS7101", subjectName: "Research Methodologies",                         creditPoints: 2, yearNumber: 4, semesterNumber: 1, isGpa: true },
  { subjectCode: "IS7102", subjectName: "IT Law",                                         creditPoints: 1, yearNumber: 4, semesterNumber: 1, isGpa: true },
  { subjectCode: "IS7103", subjectName: "Business Process Simulation",                    creditPoints: 2, yearNumber: 4, semesterNumber: 1, isGpa: true },
  { subjectCode: "IS7104", subjectName: "Enterprise Modelling Ontologies",                creditPoints: 2, yearNumber: 4, semesterNumber: 1, isGpa: true },
  { subjectCode: "IS7105", subjectName: "Organizational Behavior & Management",           creditPoints: 1, yearNumber: 4, semesterNumber: 1, isGpa: true },
  { subjectCode: "IS7106", subjectName: "Cloud Computing",                                creditPoints: 2, yearNumber: 4, semesterNumber: 1, isGpa: true },
  { subjectCode: "IS7107", subjectName: "Mobile Application Development",                 creditPoints: 1, yearNumber: 4, semesterNumber: 1, isGpa: true },
  { subjectCode: "IS7108", subjectName: "Web Service Technologies",                       creditPoints: 2, yearNumber: 4, semesterNumber: 1, isGpa: true },
  { subjectCode: "IS7109", subjectName: "Geographical Information Systems",               creditPoints: 2, yearNumber: 4, semesterNumber: 1, isGpa: true },
  { subjectCode: "IS7110", subjectName: "Statistical Distribution & Inferences",          creditPoints: 1, yearNumber: 4, semesterNumber: 1, isGpa: true },
  { subjectCode: "IS7111", subjectName: "Advanced Programming Practicum",                 creditPoints: 1, yearNumber: 4, semesterNumber: 1, isGpa: true },
  { subjectCode: "IS7112", subjectName: "Machine Learning",                               creditPoints: 2, yearNumber: 4, semesterNumber: 1, isGpa: true },

  // ── Semester VIII  (Year 4, Sem 2) ───────────────────────────────────────
  { subjectCode: "IS8101", subjectName: "Research Project in IS",                         creditPoints: 8, yearNumber: 4, semesterNumber: 2, isGpa: true },
  { subjectCode: "IS8102", subjectName: "Business/IT Alignment",                          creditPoints: 2, yearNumber: 4, semesterNumber: 2, isGpa: true },
  { subjectCode: "IS8103", subjectName: "Human Resource Management",                      creditPoints: 2, yearNumber: 4, semesterNumber: 2, isGpa: true },
  { subjectCode: "IS8104", subjectName: "Scientific Communication",                       creditPoints: 1, yearNumber: 4, semesterNumber: 2, isGpa: true },
  { subjectCode: "IS8105", subjectName: "IS Economics",                                   creditPoints: 2, yearNumber: 4, semesterNumber: 2, isGpa: true },
  { subjectCode: "IS8106", subjectName: "Computer System Security",                       creditPoints: 2, yearNumber: 4, semesterNumber: 2, isGpa: true },
  { subjectCode: "IS8107", subjectName: "Supply Chain Management",                        creditPoints: 2, yearNumber: 4, semesterNumber: 2, isGpa: true },
  { subjectCode: "IS8108", subjectName: "Advanced Computer Networks",                     creditPoints: 2, yearNumber: 4, semesterNumber: 2, isGpa: true },
  { subjectCode: "IS8109", subjectName: "Process Mining",                                 creditPoints: 2, yearNumber: 4, semesterNumber: 2, isGpa: true },
  { subjectCode: "IS8110", subjectName: "Digital Business Model",                         creditPoints: 1, yearNumber: 4, semesterNumber: 2, isGpa: true },
  { subjectCode: "IS8111", subjectName: "Game Development",                               creditPoints: 2, yearNumber: 4, semesterNumber: 2, isGpa: true },
];

async function ensureSemester(yearNumber: number, semesterNumber: number) {
  const label = `Year ${yearNumber} - Semester ${semesterNumber}`;
  try {
    const [row] = await db
      .insert(semesters)
      .values({ yearNumber, semesterNumber, label })
      .returning({ id: semesters.id });
    return row.id;
  } catch {
    const existing = await db
      .select()
      .from(semesters)
      .where(and(eq(semesters.yearNumber, yearNumber), eq(semesters.semesterNumber, semesterNumber)))
      .limit(1);
    if (existing.length > 0) return existing[0].id;
    throw new Error(`Could not ensure semester Year ${yearNumber} Sem ${semesterNumber}`);
  }
}

async function seed() {
  console.log("Seeding subjects with correct year/semester mapping…");
  for (const sub of subjectData) {
    const semesterId = await ensureSemester(sub.yearNumber, sub.semesterNumber);
    const existing = await db
      .select()
      .from(subjects)
      .where(eq(subjects.subjectCode, sub.subjectCode))
      .limit(1);
    if (existing.length > 0) {
      // Update creditPoints, subjectName, and isGpa to match seed data
      const current = existing[0];
      if (
        current.creditPoints !== sub.creditPoints ||
        current.subjectName !== sub.subjectName ||
        current.isGpa !== sub.isGpa
      ) {
        await db
          .update(subjects)
          .set({
            creditPoints: sub.creditPoints,
            subjectName: sub.subjectName,
            isGpa: sub.isGpa,
          })
          .where(eq(subjects.subjectCode, sub.subjectCode));
        console.log(`Updated: ${sub.subjectCode} (credits: ${current.creditPoints} → ${sub.creditPoints})`);
      } else {
        console.log(`Skip (unchanged): ${sub.subjectCode}`);
      }
      continue;
    }
    await db.insert(subjects).values({
      subjectCode: sub.subjectCode,
      subjectName: sub.subjectName,
      creditPoints: sub.creditPoints,
      isGpa: sub.isGpa,
      semesterId,
    });
    console.log(`Inserted: ${sub.subjectCode}`);
  }
  console.log("Seeding complete.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
