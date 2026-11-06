import { LucideIcon } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: number | string;
  color: "blue" | "green" | "red" | "purple";
}

const colorMap = {
  blue:   { bg: "rgba(79,142,247,.12)",  text: "#4f8ef7"  },
  green:  { bg: "rgba(34,197,94,.12)",   text: "#22c55e"  },
  red:    { bg: "rgba(239,68,68,.12)",   text: "#ef4444"  },
  purple: { bg: "rgba(168,85,247,.12)",  text: "#a855f7"  },
};

export default function StatCard({ icon: Icon, label, value, color }: StatCardProps) {
  const c = colorMap[color];
  return (
    <div
      className="flex items-center gap-4 p-5 rounded-xl transition-transform hover:-translate-y-0.5"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
    >
      <div className="w-13 h-13 rounded-xl flex items-center justify-center shrink-0" style={{ background: c.bg, width: 52, height: 52 }}>
        <Icon style={{ color: c.text, width: 22, height: 22 }} />
      </div>
      <div>
        <div className="text-2xl font-bold leading-none">{value}</div>
        <div className="text-xs mt-1" style={{ color: "#8892b0" }}>{label}</div>
      </div>
    </div>
  );
}
