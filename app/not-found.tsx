import Link from "next/link";
import { FileQuestion, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Spacer */}
      <div />

      {/* Main Content */}
      <main className="flex flex-col items-center justify-center px-4 text-center">
        {/* Logo/Icon container */}
        <div className="mb-6 h-20 w-20 rounded-2xl bg-gradient-to-br from-red-500 via-orange-500 to-amber-500 flex items-center justify-center shadow-2xl shadow-orange-500/20 animate-bounce">
          <FileQuestion className="h-10 w-10 text-white" />
        </div>

        {/* 404 Header */}
        <h1 className="text-7xl sm:text-8xl font-extrabold tracking-tight bg-gradient-to-r from-red-400 via-orange-400 to-amber-400 bg-clip-text text-transparent">
          404
        </h1>
        
        {/* Subtitle */}
        <h2 className="mt-4 text-xl sm:text-2xl font-semibold text-slate-200">
          Page Not Found
        </h2>
        
        {/* Description */}
        <p className="mt-2 text-sm sm:text-base text-slate-400 max-w-md">
          The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
        </p>

        {/* Action Button */}
        <div className="mt-8">
          <Link
            href="/"
            className="
              inline-flex items-center gap-2 px-6 py-3 rounded-xl
              bg-gradient-to-r from-blue-600 to-indigo-600
              hover:from-blue-500 hover:to-indigo-500
              text-white text-sm font-semibold
              shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30
              transition-all duration-200 hover:-translate-y-0.5
            "
          >
            <Home className="h-4 w-4" />
            Go Back Home
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-slate-600">
        © {new Date().getFullYear()} Department of Computing &amp; Information Systems
      </footer>
    </div>
  );
}
