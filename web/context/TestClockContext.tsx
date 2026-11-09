"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { ref, update } from "firebase/database";
import { db } from "@/lib/firebase";

const STORAGE_KEY = "rfid-test-clock";

type TestClockContextValue = {
  now: Date | null;
  isOverridden: boolean;
  setTestDateTime: (value: string) => void;
  clearTestDateTime: () => void;
};

const TestClockContext = createContext<TestClockContextValue | null>(null);

function parseStoredDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function publishTestClock(enabled: boolean, date?: Date) {
  try {
    await update(ref(db, "/settings/testClock"), {
      enabled,
      epochMs: date?.getTime() ?? null,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to sync the test clock with the RFID device.", error);
  }
}

export function TestClockProvider({ children }: { children: React.ReactNode }) {
  const [now, setNow] = useState<Date | null>(null);
  const [isOverridden, setIsOverridden] = useState(false);

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      const stored = parseStoredDate(window.localStorage.getItem(STORAGE_KEY));
      setNow(stored ?? new Date());
      setIsOverridden(stored !== null);
      if (stored) void publishTestClock(true, stored);
    }, 0);
    return () => window.clearTimeout(loadTimer);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(current => current ? new Date(current.getTime() + 1000) : new Date());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const value = useMemo<TestClockContextValue>(() => ({
    now,
    isOverridden,
    setTestDateTime: (inputValue: string) => {
      const date = new Date(inputValue);
      if (Number.isNaN(date.getTime())) return;
      window.localStorage.setItem(STORAGE_KEY, date.toISOString());
      setNow(date);
      setIsOverridden(true);
      void publishTestClock(true, date);
    },
    clearTestDateTime: () => {
      window.localStorage.removeItem(STORAGE_KEY);
      setNow(new Date());
      setIsOverridden(false);
      void publishTestClock(false);
    },
  }), [isOverridden, now]);

  return <TestClockContext.Provider value={value}>{children}</TestClockContext.Provider>;
}

export function useTestClock() {
  const context = useContext(TestClockContext);
  if (!context) throw new Error("useTestClock must be used within TestClockProvider");
  return context;
}
