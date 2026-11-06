"use client";

import { useEffect, useRef } from "react";
import { Chart, registerables } from "chart.js";
import { useAllLogs } from "@/hooks/useFirebase";
import { Card, CardHeader, CardBody } from "@/components/Card";
import { format, subDays } from "date-fns";

Chart.register(...registerables);

const CHART_OPTS = {
  scales: {
    x: { grid: { color: "rgba(46,50,80,.5)" }, ticks: { color: "#8892b0", font: { size: 10 } } },
    y: { beginAtZero: true, grid: { color: "rgba(46,50,80,.5)" }, ticks: { color: "#8892b0", stepSize: 1 } },
  },
  plugins: { legend: { labels: { color: "#8892b0" } } },
};

export default function ReportsPage() {
  const { logs } = useAllLogs();
  const hourlyRef  = useRef<HTMLCanvasElement>(null);
  const donutRef   = useRef<HTMLCanvasElement>(null);
  const monthlyRef = useRef<HTMLCanvasElement>(null);
  const hourlyC    = useRef<Chart | null>(null);
  const donutC     = useRef<Chart | null>(null);
  const monthlyC   = useRef<Chart | null>(null);

  function buildHourly() {
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
          { label: "Authorized",   data: auth,   backgroundColor: "rgba(34,197,94,.7)",  borderRadius: 4 },
          { label: "Unauthorized", data: unauth, backgroundColor: "rgba(239,68,68,.7)", borderRadius: 4 },
        ],
      },
      options: { ...CHART_OPTS, responsive: true, maintainAspectRatio: false, scales: { ...CHART_OPTS.scales, x: { ...CHART_OPTS.scales.x, stacked: true }, y: { ...CHART_OPTS.scales.y, stacked: true } } },
    });
  }

  function buildDonut() {
    if (!donutRef.current) return;
    donutC.current?.destroy();
    const auth   = logs.filter(l => l.authorized).length;
    const unauth = logs.filter(l => !l.authorized).length;
    donutC.current = new Chart(donutRef.current, {
      type: "doughnut",
      data: {
        labels: ["Authorized", "Unauthorized"],
        datasets: [{ data: [auth, unauth], backgroundColor: ["#22c55e", "#ef4444"], borderWidth: 0, hoverOffset: 6 }],
      },
      options: {
        cutout: "65%", responsive: true, maintainAspectRatio: true,
        plugins: {
          legend: { position: "bottom", labels: { color: "#8892b0", padding: 16 } },
          tooltip: { callbacks: { label: c => { const t = c.dataset.data.reduce((a, b) => (a as number) + (b as number), 0) as number; return ` ${c.label}: ${c.parsed} (${t ? Math.round((c.parsed / t) * 100) : 0}%)`; } } },
        },
      },
    });
  }

  function buildMonthly() {
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
          { label: "Authorized",   data: days.map(d => byDay[d.key].auth),   backgroundColor: "rgba(34,197,94,.7)",  borderRadius: 4 },
          { label: "Unauthorized", data: days.map(d => byDay[d.key].unauth), backgroundColor: "rgba(239,68,68,.7)", borderRadius: 4 },
        ],
      },
      options: { ...CHART_OPTS, responsive: true, maintainAspectRatio: false },
    });
  }

  useEffect(() => {
    if (!logs.length) return;
    buildHourly(); buildDonut(); buildMonthly();
    return () => { hourlyC.current?.destroy(); donutC.current?.destroy(); monthlyC.current?.destroy(); };
  }, [logs]); // eslint-disable-line

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">Reports & Analytics</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Hourly Distribution" badge={<span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(79,142,247,.12)", color: "#4f8ef7" }}>Today</span>} />
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
