"use client";

import { useState, useMemo } from "react";
import { Search, Download, ChevronDown } from "lucide-react";
import { useLogs } from "@/hooks/useFirebase";
import { Card, CardHeader, CardFooter } from "@/components/Card";
import { AccessBadge } from "@/components/StatusBadge";
import { formatTime, exportCSV } from "@/lib/utils";
import { useToast } from "@/components/Toast";

const PAGE_SIZE = 50;

export default function AccessLogsPage() {
  const toast = useToast();
  const { logs, loading } = useLogs(500);
  const [search,   setSearch]   = useState("");
  const [filter,   setFilter]   = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo,   setDateTo]   = useState("");
  const [page,     setPage]     = useState(1);

  const filtered = useMemo(() => {
    return logs.filter(log => {
      if (filter === "granted" && !log.authorized)  return false;
      if (filter === "denied"  &&  log.authorized)  return false;
      const day = log.timestamp?.substring(0, 10) ?? "";
      // only apply date filter if the log actually has a valid timestamp
      if (day) {
        if (dateFrom && day < dateFrom) return false;
        if (dateTo   && day > dateTo)   return false;
      }
      if (search) {
        const q = search.toLowerCase();
        return (log.uid || "").toLowerCase().includes(q) ||
               (log.name || "").toLowerCase().includes(q) ||
               (log.deviceName || "").toLowerCase().includes(q);
      }
      return true;
    });
  }, [logs, filter, dateFrom, dateTo, search]);

  const displayed = filtered.slice(0, page * PAGE_SIZE);

  function handleExport() {
    if (!filtered.length) { toast("No logs to export", "warning"); return; }
    exportCSV(filtered.map(l => ({
      Status:    l.authorized ? "Granted" : "Denied",
      UID:       l.uid,
      Name:      l.name || "Unknown",
      DeviceID:  l.deviceId,
      Device:    l.deviceName,
      Timestamp: l.timestamp,
    })), `access-logs-${new Date().toISOString().substring(0, 10)}.csv`);
    toast(`Exported ${filtered.length} records`, "success");
  }

  const inputStyle = {
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    color: "var(--text-main)",
  };

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold" style={{ color: "var(--text-main)" }}>Access Logs</h1>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)} placeholder="Search logs..."
            className="w-full pl-9 pr-3 py-2 rounded-lg text-sm outline-none" style={inputStyle}
            onFocus={e => (e.target.style.borderColor = "#16a34a")}
            onBlur={e  => (e.target.style.borderColor = "#bbf7d0")}
          />
        </div>
        <select
          value={filter} onChange={e => setFilter(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle}
        >
          <option value="all">All Access</option>
          <option value="granted">Granted Only</option>
          <option value="denied">Denied Only</option>
        </select>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} title="From date" />
        <input type="date" value={dateTo}   onChange={e => setDateTo(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} title="To date" />
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors hover:bg-green-50"
          style={{ border: "1px solid var(--border)", color: "var(--text-muted)" }}
        >
          <Download className="w-4 h-4" /> Export CSV
        </button>
        {(search || filter !== "all" || dateFrom || dateTo) && (
          <button
            onClick={() => { setSearch(""); setFilter("all"); setDateFrom(""); setDateTo(""); }}
            className="px-4 py-2 rounded-lg text-sm transition-colors hover:bg-red-50"
            style={{ border: "1px solid var(--border)", color: "#ef4444" }}
          >
            Clear Filters
          </button>
        )}
      </div>

      <Card>
        <CardHeader
          title="Access History"
          badge={
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(22,163,74,.10)", color: "#15803d" }}>
              {filtered.length} / {logs.length} records
            </span>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead style={{ background: "var(--bg-card2)" }}>
              <tr>
                {["Status", "UID", "Cardholder", "Device", "Date & Time"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-sm" style={{ color: "var(--text-muted)" }}>Loading...</td></tr>
              ) : displayed.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-sm" style={{ color: "var(--text-muted)" }}>No logs match your filters</td></tr>
              ) : displayed.map(log => (
                <tr
                  key={log.key}
                  className="transition-colors"
                  style={{ borderBottom: "1px solid var(--border)" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#f0fdf4")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <td className="px-4 py-3"><AccessBadge authorized={log.authorized} /></td>
                  <td className="px-4 py-3"><code className="text-xs" style={{ color: "var(--text-muted)" }}>{log.uid}</code></td>
                  <td className="px-4 py-3" style={{ color: "var(--text-main)" }}>{log.name || "Unknown"}</td>
                  <td className="px-4 py-3 text-sm" style={{ color: "var(--text-muted)" }}>{log.deviceName || log.deviceId || "—"}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: "var(--text-muted)" }}>{formatTime(log.timestamp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {displayed.length < filtered.length && (
          <CardFooter>
            <button
              onClick={() => setPage(p => p + 1)}
              className="flex items-center gap-1.5 mx-auto px-4 py-1.5 rounded-lg text-sm transition-colors hover:bg-green-50"
              style={{ border: "1px solid var(--border)", color: "var(--text-muted)" }}
            >
              <ChevronDown className="w-4 h-4" /> Load More
            </button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
