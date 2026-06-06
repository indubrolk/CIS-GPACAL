import { AdminSidebar } from "@/components/admin/AdminSidebar";

export default function AdminDashboardLoading() {
  return (
    <div className="min-h-screen bg-slate-950">
      <AdminSidebar />

      {/* Main Content Skeleton */}
      <main className="lg:ml-64 min-h-screen animate-pulse">
        <div className="px-4 sm:px-6 lg:px-8 py-8 pt-16 lg:pt-8 max-w-7xl mx-auto">
          {/* Header Skeleton */}
          <div className="mb-8 space-y-2">
            <div className="h-8 w-48 bg-slate-800 rounded-lg" />
            <div className="h-4 w-64 bg-slate-800/60 rounded" />
          </div>

          {/* Stat Cards Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-28 rounded-xl border border-slate-800 bg-slate-800/40 p-5 flex flex-col justify-between"
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="h-3.5 w-24 bg-slate-700/60 rounded" />
                    <div className="h-7 w-16 bg-slate-700 rounded" />
                  </div>
                  <div className="h-11 w-11 rounded-xl bg-slate-700/60" />
                </div>
              </div>
            ))}
          </div>

          {/* Quick Actions Skeleton */}
          <div className="flex gap-3 mb-8">
            <div className="h-10 w-44 bg-slate-800/80 rounded-lg" />
            <div className="h-10 w-40 bg-slate-800/80 rounded-lg" />
          </div>

          {/* Recent Uploads Table Skeleton */}
          <div className="rounded-xl border border-slate-850 bg-slate-800/20 overflow-hidden">
            {/* Table header skeleton */}
            <div className="px-5 py-4 border-b border-slate-800 flex items-center gap-3">
              <div className="h-5 w-5 bg-slate-800 rounded" />
              <div className="h-5 w-36 bg-slate-800 rounded" />
            </div>

            {/* Table content skeleton rows */}
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-4 gap-4 pb-2 border-b border-slate-800/50">
                <div className="h-3 w-24 bg-slate-800 rounded" />
                <div className="h-3 w-16 bg-slate-800 rounded" />
                <div className="h-3 w-12 bg-slate-800 rounded" />
                <div className="h-3 w-20 bg-slate-800 rounded" />
              </div>
              {[1, 2, 3].map((row) => (
                <div key={row} className="grid grid-cols-4 gap-4 py-1">
                  <div className="h-4 w-40 bg-slate-800/60 rounded" />
                  <div className="h-5 w-20 bg-slate-800/40 rounded-full" />
                  <div className="h-4 w-8 bg-slate-800/60 rounded" />
                  <div className="h-4 w-24 bg-slate-800/60 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
