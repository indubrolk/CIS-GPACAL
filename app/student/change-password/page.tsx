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
import { KeyRound, Loader2, Eye, EyeOff, Check, X } from "lucide-react";

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  // ── Validation state ────────────────────────────────────────────────
  const isMinLength = newPassword.length >= 8;
  const passwordsMatch =
    newPassword.length > 0 &&
    confirmPassword.length > 0 &&
    newPassword === confirmPassword;
  const canSubmit =
    currentPassword.length > 0 && isMinLength && passwordsMatch && !isLoading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isMinLength) {
      toast({
        variant: "destructive",
        title: "Password too short",
        description: "New password must be at least 8 characters.",
      });
      return;
    }

    if (!passwordsMatch) {
      toast({
        variant: "destructive",
        title: "Passwords don't match",
        description: "Please make sure both passwords match.",
      });
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/student/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast({
          variant: "destructive",
          title: "Failed",
          description: data.error || "Could not change password.",
        });
        return;
      }

      toast({
        title: "Password Changed",
        description: "Your password has been updated successfully.",
      });

      router.push("/student/dashboard");
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
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-900">
      {/* ── Branding Header ─────────────────────────────────────────────── */}
      <header className="w-full py-6 px-4 text-center">
        <div className="inline-flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
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

      {/* ── Change Password Card ────────────────────────────────────────── */}
      <main className="flex-1 flex items-center justify-center px-4 pb-12">
        <Card className="w-full max-w-md border-slate-700/50 bg-slate-800/60 backdrop-blur-xl shadow-2xl shadow-amber-500/5">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/25">
              <KeyRound className="h-7 w-7 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-white">
              Change Password
            </CardTitle>
            <CardDescription className="text-slate-400">
              Please set a new password for your account
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Current Password */}
              <div className="space-y-2">
                <Label
                  htmlFor="current-password"
                  className="text-slate-300 text-sm"
                >
                  Current Password
                </Label>
                <div className="relative">
                  <Input
                    id="current-password"
                    type={showCurrent ? "text" : "password"}
                    placeholder="Enter current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    disabled={isLoading}
                    className="h-11 pr-10 bg-slate-700/50 border-slate-600/50 text-white placeholder:text-slate-500 focus-visible:ring-amber-500/50 focus-visible:border-amber-500/50 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                    tabIndex={-1}
                    aria-label={showCurrent ? "Hide password" : "Show password"}
                  >
                    {showCurrent ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div className="space-y-2">
                <Label
                  htmlFor="new-password"
                  className="text-slate-300 text-sm"
                >
                  New Password
                </Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showNew ? "text" : "password"}
                    placeholder="Min. 8 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    disabled={isLoading}
                    className="h-11 pr-10 bg-slate-700/50 border-slate-600/50 text-white placeholder:text-slate-500 focus-visible:ring-amber-500/50 focus-visible:border-amber-500/50 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                    tabIndex={-1}
                    aria-label={showNew ? "Hide password" : "Show password"}
                  >
                    {showNew ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label
                  htmlFor="confirm-password"
                  className="text-slate-300 text-sm"
                >
                  Confirm New Password
                </Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirm ? "text" : "password"}
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    disabled={isLoading}
                    className="h-11 pr-10 bg-slate-700/50 border-slate-600/50 text-white placeholder:text-slate-500 focus-visible:ring-amber-500/50 focus-visible:border-amber-500/50 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                    tabIndex={-1}
                    aria-label={showConfirm ? "Hide password" : "Show password"}
                  >
                    {showConfirm ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Validation indicators */}
              <div className="space-y-2 rounded-lg bg-slate-700/30 border border-slate-700/50 p-3">
                <div className="flex items-center gap-2">
                  {isMinLength ? (
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <X className="h-3.5 w-3.5 text-slate-500" />
                  )}
                  <span
                    className={`text-xs ${
                      isMinLength ? "text-emerald-400" : "text-slate-500"
                    }`}
                  >
                    At least 8 characters
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {passwordsMatch ? (
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <X className="h-3.5 w-3.5 text-slate-500" />
                  )}
                  <span
                    className={`text-xs ${
                      passwordsMatch ? "text-emerald-400" : "text-slate-500"
                    }`}
                  >
                    Passwords match
                  </span>
                </div>
              </div>

              {/* Submit */}
              <Button
                id="change-password-submit"
                type="submit"
                disabled={!canSubmit}
                className="w-full h-11 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-medium shadow-lg shadow-amber-500/20 transition-all duration-200 hover:shadow-amber-500/30 disabled:opacity-40 disabled:hover:shadow-amber-500/20"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Updating…
                  </span>
                ) : (
                  "Update Password"
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
