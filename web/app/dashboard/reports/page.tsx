"use client";

import { useEffect, useRef } from "react";
import type { Chart as ChartInstance } from "chart.js";
import { useAllLogs } from "@/hooks/useFirebase";
import { Card, CardHeader, CardBody } from "@/components/Card";
import { format, subDays } from "date-fns";
import LoadingSkeleton from "@/components/LoadingSkeleton";

const CHART_OPTS = {
  scales: {
    x: { grid: { color: "rgba(187,247,208,.5)" }, ticks: { color: "#4b7a5e", font: { size: 10 } } },
    y: { beginAtZero: true, grid: { color: "rgba(187,247,208,.5)" }, ticks: { color: "#4b7a5e", stepSize: 1 } },
  },
  plugins: { legend: { labels: { color: "#4b7a5e" } } },
};

export default function ReportsPage() {
  const { logs, loading } = useAllLogs();
  const hourlyRef  = useRef<HTMLCanvasElement>(null);
  const donutRef   = useRef<HTMLCanvasElement>(null);
  const monthlyRef = useRef<HTMLCanvasElement>(null);
  const hourlyC    = useRef<ChartInstance | null>(null);
  const donutC     = useRef<ChartInstance | null>(null);
  const monthlyC   = useRef<ChartInstance | null>(null);

  function buildHourly(Chart: typeof import("chart.js").Chart) {
    if (!hourlyRef.current) return;
    hourlyC.current?.destroy();
    const today  = new Date().toISOString().substring(0, 10);
    const auth   = new Array(24).fill(0);
    const unauth = new Array(24).fill(0);
    logs.forEach(l => {
      if (!l.timestamp?.startsWith(today)) return;
      const h = new Date(l.timestamp).getHours();
      if (l.authorized) auth[h]++; else unauth[h]++;
    });
    const hours = Array.from({ length: 24 }, (_, i) => i === 0 ? "12am" : i < 12 ? `${i}am` : i === 12 ? "12pm" : `${i - 12}pm`);
    hourlyC.current = new Chart(hourlyRef.current, {
      type: "bar",
      data: {
        labels: hours,
        datasets: [
          { label: "Authorized",   data: auth,   backgroundColor: "rgba(22,163,74,.7)",  borderRadius: 4 },
          { label: "Unauthorized", data: unauth, backgroundColor: "rgba(239,68,68,.7)", borderRadius: 4 },
        ],
      },
      options: {
        ...CHART_OPTS, responsive: true, maintainAspectRatio: false,
        scales: {
          ...CHART_OPTS.scales,
          x: { ...CHART_OPTS.scales.x, stacked: true },
          y: { ...CHART_OPTS.scales.y, stacked: true },
        },
      },
    });
  }

  function buildDonut(Chart: typeof import("chart.js").Chart) {
    if (!donutRef.current) return;
    donutC.current?.destroy();
    const auth   = logs.filter(l => l.authorized).length;
    const unauth = logs.filter(l => !l.authorized).length;
    donutC.current = new Chart(donutRef.current, {
      type: "doughnut",
      data: {
        labels: ["Authorized", "Unauthorized"],
        datasets: [{ data: [auth, unauth], backgroundColor: ["#16a34a", "#ef4444"], borderWidth: 0, hoverOffset: 6 }],
      },
      options: {
        cutout: "65%", responsive: true, maintainAspectRatio: true,
        plugins: {
          legend: { position: "bottom", labels: { color: "#4b7a5e", padding: 16 } },
          tooltip: { callbacks: { label: c => { const t = c.dataset.data.reduce((a, b) => (a as number) + (b as number), 0) as number; return ` ${c.label}: ${c.parsed} (${t ? Math.round((c.parsed / t) * 100) : 0}%)`; } } },
        },
      },
    });
  }

  function buildMonthly(Chart: typeof import("chart.js").Chart) {
    if (!monthlyRef.current) return;
    monthlyC.current?.destroy();
    const days = Array.from({ length: 30 }, (_, i) => {
      const d = subDays(new Date(), 29 - i);
      return { key: d.toISOString().substring(0, 10), lbl: format(d, "MMM d") };
    });
    const byDay: Record<string, { auth: number; unauth: number }> = {};
    days.forEach(d => (byDay[d.key] = { auth: 0, unauth: 0 }));
    logs.forEach(l => {
      const day = l.timestamp?.substring(0, 10);
      if (day && byDay[day]) {
        if (l.authorized) byDay[day].auth++; else byDay[day].unauth++;
      }
    });
    monthlyC.current = new Chart(monthlyRef.current, {
      type: "bar",
      data: {
        labels: days.map(d => d.lbl),
        datasets: [
          { label: "Authorized",   data: days.map(d => byDay[d.key].auth),   backgroundColor: "rgba(22,163,74,.7)",  borderRadius: 4 },
          { label: "Unauthorized", data: days.map(d => byDay[d.key].unauth), backgroundColor: "rgba(239,68,68,.7)", borderRadius: 4 },
        ],
      },
      options: { ...CHART_OPTS, responsive: true, maintainAspectRatio: false },
    });
  }

  useEffect(() => {
    if (loading || !logs.length) return;
    let cancelled = false;
    void import("chart.js").then(({ Chart, registerables }) => {
      if (cancelled) return;
      Chart.register(...registerables);
      buildHourly(Chart);
      buildDonut(Chart);
      buildMonthly(Chart);
    }).catch(error => {
      console.error("Failed to load report charts.", error);
    });
    return () => {
      cancelled = true;
      hourlyC.current?.destroy();
      donutC.current?.destroy();
      monthlyC.current?.destroy();
      hourlyC.current = null;
      donutC.current = null;
      monthlyC.current = null;
    };
  }, [logs, loading]); // eslint-disable-line

  if (loading) return <LoadingSkeleton variant="dashboard" />;

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold" style={{ color: "var(--text-main)" }}>Reports & Analytics</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader
            title="Hourly Distribution"
            badge={
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(22,163,74,.10)", color: "#15803d" }}>
                Today
              </span>
            }
          />
          <CardBody><div style={{ height: 260 }}><canvas ref={hourlyRef} /></div></CardBody>
        </Card>
        <Card>
          <CardHeader title="Access Success Rate" />
          <CardBody><canvas ref={donutRef} /></CardBody>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title="30-Day Access Trend" />
          <CardBody><div style={{ height: 280 }}><canvas ref={monthlyRef} /></div></CardBody>
        </Card>
      </div>
    </div>
  );
}
