"use client";

import { useEffect, useState, useCallback } from "react";
import { ref, onValue, push, update, remove, off, get, query, orderByChild, limitToLast } from "firebase/database";
import { db } from "@/lib/firebase";
import type { RFIDCard, AccessLog, Device, Stats, SystemSettings } from "@/lib/types";

// ── Stats ────────────────────────────────────────────────────────────────────
// Derived live from /accessLogs so it always matches the actual log count.
export function useStats() {
  const [stats, setStats] = useState<Stats>({ authorizedCount: 0, unauthorizedCount: 0 });
  useEffect(() => {
    const r = ref(db, "/accessLogs");
    const unsub = onValue(r, (snap) => {
      let authorizedCount = 0;
      let unauthorizedCount = 0;
      snap.forEach((child) => {
        const log = child.val();
        if (log.authorized) authorizedCount++;
        else unauthorizedCount++;
      });
      setStats({ authorizedCount, unauthorizedCount });
    });
    return () => off(r, "value", unsub);
  }, []);
  return stats;
}

// ── Authorized Cards ─────────────────────────────────────────────────────────
export function useCards() {
  const [cards, setCards]     = useState<RFIDCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const r = ref(db, "/authorizedCards");
    const unsub = onValue(r, (snap) => {
      const data = snap.val() ?? {};
      setCards(Object.entries(data).map(([key, v]) => ({ key, ...(v as Omit<RFIDCard, "key">) })));
      setLoading(false);
    });
    return () => off(r, "value", unsub);
  }, []);

  const addCard    = useCallback((card: Omit<RFIDCard, "key">) => push(ref(db, "/authorizedCards"), card), []);
  const updateCard = useCallback((key: string, data: Partial<RFIDCard>) => update(ref(db, `/authorizedCards/${key}`), data), []);
  const deleteCard = useCallback((key: string) => remove(ref(db, `/authorizedCards/${key}`)), []);

  return { cards, loading, addCard, updateCard, deleteCard };
}

// ── Access Logs ───────────────────────────────────────────────────────────────
export function useLogs(limit = 200) {
  const [logs, setLogs]       = useState<AccessLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const r = query(ref(db, "/accessLogs"), limitToLast(limit));
    const unsub = onValue(r, (snap) => {
      const arr: AccessLog[] = [];
      snap.forEach((child) => {
        arr.unshift({ key: child.key!, ...child.val() });
      });
      setLogs(arr);
      setLoading(false);
    });
    return () => off(r, "value", unsub);
  }, [limit]);

  const clearAll = useCallback(async () => {
    await remove(ref(db, "/accessLogs"));
    await update(ref(db, "/stats"), { authorizedCount: 0, unauthorizedCount: 0 });
  }, []);

  const recalculateStats = useCallback(async () => {
    const snapshot = await get(ref(db, "/accessLogs"));
    let authorized = 0, unauthorized = 0;
    snapshot.forEach((child) => {
      const log = child.val();
      if (log.authorized) authorized++;
      else unauthorized++;
    });
    await update(ref(db, "/stats"), { authorizedCount: authorized, unauthorizedCount: unauthorized });
  }, []);

  return { logs, loading, clearAll, recalculateStats };
}

// ── Recent Logs (last 10, live) ───────────────────────────────────────────────
export function useRecentLogs() {
  const [logs, setLogs] = useState<AccessLog[]>([]);
  useEffect(() => {
    const r = query(ref(db, "/accessLogs"), limitToLast(10));
    const unsub = onValue(r, (snap) => {
      const arr: AccessLog[] = [];
      snap.forEach((child) => {
        arr.unshift({ key: child.key!, ...child.val() });
      });
      setLogs(arr);
    });
    return () => off(r, "value", unsub);
  }, []);
  return logs;
}

// ── Devices ────────────────────────────────────────────────────────────────────
export function useDevices() {
  const [devices, setDevices] = useState<Device[]>([]);
  useEffect(() => {
    const r = ref(db, "/devices");
    const unsub = onValue(r, (snap) => {
      const data = snap.val() ?? {};
      setDevices(Object.values(data) as Device[]);
    });
    return () => off(r, "value", unsub);
  }, []);
  return devices;
}

// ── Settings ───────────────────────────────────────────────────────────────────
export function useSettings() {
  const [settings, setSettings] = useState<SystemSettings>({
    systemName: "RFID Access Control System",
    scanCooldown: 2000,
    heartbeatInterval: 30,
  });

  useEffect(() => {
    const r = ref(db, "/settings");
    const unsub = onValue(r, (snap) => {
      if (snap.val()) setSettings(snap.val());
    });
    return () => off(r, "value", unsub);
  }, []);

  const saveSettings = useCallback(async (data: Partial<SystemSettings>) => {
    await update(ref(db, "/settings"), { ...data, updatedAt: new Date().toISOString() });
  }, []);

  return { settings, saveSettings };
}

// ── Firebase Connection ────────────────────────────────────────────────────────
export function useFirebaseConnection() {
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    const r = ref(db, ".info/connected");
    const unsub = onValue(r, (snap) => setConnected(snap.val() === true));
    return () => off(r, "value", unsub);
  }, []);
  return connected;
}

// ── All logs (for charts) ─────────────────────────────────────────────────────
export function useAllLogs() {
  const [logs, setLogs]       = useState<AccessLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const r = ref(db, "/accessLogs");
    get(r).then((snap) => {
      const arr: AccessLog[] = [];
      snap.forEach((child) => {
        arr.push({ key: child.key!, ...child.val() });
      });
      setLogs(arr);
      setLoading(false);
    });
  }, []);

  return { logs, loading };
}
