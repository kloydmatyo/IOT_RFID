import { CheckCircle, XCircle } from "lucide-react";

export function AccessBadge({ authorized }: { authorized: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={
        authorized
          ? { background: "rgba(22,163,74,.12)", color: "#15803d" }
          : { background: "rgba(239,68,68,.10)", color: "#dc2626" }
      }
    >
      {authorized
        ? <CheckCircle className="w-3 h-3" />
        : <XCircle    className="w-3 h-3" />}
      {authorized ? "Granted" : "Denied"}
    </span>
  );
}

export function OnlineBadge({ online }: { online: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={
        online
          ? { background: "rgba(22,163,74,.12)", color: "#15803d" }
          : { background: "rgba(239,68,68,.10)", color: "#dc2626" }
      }
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: online ? "#16a34a" : "#ef4444" }}
      />
      {online ? "Online" : "Offline"}
    </span>
  );
}

export function ActiveBadge({ active }: { active: boolean }) {
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
      style={
        active
          ? { background: "rgba(22,163,74,.12)", color: "#15803d" }
          : { background: "rgba(239,68,68,.10)", color: "#dc2626" }
      }
    >
      {active ? "Active" : "Disabled"}
    </span>
  );
}
