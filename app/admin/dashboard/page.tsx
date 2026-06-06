// app/admin/dashboard/page.tsx
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
  Trash2,
  RefreshCw,
} from "lucide-react";

// Confirmation Dialog Component
function ConfirmationDialog({
  open,
  title,
  message,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <dialog open className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-slate-800 rounded-lg p-6 w-96 shadow-xl">
        <h3 className="text-lg font-medium text-white mb-2">{title}</h3>
        <p className="text-sm text-slate-300 mb-4">{message}</p>
        <div className="flex justify-end space-x-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded bg-slate-600 text-slate-200 hover:bg-slate-500 transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-500 transition"
          >
            Delete
          </button>
        </div>
      </div>
    </dialog>
  );
}

// ─── Types ──────────────────────────────────────────────────────────────────
interface RecentUpload {
  id: number;
  filename: string;
  status: string;
  processedCount: number;
  createdAt: string;
}

interface DashboardStats {
  totalStudents: number;
  totalSubjects: number;
  totalResults: number;
  studentsAtRisk: number;
  recentUploads: RecentUpload[];
}

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  gradient: string;
  shadow: string;
  onClick?: () => void;
  loading: boolean;
}

// Stat Card Component
function StatCard({
  title,
  value,
  icon: Icon,
  gradient,
  shadow,
  onClick,
  loading,
}: StatCardProps) {
  const Wrapper = onClick ? "button" : "div";
  return (
    <Wrapper
      onClick={onClick}
      className={`relative overflow-hidden rounded-xl border border-slate-700/50
        bg-slate-800/60 backdrop-blur-sm p-5 transition-all duration-300 hover:scale-[1.02] hover:border-slate-600/50
        ${onClick ? "cursor-pointer hover:shadow-lg" : ""} group text-left w-full`}
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
        <div className={`h-11 w-11 rounded-xl ${gradient} flex items-center justify-center shadow-lg ${shadow} flex-shrink-0`}
        >
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
    </Wrapper>
  );
}

// ─── Status Badge ───────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; dot: string }> = {
    completed: { bg: "bg-emerald-500/10", text: "text-emerald-400", dot: "bg-emerald-400" },
    failed: { bg: "bg-red-500/10", text: "text-red-400", dot: "bg-red-400" },
    processing: { bg: "bg-amber-500/10", text: "text-amber-400", dot: "bg-amber-400" },
    pending: { bg: "bg-slate-500/10", text: "text-slate-400", dot: "bg-slate-400" },
  };
  const c = config[status] || config.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
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
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedUploadId, setSelectedUploadId] = useState<number | null>(null);

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/admin/dashboard/stats", {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to fetch stats");
      const data = await res.json();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const deleteUpload = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/uploads/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete upload");
      await fetchStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Deletion error");
    } finally {
      setConfirmOpen(false);
      setSelectedUploadId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <AdminSidebar />
      <main className="lg:ml-64 min-h-screen">
        <div className="px-4 sm:px-6 lg:px-8 py-8 pt-16 lg:pt-8 max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Dashboard</h1>
              <p className="text-slate-400 mt-1 text-sm">Overview of the GPA portal</p>
            </div>
            <button
              onClick={fetchStats}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/50 text-slate-300 hover:text-white text-xs font-medium transition-all"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          {/* Error State */}
          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
            <StatCard
              title="Total Students"
              value={stats?.totalStudents ?? 0}
              icon={GraduationCap}
              gradient="bg-blue-600"
              shadow="shadow-blue-500/25"
              loading={loading}
            />
            <StatCard
              title="Total Subjects"
              value={stats?.totalSubjects ?? 0}
              icon={BookOpen}
              gradient="bg-emerald-600"
              shadow="shadow-emerald-500/25"
              loading={loading}
            />
            <StatCard
              title="Results Entered"
              value={stats?.totalResults ?? 0}
              icon={ClipboardList}
              gradient="bg-purple-600"
              shadow="shadow-purple-500/25"
              loading={loading}
            />
            <StatCard
              title="Students at Risk"
              value={stats?.studentsAtRisk ?? 0}
              icon={AlertTriangle}
              gradient="bg-red-600"
              shadow="shadow-red-500/25"
              onClick={() => router.push("/admin/students?filter=at-risk")}
              loading={loading}
            />
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-3 mb-8">
            <button
              onClick={() => router.push("/admin/upload")}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all duration-200"
            >
              <Upload size={16} />
              Upload New Results
            </button>
            <button
              onClick={() => router.push("/admin/students")}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 text-slate-300 hover:text-white text-sm font-medium transition-all duration-200"
            >
              <Users size={16} />
              Browse Students
            </button>
          </div>

          {/* Recent Uploads */}
          <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 backdrop-blur-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700/50 flex items-center gap-2">
              <FileText size={18} className="text-slate-400" />
              <h2 className="text-base font-semibold text-white">Recent Uploads</h2>
            </div>
            {loading ? (
              <div className="p-8 flex justify-center">
                <Loader2 className="h-6 w-6 text-slate-400 animate-spin" />
              </div>
            ) : !stats?.recentUploads?.length ? (
              <div className="p-8 text-center text-slate-500 text-sm">No uploads yet. Upload your first result sheet to get started.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700/50">
                      <th className="px-5 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Filename</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Records</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Date</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/30">
                    {stats.recentUploads.map((upload) => (
                      <tr key={upload.id} className="hover:bg-slate-700/20 transition-colors">
                        <td className="px-5 py-3.5 text-sm text-slate-300 font-medium max-w-[200px] truncate">{upload.filename}</td>
                        <td className="px-5 py-3.5"><StatusBadge status={upload.status} /></td>
                        <td className="px-5 py-3.5 text-sm text-slate-400">{upload.processedCount}</td>
                        <td className="px-5 py-3.5 text-sm text-slate-500">
                          {new Date(upload.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </td>
                        <td className="px-5 py-3.5 flex space-x-2">
                          <button
                            onClick={() => { setSelectedUploadId(upload.id); setConfirmOpen(true); }}
                            className="text-red-500 hover:text-red-400 transition"
                            title="Delete upload"
                          >
                            <Trash2 size={18} />
                          </button>
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
      {/* Confirmation Dialog */}
      <ConfirmationDialog
        open={confirmOpen}
        title="Delete Result Sheet"
        message="Are you sure you want to delete this result sheet? This action cannot be undone."
        onConfirm={() => selectedUploadId && deleteUpload(selectedUploadId)}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
