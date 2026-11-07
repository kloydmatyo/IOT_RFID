"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { IdCardIcon, CheckCircle, XCircle, CreditCard, Clock, ChevronRight } from "lucide-react";
import { Chart, registerables } from "chart.js";
import { useStats, useCards, useRecentLogs, useLogs } from "@/hooks/useFirebase";
import { formatTime } from "@/lib/utils";
import { subDays, format, parseISO, isValid } from "date-fns";

Chart.register(...registerables);

/* Palette shared with the teacher side */
const C = {
  bg: "#f8f9fb",
  surface: "#ffffff",
  border: "#eef0f3",
  text: "#111827",
  muted: "#6b7280",
  green: "#16a34a",
  greenDark: "#15803d",
  greenSoft: "#ecfdf3",
  greenEdge: "#dcfce7",
  blue: "#3b6fe0",
  blueSoft: "#eaf1ff",
  purple: "#7c3aed",
  purpleSoft: "#f1eaff",
  red: "#dc2626",
  redSoft: "#fee2e2",
  grid: "#eef0f3",
};

const cardStyle: React.CSSProperties = {
  background: C.surface,
  border: `1px solid ${C.border}`,
  boxShadow: `0 1px 2px rgba(16,24,40,.04), 0 3px 0 ${C.greenEdge}`,
};

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0])
    .join("")
    .toUpperCase();
}

export default function DashboardPage() {
  const stats = useStats();
  const { cards } = useCards();
  const recentLogs = useRecentLogs();
  const { logs: allLogs } = useLogs(500);
  const donutRef = useRef<HTMLCanvasElement>(null);
  const lineRef = useRef<HTMLCanvasElement>(null);
  const donutChart = useRef<Chart | null>(null);
  const lineChart = useRef<Chart | null>(null);
  const [now, setNow] = useState<Date | null>(null);

  const total = stats.authorizedCount + stats.unauthorizedCount;
  const authPct = total ? Math.round((stats.authorizedCount / total) * 100) : 0;
  const unauthPct = total ? 100 - authPct : 0;

  /* ---- live clock ---- */
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  /* ---- donut chart ---- */
  useEffect(() => {
    if (!donutRef.current) return;
    donutChart.current?.destroy();
    donutChart.current = new Chart(donutRef.current, {
      type: "doughnut",
      data: {
        labels: ["Authorized", "Unauthorized"],
        datasets: [
          {
            // grey ring when there are no scans yet
            data: total === 0 ? [1] : [stats.authorizedCount, stats.unauthorizedCount],
            backgroundColor: total === 0 ? ["#e5e7eb"] : [C.green, C.red],
            borderWidth: 0,
            hoverOffset: total === 0 ? 0 : 6,
          },
        ],
      },
      options: {
        cutout: "74%",
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { display: false },
          tooltip: { enabled: total > 0, callbacks: { label: c => ` ${c.label}: ${c.parsed}` } },
        },
      },
    });
    return () => donutChart.current?.destroy();
  }, [stats, total]);

  /* ---- line chart (7-day) ---- */
  useEffect(() => {
    if (!lineRef.current) return;
    lineChart.current?.destroy();

    const labels = Array.from({ length: 7 }, (_, i) => format(subDays(new Date(), 6 - i), "MMM d"));
    const auth: number[] = new Array(7).fill(0);
    const unauth: number[] = new Array(7).fill(0);

    allLogs.forEach(log => {
      try {
        let label: string;
        if (log.timestamp && log.timestamp.trim() !== "") {
          const d = parseISO(log.timestamp);
          if (!isValid(d)) return;
          label = format(d, "MMM d");
        } else {
          // No timestamp: bucket into today
          label = format(new Date(), "MMM d");
        }
        const idx = labels.indexOf(label);
        if (idx === -1) return;
        if (log.authorized) auth[idx]++;
        else unauth[idx]++;
      } catch {
        /* skip */
      }
    });

    lineChart.current = new Chart(lineRef.current, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Authorized",
            data: auth,
            borderColor: C.green,
            backgroundColor: "rgba(22,163,74,.10)",
            fill: true,
            tension: 0.4,
            borderWidth: 2,
            pointBackgroundColor: "#fff",
            pointBorderColor: C.green,
            pointBorderWidth: 2,
            pointRadius: 4,
          },
          {
            label: "Unauthorized",
            data: unauth,
            borderColor: C.red,
            backgroundColor: "rgba(220,38,38,.08)",
            fill: true,
            tension: 0.4,
            borderWidth: 2,
            pointBackgroundColor: "#fff",
            pointBorderColor: C.red,
            pointBorderWidth: 2,
            pointRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        scales: {
          x: { grid: { display: false }, border: { display: false }, ticks: { color: C.muted, font: { size: 11 } } },
          y: {
            beginAtZero: true,
            grid: { color: C.grid },
            border: { display: false },
            ticks: { color: C.muted, stepSize: 1, font: { size: 11 } },
          },
        },
        plugins: {
          legend: {
            align: "end",
            labels: { color: C.muted, usePointStyle: true, pointStyle: "circle", boxWidth: 8, boxHeight: 8, padding: 16, font: { size: 12 } },
          },
        },
      },
    });
    return () => lineChart.current?.destroy();
  }, [allLogs]);

  const timeText = now
    ? now.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })
    : "--:--:--";
  const dateText = now
    ? now.toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
    : "";

  const statCards = [
    { label: "Total scans", value: total, hint: "All time", icon: IdCardIcon, color: C.blue, soft: C.blueSoft },
    { label: "Authorized", value: stats.authorizedCount, hint: `${authPct}% of scans`, icon: CheckCircle, color: C.green, soft: C.greenSoft },
    { label: "Unauthorized", value: stats.unauthorizedCount, hint: `${unauthPct}% of scans`, icon: XCircle, color: C.red, soft: C.redSoft },
    { label: "Registered cards", value: cards.length, hint: "RFID cards in the system", icon: CreditCard, color: C.purple, soft: C.purpleSoft },
  ];

  return (
    <div className="space-y-6">
          {/* Header with live clock */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: C.text }}>Dashboard</h1>
              <p className="text-sm mt-1" style={{ color: C.muted }}>Overview of RFID card scans and access activity.</p>
            </div>
            <div
              className="flex items-center gap-3 rounded-xl px-4 py-2.5"
              style={{ background: C.surface, border: `1px solid ${C.border}` }}
            >
              <Clock className="w-5 h-5" style={{ color: C.green }} />
              <div className="leading-tight">
                <p className="text-base font-semibold tabular-nums" style={{ color: C.text }}>{timeText}</p>
                <p className="text-[11px]" style={{ color: C.muted }}>{dateText}</p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map(s => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="rounded-2xl p-4 flex items-center gap-3" style={cardStyle}>
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: s.soft }}>
                    <Icon className="w-5 h-5" style={{ color: s.color }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate" style={{ color: C.muted }}>{s.label}</p>
                    <p className="text-2xl font-bold leading-tight" style={{ color: C.text }}>{s.value}</p>
                    <p className="text-[11px] truncate" style={{ color: C.muted }}>{s.hint}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5">
            <section className="rounded-2xl p-5" style={cardStyle}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold" style={{ color: C.text }}>Access overview</h2>
                <span
                  className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                  style={{ background: C.greenSoft, color: C.greenDark }}
                >
                  All time
                </span>
              </div>

              <div className="relative flex items-center justify-center mx-auto" style={{ height: 190, width: 190 }}>
                <canvas ref={donutRef} />
                <div className="absolute flex flex-col items-center pointer-events-none">
                  <span className="text-3xl font-bold" style={{ color: C.text }}>{total}</span>
                  <span className="text-xs" style={{ color: C.muted }}>Total scans</span>
                </div>
              </div>

              <div className="mt-5 space-y-2.5">
                {[
                  { label: "Authorized", value: stats.authorizedCount, pct: authPct, color: C.green },
                  { label: "Unauthorized", value: stats.unauthorizedCount, pct: unauthPct, color: C.red },
                ].map(r => (
                  <div key={r.label} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 font-medium" style={{ color: C.text }}>
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: r.color }} /> {r.label}
                    </span>
                    <span style={{ color: C.muted }}>
                      <span className="font-semibold" style={{ color: C.text }}>{r.value}</span> · {r.pct}%
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl p-5" style={cardStyle}>
              <div className="mb-4">
                <h2 className="font-semibold" style={{ color: C.text }}>Scan activity</h2>
                <p className="text-xs mt-0.5" style={{ color: C.muted }}>Authorized and unauthorized scans over the last 7 days.</p>
              </div>
              <div style={{ height: 260 }}>
                <canvas ref={lineRef} />
              </div>
            </section>
          </div>

          {/* Recent activity */}
          <section className="rounded-2xl overflow-hidden" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
            <div className="flex flex-wrap items-center justify-between gap-3 p-5">
              <div className="flex items-center gap-3">
                <h2 className="font-semibold" style={{ color: C.text }}>Recent activity</h2>
                <span
                  className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full"
                  style={{ background: C.greenSoft, color: C.greenDark }}
                >
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: C.green }} /> Live
                </span>
              </div>
              <Link
                href="/dashboard/logs"
                className="flex items-center gap-1 text-xs font-semibold"
                style={{ color: C.green }}
              >
                View all logs <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[680px]">
                <thead>
                  <tr className="text-left text-xs" style={{ color: C.muted, background: C.bg }}>
                    <th className="py-3 pl-5 pr-4 font-medium">Status</th>
                    <th className="py-3 pr-4 font-medium">Cardholder</th>
                    <th className="py-3 pr-4 font-medium">UID</th>
                    <th className="py-3 pr-4 font-medium">Device</th>
                    <th className="py-3 pr-5 font-medium">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-sm" style={{ color: C.muted }}>
                        No scans yet. Tap a card on a reader to see activity here.
                      </td>
                    </tr>
                  ) : (
                    recentLogs.map(log => {
                      const name = log.name || "Unknown";
                      return (
                        <tr
                          key={log.key}
                          className="transition-colors hover:bg-[#f8fdf9]"
                          style={{ borderTop: `1px solid ${C.border}` }}
                        >
                          <td className="py-3 pl-5 pr-4">
                            <span
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                              style={
                                log.authorized
                                  ? { background: C.greenSoft, color: C.greenDark }
                                  : { background: C.redSoft, color: C.red }
                              }
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ background: log.authorized ? C.green : C.red }}
                              />
                              {log.authorized ? "Authorized" : "Unauthorized"}
                            </span>
                          </td>
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                                style={
                                  log.name
                                    ? { background: C.greenSoft, color: C.greenDark, border: `1px solid ${C.greenEdge}` }
                                    : { background: "#f3f4f6", color: C.muted }
                                }
                              >
                                {log.name ? initials(name) : "?"}
                              </div>
                              <span className="font-semibold" style={{ color: log.name ? C.text : C.muted }}>{name}</span>
                            </div>
                          </td>
                          <td className="py-3 pr-4 font-mono text-xs font-semibold" style={{ color: C.muted }}>{log.uid}</td>
                          <td className="py-3 pr-4 font-medium" style={{ color: C.text }}>{log.deviceName || log.deviceId}</td>
                          <td className="py-3 pr-5 text-xs" style={{ color: C.muted }}>{formatTime(log.timestamp)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
    </div>
  );
}