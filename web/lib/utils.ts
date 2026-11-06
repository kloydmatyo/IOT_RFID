import { format, formatDistanceToNow, isValid, parseISO } from "date-fns";

export function formatTime(ts: string | undefined | null): string {
  if (!ts || ts === "1970-01-01T00:00:00Z") return "—";
  try {
    const d = parseISO(ts);
    if (!isValid(d)) return ts;
    return format(d, "MMM d, yyyy h:mm a");
  } catch {
    return ts;
  }
}

export function timeAgo(ts: string | undefined | null): string {
  if (!ts) return "—";
  try {
    const d = parseISO(ts);
    if (!isValid(d)) return "—";
    return formatDistanceToNow(d, { addSuffix: true });
  } catch {
    return "—";
  }
}

export function isDeviceOnline(lastSeen: string | undefined, thresholdMs = 90_000): boolean {
  if (!lastSeen) return false;
  return Date.now() - new Date(lastSeen).getTime() < thresholdMs;
}

export function formatUID(uid: string): string {
  return uid.toUpperCase().replace(/[\s\-]/g, ":");
}

export function validateUID(uid: string): boolean {
  const clean = uid.replace(/:/g, "").toUpperCase();
  return /^[0-9A-F]{6,16}$/.test(clean);
}

export function signalStrength(rssi: number): string {
  if (rssi >= -50) return "Excellent";
  if (rssi >= -60) return "Good";
  if (rssi >= -70) return "Fair";
  return "Weak";
}

export function exportCSV(rows: Record<string, string>[], filename: string): void {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [headers, ...rows.map(r => headers.map(h => `"${String(r[h] ?? "").replace(/"/g, '""')}"`))].map(r => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement("a"), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}
