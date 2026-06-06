import Link from "next/link";
import { GraduationCap, ShieldCheck } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-950">
      {/* ── Hero Section ──────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16">
        {/* Logo */}
        <div className="mb-6 h-16 w-16 rounded-2xl bg-blue-600 flex items-center justify-center shadow-2xl shadow-blue-500/20">
          <span className="text-white font-bold text-2xl">C</span>
        </div>

        {/* Heading */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white text-center tracking-tight">
          GPA Calculator
        </h1>
        <p className="mt-3 text-sm sm:text-base text-slate-400 text-center max-w-md">
          Department of Computing &amp; Information Systems
        </p>

        {/* Divider */}
        <div className="mt-10 mb-8 w-16 h-px bg-slate-700" />

        {/* Login Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg">
          {/* Student Login */}
          <Link
            href="/student/login"
            className="group relative flex flex-col items-center gap-3 rounded-xl border border-slate-700/50 bg-slate-800/50 backdrop-blur-sm p-8 shadow-lg transition-all duration-300 hover:border-emerald-500/40 hover:bg-slate-800/80 hover:shadow-emerald-500/10 hover:-translate-y-0.5"
          >
            <div className="h-12 w-12 rounded-xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 transition-transform duration-300 group-hover:scale-110">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <span className="text-lg font-semibold text-white">Student</span>
            <span className="text-xs text-slate-500">View your GPA &amp; results</span>
          </Link>

          {/* Admin Login */}
          <Link
            href="/admin/login"
            className="group relative flex flex-col items-center gap-3 rounded-xl border border-slate-700/50 bg-slate-800/50 backdrop-blur-sm p-8 shadow-lg transition-all duration-300 hover:border-blue-500/40 hover:bg-slate-800/80 hover:shadow-blue-500/10 hover:-translate-y-0.5"
          >
            <div className="h-12 w-12 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20 transition-transform duration-300 group-hover:scale-110">
              <ShieldCheck className="h-6 w-6 text-white" />
            </div>
            <span className="text-lg font-semibold text-white">Admin</span>
            <span className="text-xs text-slate-500">Manage portal &amp; results</span>
          </Link>
        </div>
      </main>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="py-6 text-center text-xs text-slate-600">
        © {new Date().getFullYear()} Department of Computing &amp; Information
        Systems
      </footer>
    </div>
  );
}
