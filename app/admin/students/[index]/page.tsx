"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import {
  ArrowLeft,
  Loader2,
  ChevronDown,
  ChevronRight,
  Calculator,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface SubjectRecord {
  subjectCode: string;
  subjectName: string;
  creditPoints: number;
  grade: string;
  gradePoint: number;
  isRepeat: boolean;
  isGpa: boolean;
  weightedGP: number;
}

interface SemesterRecord {
  semesterNumber: number;
  semesterLabel: string;
  semesterGPA: number;
  subjects: SubjectRecord[];
}

interface YearRecord {
  yearNumber: number;
  yearGPA: number;
  semesters: SemesterRecord[];
}

interface StudentDetail {
  indexNumber: string;
  fgpa: number;
  degreeClass: string;
  isPassed: boolean;
  years: YearRecord[];
}

// ─── Year Weights ───────────────────────────────────────────────────────────

const YEAR_WEIGHTS: Record<number, number> = {
  1: 0.2,
  2: 0.2,
  3: 0.3,
  4: 0.3,
};

// ─── Grade Badge ────────────────────────────────────────────────────────────

function GradeBadge({
  grade,
  isRepeat,
}: {
  grade: string;
  isRepeat: boolean;
}) {
  let colorClasses = "bg-slate-500/10 text-slate-400 border-slate-500/20";

  if (["A+", "A", "A-"].includes(grade)) {
    colorClasses = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
  } else if (["B+", "B", "B-"].includes(grade)) {
    colorClasses = "bg-blue-500/10 text-blue-400 border-blue-500/20";
  } else if (["C+", "C", "C-"].includes(grade)) {
    colorClasses = "bg-amber-500/10 text-amber-400 border-amber-500/20";
  } else if (["D+", "D"].includes(grade)) {
    colorClasses = "bg-orange-500/10 text-orange-400 border-orange-500/20";
  } else if (["E", "AB"].includes(grade)) {
    colorClasses = "bg-red-500/10 text-red-400 border-red-500/20";
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold border ${colorClasses}`}
    >
      {isRepeat && <span title="Repeat">🔁</span>}
      {grade}
    </span>
  );
}

// ─── Class Color Helper ─────────────────────────────────────────────────────

function getClassColor(degreeClass: string) {
  switch (degreeClass) {
    case "First Class":
      return {
        bg: "bg-amber-500/15",
        text: "text-amber-400",
        border: "border-amber-500/30",
        glow: "shadow-amber-500/10",
      };
    case "Second Class (Upper Division)":
      return {
        bg: "bg-slate-500/15",
        text: "text-slate-300",
        border: "border-slate-400/30",
        glow: "shadow-slate-500/10",
      };
    case "Second Class (Lower Division)":
      return {
        bg: "bg-orange-500/15",
        text: "text-orange-400",
        border: "border-orange-500/30",
        glow: "shadow-orange-500/10",
      };
    case "Pass":
      return {
        bg: "bg-emerald-500/15",
        text: "text-emerald-400",
        border: "border-emerald-500/30",
        glow: "shadow-emerald-500/10",
      };
    default:
      return {
        bg: "bg-red-500/15",
        text: "text-red-400",
        border: "border-red-500/30",
        glow: "shadow-red-500/10",
      };
  }
}

// ─── Student Detail Page ────────────────────────────────────────────────────

export default function StudentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const indexNumber = decodeURIComponent(params.index as string);

  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openYears, setOpenYears] = useState<Set<number>>(new Set());
  const [openSemesters, setOpenSemesters] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function fetchStudent() {
      try {
        const res = await fetch(
          `/api/admin/students/${encodeURIComponent(indexNumber)}`,
          { cache: "no-store" }
        );
        if (!res.ok) {
          if (res.status === 404) throw new Error("Student not found");
          throw new Error("Failed to fetch student");
        }
        const data = await res.json();
        setStudent(data);
        // Auto-open all years and semesters
        setOpenYears(new Set(data.years.map((y: YearRecord) => y.yearNumber)));
        const semKeys = new Set<string>();
        data.years.forEach((y: YearRecord) => {
          y.semesters.forEach((s: SemesterRecord) => {
            semKeys.add(`${y.yearNumber}-${s.semesterNumber}`);
          });
        });
        setOpenSemesters(semKeys);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    }
    fetchStudent();
  }, [indexNumber]);

  const toggleYear = (year: number) => {
    setOpenYears((prev) => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });
  };

  const toggleSemester = (key: string) => {
    setOpenSemesters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const classColor = student ? getClassColor(student.degreeClass) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <AdminSidebar />

      <main className="lg:ml-64 min-h-screen">
        <div className="px-4 sm:px-6 lg:px-8 py-8 pt-16 lg:pt-8 max-w-5xl mx-auto">
          {/* ── Back Button ─────────────────────────────────────────── */}
          <button
            onClick={() => router.push("/admin/students")}
            className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white mb-6 transition-colors group"
          >
            <ArrowLeft
              size={16}
              className="group-hover:-translate-x-0.5 transition-transform"
            />
            Back to Students
          </button>

          {/* ── Loading ─────────────────────────────────────────────── */}
          {loading && (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 text-slate-400 animate-spin" />
            </div>
          )}

          {/* ── Error ───────────────────────────────────────────────── */}
          {error && (
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* ── Student Data ────────────────────────────────────────── */}
          {student && classColor && (
            <>
              {/* ── Header Card ──────────────────────────────────────── */}
              <div className="rounded-xl border border-slate-700/50 bg-slate-800/60 backdrop-blur-sm p-6 mb-6 relative overflow-hidden">
                {/* Glow */}
                <div
                  className={`absolute top-0 right-0 h-32 w-32 rounded-full blur-3xl opacity-15 ${classColor.bg}`}
                />

                <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                      Student Index
                    </p>
                    <h1 className="text-3xl font-bold text-white font-mono tracking-wide">
                      {student.indexNumber}
                    </h1>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {/* FGPA Badge */}
                    <div
                      className={`px-4 py-2 rounded-xl border ${classColor.bg} ${classColor.border} shadow-lg ${classColor.glow}`}
                    >
                      <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">
                        FGPA
                      </p>
                      <p className={`text-2xl font-bold ${classColor.text}`}>
                        {student.fgpa.toFixed(2)}
                      </p>
                    </div>

                    {/* Class Label */}
                    <span
                      className={`px-3 py-1.5 rounded-lg text-sm font-semibold border ${classColor.bg} ${classColor.text} ${classColor.border}`}
                    >
                      {student.degreeClass}
                    </span>

                    {/* Pass/Fail */}
                    {student.isPassed ? (
                      <span className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        ✅ Passed
                      </span>
                    ) : (
                      <span className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
                        ❌ Failed
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* ── FGPA Breakdown Card ──────────────────────────────── */}
              <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 backdrop-blur-sm p-5 mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <Calculator size={18} className="text-slate-400" />
                  <h2 className="text-base font-semibold text-white">
                    FGPA Breakdown
                  </h2>
                </div>

                {/* Formula */}
                <div className="bg-slate-900/60 rounded-lg p-4 mb-4 border border-slate-700/30">
                  <p className="text-xs text-slate-500 font-mono text-center">
                    FGPA = (0.2 × Y1) + (0.2 × Y2) + (0.3 × Y3) + (0.3 × Y4)
                  </p>
                </div>

                {/* Year values */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[1, 2, 3, 4].map((yearNum) => {
                    const yearData = student.years.find(
                      (y) => y.yearNumber === yearNum
                    );
                    const hasData = !!yearData;
                    const gpa = yearData?.yearGPA ?? 0;
                    const weight = YEAR_WEIGHTS[yearNum];
                    const weighted =
                      Math.round(gpa * weight * 100) / 100;

                    return (
                      <div
                        key={yearNum}
                        className={`rounded-lg p-3 border text-center transition-colors ${
                          hasData
                            ? "bg-slate-800/60 border-slate-700/50"
                            : "bg-slate-900/30 border-slate-800/30 opacity-50"
                        }`}
                      >
                        <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">
                          Year {yearNum} (×{weight})
                        </p>
                        <p
                          className={`text-xl font-bold ${
                            hasData ? "text-white" : "text-slate-600"
                          }`}
                        >
                          {hasData ? gpa.toFixed(2) : "—"}
                        </p>
                        {hasData && (
                          <p className="text-xs text-slate-500 mt-0.5">
                            = {weighted.toFixed(2)}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Total */}
                <div className="mt-3 text-right">
                  <span className="text-xs text-slate-500">
                    Total FGPA ={" "}
                  </span>
                  <span className={`text-sm font-bold ${classColor.text}`}>
                    {student.fgpa.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* ── Academic Record Accordion ────────────────────────── */}
              <div className="space-y-3">
                <h2 className="text-base font-semibold text-white mb-2">
                  Academic Record
                </h2>

                {student.years.map((year) => (
                  <div
                    key={year.yearNumber}
                    className="rounded-xl border border-slate-700/50 bg-slate-800/40 backdrop-blur-sm overflow-hidden"
                  >
                    {/* Year Header */}
                    <button
                      onClick={() => toggleYear(year.yearNumber)}
                      className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-700/20 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {openYears.has(year.yearNumber) ? (
                          <ChevronDown
                            size={16}
                            className="text-slate-400"
                          />
                        ) : (
                          <ChevronRight
                            size={16}
                            className="text-slate-400"
                          />
                        )}
                        <span className="text-sm font-semibold text-white">
                          Year {year.yearNumber}
                        </span>
                      </div>
                      <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        GPA: {year.yearGPA.toFixed(2)}
                      </span>
                    </button>

                    {/* Year Content */}
                    {openYears.has(year.yearNumber) && (
                      <div className="border-t border-slate-700/30 px-4 py-3 space-y-3">
                        {year.semesters.map((sem) => {
                          const semKey = `${year.yearNumber}-${sem.semesterNumber}`;
                          const isOpen = openSemesters.has(semKey);
                          const totalCredits = sem.subjects.reduce(
                            (sum, s) => sum + s.creditPoints,
                            0
                          );

                          return (
                            <div
                              key={semKey}
                              className="rounded-lg border border-slate-700/30 bg-slate-900/30 overflow-hidden"
                            >
                              {/* Semester Header */}
                              <button
                                onClick={() => toggleSemester(semKey)}
                                className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-800/50 transition-colors"
                              >
                                <div className="flex items-center gap-2">
                                  {isOpen ? (
                                    <ChevronDown
                                      size={14}
                                      className="text-slate-500"
                                    />
                                  ) : (
                                    <ChevronRight
                                      size={14}
                                      className="text-slate-500"
                                    />
                                  )}
                                  <span className="text-sm text-slate-300 font-medium">
                                    {sem.semesterLabel}
                                  </span>
                                </div>
                                <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-700/50 text-slate-300">
                                  GPA: {sem.semesterGPA.toFixed(2)}
                                </span>
                              </button>

                              {/* Semester Table */}
                              {isOpen && (
                                <div className="border-t border-slate-700/20 overflow-x-auto">
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr className="border-b border-slate-700/20">
                                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">
                                          Code
                                        </th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">
                                          Subject
                                        </th>
                                        <th className="px-4 py-2 text-center text-xs font-medium text-slate-500 uppercase">
                                          Credits
                                        </th>
                                        <th className="px-4 py-2 text-center text-xs font-medium text-slate-500 uppercase">
                                          Grade
                                        </th>
                                        <th className="px-4 py-2 text-center text-xs font-medium text-slate-500 uppercase">
                                          GP
                                        </th>
                                        <th className="px-4 py-2 text-center text-xs font-medium text-slate-500 uppercase">
                                          Credits × GP
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-700/15">
                                      {sem.subjects.map((subj, idx) => (
                                        <tr
                                          key={idx}
                                          className={`hover:bg-slate-800/30 transition-colors ${!subj.isGpa ? "opacity-70" : ""}`}
                                        >
                                          <td className="px-4 py-2 text-slate-300 font-mono text-xs">
                                            <div className="flex items-center gap-1.5">
                                              {subj.subjectCode}
                                              {!subj.isGpa && (
                                                <span className="text-[9px] px-1 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/25 font-semibold">
                                                  Non-GPA
                                                </span>
                                              )}
                                            </div>
                                          </td>
                                          <td className="px-4 py-2 text-slate-300 max-w-[180px] truncate">
                                            {subj.subjectName}
                                          </td>
                                          <td className="px-4 py-2 text-center text-slate-400">
                                            {subj.creditPoints}
                                          </td>
                                          <td className="px-4 py-2 text-center">
                                            <GradeBadge
                                              grade={subj.grade}
                                              isRepeat={subj.isRepeat}
                                            />
                                          </td>
                                          <td className="px-4 py-2 text-center text-slate-400">
                                            {subj.isGpa ? subj.gradePoint.toFixed(2) : "—"}
                                          </td>
                                          <td className="px-4 py-2 text-center text-slate-300 font-medium">
                                            {subj.isGpa ? subj.weightedGP.toFixed(2) : "—"}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                    {/* Footer */}
                                    <tfoot>
                                      <tr className="border-t border-slate-700/30 bg-slate-800/20">
                                        <td className="px-4 py-2 text-xs font-semibold text-slate-400">
                                          Total
                                        </td>
                                        <td></td>
                                        <td className="px-4 py-2 text-center text-xs font-semibold text-slate-300">
                                          {totalCredits}
                                        </td>
                                        <td></td>
                                        <td
                                          colSpan={2}
                                          className="px-4 py-2 text-right text-xs font-semibold text-blue-400"
                                        >
                                          Semester GPA:{" "}
                                          {sem.semesterGPA.toFixed(2)}
                                        </td>
                                      </tr>
                                    </tfoot>
                                  </table>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
