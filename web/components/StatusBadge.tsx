import { CheckCircle, XCircle } from "lucide-react";

export function AccessBadge({ authorized }: { authorized: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={
        authorized
          ? { background: "rgba(34,197,94,.12)", color: "#22c55e" }
          : { background: "rgba(239,68,68,.12)",  color: "#ef4444" }
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
          ? { background: "rgba(34,197,94,.12)", color: "#22c55e" }
          : { background: "rgba(239,68,68,.12)",  color: "#ef4444" }
      }
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: online ? "#22c55e" : "#ef4444" }}
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
          ? { background: "rgba(34,197,94,.12)", color: "#22c55e" }
          : { background: "rgba(239,68,68,.12)",  color: "#ef4444" }
      }
    >
      {active ? "Active" : "Disabled"}
    </span>
  );
}
