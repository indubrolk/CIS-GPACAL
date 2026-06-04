"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  Users,
  Filter,
  RefreshCw,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface StudentRow {
  indexNumber: string;
  semestersWithData: number;
  fgpa: number;
  degreeClass: string;
  isPassed: boolean;
}

interface StudentsResponse {
  students: StudentRow[];
  total: number;
  page: number;
  totalPages: number;
}

// ─── Filter Config ──────────────────────────────────────────────────────────

const FILTERS = [
  { key: "", label: "All" },
  { key: "at-risk", label: "At Risk" },
  { key: "first-class", label: "First Class" },
  { key: "pass-only", label: "Pass Only" },
];

// ─── Class Badge ────────────────────────────────────────────────────────────

function ClassBadge({ degreeClass }: { degreeClass: string }) {
  const config: Record<string, { bg: string; text: string; border: string }> = {
    "First Class": {
      bg: "bg-amber-500/10",
      text: "text-amber-400",
      border: "border-amber-500/20",
    },
    "Second Class (Upper Division)": {
      bg: "bg-slate-500/10",
      text: "text-slate-300",
      border: "border-slate-500/20",
    },
    "Second Class (Lower Division)": {
      bg: "bg-orange-500/10",
      text: "text-orange-400",
      border: "border-orange-500/20",
    },
    Pass: {
      bg: "bg-emerald-500/10",
      text: "text-emerald-400",
      border: "border-emerald-500/20",
    },
    Fail: {
      bg: "bg-red-500/10",
      text: "text-red-400",
      border: "border-red-500/20",
    },
  };

  const c = config[degreeClass] || config.Fail;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${c.bg} ${c.text} ${c.border}`}
    >
      {degreeClass}
    </span>
  );
}

// ─── Pass/Fail Badge ────────────────────────────────────────────────────────

function PassBadge({ passed }: { passed: boolean }) {
  return passed ? (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
      ✅ Pass
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
      ❌ Fail
    </span>
  );
}

// ─── Inner Page Content (uses useSearchParams) ──────────────────────────────

function StudentsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [students, setStudents] = useState<StudentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [filter, setFilter] = useState(searchParams.get("filter") || "");
  const [page, setPage] = useState(
    parseInt(searchParams.get("page") || "1", 10)
  );

  // Debounce search
  const [debouncedSearch, setDebouncedSearch] = useState(search);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to page 1 on new search
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch students
  const fetchStudents = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (filter) params.set("filter", filter);
      params.set("page", page.toString());
      params.set("limit", "20");

      const res = await fetch(`/api/admin/students?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to fetch students");
      const data: StudentsResponse = await res.json();

      setStudents(data.students);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filter, page]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Reset page when filter changes
  useEffect(() => {
    setPage(1);
  }, [filter]);

  return (
    <>
      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Students</h1>
          <p className="text-slate-400 mt-1 text-sm">
            Browse and manage student records
          </p>
        </div>
        <button
          onClick={fetchStudents}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/50 text-slate-300 hover:text-white text-xs font-medium transition-all"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* ── Search & Filters ──────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
          />
          <input
            type="text"
            placeholder="Search by index number…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="
              w-full h-10 pl-9 pr-4 rounded-lg
              bg-slate-800/60 border border-slate-700/50
              text-sm text-white placeholder:text-slate-500
              focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40
              transition-all
            "
          />
        </div>

        {/* Filter Toggles */}
        <div className="flex items-center gap-1 bg-slate-800/40 rounded-lg p-1 border border-slate-700/50">
          <Filter size={14} className="text-slate-500 ml-2 mr-1 flex-shrink-0" />
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`
                px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200
                ${
                  filter === f.key
                    ? "bg-blue-600/20 text-blue-400 border border-blue-500/30"
                    : "text-slate-400 hover:text-white hover:bg-slate-700/50 border border-transparent"
                }
              `}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Error State ───────────────────────────────────────────── */}
      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* ── Data Table ────────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 backdrop-blur-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="h-6 w-6 text-slate-400 animate-spin" />
          </div>
        ) : students.length === 0 ? (
          <div className="p-12 text-center">
            <Users size={40} className="mx-auto text-slate-600 mb-3" />
            <p className="text-slate-400 text-sm">No students found</p>
            <p className="text-slate-600 text-xs mt-1">
              Try adjusting your search or filters
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Index Number
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Subjects Done
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    FGPA
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Class
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                {students.map((student) => (
                  <tr
                    key={student.indexNumber}
                    className="hover:bg-slate-700/20 transition-colors group"
                  >
                    <td className="px-5 py-3.5 text-sm text-white font-mono font-medium">
                      {student.indexNumber}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-slate-400">
                      {student.semestersWithData}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`text-sm font-semibold ${
                          student.fgpa >= 3.7
                            ? "text-amber-400"
                            : student.fgpa >= 2.0
                            ? "text-white"
                            : "text-red-400"
                        }`}
                      >
                        {student.fgpa.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <ClassBadge degreeClass={student.degreeClass} />
                    </td>
                    <td className="px-5 py-3.5">
                      <PassBadge passed={student.isPassed} />
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() =>
                          router.push(
                            `/admin/students/${encodeURIComponent(
                              student.indexNumber
                            )}`
                          )
                        }
                        className="
                          inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                          text-xs font-medium
                          text-blue-400 bg-blue-500/10 border border-blue-500/20
                          hover:bg-blue-500/20 hover:text-blue-300
                          transition-all duration-200
                          opacity-70 group-hover:opacity-100
                        "
                      >
                        <Eye size={13} />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Pagination ──────────────────────────────────────────── */}
        {!loading && totalPages > 1 && (
          <div className="px-5 py-3.5 border-t border-slate-700/50 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Showing {(page - 1) * 20 + 1}–
              {Math.min(page * 20, total)} of {total} students
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
              </button>

              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`
                      h-8 w-8 rounded-lg flex items-center justify-center text-xs font-medium transition-all
                      ${
                        page === pageNum
                          ? "bg-blue-600/20 text-blue-400 border border-blue-500/30"
                          : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                      }
                    `}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Students Page (with Suspense boundary for useSearchParams) ─────────────

export default function StudentsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <AdminSidebar />

      <main className="lg:ml-64 min-h-screen">
        <div className="px-4 sm:px-6 lg:px-8 py-8 pt-16 lg:pt-8 max-w-7xl mx-auto">
          <Suspense
            fallback={
              <div className="flex justify-center py-20">
                <Loader2 className="h-6 w-6 text-slate-400 animate-spin" />
              </div>
            }
          >
            <StudentsPageContent />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
