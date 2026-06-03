import { GraduationCap } from "lucide-react";

export default function StudentDashboardLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/30 text-white">
      {/* Navbar Skeleton */}
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

          {/* Right: User menu skeleton */}
          <div className="h-8 w-28 bg-slate-800 rounded-lg animate-pulse" />
        </div>
      </nav>

      {/* Main Content Skeleton */}
      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6 animate-pulse">
        {/* Hero Card Skeleton */}
        <div className="rounded-2xl bg-slate-800/60 border border-slate-700/50 p-8 shadow-2xl">
          <div className="flex flex-col items-center gap-4">
            <div className="h-4 w-32 bg-slate-700/60 rounded" />
            <div className="h-16 w-28 bg-slate-700 rounded" />
            <div className="h-3 w-full max-w-xs bg-slate-700/60 rounded-full" />
            <div className="h-9 w-48 bg-slate-700 rounded-full" />
            <div className="h-4 w-36 bg-slate-700/50 rounded" />
          </div>
        </div>

        {/* Stats Row Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-xl bg-slate-800/60 border border-slate-700/50 p-5 flex items-center gap-4"
            >
              <div className="h-10 w-10 rounded-xl bg-slate-700/60 shrink-0" />
              <div className="space-y-2">
                <div className="h-3 w-28 bg-slate-700/50 rounded" />
                <div className="h-6 w-12 bg-slate-700 rounded" />
              </div>
            </div>
          ))}
        </div>

        {/* Recommendations Section Skeleton */}
        <div className="space-y-3">
          <div className="h-5 w-56 bg-slate-800 rounded" />
          <div className="space-y-2.5">
            <div className="h-16 w-full bg-slate-800/40 rounded-xl border border-slate-800/50" />
            <div className="h-16 w-full bg-slate-800/40 rounded-xl border border-slate-800/50" />
          </div>
        </div>

        {/* Academic Results Section Skeleton */}
        <div className="space-y-3">
          <div className="h-5 w-48 bg-slate-800 rounded" />
          <div className="h-32 w-full bg-slate-800/40 rounded-xl border border-slate-800/50" />
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-slate-600 border-t border-slate-800/50 mt-8">
        Department of Computing &amp; Information Systems
      </footer>
    </div>
  );
}
