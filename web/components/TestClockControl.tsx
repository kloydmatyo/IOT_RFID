"use client";

import { RotateCcw, Settings2 } from "lucide-react";
import { useTestClock } from "@/context/TestClockContext";

const pad = (value: number) => String(value).padStart(2, "0");

function toInputValue(date: Date) {
  return [
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`,
  ].join("T");
}

export default function TestClockControl() {
  const { now, isOverridden, setTestDateTime, clearTestDateTime } = useTestClock();

  if (!now) return null;

  return (
    <details className="relative">
      <summary
        className="flex cursor-pointer list-none items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium"
        style={{ color: isOverridden ? "#15803d" : "#6b7280", background: isOverridden ? "#ecfdf3" : "#f3f4f6" }}
      >
        <Settings2 className="h-3.5 w-3.5" />
        {isOverridden ? "Test time active" : "Set test time"}
      </summary>
      <div
        className="absolute right-0 top-full z-20 mt-2 w-64 rounded-xl p-3 shadow-lg"
        style={{ background: "#ffffff", border: "1px solid #eef0f3" }}
      >
        <label className="block text-xs font-semibold" style={{ color: "#111827" }} htmlFor="test-clock">
          Testing date and time
        </label>
        <input
          id="test-clock"
          className="mt-2 w-full rounded-lg px-2.5 py-2 text-sm outline-none"
          style={{ color: "#111827", border: "1px solid #d1d5db" }}
          type="datetime-local"
          step="1"
          value={toInputValue(now)}
          onChange={event => setTestDateTime(event.target.value)}
        />
        <button
          type="button"
          className="mt-2 flex items-center gap-1.5 text-xs font-medium"
          style={{ color: "#6b7280" }}
          onClick={clearTestDateTime}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Use real date and time
        </button>
      </div>
    </details>
  );
}
