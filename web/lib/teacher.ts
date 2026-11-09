import type { CSSProperties } from "react";

export type AStatus = "present" | "late" | "absent" | "incomplete";
export type StatusFilter = "all" | AStatus;
export type Tab = "dashboard" | "classes" | "attendance" | "students" | "archive";

export interface ClassItem {
  id: string;
  name: string;
  code: string;
  year: number;
  schedule: string;
  start: string;
  end: string;
  room: string;
  created: string;
  archived?: boolean;
}

export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  program: string;
  year: number;
  section: string;
  rfid: string;
  classIds: string[];
  archived?: boolean;
}

export type StudentModalMode = "add" | "edit" | "view";

export interface Log {
  classId: string;
  studentId: string;
  date: string;
  status: AStatus;
  timeIn?: number;
  timeOut?: number;
}

export const EMAIL_DOMAIN = "@gordoncollege.edu.ph";
export const STUDENT_NO_RE = /^20\d{7}$/;
export const LATE_GRACE_MIN = 15;
export const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const MIN_TIME = "06:00";
export const MAX_TIME = "22:00";
export const MAX_LEN = 30;
export const SEARCH_MAX = 40;
export const PAGE_SIZE = 20;

export const WORDS_RE = /^[A-Za-z0-9]+(?:[ -][A-Za-z0-9]+)*$/;
export const CODE_RE = /^[A-Za-z0-9]+$/;
export const PROGRAM_MAX = 20;
export const SECTION_MAX = 20;
export const NAME_RE = /^[A-Za-z]+(?: [A-Za-z]+)*$/;
export const PROGRAM_RE = /^[A-Za-z]{1,20}$/;

export const cleanWords = (v: string) => v.replace(/[^A-Za-z0-9 -]/g, "").replace(/\s{2,}/g, " ").slice(0, MAX_LEN);
export const cleanCode = (v: string) => v.replace(/[^A-Za-z0-9]/g, "").slice(0, MAX_LEN);
export const cleanName = (v: string) => v.replace(/[^A-Za-z ]/g, "").replace(/\s{2,}/g, " ").replace(/^\s/, "").slice(0, MAX_LEN);
export const cleanProgram = (v: string) => v.replace(/[^A-Za-z]/g, "").slice(0, PROGRAM_MAX);
export const cleanSection = (v: string) => cleanWords(v).slice(0, SECTION_MAX);

export const cleanStudentNo = (v: string) => {
  let d = v.replace(/\D/g, "").slice(0, 9);
  if (d.length >= 1 && d[0] !== "2") d = "";
  if (d.length >= 2 && d[1] !== "0") d = d[0];
  return d;
};

export const INITIAL_CLASSES: ClassItem[] = [
  { id: "c1", name: "BSCS", code: "NSTP101", year: 1, schedule: "Mon/Wed/Fri 8:00-9:00 AM", start: "08:00", end: "09:00", room: "Room 201", created: "2026-04-28" },
  { id: "c2", name: "BSCA", code: "NSTP101", year: 1, schedule: "Tue/Thu 10:00-11:30 AM", start: "10:00", end: "11:30", room: "Lab 2", created: "2026-04-28" },
  { id: "c3", name: "CCS-BSIT", code: "ITP415A", year: 3, schedule: "Mon/Wed 1:00-2:00 PM", start: "13:00", end: "14:00", room: "Room 105", created: "2026-04-27" },
  { id: "c4", name: "BSIT 3", code: "ITP415", year: 3, schedule: "Fri 1:00-4:00 PM", start: "13:00", end: "16:00", room: "Lab 1", created: "2026-04-21" },
];

const makeStudent = (
  id: string,
  firstName: string,
  lastName: string,
  program: string,
  year: number,
  section: string,
  rfid: string,
  classIds: string[],
): Student => ({
  id,
  firstName,
  lastName,
  name: `${firstName} ${lastName}`,
  email: `${id}${EMAIL_DOMAIN}`,
  program,
  year,
  section,
  rfid,
  classIds,
});

export const INITIAL_STUDENTS: Student[] = [
  makeStudent("202310417", "Juan", "Dela Cruz", "BSCS", 1, "BSCS", "7F3A91C2", ["c1"]),
  makeStudent("202310418", "Maria", "Santos", "BSCS", 1, "BSCS", "4C82E087", ["c1"]),
  makeStudent("202310419", "Jose", "Reyes", "BSCS", 1, "BSCS", "B19D2F05", ["c1"]),
  makeStudent("202310420", "Ana", "Garcia", "BSCA", 1, "BSCA", "E6047AA3", ["c2"]),
  makeStudent("202310421", "Mark", "Villanueva", "BSCA", 1, "BSCA", "2DA5C318", ["c2"]),
  makeStudent("202310422", "Sofia", "Mendoza", "BSCA", 1, "BSCA", "", ["c2"]),
  makeStudent("202310501", "Carlo", "Ramos", "BSIT", 3, "CCS-BSIT", "5B7C2E60", ["c3"]),
  makeStudent("202310502", "Bea", "Navarro", "BSIT", 3, "CCS-BSIT", "C3E81D49", ["c3"]),
  makeStudent("202310503", "Paolo", "Aquino", "BSIT", 3, "CCS-BSIT", "9A41F7D2", ["c3"]),
];

export const STATUS_META: Record<AStatus, { label: string; color: string }> = {
  present: { label: "Present", color: "#16a34a" },
  late: { label: "Late", color: "#d97706" },
  absent: { label: "Absent", color: "#dc2626" },
  incomplete: { label: "Incomplete", color: "#a16207" },
};

export const C = {
  bg: "#f8f9fb",
  surface: "#ffffff",
  border: "#eef0f3",
  text: "#111827",
  muted: "#6b7280",
  green: "#16a34a",
  greenDark: "#15803d",
  greenSoft: "#ecfdf3",
  greenEdge: "#dcfce7",
  ink: "#10231a",
  blueSoft: "#eaf1ff",
  blue: "#3b6fe0",
  red: "#dc2626",
  amber: "#b45309",
  amberSoft: "#fef3c7",
};

export const cardStyle: CSSProperties = {
  background: C.surface,
  border: `1px solid ${C.border}`,
  boxShadow: `0 1px 2px rgba(16,24,40,.04), 0 3px 0 ${C.greenEdge}`,
};

export const inputStyle: CSSProperties = {
  background: C.surface,
  border: `1px solid ${C.border}`,
  color: C.text,
};

const pad = (n: number) => String(n).padStart(2, "0");
const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

export function fmtTime(min?: number) {
  if (min === undefined) return "—";
  const h24 = Math.floor(min / 60) % 24;
  const m = min % 60;
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${pad(m)} ${h24 < 12 ? "AM" : "PM"}`;
}

export function fmtDuration(inMin?: number, outMin?: number) {
  if (inMin === undefined || outMin === undefined || outMin < inMin) return "—";
  const d = outMin - inMin;
  const h = Math.floor(d / 60);
  const m = d % 60;
  return h > 0 ? `${h} hr ${m} min` : `${m} min`;
}

export function fmtDay(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0])
    .join("")
    .toUpperCase();
}

export function paginate<T>(items: T[], page: number) {
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const current = Math.min(Math.max(page, 1), totalPages);
  return {
    items: items.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE),
    page: current,
    totalPages,
    total: items.length,
  };
}

function seeded(seed: string) {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return (h % 1000) / 1000;
}

export function buildDates(): { past: string[]; today: string } {
  const today = new Date();
  const past: string[] = [];
  const d = new Date(today);
  while (past.length < 6) {
    d.setDate(d.getDate() - 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) past.unshift(toISO(d));
  }
  return { past, today: toISO(today) };
}

export function seedLogs(students: Student[], classes: ClassItem[], pastDates: string[], today: string): Log[] {
  const out: Log[] = [];
  for (const date of [...pastDates, today]) {
    const isToday = date === today;
    for (const s of students) {
      for (const classId of s.classIds) {
        const cls = classes.find(c => c.id === classId);
        if (!cls) continue;
        const start = toMin(cls.start);
        const end = toMin(cls.end);
        const r = seeded(`${classId}${date}${s.id}`);
        const timeIn = start - 20 + Math.round(seeded(`in${classId}${date}${s.id}`) * 45);
        const late = timeIn > start + LATE_GRACE_MIN;

        if (isToday) {
          if (r > 0.6) continue;
          out.push({ classId, studentId: s.id, date, status: late ? "late" : "present", timeIn });
          continue;
        }
        if (r < 0.15) {
          out.push({ classId, studentId: s.id, date, status: "absent" });
          continue;
        }
        if (r < 0.22) {
          out.push({ classId, studentId: s.id, date, status: "incomplete", timeIn });
          continue;
        }
        const timeOut = end - 2 + Math.round(seeded(`out${classId}${date}${s.id}`) * 10);
        out.push({ classId, studentId: s.id, date, status: late ? "late" : "present", timeIn, timeOut });
      }
    }
  }
  return out;
}
