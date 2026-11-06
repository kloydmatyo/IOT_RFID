"use client";

import { useEffect, useRef } from "react";
import { IdCardIcon, CheckCircle, XCircle, CreditCard } from "lucide-react";
import { Chart, registerables } from "chart.js";
import { useStats, useCards, useRecentLogs } from "@/hooks/useFirebase";
import StatCard from "@/components/StatCard";
import { Card, CardHeader, CardBody } from "@/components/Card";
import { AccessBadge } from "@/components/StatusBadge";
import { formatTime } from "@/lib/utils";
import { subDays, format, parseISO, isValid } from "date-fns";

Chart.register(...registerables);

export default function DashboardPage() {
  const stats      = useStats();
  const { cards }  = useCards();
  const recentLogs = useRecentLogs();
  const donutRef   = useRef<HTMLCanvasElement>(null);
  const lineRef    = useRef<HTMLCanvasElement>(null);
  const donutChart = useRef<Chart | null>(null);
  const lineChart  = useRef<Chart | null>(null);

  const total = stats.authorizedCount + stats.unauthorizedCount;

  // Donut chart
  useEffect(() => {
    if (!donutRef.current) return;
    donutChart.current?.destroy();
    donutChart.current = new Chart(donutRef.current, {
      type: "doughnut",
      data: {
        labels: ["Authorized", "Unauthorized"],
        datasets: [{ data: [stats.authorizedCount, stats.unauthorizedCount], backgroundColor: ["#22c55e", "#ef4444"], borderWidth: 0, hoverOffset: 8 }],
      },
      options: {
        cutout: "72%", responsive: true, maintainAspectRatio: true,
        plugins: {
          legend: { position: "bottom", labels: { color: "#8892b0", padding: 16, font: { size: 12 } } },
          tooltip: { callbacks: { label: c => ` ${c.label}: ${c.parsed}` } },
        },
      },
    });
    return () => donutChart.current?.destroy();
  }, [stats]);

  // Line chart (7-day)
  useEffect(() => {
    if (!lineRef.current) return;
    lineChart.current?.destroy();

    const labels = Array.from({ length: 7 }, (_, i) =>
      format(subDays(new Date(), 6 - i), "MMM d")
    );
    const auth:   number[] = new Array(7).fill(0);
    const unauth: number[] = new Array(7).fill(0);

    recentLogs.forEach(log => {
      if (!log.timestamp) return;
      try {
        const d = parseISO(log.timestamp);
        if (!isValid(d)) return;
        const label = format(d, "MMM d");
        const idx = labels.indexOf(label);
        if (idx === -1) return;
        if (log.authorized) auth[idx]++;
        else unauth[idx]++;
      } catch { /* skip */ }
    });

    lineChart.current = new Chart(lineRef.current, {
      type: "line",
      data: {
        labels,
        datasets: [
          { label: "Authorized",   data: auth,   borderColor: "#22c55e", backgroundColor: "rgba(34,197,94,.08)",  fill: true, tension: 0.4, pointBackgroundColor: "#22c55e", pointRadius: 4 },
          { label: "Unauthorized", data: unauth, borderColor: "#ef4444", backgroundColor: "rgba(239,68,68,.08)", fill: true, tension: 0.4, pointBackgroundColor: "#ef4444", pointRadius: 4 },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        scales: {
          x: { grid: { color: "rgba(46,50,80,.5)" }, ticks: { color: "#8892b0" } },
          y: { beginAtZero: true, grid: { color: "rgba(46,50,80,.5)" }, ticks: { color: "#8892b0", stepSize: 1 } },
        },
        plugins: { legend: { labels: { color: "#8892b0" } } },
      },
    });
    return () => lineChart.current?.destroy();
  }, [recentLogs]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={IdCardIcon}  label="Total Scans"      value={total}                    color="blue"   />
        <StatCard icon={CheckCircle} label="Authorized"       value={stats.authorizedCount}    color="green"  />
        <StatCard icon={XCircle}     label="Unauthorized"     value={stats.unauthorizedCount}  color="red"    />
        <StatCard icon={CreditCard}  label="Registered Cards" value={cards.length}             color="purple" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4">
        {/* Donut */}
        <Card>
          <CardHeader title="Access Overview" badge={<span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(79,142,247,.12)", color: "#4f8ef7" }}>All Time</span>} />
          <CardBody>
            <div className="relative flex items-center justify-center" style={{ height: 220 }}>
              <canvas ref={donutRef} />
              <div className="absolute flex flex-col items-center pointer-events-none">
                <span className="text-2xl font-bold">{total}</span>
                <span className="text-xs" style={{ color: "#8892b0" }}>Total</span>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Line */}
        <Card>
          <CardHeader title="Scan Activity (Last 7 Days)" />
          <CardBody>
            <div style={{ height: 220 }}>
              <canvas ref={lineRef} />
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Recent activity */}
      <Card>
        <CardHeader
          title="Recent Activity"
          badge={<span className="text-xs px-2 py-0.5 rounded-full animate-pulse" style={{ background: "rgba(34,197,94,.12)", color: "#22c55e" }}>Live</span>}
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead style={{ background: "var(--bg-card2)" }}>
              <tr>
                {["Status", "UID", "Cardholder", "Device", "Time"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "#8892b0" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentLogs.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-sm" style={{ color: "#8892b0" }}>No scans yet</td></tr>
              ) : recentLogs.map(log => (
                <tr key={log.key} className="hover:bg-[#22263a] transition-colors" style={{ borderBottom: "1px solid var(--border)" }}>
                  <td className="px-4 py-3"><AccessBadge authorized={log.authorized} /></td>
                  <td className="px-4 py-3"><code className="text-xs" style={{ color: "#8892b0" }}>{log.uid}</code></td>
                  <td className="px-4 py-3">{log.name || "Unknown"}</td>
                  <td className="px-4 py-3 text-sm" style={{ color: "#8892b0" }}>{log.deviceName || log.deviceId}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: "#8892b0" }}>{formatTime(log.timestamp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
