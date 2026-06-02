"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { ShieldCheck, Loader2, Eye, EyeOff } from "lucide-react";

export default function AdminLoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
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
        title: "Welcome back!",
        description: "Redirecting to dashboard…",
      });

      router.push(data.redirect);
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
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* ── Branding Header ─────────────────────────────────────────────── */}
      <header className="w-full py-6 px-4 text-center">
        <div className="inline-flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">C</span>
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-semibold text-white tracking-tight">
              Department of Computing
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 -mt-0.5">
              GPA Portal
            </p>
          </div>
        </div>
      </header>

      {/* ── Login Card ──────────────────────────────────────────────────── */}
      <main className="flex-1 flex items-center justify-center px-4 pb-12">
        <Card className="w-full max-w-md border-slate-700/50 bg-slate-800/60 backdrop-blur-xl shadow-2xl shadow-blue-500/5">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
              <ShieldCheck className="h-7 w-7 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-white">
              Admin Login
            </CardTitle>
            <CardDescription className="text-slate-400">
              Sign in to manage the GPA portal
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Username */}
              <div className="space-y-2">
                <Label
                  htmlFor="admin-username"
                  className="text-slate-300 text-sm"
                >
                  Username
                </Label>
                <Input
                  id="admin-username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                  disabled={isLoading}
                  className="h-11 bg-slate-700/50 border-slate-600/50 text-white placeholder:text-slate-500 focus-visible:ring-blue-500/50 focus-visible:border-blue-500/50 transition-colors"
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label
                  htmlFor="admin-password"
                  className="text-slate-300 text-sm"
                >
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="admin-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    disabled={isLoading}
                    className="h-11 pr-10 bg-slate-700/50 border-slate-600/50 text-white placeholder:text-slate-500 focus-visible:ring-blue-500/50 focus-visible:border-blue-500/50 transition-colors"
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

              {/* Submit */}
              <Button
                id="admin-login-submit"
                type="submit"
                disabled={isLoading}
                className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium shadow-lg shadow-blue-500/20 transition-all duration-200 hover:shadow-blue-500/30"
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

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="py-4 text-center text-xs text-slate-500">
        Department of Computing &amp; Information Systems
      </footer>
    </div>
  );
}
