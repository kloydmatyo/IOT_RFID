"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ref,
  onValue,
  off,
  push,
  update,
  remove,
  get,
  set,
} from "firebase/database";
import { db } from "@/lib/firebase";
import type {
  TeacherProfile,
  ClassRecord,
  StudentRecord,
  AttendanceRecord,
  ActiveSession,
} from "@/lib/types";

// ── Teacher profile ────────────────────────────────────────────────────────────

export function useTeacherProfile(uid: string | null) {
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) { setLoading(false); return; }
    const r = ref(db, `/teacher/${uid}`);
    const unsub = onValue(r, (snap) => {
      setProfile(snap.val() ?? null);
      setLoading(false);
    });
    return () => off(r, "value", unsub);
  }, [uid]);

  const saveProfile = useCallback(async (data: Partial<TeacherProfile>) => {
    if (!uid) return;
    await update(ref(db, `/teacher/${uid}`), data);
  }, [uid]);

  return { profile, loading, saveProfile };
}

// ── Classes ────────────────────────────────────────────────────────────────────

export function useClasses(teacherUid: string | null) {
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!teacherUid) { setLoading(false); return; }
    const r = ref(db, `/classes`);
    const unsub = onValue(r, (snap) => {
      const data = snap.val() ?? {};
      const list = Object.entries(data)
        .map(([key, v]) => ({ key, ...(v as Omit<ClassRecord, "key">) }))
        .filter((c) => c.teacherUid === teacherUid);
      setClasses(list);
      setLoading(false);
    });
    return () => off(r, "value", unsub);
  }, [teacherUid]);

  const addClass = useCallback(
    async (data: Omit<ClassRecord, "key">) => {
      const result = await push(ref(db, "/classes"), data);
      return result.key!;
    },
    []
  );

  const updateClass = useCallback(
    async (key: string, data: Partial<ClassRecord>) =>
      update(ref(db, `/classes/${key}`), data),
    []
  );

  const deleteClass = useCallback(
    async (key: string) => remove(ref(db, `/classes/${key}`)),
    []
  );

  return { classes, loading, addClass, updateClass, deleteClass };
}

// ── Students ────────────────────────────────────────────────────────────────────

export function useStudents(teacherUid: string | null) {
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!teacherUid) { setLoading(false); return; }
    const r = ref(db, `/students`);
    const unsub = onValue(r, (snap) => {
      const data = snap.val() ?? {};
      const list = Object.entries(data)
        .map(([key, v]) => ({ key, ...(v as Omit<StudentRecord, "key">) }))
        .filter((s) => s.teacherUid === teacherUid);
      setStudents(list);
      setLoading(false);
    });
    return () => off(r, "value", unsub);
  }, [teacherUid]);

  const addStudent = useCallback(
    async (data: Omit<StudentRecord, "key">) => {
      const result = await push(ref(db, "/students"), data);
      return result.key!;
    },
    []
  );

  const updateStudent = useCallback(
    async (key: string, data: Partial<StudentRecord>) =>
      update(ref(db, `/students/${key}`), data),
    []
  );

  const deleteStudent = useCallback(
    async (key: string) => remove(ref(db, `/students/${key}`)),
    []
  );

  return { students, loading, addStudent, updateStudent, deleteStudent };
}

// ── Attendance ─────────────────────────────────────────────────────────────────

/** Live listener for a single class's attendance on a given date */
export function useAttendanceByDate(classKey: string | null, date: string | null) {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!classKey || !date) { setLoading(false); return; }
    const r = ref(db, `/attendance/${classKey}/${date}`);
    const unsub = onValue(r, (snap) => {
      const data = snap.val() ?? {};
      setRecords(Object.values(data) as AttendanceRecord[]);
      setLoading(false);
    });
    return () => off(r, "value", unsub);
  }, [classKey, date]);

  return { records, loading };
}

/** One-time fetch of all attendance for a class (for history / CSV export) */
export async function fetchAttendanceForClass(
  classKey: string
): Promise<AttendanceRecord[]> {
  const snap = await get(ref(db, `/attendance/${classKey}`));
  if (!snap.exists()) return [];
  const all: AttendanceRecord[] = [];
  snap.forEach((dateSnap) => {
    dateSnap.forEach((recSnap) => {
      all.push(recSnap.val() as AttendanceRecord);
    });
  });
  return all;
}

/** Write or overwrite a single attendance record (used by manual override) */
export async function writeAttendanceRecord(rec: AttendanceRecord) {
  await set(
    ref(db, `/attendance/${rec.classKey}/${rec.date}/${rec.studentKey}`),
    rec
  );
}

// ── Active session (which class the ESP32 is recording for) ───────────────────

const DEVICE_ID = "ESP32-RFID-001";

export function useActiveSession() {
  const [session, setSession] = useState<ActiveSession | null>(null);

  useEffect(() => {
    const r = ref(db, `/activeSessions/${DEVICE_ID}`);
    const unsub = onValue(r, (snap) => {
      const val = snap.val();
      setSession(val && val.active ? (val as ActiveSession) : null);
    });
    return () => off(r, "value", unsub);
  }, []);

  const startSession = useCallback(
    async (cls: ClassRecord, teacherUid: string) => {
      const session: ActiveSession = {
        classKey: cls.key,
        className: cls.name,
        classCode: cls.code,
        teacherUid,
        startedAt: new Date().toISOString(),
        classStart: cls.start,   // e.g. "08:00"
        active: true,
      };
      await set(ref(db, `/activeSessions/${DEVICE_ID}`), session);
    },
    []
  );

  const stopSession = useCallback(async () => {
    await update(ref(db, `/activeSessions/${DEVICE_ID}`), { active: false });
  }, []);

  return { session, startSession, stopSession };
}

// ── Live attendance hook for teacher dashboard (today across all classes) ──────

export function useTodayAttendance(classKeys: string[], today: string) {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);

  useEffect(() => {
    if (!classKeys.length || !today) return;

    const listeners: (() => void)[] = [];

    classKeys.forEach((classKey) => {
      const r = ref(db, `/attendance/${classKey}/${today}`);
      const unsub = onValue(r, () => {
        // Re-fetch all when any class changes
        Promise.all(
          classKeys.map((ck) =>
            get(ref(db, `/attendance/${ck}/${today}`)).then((snap) => {
              if (!snap.exists()) return [];
              return Object.values(snap.val()) as AttendanceRecord[];
            })
          )
        ).then((arrays) => {
          setRecords(arrays.flat());
        });
      });
      listeners.push(() => off(r, "value", unsub));
    });

    return () => listeners.forEach((fn) => fn());
  }, [classKeys, today]);

  return records;
}

/** Fetch all attendance records across all dates for given class keys (for history view) */
export function useAttendanceHistory(classKeys: string[]) {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!classKeys.length) { setLoading(false); return; }

    Promise.all(classKeys.map((ck) => fetchAttendanceForClass(ck))).then(
      (arrays) => {
        setRecords(arrays.flat());
        setLoading(false);
      }
    );
  }, [classKeys]);

  return { records, loading };
}
