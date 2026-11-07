import { LucideIcon } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: number | string;
  color: "blue" | "green" | "red" | "purple";
}

const colorMap = {
  blue:   { bg: "rgba(22,163,74,.10)",  text: "#15803d"  },
  green:  { bg: "rgba(22,163,74,.14)",  text: "#15803d"  },
  red:    { bg: "rgba(239,68,68,.10)",  text: "#ef4444"  },
  purple: { bg: "rgba(168,85,247,.10)", text: "#9333ea"  },
};

export default function StatCard({ icon: Icon, label, value, color }: StatCardProps) {
  const c = colorMap[color];
  return (
    <div
      className="flex items-center gap-4 p-5 rounded-xl transition-transform hover:-translate-y-0.5"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
    >
      <div className="rounded-xl flex items-center justify-center shrink-0" style={{ background: c.bg, width: 52, height: 52 }}>
        <Icon style={{ color: c.text, width: 22, height: 22 }} />
      </div>
      <div>
        <div className="text-2xl font-bold leading-none" style={{ color: "var(--text-main)" }}>{value}</div>
        <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{label}</div>
      </div>
    </div>
  );
}
