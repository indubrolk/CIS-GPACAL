import { AdminSidebar } from "@/components/admin/AdminSidebar";

export default function AdminStudentsLoading() {
  return (
    <div className="min-h-screen bg-slate-950">
      <AdminSidebar />

      {/* Main Content Skeleton */}
      <main className="lg:ml-64 min-h-screen animate-pulse">
        <div className="px-4 sm:px-6 lg:px-8 py-8 pt-16 lg:pt-8 max-w-7xl mx-auto">
          {/* Header Skeleton */}
          <div className="mb-6 space-y-2">
            <div className="h-8 w-40 bg-slate-800 rounded-lg" />
            <div className="h-4 w-60 bg-slate-800/60 rounded" />
          </div>

          {/* Search and Filters Skeleton */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            {/* Search input placeholder */}
            <div className="h-10 w-full max-w-md bg-slate-800/60 rounded-lg" />

            {/* Filter buttons placeholder */}
            <div className="h-10 w-64 bg-slate-800/40 rounded-lg border border-slate-800" />
          </div>

          {/* Student Table Skeleton */}
          <div className="rounded-xl border border-slate-800/50 bg-slate-800/40 backdrop-blur-sm overflow-hidden">
            <div className="p-5 space-y-4">
              {/* Header row */}
              <div className="grid grid-cols-6 gap-4 pb-3 border-b border-slate-800">
                <div className="h-3.5 w-24 bg-slate-700/60 rounded" />
                <div className="h-3.5 w-20 bg-slate-700/60 rounded" />
                <div className="h-3.5 w-12 bg-slate-700/60 rounded" />
                <div className="h-3.5 w-24 bg-slate-700/60 rounded" />
                <div className="h-3.5 w-16 bg-slate-700/60 rounded" />
                <div className="h-3.5 w-12 ml-auto bg-slate-700/60 rounded" />
              </div>

              {/* Rows */}
              {[1, 2, 3, 4, 5, 6, 7, 8].map((row) => (
                <div key={row} className="grid grid-cols-6 gap-4 py-2 items-center border-b border-slate-800/20 last:border-0">
                  {/* Index Number */}
                  <div className="h-4 w-32 bg-slate-800/80 rounded" />
                  {/* Semesters completed */}
                  <div className="h-4 w-8 bg-slate-800/60 rounded" />
                  {/* FGPA */}
                  <div className="h-4 w-12 bg-slate-800/80 rounded font-semibold" />
                  {/* Class */}
                  <div className="h-6 w-36 bg-slate-800/50 rounded-full" />
                  {/* Status */}
                  <div className="h-6 w-16 bg-slate-800/50 rounded-full" />
                  {/* Action button */}
                  <div className="h-8 w-16 ml-auto bg-slate-800/60 rounded-lg" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
