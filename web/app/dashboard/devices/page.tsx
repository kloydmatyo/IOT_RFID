"use client";

import { useState, useEffect } from "react";
import { Cpu } from "lucide-react";
import { useDevices } from "@/hooks/useFirebase";
import { Card, CardHeader, CardBody } from "@/components/Card";
import { OnlineBadge } from "@/components/StatusBadge";
import { isDeviceOnline, signalStrength, formatTime, timeAgo } from "@/lib/utils";

export default function DeviceMonitoringPage() {
  const devices = useDevices();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [, setTick] = useState(0);
  const selected = devices.find(device => device.deviceId === selectedId) ?? null;

  // Re-check online status every 30s
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold" style={{ color: "var(--text-main)" }}>Device Monitor</h1>

      {/* Device cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {devices.length === 0 ? (
          <div className="col-span-full flex flex-col items-center py-16 text-center" style={{ color: "var(--text-muted)" }}>
            <Cpu className="w-12 h-12 mb-4 opacity-20" />
            <p>No devices found. Make sure your ESP32 is running and connected to Firebase.</p>
          </div>
        ) : devices.map(device => {
          const online = isDeviceOnline(device.lastSeen);
          return (
            <div
              key={device.deviceId}
              onClick={() => setSelectedId(device.deviceId)}
              className="rounded-xl p-5 cursor-pointer transition-all hover:-translate-y-0.5"
              style={{
                background: "var(--bg-card)",
                border: `1px solid var(--border)`,
                borderTop: `3px solid ${online ? "#16a34a" : "#ef4444"}`,
              }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "rgba(22,163,74,.10)" }}>
                  <Cpu className="w-6 h-6" style={{ color: "#15803d" }} />
                </div>
                <OnlineBadge online={online} />
              </div>
              <div className="font-semibold text-base" style={{ color: "var(--text-main)" }}>{device.deviceName || device.deviceId}</div>
              <div className="text-xs mt-0.5 mb-4" style={{ color: "var(--text-muted)" }}>{device.deviceId}</div>
              <div className="grid grid-cols-2 gap-2">
                <InfoTile label="IP Address"  value={device.ip    || "—"} />
                <InfoTile label="WiFi Signal" value={device.rssi ? `${device.rssi} dBm` : "—"} />
                <InfoTile label="Last Seen"   value={timeAgo(device.lastSeen)} />
                <InfoTile label="Last Scan"   value={timeAgo(device.lastScan)} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail panel */}
      {selected && (
        <Card>
          <CardHeader
            title={selected.deviceName || selected.deviceId}
            action={
              <button
                onClick={() => setSelectedId(null)}
                className="text-xs px-3 py-1 rounded-lg transition-colors hover:bg-green-50"
                style={{ border: "1px solid var(--border)", color: "var(--text-muted)" }}
              >
                Close
              </button>
            }
          />
          <CardBody>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {[
                { label: "Device ID",    value: selected.deviceId },
                { label: "Device Name",  value: selected.deviceName || "—" },
                { label: "Status",       value: isDeviceOnline(selected.lastSeen) ? "🟢 Online" : "🔴 Offline" },
                { label: "IP Address",   value: selected.ip || "—" },
                { label: "WiFi Signal",  value: selected.rssi ? `${selected.rssi} dBm (${signalStrength(selected.rssi)})` : "—" },
                { label: "Free Heap",    value: selected.freeHeap ? `${Math.round(selected.freeHeap / 1024)} KB` : "—" },
                { label: "Last Seen",    value: formatTime(selected.lastSeen) },
                { label: "Last Scan",    value: formatTime(selected.lastScan) },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-lg p-3" style={{ background: "var(--bg-card2)" }}>
                  <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>{label}</div>
                  <div className="text-sm font-semibold break-all" style={{ color: "var(--text-main)" }}>{value}</div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg p-2.5" style={{ background: "var(--bg-card2)" }}>
      <div className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</div>
      <div className="text-xs font-semibold mt-0.5 truncate" style={{ color: "var(--text-main)" }}>{value}</div>
    </div>
  );
}
