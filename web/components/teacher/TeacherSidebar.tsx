import type { Dispatch, SetStateAction } from "react";
import type { LucideIcon } from "lucide-react";
import { ChevronLeft, ChevronRight, LogOut } from "lucide-react";
import { C } from "@/lib/teacher";
import type { Tab } from "@/lib/teacher";

interface TeacherSidebarProps {
  collapsed: boolean;
  setCollapsed: Dispatch<SetStateAction<boolean>>;
  navItems: { id: Tab; label: string; icon: LucideIcon }[];
  tab: Tab;
  setTab: Dispatch<SetStateAction<Tab>>;
  setOpenClassId: Dispatch<SetStateAction<string | null>>;
  initial: string;
  teacher: { name: string; email: string };
  setConfirmSignOut: Dispatch<SetStateAction<boolean>>;
}

export default function TeacherSidebar({
  collapsed,
  setCollapsed,
  navItems,
  tab,
  setTab,
  setOpenClassId,
  initial,
  teacher,
  setConfirmSignOut,
}: TeacherSidebarProps) {
  return (
    <aside
      className="sticky top-0 h-screen flex flex-col shrink-0 transition-[width] duration-200"
      style={{
        width: collapsed ? 76 : 256,
        background: C.surface,
        borderRight: `1px solid ${C.border}`,
      }}
    >
      <div className="flex items-center gap-3 px-5 relative" style={{ height: 76, borderBottom: `1px solid ${C.border}` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/gclogo.png" alt="Gordon College logo" className="w-9 h-9 rounded-full object-contain shrink-0" />
        {!collapsed && (
          <span className="min-w-0 text-[11px] font-bold leading-tight tracking-tight" style={{ color: C.text }}>
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

      <nav className="flex-1 px-3 pt-6 space-y-1">
        {navItems.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              onClick={() => {
                setTab(id);
                if (id === "classes") setOpenClassId(null);
              }}
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
            </button>
          );
        })}
      </nav>

      <div style={{ borderTop: `1px solid ${C.border}` }}>
        <div className="flex items-center gap-3 px-5 py-4">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold text-white shrink-0"
            style={{ background: C.green }}
          >
            {initial}
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: C.text }}>{teacher.name}</p>
              <p className="text-[11px] font-medium uppercase truncate" style={{ color: C.muted }}>Instructor</p>
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
  );
}
