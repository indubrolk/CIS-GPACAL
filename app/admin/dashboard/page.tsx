"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import {
  GraduationCap,
  BookOpen,
  ClipboardList,
  AlertTriangle,
  Upload,
  Users,
  Loader2,
  FileText,
  ArrowRight,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface DashboardStats {
  totalStudents: number;
  totalSubjects: number;
  totalResults: number;
  studentsAtRisk: number;
  recentUploads: {
    id: number;
    filename: string;
    status: string;
    processedCount: number;
    createdAt: string;
  }[];
}

// ─── Stat Card ──────────────────────────────────────────────────────────────

function StatCard({
  title,
  value,
  icon: Icon,
  gradient,
  shadow,
  onClick,
  loading,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  gradient: string;
  shadow: string;
  onClick?: () => void;
  loading: boolean;
}) {
  const Wrapper = onClick ? "button" : "div";
  return (
    <Wrapper
      onClick={onClick}
      className={`
        relative overflow-hidden rounded-xl border border-slate-700/50
        bg-slate-800/60 backdrop-blur-sm p-5
        transition-all duration-300 hover:scale-[1.02] hover:border-slate-600/50
        ${onClick ? "cursor-pointer hover:shadow-lg" : ""}
        group text-left w-full
      `}
    >
      {/* Gradient glow background */}
      <div
        className={`absolute top-0 right-0 h-24 w-24 rounded-full blur-2xl opacity-20 group-hover:opacity-30 transition-opacity ${gradient}`}
      />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-400 mb-1">{title}</p>
          {loading ? (
            <div className="h-9 w-20 bg-slate-700/50 rounded animate-pulse" />
          ) : (
            <p className="text-3xl font-bold text-white tracking-tight">
              {value.toLocaleString()}
            </p>
          )}
        </div>
        <div
          className={`h-11 w-11 rounded-xl ${gradient} flex items-center justify-center shadow-lg ${shadow} flex-shrink-0`}
        >
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>

      {onClick && (
        <div className="mt-3 flex items-center text-xs text-slate-500 group-hover:text-slate-300 transition-colors">
          <span>View details</span>
          <ArrowRight size={12} className="ml-1 group-hover:translate-x-0.5 transition-transform" />
        </div>
      )}
    </Wrapper>
  );
}

// ─── Status Badge ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; dot: string }> = {
    completed: {
      bg: "bg-emerald-500/10",
      text: "text-emerald-400",
      dot: "bg-emerald-400",
    },
    failed: {
      bg: "bg-red-500/10",
      text: "text-red-400",
      dot: "bg-red-400",
    },
    processing: {
      bg: "bg-amber-500/10",
      text: "text-amber-400",
      dot: "bg-amber-400",
    },
    pending: {
      bg: "bg-slate-500/10",
      text: "text-slate-400",
      dot: "bg-slate-400",
    },
  };

  const c = config[status] || config.pending;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// ─── Dashboard Page ─────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/admin/dashboard/stats");
        if (!res.ok) throw new Error("Failed to fetch stats");
        const data = await res.json();
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <AdminSidebar />

      {/* ── Main Content ───────────────────────────────────────────────── */}
      <main className="lg:ml-64 min-h-screen">
        <div className="px-4 sm:px-6 lg:px-8 py-8 pt-16 lg:pt-8 max-w-7xl mx-auto">
          {/* ── Header ────────────────────────────────────────────────── */}
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              Dashboard
            </h1>
            <p className="text-slate-400 mt-1 text-sm">
              Overview of the GPA portal
            </p>
          </div>

          {/* ── Error State ───────────────────────────────────────────── */}
          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* ── Stat Cards ────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
            <StatCard
              title="Total Students"
              value={stats?.totalStudents ?? 0}
              icon={GraduationCap}
              gradient="bg-gradient-to-br from-blue-500 to-blue-600"
              shadow="shadow-blue-500/25"
              loading={loading}
            />
            <StatCard
              title="Total Subjects"
              value={stats?.totalSubjects ?? 0}
              icon={BookOpen}
              gradient="bg-gradient-to-br from-emerald-500 to-emerald-600"
              shadow="shadow-emerald-500/25"
              loading={loading}
            />
            <StatCard
              title="Results Entered"
              value={stats?.totalResults ?? 0}
              icon={ClipboardList}
              gradient="bg-gradient-to-br from-purple-500 to-purple-600"
              shadow="shadow-purple-500/25"
              loading={loading}
            />
            <StatCard
              title="Students at Risk"
              value={stats?.studentsAtRisk ?? 0}
              icon={AlertTriangle}
              gradient="bg-gradient-to-br from-red-500 to-red-600"
              shadow="shadow-red-500/25"
              onClick={() => router.push("/admin/students?filter=at-risk")}
              loading={loading}
            />
          </div>

          {/* ── Quick Actions ─────────────────────────────────────────── */}
          <div className="flex flex-wrap gap-3 mb-8">
            <button
              onClick={() => router.push("/admin/upload")}
              className="
                inline-flex items-center gap-2 px-4 py-2.5 rounded-lg
                bg-gradient-to-r from-blue-600 to-indigo-600
                hover:from-blue-500 hover:to-indigo-500
                text-white text-sm font-medium
                shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30
                transition-all duration-200
              "
            >
              <Upload size={16} />
              Upload New Results
            </button>
            <button
              onClick={() => router.push("/admin/students")}
              className="
                inline-flex items-center gap-2 px-4 py-2.5 rounded-lg
                bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50
                text-slate-300 hover:text-white text-sm font-medium
                transition-all duration-200
              "
            >
              <Users size={16} />
              Browse Students
            </button>
          </div>

          {/* ── Recent Uploads ────────────────────────────────────────── */}
          <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 backdrop-blur-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700/50 flex items-center gap-2">
              <FileText size={18} className="text-slate-400" />
              <h2 className="text-base font-semibold text-white">
                Recent Uploads
              </h2>
            </div>

            {loading ? (
              <div className="p-8 flex justify-center">
                <Loader2 className="h-6 w-6 text-slate-400 animate-spin" />
              </div>
            ) : !stats?.recentUploads?.length ? (
              <div className="p-8 text-center text-slate-500 text-sm">
                No uploads yet. Upload your first result sheet to get started.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700/50">
                      <th className="px-5 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                        Filename
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                        Records
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/30">
                    {stats.recentUploads.map((upload) => (
                      <tr
                        key={upload.id}
                        className="hover:bg-slate-700/20 transition-colors"
                      >
                        <td className="px-5 py-3.5 text-sm text-slate-300 font-medium max-w-[200px] truncate">
                          {upload.filename}
                        </td>
                        <td className="px-5 py-3.5">
                          <StatusBadge status={upload.status} />
                        </td>
                        <td className="px-5 py-3.5 text-sm text-slate-400">
                          {upload.processedCount}
                        </td>
                        <td className="px-5 py-3.5 text-sm text-slate-500">
                          {new Date(upload.createdAt).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            }
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
