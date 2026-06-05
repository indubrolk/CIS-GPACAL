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

// Delete All Dialog Component
function DeleteAllDialog({
  open,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  onConfirm: (deleteStudents: boolean) => void;
  onCancel: () => void;
}) {
  const [deleteStudents, setDeleteStudents] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  if (!open) return null;

  return (
    <dialog open className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-slate-800 rounded-xl p-6 w-96 shadow-2xl border border-red-500/30">
        <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
          <Trash2 className="text-red-500 h-5 w-5" />
          Reset Database
        </h3>
        <p className="text-sm text-slate-300 mb-4 leading-relaxed">
          Are you sure you want to delete <strong>ALL student results</strong> and <strong>upload logs</strong>? This action is irreversible.
        </p>
        
        {/* Checkbox option */}
        <label className="flex items-center space-x-3 mb-5 cursor-pointer text-slate-300 select-none">
          <input
            type="checkbox"
            checked={deleteStudents}
            onChange={(e) => setDeleteStudents(e.target.checked)}
            className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-red-600 focus:ring-red-500/50"
          />
          <span className="text-sm">Also delete all student accounts</span>
        </label>

        {/* Safety confirmation text field */}
        <div className="mb-6">
          <p className="text-xs text-slate-400 mb-1.5 font-medium">
            Type <span className="font-semibold text-red-400 select-all">DELETE</span> to confirm:
          </p>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="w-full h-9 bg-slate-900 border border-slate-700 rounded-lg px-3 text-sm text-white focus:outline-none focus:border-red-500 font-mono tracking-wider"
            placeholder="DELETE"
          />
        </div>

        <div className="flex justify-end space-x-2">
          <button
            onClick={() => {
              setDeleteStudents(false);
              setConfirmText("");
              onCancel();
            }}
            className="px-4 py-2 rounded-lg bg-slate-700 text-slate-200 hover:bg-slate-600 transition text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            disabled={confirmText !== "DELETE"}
            onClick={() => {
              onConfirm(deleteStudents);
              setDeleteStudents(false);
              setConfirmText("");
            }}
            className={`px-4 py-2 rounded-lg text-white text-xs font-semibold transition ${
              confirmText === "DELETE"
                ? "bg-red-600 hover:bg-red-500 shadow-lg shadow-red-600/20"
                : "bg-red-950/30 text-red-500/50 cursor-not-allowed border border-red-900/20"
            }`}
          >
            Delete Everything
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
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);

  const deleteAllResults = async (deleteStudents: boolean) => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/results/delete-all", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deleteStudents }),
      });
      if (!res.ok) throw new Error("Failed to delete all results");
      const data = await res.json();
      alert(
        `Database Reset Complete!\nDeleted ${data.deleted.results} results, ${data.deleted.uploads} uploads${
          deleteStudents ? `, and ${data.deleted.students} student accounts` : ""
        }.`
      );
      await fetchStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset database error");
    } finally {
      setDeleteAllOpen(false);
      setLoading(false);
    }
  };

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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
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

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-3 mb-8">
            <button
              onClick={() => router.push("/admin/upload")}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-medium shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all duration-200"
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
            <button
              onClick={() => setDeleteAllOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-950/45 hover:bg-red-900/60 border border-red-800/40 text-red-200 hover:text-white text-sm font-medium transition-all duration-200"
            >
              <Trash2 size={16} />
              Reset Database / Delete All Results
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
      {/* Delete All Confirmation Dialog */}
      <DeleteAllDialog
        open={deleteAllOpen}
        onConfirm={deleteAllResults}
        onCancel={() => setDeleteAllOpen(false)}
      />
    </div>
  );
}
