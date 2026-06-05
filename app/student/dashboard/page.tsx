"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import {
  GraduationCap,
  BookOpen,
  Award,
  TrendingUp,
  LogOut,
  KeyRound,
  ChevronDown,
  RefreshCw,
  Loader2,
  AlertCircle,
  Star,
  Triangle,
  Diamond,
  Check,
  X,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface SubjectResult {
  subjectCode: string;
  subjectName: string;
  creditPoints: number;
  grade: string;
  gradePoint: number;
  isRepeat: boolean;
  isGpa: boolean;
  weightedGP: number;
}

interface SemesterData {
  semesterNumber: number;
  semesterLabel: string;
  semesterGPA: number;
  subjects: SubjectResult[];
}

interface YearData {
  yearNumber: number;
  yearGPA: number;
  semesters: SemesterData[];
}

interface GPAResponse {
  indexNumber: string;
  fgpa: number;
  degreeClass: string;
  isPassed: boolean;
  totalSubjects: number;
  totalCredits: number;
  bestSemesterGPA: number;
  recommendations: string[];
  years: YearData[];
}

// ─── Grade Color Map ────────────────────────────────────────────────────────

function getGradeColor(grade: string): string {
  const colors: Record<string, string> = {
    "A+": "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    A: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    "A-": "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
    "B+": "bg-blue-500/20 text-blue-300 border-blue-500/30",
    B: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    "B-": "bg-blue-500/15 text-blue-400 border-blue-500/25",
    "C+": "bg-amber-500/20 text-amber-300 border-amber-500/30",
    C: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    "C-": "bg-amber-500/15 text-amber-400 border-amber-500/25",
    "D+": "bg-orange-500/20 text-orange-300 border-orange-500/30",
    D: "bg-orange-500/20 text-orange-300 border-orange-500/30",
    E: "bg-red-500/20 text-red-300 border-red-500/30",
    AB: "bg-red-500/20 text-red-300 border-red-500/30",
  };
  return colors[grade] || "bg-slate-500/20 text-slate-300 border-slate-500/30";
}

// ─── Grade Hint (inline advice per subject) ─────────────────────────────────

function getGradeHint(grade: string): { text: string; color: string } | null {
  // Must write again: D, E, AB (less than D+)
  if (grade === "D" || grade === "E" || grade === "AB") {
    return {
      text: grade === "D" ? "Have to write again" : grade === "E" ? "Failed — Write again" : "Absent — Write again",
      color: "bg-red-500/15 text-red-400 border-red-500/25",
    };
  }
  // Rewrite if you can: C-, D+
  if (grade === "C-" || grade === "D+") {
    return {
      text: "Rewrite if you can",
      color: "bg-amber-500/15 text-amber-400 border-amber-500/25",
    };
  }
  return null;
}

// ─── Class Tier Styling ─────────────────────────────────────────────────────

function getClassTier(degreeClass: string) {
  switch (degreeClass) {
    case "First Class":
      return {
        gradient: "from-amber-400 via-yellow-500 to-amber-600",
        bgGlow: "shadow-amber-500/20",
        textColor: "text-amber-400",
        progressColor: "bg-gradient-to-r from-amber-400 to-yellow-500",
        icon: <Star className="h-5 w-5" />,
        label: "★ First Class Honours",
      };
    case "Second Class (Upper Division)":
      return {
        gradient: "from-slate-300 via-gray-400 to-slate-500",
        bgGlow: "shadow-slate-400/20",
        textColor: "text-slate-300",
        progressColor: "bg-gradient-to-r from-slate-300 to-gray-400",
        icon: <Triangle className="h-5 w-5" />,
        label: "▲ Second Class (Upper)",
      };
    case "Second Class (Lower Division)":
      return {
        gradient: "from-orange-600 via-amber-700 to-orange-800",
        bgGlow: "shadow-orange-500/20",
        textColor: "text-orange-400",
        progressColor: "bg-gradient-to-r from-orange-500 to-amber-600",
        icon: <Diamond className="h-5 w-5" />,
        label: "◆ Second Class (Lower)",
      };
    case "Pass":
      return {
        gradient: "from-emerald-500 via-green-600 to-emerald-700",
        bgGlow: "shadow-emerald-500/20",
        textColor: "text-emerald-400",
        progressColor: "bg-gradient-to-r from-emerald-400 to-green-500",
        icon: <Check className="h-5 w-5" />,
        label: "✓ Pass",
      };
    case "Fail":
      return {
        gradient: "from-red-500 via-red-600 to-red-700",
        bgGlow: "shadow-red-500/20",
        textColor: "text-red-400",
        progressColor: "bg-gradient-to-r from-red-400 to-red-500",
        icon: <X className="h-5 w-5" />,
        label: "✗ Fail",
      };
    default:
      return {
        gradient: "from-slate-500 via-slate-600 to-slate-700",
        bgGlow: "shadow-slate-500/20",
        textColor: "text-slate-400",
        progressColor: "bg-slate-500",
        icon: <GraduationCap className="h-5 w-5" />,
        label: "Awaiting Results",
      };
  }
}

// ─── Recommendation Alert Variant ───────────────────────────────────────────

function getRecommendationVariant(
  text: string
): "destructive" | "warning" | "info" | "success" | "default" {
  if (text.startsWith("🚨")) return "destructive";
  if (text.startsWith("⚠️") || text.startsWith("💡")) return "warning";
  if (text.startsWith("📈") || text.startsWith("📘") || text.startsWith("⭐"))
    return "info";
  if (text.startsWith("🏆")) return "success";
  return "default";
}

// ─── Skeleton Loader ────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Hero card skeleton */}
      <div className="rounded-2xl bg-slate-800/60 border border-slate-700/50 p-8">
        <div className="flex flex-col items-center gap-4">
          <div className="h-4 w-32 bg-slate-700 rounded" />
          <div className="h-16 w-28 bg-slate-700 rounded" />
          <div className="h-3 w-full max-w-xs bg-slate-700 rounded-full" />
          <div className="h-8 w-48 bg-slate-700 rounded-full" />
          <div className="h-4 w-36 bg-slate-700 rounded" />
        </div>
      </div>
      {/* Stats row skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-xl bg-slate-800/60 border border-slate-700/50 p-5"
          >
            <div className="h-3 w-24 bg-slate-700 rounded mb-3" />
            <div className="h-8 w-16 bg-slate-700 rounded" />
          </div>
        ))}
      </div>
      {/* Recommendations skeleton */}
      <div className="space-y-3">
        <div className="h-5 w-56 bg-slate-700 rounded" />
        <div className="h-16 w-full bg-slate-700/50 rounded-lg" />
      </div>
      {/* Results skeleton */}
      <div className="space-y-3">
        <div className="h-5 w-48 bg-slate-700 rounded" />
        <div className="h-32 w-full bg-slate-700/50 rounded-lg" />
      </div>
    </div>
  );
}

// ─── Main Dashboard Component ───────────────────────────────────────────────

export default function StudentDashboardPage() {
  const [data, setData] = useState<GPAResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const fetchGPA = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/student/gpa", {
        cache: "no-store",
      });
      if (!res.ok) {
        if (res.status === 401) {
          router.push("/student/login");
          return;
        }
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || "Failed to fetch GPA data");
      }
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchGPA();
  }, [fetchGPA]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      toast({ title: "Logged out", description: "You have been signed out." });
      router.push("/student/login");
    } catch {
      router.push("/student/login");
    }
  };

  const hasResults = data && data.years.length > 0;
  const tier = data ? getClassTier(data.degreeClass) : getClassTier("N/A");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/30">
      {/* ── Top Navbar ──────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 w-full border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Left: Logo */}
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <GraduationCap className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-semibold text-white tracking-tight hidden sm:inline">
              GPA Portal
            </span>
          </div>

          {/* Right: User dropdown */}
          <div className="relative">
            <button
              id="user-menu-button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors text-sm text-slate-300"
            >
              <span className="font-mono text-xs sm:text-sm text-emerald-400">
                {data?.indexNumber || "Loading…"}
              </span>
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform duration-200 ${menuOpen ? "rotate-180" : ""}`}
              />
            </button>

            {menuOpen && (
              <>
                {/* Backdrop */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setMenuOpen(false)}
                />
                {/* Dropdown menu */}
                <div className="absolute right-0 mt-1 w-48 rounded-lg border border-slate-700/50 bg-slate-800 shadow-xl z-50 py-1 animate-in fade-in slide-in-from-top-1 duration-150">
                  <button
                    id="menu-change-password"
                    onClick={() => {
                      setMenuOpen(false);
                      router.push("/student/change-password");
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700/50 transition-colors"
                  >
                    <KeyRound className="h-4 w-4" />
                    Change Password
                  </button>
                  <button
                    id="menu-logout"
                    onClick={() => {
                      setMenuOpen(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-400 hover:bg-slate-700/50 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Main Content ────────────────────────────────────────────────── */}
      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {loading ? (
          <DashboardSkeleton />
        ) : error ? (
          /* ── Error State ──────────────────────────────────────────────── */
          <Card className="border-slate-700/50 bg-slate-800/60">
            <CardContent className="flex flex-col items-center gap-4 py-12">
              <AlertCircle className="h-12 w-12 text-red-400" />
              <p className="text-slate-300 text-center">{error}</p>
              <Button
                id="retry-button"
                onClick={fetchGPA}
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : data ? (
          <>
            {/* ── Page Header ────────────────────────────────────────── */}
            <div className="flex items-center justify-between pb-2">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white">Student Dashboard</h1>
                <p className="text-slate-400 text-xs sm:text-sm mt-0.5">Your academic performance overview</p>
              </div>
              <Button
                onClick={fetchGPA}
                variant="outline"
                size="sm"
                className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
                disabled={loading}
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>

            {/* ── Hero GPA Card ──────────────────────────────────────── */}
            {hasResults ? (
              <Card
                className={`border-slate-700/50 bg-slate-800/60 backdrop-blur-xl shadow-2xl ${tier.bgGlow} overflow-hidden`}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
                <CardContent className="relative flex flex-col items-center gap-5 py-8 px-6">
                  <p className="text-sm font-medium text-slate-400 uppercase tracking-wider">
                    Your Final GPA
                  </p>

                  {/* FGPA Number */}
                  <div className="relative">
                    <span
                      className={`text-6xl sm:text-7xl font-bold bg-gradient-to-r ${tier.gradient} bg-clip-text text-transparent`}
                    >
                      {data.fgpa.toFixed(2)}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full max-w-sm">
                    <div className="relative h-3 w-full overflow-hidden rounded-full bg-slate-700/50">
                      <div
                        className={`h-full ${tier.progressColor} transition-all duration-1000 ease-out rounded-full`}
                        style={{
                          width: `${Math.min(100, (data.fgpa / 4.0) * 100)}%`,
                        }}
                      />
                    </div>
                    <div className="flex justify-between mt-1.5 text-[10px] text-slate-500 font-mono">
                      <span>0.00</span>
                      <span>2.00</span>
                      <span>4.00</span>
                    </div>
                  </div>

                  {/* Class Badge */}
                  <div
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border bg-gradient-to-r ${tier.gradient} border-white/20 text-white font-semibold text-sm shadow-lg`}
                  >
                    {tier.icon}
                    {tier.label}
                  </div>

                  {/* Pass/Fail Status */}
                  <p
                    className={`text-sm font-medium ${data.isPassed ? "text-emerald-400" : "text-red-400"}`}
                  >
                    {data.isPassed
                      ? "✓ Eligible for Degree"
                      : "✗ Not Yet Eligible for Degree"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              /* ── No Results Placeholder Card ───────────────────────── */
              <Card className="border-slate-700/50 bg-slate-800/60 border-dashed">
                <CardContent className="flex flex-col items-center gap-4 py-12">
                  <div className="h-16 w-16 rounded-2xl bg-slate-700/50 flex items-center justify-center">
                    <GraduationCap className="h-8 w-8 text-slate-500" />
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-slate-300">
                      Awaiting Results
                    </p>
                    <p className="text-sm text-slate-500 mt-1">
                      Your results have not been uploaded yet. Check back later.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ── Summary Stats Row ──────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="border-slate-700/50 bg-slate-800/60 hover:bg-slate-800/80 transition-colors">
                <CardContent className="flex items-center gap-4 py-5 px-5">
                  <div className="h-10 w-10 rounded-xl bg-blue-500/15 flex items-center justify-center shrink-0">
                    <BookOpen className="h-5 w-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
                      Subjects Completed
                    </p>
                    <p className="text-2xl font-bold text-white mt-0.5">
                      {data.totalSubjects}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-700/50 bg-slate-800/60 hover:bg-slate-800/80 transition-colors">
                <CardContent className="flex items-center gap-4 py-5 px-5">
                  <div className="h-10 w-10 rounded-xl bg-purple-500/15 flex items-center justify-center shrink-0">
                    <Award className="h-5 w-5 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
                      Total Credits
                    </p>
                    <p className="text-2xl font-bold text-white mt-0.5">
                      {data.totalCredits}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-700/50 bg-slate-800/60 hover:bg-slate-800/80 transition-colors">
                <CardContent className="flex items-center gap-4 py-5 px-5">
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
                    <TrendingUp className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
                      Best Semester GPA
                    </p>
                    <p className="text-2xl font-bold text-white mt-0.5">
                      {data.bestSemesterGPA.toFixed(2)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ── Recommendations Section ────────────────────────────── */}
            {data.recommendations.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <span>📌</span> Academic Recommendations
                </h2>
                <div className="space-y-2.5">
                  {data.recommendations.map((rec, i) => (
                    <Alert
                      key={i}
                      variant={getRecommendationVariant(rec)}
                      className="border-slate-700/50 bg-slate-800/40"
                    >
                      <AlertDescription className="text-sm leading-relaxed">
                        {rec}
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              </section>
            )}

            {/* ── Academic Results Section ────────────────────────────── */}
            {hasResults && (
              <section>
                <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <span>📚</span> Results by Semester
                </h2>

                <Accordion
                  type="multiple"
                  defaultValue={data.years.map((y) => `year-${y.yearNumber}`)}
                  className="space-y-3"
                >
                  {data.years.map((year) => (
                    <AccordionItem
                      key={year.yearNumber}
                      value={`year-${year.yearNumber}`}
                      className="border border-slate-700/50 rounded-xl bg-slate-800/40 overflow-hidden px-0"
                    >
                      <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-slate-800/60 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-emerald-500/15 flex items-center justify-center text-sm font-bold text-emerald-400">
                            Y{year.yearNumber}
                          </div>
                          <div className="text-left">
                            <span className="text-white font-semibold text-sm">
                              Year {year.yearNumber}
                            </span>
                            <span className="text-slate-500 mx-2">—</span>
                            <span className="text-emerald-400 font-mono text-sm">
                              GPA: {year.yearGPA.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-5 pb-4 pt-0">
                        <div className="space-y-4">
                          {year.semesters.map((sem) => {
                            const semCredits = sem.subjects.reduce(
                              (sum, s) => sum + s.creditPoints,
                              0
                            );
                            return (
                              <div
                                key={sem.semesterNumber}
                                className="rounded-lg border border-slate-700/30 bg-slate-900/40 overflow-hidden"
                              >
                                {/* Semester header */}
                                <div className="px-4 py-3 border-b border-slate-700/30 bg-slate-800/30">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-slate-300">
                                      {sem.semesterLabel}
                                    </span>
                                    <span className="text-xs font-mono text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded-full">
                                      GPA: {sem.semesterGPA.toFixed(2)}
                                    </span>
                                  </div>
                                </div>

                                {/* Subject table */}
                                <div className="overflow-x-auto">
                                  <Table>
                                    <TableHeader>
                                      <TableRow className="border-slate-700/30 hover:bg-transparent">
                                        <TableHead className="text-slate-500 text-xs font-medium">
                                          Subject
                                        </TableHead>
                                        <TableHead className="text-slate-500 text-xs font-medium text-center w-20">
                                          Grade
                                        </TableHead>
                                        <TableHead className="text-slate-500 text-xs font-medium text-center w-16">
                                          GP
                                        </TableHead>
                                        <TableHead className="text-slate-500 text-xs font-medium text-center w-20">
                                          Credits
                                        </TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {sem.subjects.map((subj, idx) => (
                                        <TableRow
                                          key={idx}
                                          className={`border-slate-700/20 hover:bg-slate-800/30 ${!subj.isGpa ? "opacity-75" : ""}`}
                                        >
                                          <TableCell className="py-2.5">
                                            <div>
                                              <span className="text-sm text-white">
                                                {subj.subjectName}
                                              </span>
                                              <div className="flex items-center gap-1.5">
                                                <span className="text-[11px] text-slate-500 font-mono">
                                                  {subj.subjectCode}
                                                </span>
                                                {!subj.isGpa && (
                                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/25 font-semibold uppercase tracking-wider">
                                                    Non-GPA
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                          </TableCell>
                                          <TableCell className="text-center py-2.5">
                                            <div className="inline-flex flex-col items-center gap-1">
                                              <div className="inline-flex items-center gap-1.5">
                                                <Badge
                                                  className={`${getGradeColor(subj.grade)} border text-xs font-mono`}
                                                >
                                                  {subj.grade}
                                                </Badge>
                                                {subj.isRepeat && (
                                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/25 font-medium">
                                                    Repeat
                                                  </span>
                                                )}
                                              </div>
                                              {getGradeHint(subj.grade) && (
                                                <span className={`text-[9px] px-1.5 py-0.5 rounded border font-semibold ${getGradeHint(subj.grade)!.color}`}>
                                                  {getGradeHint(subj.grade)!.text}
                                                </span>
                                              )}
                                            </div>
                                          </TableCell>
                                          <TableCell className="text-center py-2.5 text-sm text-slate-300 font-mono">
                                            {subj.isGpa ? subj.gradePoint.toFixed(2) : "—"}
                                          </TableCell>
                                          <TableCell className="text-center py-2.5 text-sm text-slate-400">
                                            {subj.creditPoints}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                    <TableFooter className="border-slate-700/30 bg-slate-800/20">
                                      <TableRow className="hover:bg-transparent">
                                        <TableCell
                                          colSpan={4}
                                          className="text-xs text-slate-500 py-2.5"
                                        >
                                          Semester GPA:{" "}
                                          <span className="text-teal-400 font-mono font-medium">
                                            {sem.semesterGPA.toFixed(2)}
                                          </span>
                                          <span className="mx-2 text-slate-700">
                                            |
                                          </span>
                                          {sem.subjects.length} subjects
                                          <span className="mx-2 text-slate-700">
                                            |
                                          </span>
                                          {semCredits} credits
                                        </TableCell>
                                      </TableRow>
                                    </TableFooter>
                                  </Table>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </section>
            )}
          </>
        ) : null}
      </main>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="py-6 text-center text-xs text-slate-600 border-t border-slate-800/50 mt-8">
        Department of Computing &amp; Information Systems
      </footer>
    </div>
  );
}
