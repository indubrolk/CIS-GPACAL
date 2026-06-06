"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Upload,
  Users,
  LogOut,
  Menu,
  X,
} from "lucide-react";

// ─── Navigation Links ───────────────────────────────────────────────────────

const NAV_LINKS = [
  {
    label: "Dashboard",
    href: "/admin/dashboard",
    icon: LayoutDashboard,
    emoji: "📊",
  },
  {
    label: "Upload Results",
    href: "/admin/upload",
    icon: Upload,
    emoji: "📤",
  },
  {
    label: "Students",
    href: "/admin/students",
    icon: Users,
    emoji: "👥",
  },
];

// ─── AdminSidebar ───────────────────────────────────────────────────────────

export function AdminSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/admin/login");
    } catch {
      setLoggingOut(false);
    }
  };

  const isActive = (href: string) => {
    if (href === "/admin/dashboard") {
      return pathname === "/admin/dashboard";
    }
    return pathname.startsWith(href);
  };

  // ── Sidebar Content ───────────────────────────────────────────────────

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* ── Branding ──────────────────────────────────────────────────── */}
      <div className="px-5 pt-6 pb-6 border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25 flex-shrink-0">
            <span className="text-white font-bold text-lg">C</span>
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-white truncate">
              Dept. of Computing
            </h1>
            <p className="text-xs text-slate-400 truncate">
              GPA Portal — Admin
            </p>
          </div>
        </div>
      </div>

      {/* ── Navigation ────────────────────────────────────────────────── */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_LINKS.map((link) => {
          const active = isActive(link.href);
          const Icon = link.icon;
          return (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={`
                group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                transition-all duration-200
                ${
                  active
                    ? "bg-blue-600/20 text-blue-400 border border-blue-500/20 shadow-sm shadow-blue-500/5"
                    : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                }
              `}
            >
              <Icon
                className={`h-4.5 w-4.5 flex-shrink-0 transition-colors ${
                  active
                    ? "text-blue-400"
                    : "text-slate-500 group-hover:text-slate-300"
                }`}
                size={18}
              />
              <span>{link.label}</span>
              {active && (
                <div className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
              )}
            </a>
          );
        })}
      </nav>

      {/* ── Logout ────────────────────────────────────────────────────── */}
      <div className="px-3 pb-4 pt-2 border-t border-slate-700/50">
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="
            w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
            text-slate-400 hover:text-red-400 hover:bg-red-500/10
            transition-all duration-200 disabled:opacity-50
          "
        >
          <LogOut size={18} className="flex-shrink-0" />
          <span>{loggingOut ? "Logging out…" : "Logout"}</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* ── Mobile Toggle Button ──────────────────────────────────────── */}
      <button
        onClick={() => setMobileOpen(true)}
        className="
          fixed top-4 left-4 z-50 lg:hidden
          h-10 w-10 rounded-lg bg-slate-800/90 backdrop-blur-sm border border-slate-700/50
          flex items-center justify-center
          text-slate-300 hover:text-white hover:bg-slate-700
          transition-all duration-200 shadow-lg
        "
        aria-label="Open navigation menu"
      >
        <Menu size={20} />
      </button>

      {/* ── Mobile Overlay ────────────────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Mobile Drawer ─────────────────────────────────────────────── */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-full w-64
          bg-slate-900/95 backdrop-blur-xl border-r border-slate-700/50
          transform transition-transform duration-300 ease-in-out
          lg:hidden
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
          aria-label="Close navigation menu"
        >
          <X size={18} />
        </button>
        <SidebarContent />
      </aside>

      {/* ── Desktop Sidebar ───────────────────────────────────────────── */}
      <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 bg-slate-900/80 backdrop-blur-xl border-r border-slate-700/50 z-30">
        <SidebarContent />
      </aside>
    </>
  );
}
