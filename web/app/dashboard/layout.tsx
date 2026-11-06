"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard, IdCard, ListChecks, Cpu, BarChart3, Settings,
  ShieldHalf, Menu, X, LogOut, Wifi, WifiOff,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useFirebaseConnection } from "@/hooks/useFirebase";
import { ToastProvider } from "@/components/Toast";

const NAV = [
  { href: "/dashboard",            icon: LayoutDashboard, label: "Dashboard"       },
  { href: "/dashboard/rfid",       icon: IdCard,          label: "RFID Management" },
  { href: "/dashboard/logs",       icon: ListChecks,      label: "Access Logs"     },
  { href: "/dashboard/devices",    icon: Cpu,             label: "Device Monitor"  },
  { href: "/dashboard/reports",    icon: BarChart3,       label: "Reports"         },
  { href: "/dashboard/settings",   icon: Settings,        label: "Settings"        },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router     = useRouter();
  const pathname   = usePathname();
  const connected  = useFirebaseConnection();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: "var(--bg)" }}>
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  function activeClass(href: string) {
    const isActive = href === "/dashboard" ? pathname === href : pathname.startsWith(href);
    return isActive
      ? "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors bg-blue-500/10 text-blue-400"
      : "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-[#8892b0] hover:bg-[#22263a] hover:text-[#e2e8f0]";
  }

  return (
    <ToastProvider>
      <div className="flex min-h-screen" style={{ background: "var(--bg)" }}>
        {/* Sidebar */}
        <aside
          className={`fixed top-0 left-0 z-50 h-full flex flex-col transition-transform duration-200
            ${open ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
          style={{ width: 260, background: "var(--bg-card)", borderRight: "1px solid var(--border)" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-5" style={{ borderBottom: "1px solid var(--border)" }}>
            <div className="flex items-center gap-2.5 text-blue-400 font-bold">
              <ShieldHalf className="w-6 h-6" />
              <span className="text-base">RFID Control</span>
            </div>
            <button onClick={() => setOpen(false)} className="lg:hidden text-[#8892b0] hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-2 py-3 overflow-y-auto space-y-0.5">
            {NAV.map(({ href, icon: Icon, label }) => (
              <Link key={href} href={href} className={activeClass(href)} onClick={() => setOpen(false)}>
                <Icon className="w-4.5 h-4.5 shrink-0" style={{ width: 18, height: 18 }} />
                {label}
              </Link>
            ))}
          </nav>

          {/* Footer – connection status */}
          <div className="px-4 py-4" style={{ borderTop: "1px solid var(--border)" }}>
            <div className="flex items-center gap-2 text-xs" style={{ color: "#8892b0" }}>
              {connected
                ? <><Wifi className="w-3.5 h-3.5 text-green-400" /><span className="text-green-400">Firebase Connected</span></>
                : <><WifiOff className="w-3.5 h-3.5 text-red-400" /><span className="text-red-400">Disconnected</span></>
              }
            </div>
          </div>
        </aside>

        {/* Overlay on mobile */}
        {open && (
          <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setOpen(false)} />
        )}

        {/* Main */}
        <div className="flex-1 flex flex-col lg:ml-[260px]">
          {/* Topbar */}
          <header
            className="sticky top-0 z-30 flex items-center justify-between px-5 h-16"
            style={{ background: "var(--bg-card)", borderBottom: "1px solid var(--border)" }}
          >
            <div className="flex items-center gap-3">
              <button onClick={() => setOpen(true)} className="lg:hidden text-[#8892b0] hover:text-white">
                <Menu className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2 text-xs px-2.5 py-1 rounded-full" style={{ background: "rgba(34,197,94,.1)", color: "#22c55e" }}>
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse-dot" />
                Live
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs hidden sm:block" style={{ color: "#8892b0" }}>{user.email}</span>
              <button
                onClick={() => logout().then(() => router.push("/login"))}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors"
                style={{ border: "1px solid var(--border)", color: "#8892b0" }}
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </div>
          </header>

          <main className="flex-1 p-5 lg:p-6 max-w-[1400px] w-full mx-auto">
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
