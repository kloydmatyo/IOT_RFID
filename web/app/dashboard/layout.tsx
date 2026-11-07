"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard, IdCard, ListChecks,
  LogOut, Wifi, WifiOff, ChevronLeft, ChevronRight,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useFirebaseConnection } from "@/hooks/useFirebase";
import { ToastProvider } from "@/components/Toast";
import LoadingSkeleton from "@/components/LoadingSkeleton";

/* Same palette as the teacher side */
const C = {
  bg: "#f8f9fb",
  surface: "#ffffff",
  border: "#eef0f3",
  text: "#111827",
  muted: "#6b7280",
  green: "#16a34a",
  greenSoft: "#ecfdf3",
  red: "#dc2626",
};

const NAV = [
  { href: "/dashboard",       icon: LayoutDashboard, label: "Dashboard"       },
  { href: "/dashboard/rfid",  icon: IdCard,          label: "RFID Management" },
  { href: "/dashboard/logs",  icon: ListChecks,      label: "Access Logs"     },
  // { href: "/dashboard/devices",  icon: Cpu,       label: "Device Monitor" },
  // { href: "/dashboard/reports",  icon: BarChart3, label: "Reports"        },
  // { href: "/dashboard/settings", icon: Settings,  label: "Settings"       },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router    = useRouter();
  const pathname  = usePathname();
  const connected = useFirebaseConnection();
  const [collapsed, setCollapsed] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  /* start collapsed on small screens */
  useEffect(() => {
    if (window.innerWidth < 768) setCollapsed(true);
  }, []);

  if (loading || !user) {
    return <LoadingSkeleton variant="dashboard-shell" />;
  }

  const isActive = (href: string) => (href === "/dashboard" ? pathname === href : pathname.startsWith(href));
  const email = user.email ?? "";
  const name = email.split("@")[0] || "Admin";
  const initial = (name[0] ?? "A").toUpperCase();

  async function handleSignOut() {
    setSigningOut(true);
    setSignOutError("");
    try {
      await logout();
      router.push("/login");
    } catch (error) {
      console.error("Failed to sign out.", error);
      setSignOutError("Sign out failed. Please try again.");
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <ToastProvider>
      <div className="flex min-h-screen" style={{ background: C.bg, fontFamily: "'Poppins', system-ui, sans-serif" }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');`}</style>

        {/* ============================ SIDEBAR ============================ */}
        <aside
          className="sticky top-0 h-screen flex flex-col shrink-0 transition-[width] duration-200"
          style={{
            width: collapsed ? 76 : 256,
            background: C.surface,
            borderRight: `1px solid ${C.border}`,
          }}
        >
          <div
            className="flex items-center gap-3 px-5 relative"
            style={{ height: 76, borderBottom: `1px solid ${C.border}` }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/gclogo.png" alt="Gordon College logo" className="w-9 h-9 rounded-full object-contain shrink-0" />
            {!collapsed && (
              <span className="min-w-0 flex-1 text-[11px] leading-tight font-bold tracking-tight" style={{ color: C.text }}>
                RFID-BASED STUDENT ATTENDANCE MONITORING
              </span>
            )}
            <button
              onClick={() => setCollapsed(v => !v)}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="absolute -right-3 top-[64px] w-6 h-6 rounded-full flex items-center justify-center"
              style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.green }}
            >
              {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
            </button>
          </div>

          <nav className="flex-1 px-3 pt-6 space-y-1 overflow-y-auto">
            {NAV.map(({ href, icon: Icon, label }) => {
              const active = isActive(href);
              return (
                <Link
                  key={href}
                  href={href}
                  title={label}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-left"
                  style={{
                    background: active ? C.greenSoft : "transparent",
                    color: active ? C.green : C.muted,
                    borderLeft: active ? `3px solid ${C.green}` : "3px solid transparent",
                  }}
                >
                  <Icon className="w-[18px] h-[18px] shrink-0" />
                  {!collapsed && <span>{label}</span>}
                </Link>
              );
            })}
          </nav>

          <div style={{ borderTop: `1px solid ${C.border}` }}>
            {/* Firebase connection status */}
            <div
              className="flex items-center gap-2 px-5 pt-4 text-xs font-medium"
              style={{ color: connected ? C.green : C.red }}
              title={connected ? "Firebase connected" : "Disconnected"}
            >
              {connected ? <Wifi className="w-3.5 h-3.5 shrink-0" /> : <WifiOff className="w-3.5 h-3.5 shrink-0" />}
              {!collapsed && <span>{connected ? "Firebase connected" : "Disconnected"}</span>}
            </div>

            <div className="flex items-center gap-3 px-5 py-4">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold text-white shrink-0"
                style={{ background: C.green }}
              >
                {initial}
              </div>
              {!collapsed && (
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: C.text }}>{name}</p>
                  <p className="text-[11px] font-medium uppercase truncate" style={{ color: C.muted }}>Admin</p>
                </div>
              )}
            </div>
            <div className="px-3 pb-4" style={{ borderTop: `1px solid ${C.border}` }}>
              <button
                onClick={() => setConfirmSignOut(true)}
                title="Sign out"
                className="w-full flex items-center gap-3 px-3 py-2.5 mt-2 rounded-lg text-sm font-medium"
                style={{ color: C.red }}
              >
                <LogOut className="w-[18px] h-[18px] shrink-0" />
                {!collapsed && <span>Sign out</span>}
              </button>
            </div>
          </div>
        </aside>

        {confirmSignOut && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            style={{ background: "rgba(17,24,39,.45)" }}
            onClick={() => {
              if (!signingOut) {
                setConfirmSignOut(false);
                setSignOutError("");
              }
            }}
          >
            <div
              className="w-full max-w-sm rounded-2xl p-6"
              style={{ background: C.surface }}
              onClick={event => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="admin-signout-title"
            >
              <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: "#fee2e2" }}>
                <LogOut className="w-5 h-5" style={{ color: C.red }} />
              </div>
              <h2 id="admin-signout-title" className="text-lg font-bold" style={{ color: C.text }}>Sign out?</h2>
              <p className="text-sm mt-1" style={{ color: C.muted }}>
                You will need to sign in again to view the dashboard.
              </p>
              {signOutError && <p className="text-sm mt-3" role="alert" style={{ color: C.red }}>{signOutError}</p>}
              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={() => {
                    setConfirmSignOut(false);
                    setSignOutError("");
                  }}
                  disabled={signingOut}
                  className="px-4 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50"
                  style={{ background: C.bg, color: C.muted, border: `1px solid ${C.border}` }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="px-4 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                  style={{ background: C.red }}
                >
                  {signingOut ? "Signing out..." : "Sign out"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================== MAIN ============================== */}
        <main className="flex-1 min-w-0 px-4 sm:px-10 py-8">
          <div className="max-w-6xl mx-auto">{children}</div>
        </main>
      </div>
    </ToastProvider>
  );
}