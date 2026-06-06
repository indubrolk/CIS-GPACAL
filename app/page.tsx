"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { GraduationCap, Loader2, Eye, EyeOff, Info } from "lucide-react";

export default function Home() {
  const [indexNumber, setIndexNumber] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/student/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ indexNumber, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast({
          variant: "destructive",
          title: "Login Failed",
          description: data.error || "Invalid credentials",
        });
        return;
      }

      toast({
        title: "Welcome!",
        description: data.isFirstLogin
          ? "Please change your password to continue."
          : "Redirecting to your dashboard…",
      });

      router.push(
        data.isFirstLogin
          ? "/student/change-password?first=true"
          : data.redirect
      );
    } catch {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Something went wrong. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950">
      {/* ── Branding Header ─────────────────────────────────────────────── */}
      <header className="w-full py-6 px-4 text-center">
        <div className="inline-flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-emerald-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">C</span>
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-semibold text-white tracking-tight">
              Department of Computing & Information Systems
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 -mt-0.5">
              GPA Portal
            </p>
          </div>
        </div>
      </header>

      {/* ── Login Card ──────────────────────────────────────────────────── */}
      <main className="flex-1 flex items-center justify-center px-4 pb-12">
        <Card className="w-full max-w-md border-slate-700/50 bg-slate-800/60 backdrop-blur-xl shadow-2xl shadow-emerald-500/5">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <GraduationCap className="h-7 w-7 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-white">
              Student Login
            </CardTitle>
            <CardDescription className="text-slate-400">
              Sign in to view your GPA results
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Index Number */}
              <div className="space-y-2">
                <Label
                  htmlFor="student-index"
                  className="text-slate-300 text-sm"
                >
                  Index Number
                </Label>
                <Input
                  id="student-index"
                  type="text"
                  placeholder="e.g. CS/2021/001"
                  value={indexNumber}
                  onChange={(e) => setIndexNumber(e.target.value)}
                  required
                  autoComplete="username"
                  disabled={isLoading}
                  className="h-11 bg-slate-700/50 border-slate-600/50 text-white placeholder:text-slate-500 focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500/50 transition-colors"
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label
                  htmlFor="student-password"
                  className="text-slate-300 text-sm"
                >
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="student-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    disabled={isLoading}
                    className="h-11 pr-10 bg-slate-700/50 border-slate-600/50 text-white placeholder:text-slate-500 focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500/50 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* First-time login hint */}
              <div className="flex items-start gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3">
                <Info className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                <p className="text-xs text-emerald-300/90">
                  <span className="font-medium">First-time login?</span> Your
                  default password is{" "}
                  <code className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-200 font-mono text-[11px]">
                    123456789
                  </code>
                </p>
              </div>

              {/* Submit */}
              <Button
                id="student-login-submit"
                type="submit"
                disabled={isLoading}
                className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-lg shadow-emerald-500/20 transition-all duration-200 hover:shadow-emerald-500/30"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in…
                  </span>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>

      {/* ── Footer with subtle admin link ────────────────────────────────── */}
      <footer className="py-4 text-center text-xs text-slate-600">
        <p>
          © {new Date().getFullYear()} Department of Computing &amp; Information
          Systems
        </p>
        <Link
          href="/admin/login"
          className="mt-1 inline-block text-[10px] text-slate-700 hover:text-slate-400 transition-colors"
        >
          Admin Access
        </Link>
      </footer>
    </div>
  );
}
