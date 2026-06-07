"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import {
  User,
  GraduationCap,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Building2,
  BookOpen,
  Pencil,
  Save,
  X,
  ArrowLeft,
  Loader2,
  AlertCircle,
  RefreshCw,
  Shield,
  KeyRound,
  LogOut,
  ChevronDown,
  Hash,
  Clock,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface StudentProfile {
  id: number;
  indexNumber: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  dateOfBirth: string | null;
  faculty: string | null;
  department: string | null;
  isFirstLogin: boolean;
  createdAt: string;
}

// ─── Profile Field Component ────────────────────────────────────────────────

function ProfileField({
  icon: Icon,
  label,
  value,
  fieldKey,
  isEditing,
  editValues,
  onEditChange,
  type = "text",
  placeholder,
  readOnly = false,
}: {
  icon: React.ElementType;
  label: string;
  value: string | null;
  fieldKey: string;
  isEditing: boolean;
  editValues: Record<string, string>;
  onEditChange: (key: string, val: string) => void;
  type?: string;
  placeholder?: string;
  readOnly?: boolean;
}) {
  return (
    <div className="group relative">
      <div className="flex items-start gap-4 p-4 rounded-xl transition-all duration-200 hover:bg-slate-800/40">
        <div className="h-10 w-10 rounded-xl bg-slate-700/80 border border-slate-600/30 flex items-center justify-center shrink-0 mt-0.5 group-hover:border-emerald-500/30 transition-colors">
          <Icon className="h-4.5 w-4.5 text-slate-400 group-hover:text-emerald-400 transition-colors" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">
            {label}
          </p>
          {isEditing && !readOnly ? (
            <Input
              id={`profile-${fieldKey}`}
              type={type}
              value={editValues[fieldKey] ?? ""}
              onChange={(e) => onEditChange(fieldKey, e.target.value)}
              placeholder={placeholder || `Enter ${label.toLowerCase()}`}
              className="h-9 bg-slate-700/50 border-slate-600/50 text-white placeholder:text-slate-500 focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500/50 transition-colors text-sm"
            />
          ) : (
            <p className={`text-sm font-medium ${value ? "text-white" : "text-slate-600 italic"}`}>
              {value || "Not provided"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Skeleton Loader ────────────────────────────────────────────────────────

function ProfileSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header card */}
      <div className="rounded-2xl bg-slate-800/60 border border-slate-700/50 p-8">
        <div className="flex flex-col items-center gap-4">
          <div className="h-24 w-24 bg-slate-700 rounded-2xl" />
          <div className="h-6 w-48 bg-slate-700 rounded" />
          <div className="h-4 w-32 bg-slate-700 rounded" />
        </div>
      </div>
      {/* Fields card */}
      <div className="rounded-xl bg-slate-800/60 border border-slate-700/50 p-6 space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="h-10 w-10 bg-slate-700 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-20 bg-slate-700 rounded" />
              <div className="h-4 w-40 bg-slate-700 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Profile Component ─────────────────────────────────────────────────

export default function StudentProfilePage() {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/student/profile", { cache: "no-store" });
      if (!res.ok) {
        if (res.status === 401) {
          router.push("/student/login");
          return;
        }
        throw new Error("Failed to load profile");
      }
      const data = await res.json();
      setProfile(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // ── Edit mode handlers ─────────────────────────────────────────────────

  const startEditing = () => {
    if (!profile) return;
    setEditValues({
      fullName: profile.fullName || "",
      email: profile.email || "",
      phone: profile.phone || "",
      address: profile.address || "",
      dateOfBirth: profile.dateOfBirth || "",
      faculty: profile.faculty || "",
      department: profile.department || "",
    });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditValues({});
  };

  const handleEditChange = (key: string, val: string) => {
    setEditValues((prev) => ({ ...prev, [key]: val }));
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/student/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editValues),
      });

      const data = await res.json();

      if (!res.ok) {
        toast({
          variant: "destructive",
          title: "Update Failed",
          description: data.error || "Could not save profile.",
        });
        return;
      }

      setProfile(data);
      setIsEditing(false);
      setEditValues({});
      toast({
        title: "Profile Updated ✓",
        description: "Your details have been saved successfully.",
      });
    } catch {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Something went wrong. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      toast({ title: "Logged out", description: "You have been signed out." });
      router.push("/student/login");
    } catch {
      router.push("/student/login");
    }
  };

  // ── Derived data ───────────────────────────────────────────────────────

  const initials = profile?.fullName
    ? profile.fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : profile?.indexNumber?.slice(0, 2).toUpperCase() || "?";

  const joinDate = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  // Count completed profile fields
  const profileFields = profile
    ? [
        profile.fullName,
        profile.email,
        profile.phone,
        profile.address,
        profile.dateOfBirth,
        profile.faculty,
        profile.department,
      ]
    : [];
  const filledCount = profileFields.filter(Boolean).length;
  const completionPercent = Math.round((filledCount / 7) * 100);

  return (
    <div className="min-h-screen bg-slate-950">
      {/* ── Top Navbar ──────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 w-full border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Left: Logo + Back */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/student/dashboard")}
              className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </button>
            <div className="h-5 w-px bg-slate-700/50" />
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-emerald-600 flex items-center justify-center">
                <User className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="text-sm font-semibold text-white tracking-tight hidden sm:inline">
                My Profile
              </span>
            </div>
          </div>

          {/* Right: User dropdown */}
          <div className="relative">
            <button
              id="profile-menu-button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors text-sm text-slate-300"
            >
              <span className="font-mono text-xs sm:text-sm text-emerald-400">
                {profile?.indexNumber || "Loading…"}
              </span>
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform duration-200 ${menuOpen ? "rotate-180" : ""}`}
              />
            </button>

            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 mt-1 w-48 rounded-lg border border-slate-700/50 bg-slate-800 shadow-xl z-50 py-1 animate-in fade-in slide-in-from-top-1 duration-150">
                  <button
                    id="menu-dashboard"
                    onClick={() => {
                      setMenuOpen(false);
                      router.push("/student/dashboard");
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700/50 transition-colors"
                  >
                    <GraduationCap className="h-4 w-4" />
                    Dashboard
                  </button>
                  <button
                    id="menu-change-password"
                    onClick={() => {
                      setMenuOpen(false);
                      router.push("/student/change-password");
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700/50 transition-colors"
                  >
                    <KeyRound className="h-4 w-4" />
                    Change Password
                  </button>
                  <button
                    id="menu-logout"
                    onClick={() => {
                      setMenuOpen(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-400 hover:bg-slate-700/50 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Main Content ────────────────────────────────────────────────── */}
      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {loading ? (
          <ProfileSkeleton />
        ) : error ? (
          <Card className="border-slate-700/50 bg-slate-800/60">
            <CardContent className="flex flex-col items-center gap-4 py-12">
              <AlertCircle className="h-12 w-12 text-red-400" />
              <p className="text-slate-300 text-center">{error}</p>
              <Button
                id="retry-button"
                onClick={fetchProfile}
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : profile ? (
          <>
            {/* ── Profile Hero Card ──────────────────────────────────── */}
            <Card className="border-slate-700/50 bg-slate-800/60 backdrop-blur-xl shadow-2xl shadow-emerald-500/5 overflow-hidden relative">
              {/* Background gradient accent */}
              <div className="absolute top-0 left-0 right-0 h-32 bg-emerald-600/10 pointer-events-none" />
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

              <CardContent className="relative flex flex-col items-center gap-4 pt-10 pb-8 px-6">
                {/* Avatar */}
                <div className="relative">
                  <div className="h-24 w-24 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-xl shadow-emerald-500/25 ring-4 ring-slate-800/80">
                    <span className="text-3xl font-bold text-white">
                      {initials}
                    </span>
                  </div>
                  {/* Online indicator */}
                  <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-emerald-500 border-4 border-slate-800 flex items-center justify-center">
                    <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
                  </div>
                </div>

                {/* Name & Index */}
                <div className="text-center space-y-1.5">
                  <h1 className="text-2xl font-bold text-white">
                    {profile.fullName || "Student"}
                  </h1>
                  <div className="flex items-center gap-2 justify-center">
                    <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/25 font-mono text-xs px-2.5">
                      <Hash className="h-3 w-3 mr-1" />
                      {profile.indexNumber}
                    </Badge>
                  </div>
                </div>

                {/* Quick info chips */}
                <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
                  {profile.faculty && (
                    <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 bg-slate-700/50 px-3 py-1.5 rounded-full border border-slate-600/30">
                      <Building2 className="h-3 w-3" />
                      {profile.faculty}
                    </span>
                  )}
                  {profile.department && (
                    <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 bg-slate-700/50 px-3 py-1.5 rounded-full border border-slate-600/30">
                      <BookOpen className="h-3 w-3" />
                      {profile.department}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 bg-slate-700/30 px-3 py-1.5 rounded-full border border-slate-700/30">
                    <Clock className="h-3 w-3" />
                    Joined {joinDate}
                  </span>
                </div>

                {/* Profile completion bar */}
                <div className="w-full max-w-xs mt-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">
                      Profile Completion
                    </span>
                    <span className={`text-xs font-semibold ${completionPercent === 100 ? "text-emerald-400" : "text-slate-400"}`}>
                      {completionPercent}%
                    </span>
                  </div>
                  <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-700/50">
                    <div
                      className={`h-full transition-all duration-700 ease-out rounded-full ${
                        completionPercent === 100
                          ? "bg-emerald-400"
                          : completionPercent >= 50
                          ? "bg-emerald-500"
                          : "bg-amber-500"
                      }`}
                      style={{ width: `${completionPercent}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ── Profile Details Card ───────────────────────────────── */}
            <Card className="border-slate-700/50 bg-slate-800/60 backdrop-blur-xl">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                    <Shield className="h-4.5 w-4.5 text-emerald-400" />
                    Personal Information
                  </CardTitle>
                  <CardDescription className="text-slate-500 text-xs mt-1">
                    {isEditing
                      ? "Edit your personal details below"
                      : "View and manage your personal details"}
                  </CardDescription>
                </div>

                {!isEditing ? (
                  <Button
                    id="edit-profile-button"
                    onClick={startEditing}
                    variant="outline"
                    size="sm"
                    className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 hover:border-emerald-500/50 transition-all"
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1.5" />
                    Edit Profile
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button
                      id="cancel-edit-button"
                      onClick={cancelEditing}
                      variant="outline"
                      size="sm"
                      className="border-slate-600 text-slate-400 hover:bg-slate-700 hover:text-slate-300"
                      disabled={saving}
                    >
                      <X className="h-3.5 w-3.5 mr-1.5" />
                      Cancel
                    </Button>
                    <Button
                      id="save-profile-button"
                      onClick={saveProfile}
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                      disabled={saving}
                    >
                      {saving ? (
                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <Save className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      {saving ? "Saving…" : "Save Changes"}
                    </Button>
                  </div>
                )}
              </CardHeader>

              <CardContent className="pt-2">
                {/* Divider */}
                <div className="h-px bg-slate-700/50 mb-2" />

                <div className="space-y-1">
                  {/* Index Number (read-only) */}
                  <ProfileField
                    icon={Hash}
                    label="Index Number"
                    value={profile.indexNumber}
                    fieldKey="indexNumber"
                    isEditing={isEditing}
                    editValues={editValues}
                    onEditChange={handleEditChange}
                    readOnly
                  />

                  {/* Full Name */}
                  <ProfileField
                    icon={User}
                    label="Full Name"
                    value={profile.fullName}
                    fieldKey="fullName"
                    isEditing={isEditing}
                    editValues={editValues}
                    onEditChange={handleEditChange}
                    placeholder="e.g. John Doe"
                  />

                  {/* Email */}
                  <ProfileField
                    icon={Mail}
                    label="Email Address"
                    value={profile.email}
                    fieldKey="email"
                    isEditing={isEditing}
                    editValues={editValues}
                    onEditChange={handleEditChange}
                    type="email"
                    placeholder="e.g. john@example.com"
                  />

                  {/* Phone */}
                  <ProfileField
                    icon={Phone}
                    label="Phone Number"
                    value={profile.phone}
                    fieldKey="phone"
                    isEditing={isEditing}
                    editValues={editValues}
                    onEditChange={handleEditChange}
                    type="tel"
                    placeholder="e.g. +94 77 123 4567"
                  />

                  {/* Date of Birth */}
                  <ProfileField
                    icon={Calendar}
                    label="Date of Birth"
                    value={profile.dateOfBirth}
                    fieldKey="dateOfBirth"
                    isEditing={isEditing}
                    editValues={editValues}
                    onEditChange={handleEditChange}
                    type="date"
                  />

                  {/* Faculty */}
                  <ProfileField
                    icon={Building2}
                    label="Faculty"
                    value={profile.faculty}
                    fieldKey="faculty"
                    isEditing={isEditing}
                    editValues={editValues}
                    onEditChange={handleEditChange}
                    placeholder="e.g. Faculty of Applied Sciences"
                  />

                  {/* Department */}
                  <ProfileField
                    icon={BookOpen}
                    label="Department"
                    value={profile.department}
                    fieldKey="department"
                    isEditing={isEditing}
                    editValues={editValues}
                    onEditChange={handleEditChange}
                    placeholder="e.g. Computing & Information Systems"
                  />

                  {/* Address */}
                  <ProfileField
                    icon={MapPin}
                    label="Address"
                    value={profile.address}
                    fieldKey="address"
                    isEditing={isEditing}
                    editValues={editValues}
                    onEditChange={handleEditChange}
                    placeholder="e.g. 123 Main Street, Colombo"
                  />
                </div>
              </CardContent>
            </Card>

            {/* ── Quick Actions ──────────────────────────────────────── */}
            <Card className="border-slate-700/50 bg-slate-800/60 backdrop-blur-xl">
              <CardContent className="py-4 px-5">
                <div className="flex flex-wrap gap-3">
                  <Button
                    id="goto-dashboard"
                    onClick={() => router.push("/student/dashboard")}
                    variant="outline"
                    size="sm"
                    className="border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white"
                  >
                    <GraduationCap className="h-4 w-4 mr-2" />
                    View Dashboard
                  </Button>

                  <Button
                    id="goto-change-password"
                    onClick={() => router.push("/student/change-password")}
                    variant="outline"
                    size="sm"
                    className="border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white"
                  >
                    <KeyRound className="h-4 w-4 mr-2" />
                    Change Password
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        ) : null}
      </main>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="py-6 text-center text-xs text-slate-600 border-t border-slate-800/50 mt-8">
        Department of Computing &amp; Information Systems
      </footer>
    </div>
  );
}