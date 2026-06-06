"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Unhandled error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-950 text-white">
      {/* Spacer */}
      <div />

      {/* Main Content */}
      <main className="flex flex-col items-center justify-center px-4 text-center">
        {/* Warning Icon Container */}
        <div className="mb-6 h-20 w-20 rounded-2xl bg-red-500 flex items-center justify-center shadow-2xl shadow-red-500/20">
          <AlertTriangle className="h-10 w-10 text-white" />
        </div>

        {/* Heading */}
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white">
          Something went wrong!
        </h1>

        {/* Subtitle / User Message */}
        <p className="mt-4 text-sm sm:text-base text-slate-400 max-w-md">
          An unexpected error occurred while loading this page. Our technical team has been notified.
        </p>

        {/* Optional Technical Details */}
        {error.message && (
          <div className="mt-4 max-w-lg p-3 rounded-lg border border-red-500/25 bg-red-950/20 text-red-300 text-xs font-mono break-all text-left">
            <span className="font-bold">Error:</span> {error.message}
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 items-center justify-center">
          <button
            onClick={() => reset()}
            className="
              inline-flex items-center gap-2 px-6 py-3 rounded-xl
              bg-blue-600
              hover:from-blue-500 hover:to-indigo-500
              text-white text-sm font-semibold
              shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30
              transition-all duration-200 hover:-translate-y-0.5
              w-full sm:w-auto justify-center
            "
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>

          <Link
            href="/"
            className="
              inline-flex items-center gap-2 px-6 py-3 rounded-xl
              bg-slate-800 hover:bg-slate-700 border border-slate-700/50
              text-slate-300 hover:text-white text-sm font-semibold
              transition-all duration-200 hover:-translate-y-0.5
              w-full sm:w-auto justify-center
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
