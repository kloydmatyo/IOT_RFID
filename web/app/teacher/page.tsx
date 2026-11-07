"use client";

import { useEffect, useMemo, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  ClipboardCheck,
  UserPlus,
  LogOut,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Trash2,
  Search,
  Plus,
  GraduationCap,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Download,
  Eye,
  Pencil,
  Archive,
  ArchiveRestore,
  X,
  BookOpen,
} from "lucide-react";
import { TEACHER_SESSION_KEY } from "@/lib/mockTeacher";

/* ------------------------------------------------------------------ */
/* Types & mock data (no database yet)                                 */
/* ------------------------------------------------------------------ */

type AStatus = "present" | "late" | "absent" | "incomplete";
type StatusFilter = "all" | AStatus;
type Tab = "dashboard" | "classes" | "attendance" | "students" | "archive";

interface ClassItem {
  id: string;
  name: string; // section, e.g. BSCS
  code: string; // subject code, e.g. NSTP101
  year: number; // 1-4
  schedule: string;
  start: string; // "HH:MM" 24h
  end: string; // "HH:MM" 24h
  room: string;
  created: string; // ISO date
  archived?: boolean;
}

interface Student {
  id: string; // student number, taken from the Gordon email
  firstName: string;
  lastName: string;
  name: string; // "First Last", kept in sync on save
  email: string;
  program: string; // e.g. BSIT
  year: number; // 1-4
  section: string; // e.g. BSIT 4B
  rfid: string; // RFID card UID, empty when no card is registered yet
  classIds: string[];
  archived?: boolean;
}

type StudentModalMode = "add" | "edit" | "view";

// One RFID attendance record (a student's tap-in / tap-out for a class on a date)
interface Log {
  classId: string;
  studentId: string;
  date: string; // ISO
  status: AStatus;
  timeIn?: number; // minutes since midnight
  timeOut?: number; // minutes since midnight
}

const EMAIL_DOMAIN = "@gordoncollege.edu.ph";
const STUDENT_NO_RE = /^20\d{7}$/; // 9 digits, always starts with 20
const LATE_GRACE_MIN = 10;

// Class form rules
const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]; // no Sunday
const MIN_TIME = "06:00"; // nothing from 12AM to 5:59AM
const MAX_TIME = "22:00"; // 10PM latest
const MAX_LEN = 30;

const SEARCH_MAX = 40; // max characters in any search bar
const PAGE_SIZE = 20; // rows per page

// letters + numbers, single spaces/hyphens allowed between words (e.g. "BSIT 3", "CCS-BSIT", "Room 201")
const WORDS_RE = /^[A-Za-z0-9]+(?:[ -][A-Za-z0-9]+)*$/;
const CODE_RE = /^[A-Za-z0-9]+$/;
const cleanWords = (v: string) => v.replace(/[^A-Za-z0-9 -]/g, "").replace(/\s{2,}/g, " ").slice(0, MAX_LEN);
const cleanCode = (v: string) => v.replace(/[^A-Za-z0-9]/g, "").slice(0, MAX_LEN);

// Student form rules
const PROGRAM_MAX = 20;
const SECTION_MAX = 20;
const NAME_RE = /^[A-Za-z]+(?: [A-Za-z]+)*$/; // letters only, single spaces between words
const PROGRAM_RE = /^[A-Za-z]{1,20}$/; // letters only, no spaces
const cleanName = (v: string) => v.replace(/[^A-Za-z ]/g, "").replace(/\s{2,}/g, " ").replace(/^\s/, "").slice(0, MAX_LEN);
const cleanProgram = (v: string) => v.replace(/[^A-Za-z]/g, "").slice(0, PROGRAM_MAX);
const cleanSection = (v: string) => cleanWords(v).slice(0, SECTION_MAX);
// 9 digits only, and the number must start with 20 (the first two digits are blocked otherwise)
const cleanStudentNo = (v: string) => {
  let d = v.replace(/\D/g, "").slice(0, 9);
  if (d.length >= 1 && d[0] !== "2") d = "";
  if (d.length >= 2 && d[1] !== "0") d = d[0];
  return d;
};

const INITIAL_CLASSES: ClassItem[] = [
  { id: "c1", name: "BSCS", code: "NSTP101", year: 1, schedule: "Mon/Wed/Fri 8:00-9:00 AM", start: "08:00", end: "09:00", room: "Room 201", created: "2026-04-28" },
  { id: "c2", name: "BSCA", code: "NSTP101", year: 1, schedule: "Tue/Thu 10:00-11:30 AM", start: "10:00", end: "11:30", room: "Lab 2", created: "2026-04-28" },
  { id: "c3", name: "CCS-BSIT", code: "ITP415A", year: 3, schedule: "Mon/Wed 1:00-2:00 PM", start: "13:00", end: "14:00", room: "Room 105", created: "2026-04-27" },
  { id: "c4", name: "BSIT 3", code: "ITP415", year: 3, schedule: "Fri 1:00-4:00 PM", start: "13:00", end: "16:00", room: "Lab 1", created: "2026-04-21" },
];

const mk = (
  id: string, firstName: string, lastName: string, program: string, year: number,
  section: string, rfid: string, classIds: string[]
): Student => ({
  id, firstName, lastName, name: `${firstName} ${lastName}`,
  email: `${id}${EMAIL_DOMAIN}`, program, year, section, rfid, classIds,
});

const INITIAL_STUDENTS: Student[] = [
  mk("202310417", "Juan", "Dela Cruz", "BSCS", 1, "BSCS", "7F3A91C2", ["c1"]),
  mk("202310418", "Maria", "Santos", "BSCS", 1, "BSCS", "4C82E087", ["c1"]),
  mk("202310419", "Jose", "Reyes", "BSCS", 1, "BSCS", "B19D2F05", ["c1"]),
  mk("202310420", "Ana", "Garcia", "BSCA", 1, "BSCA", "E6047AA3", ["c2"]),
  mk("202310421", "Mark", "Villanueva", "BSCA", 1, "BSCA", "2DA5C318", ["c2"]),
  mk("202310422", "Sofia", "Mendoza", "BSCA", 1, "BSCA", "", ["c2"]),
  mk("202310501", "Carlo", "Ramos", "BSIT", 3, "CCS-BSIT", "5B7C2E60", ["c3"]),
  mk("202310502", "Bea", "Navarro", "BSIT", 3, "CCS-BSIT", "C3E81D49", ["c3"]),
  mk("202310503", "Paolo", "Aquino", "BSIT", 3, "CCS-BSIT", "9A41F7D2", ["c3"]),
];

const STATUS_META: Record<AStatus, { label: string; color: string }> = {
  present: { label: "Present", color: "#16a34a" },
  late: { label: "Late", color: "#d97706" },
  absent: { label: "Absent", color: "#dc2626" },
  incomplete: { label: "Incomplete", color: "#a16207" },
};

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
  ink: "#10231a",
  blueSoft: "#eaf1ff",
  blue: "#3b6fe0",
  red: "#dc2626",
  amber: "#b45309",
  amberSoft: "#fef3c7",
};

const cardStyle: React.CSSProperties = {
  background: C.surface,
  border: `1px solid ${C.border}`,
  boxShadow: `0 1px 2px rgba(16,24,40,.04), 0 3px 0 ${C.greenEdge}`,
};

const inputStyle: React.CSSProperties = {
  background: C.surface,
  border: `1px solid ${C.border}`,
  color: C.text,
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const pad = (n: number) => String(n).padStart(2, "0");
const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

function fmtTime(min?: number) {
  if (min === undefined) return "—";
  const h24 = Math.floor(min / 60) % 24;
  const m = min % 60;
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${pad(m)} ${h24 < 12 ? "AM" : "PM"}`;
}

function fmtDuration(inMin?: number, outMin?: number) {
  if (inMin === undefined || outMin === undefined || outMin < inMin) return "—";
  const d = outMin - inMin;
  const h = Math.floor(d / 60);
  const m = d % 60;
  return h > 0 ? `${h} hr ${m} min` : `${m} min`;
}

function fmtDay(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0])
    .join("")
    .toUpperCase();
}

// Slice a list into pages. The page number is clamped so it is always valid.
function paginate<T>(items: T[], page: number) {
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const current = Math.min(Math.max(page, 1), totalPages);
  return {
    items: items.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE),
    page: current,
    totalPages,
    total: items.length,
  };
}

function Pagination({
  page,
  totalPages,
  total,
  onChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  onChange: (p: number) => void;
}) {
  if (total <= PAGE_SIZE) return null;
  const start = (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, total);
  const btn = "flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold disabled:opacity-40";
  const btnStyle = { background: C.surface, color: C.text, border: `1px solid ${C.border}` };
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
      style={{ borderTop: `1px solid ${C.border}` }}
    >
      <p className="text-xs" style={{ color: C.muted }}>
        Showing {start}-{end} of {total}
      </p>
      <div className="flex items-center gap-2">
        <button className={btn} style={btnStyle} disabled={page <= 1} onClick={() => onChange(page - 1)}>
          <ChevronLeft className="w-3.5 h-3.5" /> Prev
        </button>
        <span className="text-xs font-semibold px-1" style={{ color: C.text }}>
          Page {page} of {totalPages}
        </span>
        <button className={btn} style={btnStyle} disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
          Next <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// Deterministic pseudo-random number (0-1) so the demo history stays stable
function seeded(seed: string) {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return (h % 1000) / 1000;
}

// Last 6 school days (Mon-Fri) before today, oldest first, plus today.
// Only call this from an effect or event handler (never during render).
function buildDates(): { past: string[]; today: string } {
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

// Demo RFID tap data. Replace with real data from Firebase later.
function seedLogs(students: Student[], classes: ClassItem[], pastDates: string[], today: string): Log[] {
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
          if (r > 0.6) continue; // has not tapped yet
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

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function TeacherPage() {
  const router = useRouter();
  const [teacher, setTeacher] = useState<{ name: string; email: string } | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [confirmDlg, setConfirmDlg] = useState<{
    tone: "archive" | "delete";
    title: string;
    subject: string;
    message: string;
    confirmLabel: string;
    onConfirm: () => void;
  } | null>(null);
  const [toast, setToast] = useState<{ msg: string; kind: "success" | "archive" | "delete" } | null>(null);
  const notify = (msg: string, kind: "success" | "archive" | "delete" = "success") => setToast({ msg, kind });
  const [now, setNow] = useState<Date | null>(null);

  // Dates and demo logs are created on the client after mount (avoids the prerender time error)
  const [dates, setDates] = useState<{ past: string[]; today: string } | null>(null);
  const [logs, setLogs] = useState<Log[]>([]);
  const today = dates?.today ?? "";

  const [classes, setClasses] = useState<ClassItem[]>(INITIAL_CLASSES);
  const [students, setStudents] = useState<Student[]>(INITIAL_STUDENTS);

  const [tab, setTab] = useState<Tab>("dashboard");
  const [classSearch, setClassSearch] = useState("");
  const [openClassId, setOpenClassId] = useState<string | null>(null);
  const [classView, setClassView] = useState<"attendance" | "students">("attendance");
  const [rosterSearch, setRosterSearch] = useState("");
  const [editingClassId, setEditingClassId] = useState<string | null>(null);

  // Archive tab
  const [archiveView, setArchiveView] = useState<"students" | "classes">("students");
  const [archiveSearch, setArchiveSearch] = useState("");

  // Add students to the opened class
  const [addStudentsOpen, setAddStudentsOpen] = useState(false);
  const [pickIds, setPickIds] = useState<string[]>([]);
  const [pickSearch, setPickSearch] = useState("");

  // Attendance filters
  const [fStatus, setFStatus] = useState<StatusFilter>("all");
  const [fSearch, setFSearch] = useState("");
  const [fDate, setFDate] = useState("all");
  const [fClass, setFClass] = useState("all");
  const [fSection, setFSection] = useState("all");
  const [fYear, setFYear] = useState("all");

  // Pagination (each table keeps its own page number)
  const [attPage, setAttPage] = useState(1);
  const [rosterPage, setRosterPage] = useState(1);
  const [stuPage, setStuPage] = useState(1);
  const [arcStuPage, setArcStuPage] = useState(1);
  const [arcClsPage, setArcClsPage] = useState(1);

  // Add class modal
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newYear, setNewYear] = useState(1);
  const [newDays, setNewDays] = useState<string[]>(["Mon", "Wed", "Fri"]);
  const [newStart, setNewStart] = useState("08:00");
  const [newEnd, setNewEnd] = useState("09:00");
  const [newRoom, setNewRoom] = useState("");
  const [classError, setClassError] = useState("");

  // Students tab: search + add / edit / view modal
  const [search, setSearch] = useState("");
  const [fsYear, setFsYear] = useState("all");
  const [fsSection, setFsSection] = useState("all");
  const [fsProgram, setFsProgram] = useState("all");
  const [studentModal, setStudentModal] = useState<{ mode: StudentModalMode; id?: string } | null>(null);
  const [sFirst, setSFirst] = useState("");
  const [sLast, setSLast] = useState("");
  const [sEmail, setSEmail] = useState("");
  const [sProgram, setSProgram] = useState("");
  const [sYear, setSYear] = useState(1);
  const [sSection, setSSection] = useState("");
  const [sRfid, setSRfid] = useState("");
  const [sClassIds, setSClassIds] = useState<string[]>([]);
  const [sError, setSError] = useState("");

  /* ---- session guard (mock teacher login) ---- */
  useEffect(() => {
    const raw = sessionStorage.getItem(TEACHER_SESSION_KEY);
    if (!raw) {
      router.replace("/login");
      return;
    }
    setTeacher(JSON.parse(raw));
  }, [router]);

  /* ---- dates + demo logs (client only) ---- */
  useEffect(() => {
    const d = buildDates();
    setDates(d);
    setLogs(seedLogs(INITIAL_STUDENTS, INITIAL_CLASSES, d.past, d.today));
  }, []);

  /* ---- live clock ---- */
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  /* ---- start collapsed on small screens ---- */
  useEffect(() => {
    if (window.innerWidth < 768) setCollapsed(true);
  }, []);

  /* ---- go back to page 1 whenever a filter or search changes ---- */
  useEffect(() => setAttPage(1), [fStatus, fSearch, fDate, fClass, fSection, fYear, openClassId, tab]);
  useEffect(() => setRosterPage(1), [rosterSearch, openClassId, classView]);
  useEffect(() => setStuPage(1), [search, fsYear, fsSection, fsProgram]);
  useEffect(() => setArcStuPage(1), [archiveSearch, archiveView]);
  useEffect(() => setArcClsPage(1), [archiveSearch, archiveView]);

  /* ---- auto-hide the toast ---- */
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  function logout() {
    sessionStorage.removeItem(TEACHER_SESSION_KEY);
    router.replace("/login");
  }

  /* ---- active vs archived ---- */
  const activeClasses = useMemo(() => classes.filter(c => !c.archived), [classes]);
  const activeStudents = useMemo(() => students.filter(s => !s.archived), [students]);
  const archivedClasses = useMemo(() => classes.filter(c => c.archived), [classes]);
  const archivedStudents = useMemo(() => students.filter(s => s.archived), [students]);

  /* ---- derived data ---- */
  const classStudents = (cId: string) => activeStudents.filter(s => s.classIds.includes(cId));

  function pairStats(cId: string, sId: string) {
    const mine = logs.filter(l => l.classId === cId && l.studentId === sId);
    const absent = mine.filter(l => l.status === "absent").length;
    const late = mine.filter(l => l.status === "late").length;
    const total = mine.length;
    const rate = total === 0 ? 0 : Math.round(((total - absent) / total) * 100);
    return { absent, late, total, rate };
  }

  const overview = useMemo(() => {
    let present = 0, notTapped = 0, totalAbsences = 0;
    for (const c of activeClasses) {
      const roster = activeStudents.filter(s => s.classIds.includes(c.id));
      for (const s of roster) {
        const todayLog = logs.find(l => l.classId === c.id && l.studentId === s.id && l.date === today);
        if (todayLog && todayLog.status !== "absent") present++;
        else notTapped++;
        totalAbsences += logs.filter(l => l.classId === c.id && l.studentId === s.id && l.status === "absent").length;
      }
    }
    return { present, notTapped, totalAbsences };
  }, [logs, activeStudents, activeClasses, today]);

  const needsAttention = useMemo(() => {
    const list: { student: Student; cls: ClassItem; absent: number; rate: number }[] = [];
    for (const c of activeClasses) {
      for (const s of activeStudents.filter(st => st.classIds.includes(c.id))) {
        const mine = logs.filter(l => l.classId === c.id && l.studentId === s.id);
        const absent = mine.filter(l => l.status === "absent").length;
        const rate = mine.length === 0 ? 0 : Math.round(((mine.length - absent) / mine.length) * 100);
        if (absent >= 3 || (mine.length >= 3 && rate < 75)) {
          list.push({ student: s, cls: c, absent, rate });
        }
      }
    }
    return list.sort((a, b) => b.absent - a.absent);
  }, [logs, activeStudents, activeClasses]);

  // Attendance rows = logs joined with student + class (archived ones are hidden)
  const rows = useMemo(() => {
    return logs
      .map(l => ({
        log: l,
        student: activeStudents.find(s => s.id === l.studentId),
        cls: activeClasses.find(c => c.id === l.classId),
      }))
      .filter((r): r is { log: Log; student: Student; cls: ClassItem } => !!r.student && !!r.cls);
  }, [logs, activeStudents, activeClasses]);

  // Rows after every filter EXCEPT the status chip (so the chip counts stay meaningful)
  // When a class is opened inside the Classes tab, only that class's records are used
  const scopeId = tab === "classes" ? openClassId : null;

  const baseRows = useMemo(() => {
    const q = fSearch.trim().toLowerCase();
    return rows.filter(r => {
      if (q && !r.student.name.toLowerCase().includes(q) && !r.student.id.includes(q)) return false;
      if (fDate !== "all" && r.log.date !== fDate) return false;
      if (scopeId) {
        if (r.cls.id !== scopeId) return false;
      } else {
        if (fClass !== "all" && r.cls.code !== fClass) return false;
        if (fSection !== "all" && r.cls.name !== fSection) return false;
        if (fYear !== "all" && String(r.cls.year) !== fYear) return false;
      }
      return true;
    });
  }, [rows, fSearch, fDate, fClass, fSection, fYear, scopeId]);

  const chipCounts = useMemo(() => {
    const c = { all: baseRows.length, present: 0, late: 0, absent: 0, incomplete: 0 };
    for (const r of baseRows) c[r.log.status]++;
    return c;
  }, [baseRows]);

  const visibleRows = useMemo(() => {
    const list = fStatus === "all" ? baseRows : baseRows.filter(r => r.log.status === fStatus);
    return [...list].sort((a, b) => {
      if (a.log.date !== b.log.date) return a.log.date < b.log.date ? 1 : -1;
      return a.student.name.localeCompare(b.student.name);
    });
  }, [baseRows, fStatus]);

  const classCodes = Array.from(new Set(activeClasses.map(c => c.code)));
  const sections = Array.from(new Set(activeClasses.map(c => c.name)));
  const years = Array.from(new Set(activeClasses.map(c => c.year))).sort();
  const dateOptions = Array.from(new Set(logs.map(l => l.date))).sort().reverse();

  /* ---- actions ---- */
  function openClass(cls: ClassItem) {
    setFStatus("all");
    setFSearch("");
    setFDate("all");
    setOpenClassId(cls.id);
    setClassView("attendance");
    setRosterSearch("");
    setTab("classes");
  }

  function exportCsv() {
    const header = ["Student", "Student ID", "Class", "Section", "Date", "Status", "Time In", "Time Out", "Duration"];
    const lines = visibleRows.map(r =>
      [
        r.student.name,
        r.student.id,
        r.cls.code,
        r.cls.name,
        fmtDay(r.log.date),
        STATUS_META[r.log.status].label,
        fmtTime(r.log.timeIn),
        fmtTime(r.log.timeOut),
        fmtDuration(r.log.timeIn, r.log.timeOut),
      ]
        .map(v => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function resetClassForm() {
    setNewName("");
    setNewCode("");
    setNewYear(1);
    setNewDays(["Mon", "Wed", "Fri"]);
    setNewStart("08:00");
    setNewEnd("09:00");
    setNewRoom("");
    setClassError("");
  }

  function openAddClass() {
    resetClassForm();
    setEditingClassId(null);
    setShowAdd(true);
  }

  function openEditClass(c: ClassItem) {
    setClassError("");
    setEditingClassId(c.id);
    setNewName(c.name);
    setNewCode(c.code);
    setNewYear(c.year);
    const parsedDays = c.schedule.replace(/\s*\d{1,2}:\d{2}.*$/, "");
    setNewDays(parsedDays.split("/").filter(d => WEEK_DAYS.includes(d)));
    setNewStart(c.start);
    setNewEnd(c.end);
    setNewRoom(c.room === "No room set" ? "" : c.room);
    setShowAdd(true);
  }

  function handleAddClass(e: FormEvent) {
    e.preventDefault();
    setClassError("");
    const name = newName.trim();
    const code = newCode.trim();
    const room = newRoom.trim();

    if (!name || !WORDS_RE.test(name)) return setClassError("Class name: letters and numbers only.");
    if (!code || !CODE_RE.test(code)) return setClassError("Subject code: letters and numbers only, no spaces.");
    if (room && !WORDS_RE.test(room)) return setClassError("Room: letters and numbers only.");
    if (name.length > MAX_LEN || code.length > MAX_LEN || room.length > MAX_LEN)
      return setClassError(`Maximum of ${MAX_LEN} characters per field.`);
    if (newDays.length === 0) return setClassError("Select at least one class day.");
    if (!newStart || !newEnd) return setClassError("Set the start and end time.");
    if (newStart < MIN_TIME || newStart > MAX_TIME || newEnd < MIN_TIME || newEnd > MAX_TIME)
      return setClassError("Class time must be between 6:00 AM and 10:00 PM.");
    if (toMin(newEnd) <= toMin(newStart)) return setClassError("End time must be after the start time.");

    const daysText = WEEK_DAYS.filter(d => newDays.includes(d)).join("/");
    const schedule = `${daysText} ${fmtTime(toMin(newStart))}-${fmtTime(toMin(newEnd))}`;
    const roomValue = room || "No room set";

    if (editingClassId) {
      setClasses(prev =>
        prev.map(c =>
          c.id === editingClassId
            ? { ...c, name, code: code.toUpperCase(), year: newYear, schedule, start: newStart, end: newEnd, room: roomValue }
            : c
        )
      );
    } else {
      setClasses(prev => [
        { id: `c${Date.now()}`, name, code: code.toUpperCase(), year: newYear, schedule, start: newStart, end: newEnd, room: roomValue, created: today },
        ...prev,
      ]);
    }
    notify(editingClassId ? `Successfully updated ${name} · ${code.toUpperCase()}.` : `Successfully added ${name} · ${code.toUpperCase()}.`);
    resetClassForm();
    setEditingClassId(null);
    setShowAdd(false);
  }

  /* ---- archive actions: classes ---- */
  function archiveClass(c: ClassItem) {
    setConfirmDlg({
      tone: "archive",
      title: "Archive this class?",
      subject: `${c.name} · ${c.code}`,
      message: "It will be hidden from your lists. You can restore it later from the Archive tab.",
      confirmLabel: "Archive",
      onConfirm: () => {
        setClasses(prev => prev.map(x => (x.id === c.id ? { ...x, archived: true } : x)));
        if (openClassId === c.id) setOpenClassId(null);
        notify(`${c.name} · ${c.code} was archived.`, "archive");
      },
    });
  }

  function restoreClass(c: ClassItem) {
    setClasses(prev => prev.map(x => (x.id === c.id ? { ...x, archived: false } : x)));
    notify(`Successfully restored ${c.name} · ${c.code}.`);
  }

  function deleteClassForever(c: ClassItem) {
    setConfirmDlg({
      tone: "delete",
      title: "Delete this class permanently?",
      subject: `${c.name} · ${c.code}`,
      message: "Its attendance records will be deleted and students will be unenrolled. This cannot be undone.",
      confirmLabel: "Delete",
      onConfirm: () => {
        setClasses(prev => prev.filter(x => x.id !== c.id));
        setStudents(prev => prev.map(x => ({ ...x, classIds: x.classIds.filter(id => id !== c.id) })));
        setLogs(prev => prev.filter(l => l.classId !== c.id));
        notify(`${c.name} · ${c.code} was permanently deleted.`, "delete");
      },
    });
  }

  /* ---- archive actions: students ---- */
  function archiveStudent(st: Student) {
    setConfirmDlg({
      tone: "archive",
      title: "Archive this student?",
      subject: st.name,
      message: "They will be hidden from all classes. You can restore them later from the Archive tab.",
      confirmLabel: "Archive",
      onConfirm: () => {
        setStudents(prev => prev.map(x => (x.id === st.id ? { ...x, archived: true } : x)));
        notify(`${st.name} was archived.`, "archive");
      },
    });
  }

  function restoreStudent(st: Student) {
    setStudents(prev => prev.map(x => (x.id === st.id ? { ...x, archived: false } : x)));
    notify(`Successfully restored ${st.name}.`);
  }

  function deleteStudentForever(st: Student) {
    setConfirmDlg({
      tone: "delete",
      title: "Delete this student permanently?",
      subject: st.name,
      message: "Their attendance records will be deleted. This cannot be undone.",
      confirmLabel: "Delete",
      onConfirm: () => {
        setStudents(prev => prev.filter(x => x.id !== st.id));
        setLogs(prev => prev.filter(l => l.studentId !== st.id));
        notify(`${st.name} was permanently deleted.`, "delete");
      },
    });
  }

  function openAddStudents() {
    setPickIds([]);
    setPickSearch("");
    setAddStudentsOpen(true);
  }

  function addPickedToClass(cls: ClassItem) {
    setStudents(prev =>
      prev.map(x => (pickIds.includes(x.id) && !x.classIds.includes(cls.id) ? { ...x, classIds: [...x.classIds, cls.id] } : x))
    );
    notify(`Successfully added ${pickIds.length} student${pickIds.length === 1 ? "" : "s"} to ${cls.name} · ${cls.code}.`);
    setAddStudentsOpen(false);
  }

  function openStudentModal(mode: StudentModalMode, st?: Student) {
    setSError("");
    if (st) {
      setSFirst(st.firstName);
      setSLast(st.lastName);
      setSEmail(st.id);
      setSProgram(st.program);
      setSYear(st.year);
      setSSection(st.section);
      setSRfid(st.rfid);
      setSClassIds(st.classIds);
    } else {
      setSFirst("");
      setSLast("");
      setSEmail("");
      setSProgram("");
      setSYear(1);
      setSSection("");
      setSRfid("");
      setSClassIds(activeClasses[0] ? [activeClasses[0].id] : []);
    }
    setStudentModal({ mode, id: st?.id });
  }

  function toggleClass(id: string) {
    setSClassIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  }

  function handleSaveStudent(e: FormEvent) {
    e.preventDefault();
    if (!studentModal) return;
    setSError("");

    const first = sFirst.trim();
    const last = sLast.trim();
    const studentNo = sEmail.trim();
    const email = `${studentNo}${EMAIL_DOMAIN}`;
    const rfid = sRfid.trim().toUpperCase();
    const adding = studentModal.mode === "add";
    const program = sProgram.trim();
    const section = sSection.trim();

    if (!first || !last) return setSError("Enter the student's first and last name.");
    if (!NAME_RE.test(first) || !NAME_RE.test(last)) return setSError("Names can only contain letters.");
    if (adding && !STUDENT_NO_RE.test(studentNo)) {
      return setSError("Student number must be 9 digits and start with 20, e.g. 202310417.");
    }
    const studentId = adding ? studentNo : studentModal.id!;
    if (adding && students.some(x => x.id === studentId)) {
      return setSError("A student with this ID is already registered.");
    }
    if (!program) return setSError("Enter the program, e.g. BSIT.");
    if (!PROGRAM_RE.test(program)) return setSError(`Program: letters only, up to ${PROGRAM_MAX} characters.`);
    if (!section) return setSError("Enter the section, e.g. BSIT 4B.");
    if (!WORDS_RE.test(section) || section.length > SECTION_MAX)
      return setSError(`Section: letters and numbers only, up to ${SECTION_MAX} characters.`);
    if (sClassIds.length === 0) return setSError("Select at least one class.");
    if (rfid) {
      if (!/^[0-9A-F]{4,16}$/.test(rfid)) {
        return setSError("RFID UID should be 4 to 16 characters using 0-9 and A-F.");
      }
      const dup = students.find(x => x.rfid === rfid && x.id !== studentId);
      if (dup) return setSError(`That card is already assigned to ${dup.name}.`);
    }

    const existing = students.find(x => x.id === studentId);
    // Keep enrollments in archived classes, since the form only shows active classes
    const keptArchivedIds = (existing?.classIds ?? []).filter(id => classes.find(c => c.id === id)?.archived);

    const next: Student = {
      id: studentId,
      firstName: first,
      lastName: last,
      name: `${first} ${last}`,
      email: adding ? email : existing?.email ?? email,
      program: program.toUpperCase(),
      year: sYear,
      section: section.toUpperCase(),
      rfid,
      classIds: [...sClassIds, ...keptArchivedIds],
      archived: existing?.archived,
    };
    setStudents(prev => (adding ? [...prev, next] : prev.map(x => (x.id === studentId ? next : x))));
    notify(adding ? `Successfully added ${next.name}.` : `Successfully updated ${next.name}.`);
    setStudentModal(null);
  }

  function exportStudentsCsv() {
    const header = ["Last name", "First name", "Student ID", "Program", "Year", "Section", "RFID UID", "Card status"];
    const lines = filteredStudents.map(st =>
      [st.lastName, st.firstName, st.id, st.program, st.year, st.section, st.rfid || "—", st.rfid ? "Registered" : "No card"]
        .map(v => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `students-${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!teacher || !dates) return null;

  const navItems: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "classes", label: "Classes", icon: Users },
    { id: "attendance", label: "Attendance", icon: ClipboardCheck },
    { id: "students", label: "Students", icon: UserPlus },
    { id: "archive", label: "Archive", icon: Archive },
  ];

  const pageTitle: Record<Tab, { title: string; sub: string }> = {
    dashboard: { title: "Dashboard", sub: "Today's RFID attendance at a glance." },
    classes: { title: "Classes", sub: "Create and manage your classes and students." },
    attendance: { title: "Attendance", sub: "RFID tap-in and tap-out records for your classes." },
    students: { title: "Students", sub: "Manage registered students and their RFID cards." },
    archive: { title: "Archive", sub: "Restore archived classes and students, or delete them for good." },
  };

  const filteredClasses = activeClasses.filter(c => {
    const q = classSearch.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q) || `year ${c.year}`.includes(q);
  });

  const filteredStudents = activeStudents.filter(s => {
    const q = search.toLowerCase();
    if (q && !s.name.toLowerCase().includes(q) && !s.id.includes(q)) return false;
    if (fsYear !== "all" && String(s.year) !== fsYear) return false;
    if (fsSection !== "all" && s.section !== fsSection) return false;
    if (fsProgram !== "all" && s.program !== fsProgram) return false;
    return true;
  });

  const studentYears = Array.from(new Set(activeStudents.map(s => s.year))).sort();
  const studentSections = Array.from(new Set(activeStudents.map(s => s.section))).sort();
  const studentPrograms = Array.from(new Set(activeStudents.map(s => s.program))).sort();

  const aq = archiveSearch.trim().toLowerCase();
  const shownArchivedStudents = archivedStudents.filter(
    s => !aq || s.name.toLowerCase().includes(aq) || s.id.includes(aq)
  );
  const shownArchivedClasses = archivedClasses.filter(
    c => !aq || c.name.toLowerCase().includes(aq) || c.code.toLowerCase().includes(aq)
  );

  // Paged slices (exports above still use the full filtered lists)
  const attPaged = paginate(visibleRows, attPage);
  const stuPaged = paginate(filteredStudents, stuPage);
  const arcStuPaged = paginate(shownArchivedStudents, arcStuPage);
  const arcClsPaged = paginate(shownArchivedClasses, arcClsPage);

  const timeText = now
    ? now.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })
    : "--:--:--";
  const dateText = now
    ? now.toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
    : "";

  const initial = (teacher.name?.trim()[0] ?? "T").toUpperCase();

  const chips: { id: StatusFilter; label: string; color?: string }[] = [
    { id: "all", label: "All records" },
    { id: "present", label: "Present", color: STATUS_META.present.color },
    { id: "late", label: "Late", color: STATUS_META.late.color },
    { id: "absent", label: "Absent", color: STATUS_META.absent.color },
    { id: "incomplete", label: "Incomplete", color: STATUS_META.incomplete.color },
  ];

  const selectWrap = "relative";
  const selectCls = "w-full appearance-none px-4 py-3 pr-10 rounded-xl text-sm font-medium outline-none";

  const recentTaps = logs
    .filter(l => l.date === today && l.timeIn !== undefined)
    .map(l => ({
      log: l,
      student: activeStudents.find(x => x.id === l.studentId),
      cls: activeClasses.find(x => x.id === l.classId),
    }))
    .filter((r): r is { log: Log; student: Student; cls: ClassItem } => !!r.student && !!r.cls)
    .sort((a, b) => (b.log.timeIn ?? 0) - (a.log.timeIn ?? 0))
    .slice(0, 6);

  const openClassItem = openClassId ? activeClasses.find(c => c.id === openClassId) ?? null : null;

  const renderAttendance = (scoped: boolean) => (
    <>
      {/* Status chips with counts */}
      <div className="flex flex-wrap gap-3">
        {chips.map(ch => {
          const active = fStatus === ch.id;
          return (
            <button
              key={ch.id}
              onClick={() => setFStatus(ch.id)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
              style={{
                background: active ? C.ink : C.surface,
                color: active ? "#fff" : C.text,
                border: `1px solid ${active ? C.ink : C.border}`,
                boxShadow: "0 1px 2px rgba(16,24,40,.05)",
              }}
            >
              {ch.color && <span className="w-2 h-2 rounded-full" style={{ background: ch.color }} />}
              {ch.label}
              <span className="font-medium" style={{ color: active ? "rgba(255,255,255,.75)" : C.muted }}>
                {chipCounts[ch.id]}
              </span>
            </button>
          );
        })}
      </div>

      <section className="rounded-2xl overflow-hidden" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
        {/* Filters */}
        <div className="p-5 space-y-3">
          <div
            className="flex items-center gap-3 rounded-xl px-4 py-3"
            style={{ background: C.surface, border: `1px solid ${C.border}` }}
          >
            <Search className="w-4 h-4 shrink-0" style={{ color: C.muted }} />
            <input
              value={fSearch}
              onChange={e => setFSearch(e.target.value)}
              maxLength={SEARCH_MAX}
              placeholder="Search student name or ID"
              className="flex-1 bg-transparent outline-none text-sm"
              style={{ color: C.text }}
            />
          </div>

          <div className={`grid sm:grid-cols-2 gap-3 ${scoped ? "" : "lg:grid-cols-4"}`}>
            <div className={selectWrap}>
              <select value={fDate} onChange={e => setFDate(e.target.value)} className={selectCls} style={inputStyle}>
                <option value="all">All dates</option>
                {dateOptions.map(d => (
                  <option key={d} value={d}>{fmtDay(d)}{d === today ? " (today)" : ""}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: C.muted }} />
            </div>
            {!scoped && (
              <>
                <div className={selectWrap}>
                  <select value={fClass} onChange={e => setFClass(e.target.value)} className={selectCls} style={inputStyle}>
                    <option value="all">All classes</option>
                    {classCodes.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: C.muted }} />
                </div>
                <div className={selectWrap}>
                  <select value={fSection} onChange={e => setFSection(e.target.value)} className={selectCls} style={inputStyle}>
                    <option value="all">All sections</option>
                    {sections.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: C.muted }} />
                </div>
                <div className={selectWrap}>
                  <select value={fYear} onChange={e => setFYear(e.target.value)} className={selectCls} style={inputStyle}>
                    <option value="all">All years</option>
                    {years.map(y => (
                      <option key={y} value={String(y)}>Year {y}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: C.muted }} />
                </div>
              </>
            )}
          </div>

          <button
            onClick={exportCsv}
            disabled={visibleRows.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
            style={{ background: C.surface, color: C.text, border: `1px solid ${C.border}`, boxShadow: "0 1px 2px rgba(16,24,40,.05)" }}
          >
            <Download className="w-4 h-4" /> Export
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className={`w-full text-sm ${scoped ? "min-w-[640px]" : "min-w-[820px]"}`}>
            <thead>
              <tr className="text-left text-xs" style={{ color: C.muted, background: C.bg }}>
                <th className="py-3 pl-5 pr-4 font-medium">Student</th>
                {!scoped && (
                  <>
                    <th className="py-3 pr-4 font-medium">Class</th>
                    <th className="py-3 pr-4 font-medium">Section</th>
                  </>
                )}
                <th className="py-3 pr-4 font-medium">Date</th>
                <th className="py-3 pr-4 font-medium">Time In</th>
                <th className="py-3 pr-4 font-medium">Time Out</th>
                <th className="py-3 pr-5 font-medium">Duration</th>
              </tr>
            </thead>
            <tbody>
              {attPaged.items.map(r => {
                const { log, student, cls } = r;
                const dash = { color: C.muted };
                return (
                  <tr key={`${log.classId}${log.date}${log.studentId}`} style={{ borderTop: `1px solid ${C.border}` }}>
                    <td className="py-3 pl-5 pr-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                          style={{ background: C.greenSoft, color: C.greenDark, border: `1px solid ${C.greenEdge}` }}
                        >
                          {initials(student.name)}
                        </div>
                        <div>
                          <p className="font-semibold" style={{ color: C.text }}>{student.name}</p>
                          <p className="text-xs" style={{ color: C.muted }}>{student.id}</p>
                        </div>
                      </div>
                    </td>
                    {!scoped && (
                      <>
                        <td className="py-3 pr-4 font-medium" style={{ color: C.text }}>{cls.code}</td>
                        <td className="py-3 pr-4 font-medium" style={{ color: C.text }}>{cls.name}</td>
                      </>
                    )}
                    <td className="py-3 pr-4 font-medium" style={{ color: C.text }}>{fmtDay(log.date)}</td>
                    <td className="py-3 pr-4 font-medium" style={log.timeIn === undefined ? dash : { color: C.text }}>
                      {fmtTime(log.timeIn)}
                    </td>
                    <td className="py-3 pr-4 font-medium" style={log.timeOut === undefined ? dash : { color: C.text }}>
                      {fmtTime(log.timeOut)}
                    </td>
                    <td className="py-3 pr-5" style={dash}>{fmtDuration(log.timeIn, log.timeOut)}</td>
                  </tr>
                );
              })}
              {visibleRows.length === 0 && (
                <tr>
                  <td colSpan={scoped ? 5 : 7} className="py-10 text-center text-sm" style={{ color: C.muted }}>
                    No attendance records match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={attPaged.page} totalPages={attPaged.totalPages} total={attPaged.total} onChange={setAttPage} />
      </section>
    </>
  );

  return (
    <div className="flex min-h-screen" style={{ background: C.bg, fontFamily: "'Poppins', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap'); @keyframes toastIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }`}</style>

      {/* ============================ SIDEBAR ============================ */}
      <aside
        className="sticky top-0 h-screen flex flex-col shrink-0 transition-[width] duration-200"
        style={{
          width: collapsed ? 76 : 256,
          background: C.surface,
          borderRight: `1px solid ${C.border}`,
        }}
      >
        <div
          className="flex items-center gap-3 px-5 relative"
          style={{ height: 76, borderBottom: `1px solid ${C.border}` }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/gclogo.png" alt="Gordon College logo" className="w-9 h-9 rounded-full object-contain shrink-0" />
          {!collapsed && (
            <span className="min-w-0 text-[11px] font-bold leading-tight tracking-tight" style={{ color: C.text }}>
              RFID-BASED STUDENT ATTENDANCE MONITORING
            </span>
          )}
          <button
            onClick={() => setCollapsed(v => !v)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="absolute -right-3 top-[64px] w-6 h-6 rounded-full flex items-center justify-center"
            style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.green }}
          >
            {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>
        </div>

        <nav className="flex-1 px-3 pt-6 space-y-1">
          {navItems.map(n => {
            const Icon = n.icon;
            const active = tab === n.id;
            return (
              <button
                key={n.id}
                onClick={() => {
                  setTab(n.id);
                  if (n.id === "classes") setOpenClassId(null);
                }}
                title={n.label}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-left"
                style={{
                  background: active ? C.greenSoft : "transparent",
                  color: active ? C.green : C.muted,
                  borderLeft: active ? `3px solid ${C.green}` : "3px solid transparent",
                }}
              >
                <Icon className="w-[18px] h-[18px] shrink-0" />
                {!collapsed && <span>{n.label}</span>}
              </button>
            );
          })}
        </nav>

        <div style={{ borderTop: `1px solid ${C.border}` }}>
          <div className="flex items-center gap-3 px-5 py-4">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold text-white shrink-0"
              style={{ background: C.green }}
            >
              {initial}
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: C.text }}>{teacher.name}</p>
                <p className="text-[11px] font-medium uppercase truncate" style={{ color: C.muted }}>Instructor</p>
              </div>
            )}
          </div>
          <div className="px-3 pb-4" style={{ borderTop: `1px solid ${C.border}` }}>
            <button
              onClick={() => setConfirmSignOut(true)}
              title="Sign out"
              className="w-full flex items-center gap-3 px-3 py-2.5 mt-2 rounded-lg text-sm font-medium"
              style={{ color: C.red }}
            >
              <LogOut className="w-[18px] h-[18px] shrink-0" />
              {!collapsed && <span>Sign out</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* ============================== MAIN ============================== */}
      <main className="flex-1 min-w-0 px-4 sm:px-10 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Page header with live clock */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: C.text }}>{pageTitle[tab].title}</h1>
              <p className="text-sm mt-1" style={{ color: C.muted }}>{pageTitle[tab].sub}</p>
            </div>

            <div className="flex items-center gap-3">
              {tab === "dashboard" && (
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
              )}
              {tab === "classes" && !openClassId && (
                <button
                  onClick={openAddClass}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white"
                  style={{ background: C.green }}
                >
                  <Plus className="w-4 h-4" /> Add Class
                </button>
              )}
            </div>
          </div>

          {/* ============================ DASHBOARD ============================ */}
          {tab === "dashboard" && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                {[
                  { label: "Classes", value: activeClasses.length, icon: BookOpen, color: C.green, soft: C.greenSoft },
                  { label: "Students", value: activeStudents.length, icon: Users, color: C.blue, soft: C.blueSoft },
                  { label: "Present today", value: overview.present, icon: CheckCircle2, color: C.green, soft: C.greenSoft },
                  { label: "Not yet tapped", value: overview.notTapped, icon: Clock, color: "#d97706", soft: "#fef3c7" },
                  { label: "Total absences", value: overview.totalAbsences, icon: AlertTriangle, color: C.red, soft: "#fee2e2" },
                ].map(st => {
                  const Icon = st.icon;
                  return (
                    <div key={st.label} className="rounded-2xl p-4 flex items-center gap-3" style={cardStyle}>
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: st.soft }}>
                        <Icon className="w-5 h-5" style={{ color: st.color }} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate" style={{ color: C.muted }}>{st.label}</p>
                        <p className="text-2xl font-bold leading-tight" style={{ color: C.text }}>{st.value}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div>
                <h2 className="text-base font-semibold mb-3" style={{ color: C.text }}>Today&apos;s attendance by class</h2>
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {activeClasses.map(c => {
                    const roster = classStudents(c.id);
                    const todays = logs.filter(l => l.classId === c.id && l.date === today && roster.some(x => x.id === l.studentId));
                    const present = todays.filter(l => l.status === "present").length;
                    const late = todays.filter(l => l.status === "late").length;
                    const notTapped = Math.max(roster.length - present - late, 0);
                    const total = roster.length || 1;
                    const avg = roster.length
                      ? Math.round(roster.reduce((sum, x) => sum + pairStats(c.id, x.id).rate, 0) / roster.length)
                      : 0;
                    return (
                      <div key={c.id} className="rounded-2xl p-5 flex flex-col" style={cardStyle}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: C.greenSoft }}>
                              <GraduationCap className="w-5 h-5" style={{ color: C.green }} />
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold truncate" style={{ color: C.text }}>{c.name}</p>
                              <p className="text-xs font-semibold" style={{ color: C.muted }}>{c.code}</p>
                            </div>
                          </div>
                          <span
                            className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide shrink-0"
                            style={{ background: C.greenSoft, color: C.greenDark, border: `1px solid ${C.greenEdge}` }}
                          >
                            Year {c.year}
                          </span>
                        </div>

                        <p className="flex items-center gap-1.5 text-xs mt-3" style={{ color: C.muted }}>
                          <Clock className="w-3.5 h-3.5 shrink-0" /> {c.schedule} · {c.room}
                        </p>

                        <div className="mt-4 flex h-2.5 rounded-full overflow-hidden" style={{ background: "#e5e7eb" }}>
                          <div style={{ width: `${(present / total) * 100}%`, background: STATUS_META.present.color }} />
                          <div style={{ width: `${(late / total) * 100}%`, background: STATUS_META.late.color }} />
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 mb-5 text-xs font-medium">
                          <span className="flex items-center gap-1.5" style={{ color: C.text }}>
                            <span className="w-2 h-2 rounded-full" style={{ background: STATUS_META.present.color }} /> {present} present
                          </span>
                          <span className="flex items-center gap-1.5" style={{ color: C.text }}>
                            <span className="w-2 h-2 rounded-full" style={{ background: STATUS_META.late.color }} /> {late} late
                          </span>
                          <span className="flex items-center gap-1.5" style={{ color: C.muted }}>
                            <span className="w-2 h-2 rounded-full" style={{ background: "#d1d5db" }} /> {notTapped} not yet tapped
                          </span>
                        </div>

                        <div
                          className="flex items-center justify-between mt-auto pt-4"
                          style={{ borderTop: `1px solid ${C.border}` }}
                        >
                          <div>
                            <p className="text-[11px]" style={{ color: C.muted }}>Average attendance</p>
                            <p className="text-sm font-bold" style={{ color: avg < 75 && roster.length ? C.red : C.text }}>
                              {roster.length ? `${avg}%` : "—"}
                              <span className="font-medium text-xs" style={{ color: C.muted }}> · {roster.length} students</span>
                            </p>
                          </div>
                          <button
                            onClick={() => openClass(c)}
                            className="flex items-center gap-1 text-xs font-semibold"
                            style={{ color: C.green }}
                          >
                            View class <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid lg:grid-cols-3 gap-5">
                <section className="lg:col-span-2 rounded-2xl overflow-hidden" style={cardStyle}>
                  <div className="p-5 pb-4">
                    <h2 className="font-semibold" style={{ color: C.text }}>Students to monitor</h2>
                    <p className="text-xs mt-0.5" style={{ color: C.muted }}>
                      3 or more absences, or an attendance rate below 75%.
                    </p>
                  </div>
                  {needsAttention.length === 0 ? (
                    <p className="text-sm px-5 pb-6" style={{ color: C.muted }}>No students need attention right now.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm min-w-[480px]">
                        <thead>
                          <tr className="text-left text-xs" style={{ color: C.muted, background: C.bg }}>
                            <th className="py-2.5 pl-5 pr-4 font-medium">Student</th>
                            <th className="py-2.5 pr-4 font-medium">Class</th>
                            <th className="py-2.5 pr-4 font-medium">Absences</th>
                            <th className="py-2.5 pr-5 font-medium">Attendance rate</th>
                          </tr>
                        </thead>
                        <tbody>
                          {needsAttention.map(n => (
                            <tr key={n.student.id + n.cls.id} style={{ borderTop: `1px solid ${C.border}` }}>
                              <td className="py-3 pl-5 pr-4">
                                <div className="flex items-center gap-3">
                                  <div
                                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                                    style={{ background: C.greenSoft, color: C.greenDark, border: `1px solid ${C.greenEdge}` }}
                                  >
                                    {initials(n.student.name)}
                                  </div>
                                  <div>
                                    <p className="font-semibold" style={{ color: C.text }}>{n.student.name}</p>
                                    <p className="text-xs" style={{ color: C.muted }}>{n.student.id}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 pr-4 font-medium" style={{ color: C.text }}>{n.cls.name}</td>
                              <td className="py-3 pr-4">
                                <span
                                  className="px-2.5 py-1 rounded-full text-xs font-semibold"
                                  style={{ background: "#fee2e2", color: C.red }}
                                >
                                  {n.absent}
                                </span>
                              </td>
                              <td className="py-3 pr-5">
                                <div className="flex items-center gap-2">
                                  <div className="h-2 w-24 rounded-full" style={{ background: "#e5e7eb" }}>
                                    <div className="h-2 rounded-full" style={{ width: `${n.rate}%`, background: n.rate < 75 ? C.red : C.green }} />
                                  </div>
                                  <span className="text-xs font-semibold w-9" style={{ color: C.text }}>{n.rate}%</span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>

                <section className="rounded-2xl p-5" style={cardStyle}>
                  <h2 className="font-semibold" style={{ color: C.text }}>Recent taps today</h2>
                  <p className="text-xs mt-0.5 mb-4" style={{ color: C.muted }}>Latest RFID tap-ins across your classes.</p>
                  {recentTaps.length === 0 ? (
                    <p className="text-sm" style={{ color: C.muted }}>No taps yet today.</p>
                  ) : (
                    <ul className="space-y-3">
                      {recentTaps.map(r => (
                        <li key={`${r.log.classId}${r.log.studentId}`} className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                            style={{ background: C.greenSoft, color: C.greenDark, border: `1px solid ${C.greenEdge}` }}
                          >
                            {initials(r.student.name)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold truncate" style={{ color: C.text }}>{r.student.name}</p>
                            <p className="text-xs truncate" style={{ color: C.muted }}>{r.cls.name} · {r.cls.code}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs font-semibold" style={{ color: C.text }}>{fmtTime(r.log.timeIn)}</p>
                            <p className="text-[11px] font-medium" style={{ color: STATUS_META[r.log.status].color }}>
                              {r.log.status === "late" ? "Late" : "On time"}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>
            </>
          )}

          {/* ============================== CLASSES ============================== */}
          {tab === "classes" && !openClassId && (
            <>
              <div
                className="flex items-center gap-3 rounded-xl px-4 py-3.5"
                style={{ background: C.surface, border: `1px solid ${C.border}` }}
              >
                <Search className="w-4 h-4 shrink-0" style={{ color: C.muted }} />
                <input
                  value={classSearch}
                  onChange={e => setClassSearch(e.target.value)}
                  maxLength={SEARCH_MAX}
                  placeholder="Search classes by name, course, or year..."
                  className="flex-1 bg-transparent outline-none text-sm font-medium"
                  style={{ color: C.text }}
                />
              </div>

              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredClasses.map(c => {
                  const count = classStudents(c.id).length;
                  return (
                    <button
                      key={c.id}
                      onClick={() => openClass(c)}
                      className="text-left rounded-2xl p-6"
                      style={cardStyle}
                    >
                      <div className="flex items-start justify-between">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center"
                          style={{ background: C.greenSoft }}
                        >
                          <GraduationCap className="w-6 h-6" style={{ color: C.green }} />
                        </div>
                        <span
                          className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide"
                          style={{ background: C.greenSoft, color: C.greenDark, border: `1px solid ${C.greenEdge}` }}
                        >
                          Year {c.year}
                        </span>
                      </div>

                      <h3 className="mt-5 text-lg font-bold" style={{ color: C.text }}>{c.name}</h3>
                      <p className="text-sm font-semibold mt-1" style={{ color: C.muted }}>{c.code}</p>
                      <p className="flex items-center gap-2 text-xs font-medium mt-3" style={{ color: C.muted }}>
                        <CalendarDays className="w-3.5 h-3.5" /> {fmtDay(c.created)}
                      </p>

                      <div
                        className="flex items-center justify-between mt-5 pt-4"
                        style={{ borderTop: `1px solid ${C.border}` }}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center"
                            style={{ background: C.blueSoft }}
                          >
                            <Users className="w-4 h-4" style={{ color: C.blue }} />
                          </div>
                          <span className="text-sm font-bold" style={{ color: C.text }}>
                            {count}{" "}
                            <span className="text-[10px] font-semibold uppercase" style={{ color: C.muted }}>
                              {count === 1 ? "Student" : "Students"}
                            </span>
                          </span>
                        </div>
                        <ClipboardCheck className="w-4 h-4" style={{ color: C.muted }} />
                      </div>
                    </button>
                  );
                })}
              </div>

              {filteredClasses.length === 0 && (
                <p className="text-sm text-center py-10" style={{ color: C.muted }}>
                  No classes match your search. Try a different name or use Add Class.
                </p>
              )}
            </>
          )}

          {tab === "classes" && openClassItem && (() => {
            const roster = classStudents(openClassItem.id);
            const q = rosterSearch.trim().toLowerCase();
            const shownRoster = roster.filter(x => !q || x.name.toLowerCase().includes(q) || x.id.includes(q));
            const rosterPaged = paginate(shownRoster, rosterPage);
            return (
              <>
                <button
                  onClick={() => setOpenClassId(null)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold"
                  style={{ background: C.surface, color: C.text, border: `1px solid ${C.border}`, boxShadow: "0 1px 2px rgba(16,24,40,.05)" }}
                >
                  <ChevronLeft className="w-4 h-4" /> Back to classes
                </button>

                <div className="rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4" style={cardStyle}>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: C.greenSoft }}>
                      <GraduationCap className="w-6 h-6" style={{ color: C.green }} />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold" style={{ color: C.text }}>
                        {openClassItem.name} <span className="font-semibold" style={{ color: C.muted }}>· {openClassItem.code}</span>
                      </h2>
                      <p className="text-xs" style={{ color: C.muted }}>
                        Year {openClassItem.year} · {openClassItem.room} · {openClassItem.schedule}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => openEditClass(openClassItem)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
                      style={{ background: C.surface, color: C.text, border: `1px solid ${C.border}`, boxShadow: "0 1px 2px rgba(16,24,40,.05)" }}
                    >
                      <Pencil className="w-4 h-4" /> Edit class
                    </button>
                    <button
                      onClick={() => archiveClass(openClassItem)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
                      style={{ background: C.amberSoft, color: C.amber, border: `1px solid ${C.amberSoft}` }}
                    >
                      <Archive className="w-4 h-4" /> Archive class
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  {([
                    { id: "attendance", label: "Attendance", icon: ClipboardCheck },
                    { id: "students", label: `Students ${roster.length}`, icon: Users },
                  ] as const).map(t => {
                    const Icon = t.icon;
                    const active = classView === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => setClassView(t.id)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
                        style={{
                          background: active ? C.ink : C.surface,
                          color: active ? "#fff" : C.text,
                          border: `1px solid ${active ? C.ink : C.border}`,
                          boxShadow: "0 1px 2px rgba(16,24,40,.05)",
                        }}
                      >
                        <Icon className="w-4 h-4" /> {t.label}
                      </button>
                    );
                  })}
                </div>

                {classView === "attendance" ? (
                  renderAttendance(true)
                ) : (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <button
                        onClick={openAddStudents}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
                        style={{ background: C.green }}
                      >
                        <UserPlus className="w-4 h-4" /> Add students
                      </button>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: C.muted }} />
                        <input
                          value={rosterSearch}
                          onChange={e => setRosterSearch(e.target.value)}
                          maxLength={SEARCH_MAX}
                          placeholder="Search name or ID"
                          className="pl-9 pr-3 py-2.5 rounded-xl text-sm outline-none"
                          style={inputStyle}
                        />
                      </div>
                    </div>

                    <section className="rounded-2xl overflow-hidden" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm min-w-[760px]">
                          <thead>
                            <tr className="text-left text-xs" style={{ color: C.muted, background: C.bg }}>
                              <th className="py-3 pl-5 pr-4 font-medium">Student</th>
                              <th className="py-3 pr-4 font-medium">Student ID</th>
                              <th className="py-3 pr-4 font-medium">Section</th>
                              <th className="py-3 pr-4 font-medium">RFID UID</th>
                              <th className="py-3 pr-4 font-medium">Card status</th>
                              <th className="py-3 pr-5 font-medium text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rosterPaged.items.map(st => (
                              <tr key={st.id} style={{ borderTop: `1px solid ${C.border}` }}>
                                <td className="py-3 pl-5 pr-4">
                                  <div className="flex items-center gap-3">
                                    <div
                                      className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                                      style={{ background: C.greenSoft, color: C.greenDark, border: `1px solid ${C.greenEdge}` }}
                                    >
                                      {initials(st.name)}
                                    </div>
                                    <span className="font-semibold" style={{ color: C.text }}>{st.lastName}, {st.firstName}</span>
                                  </div>
                                </td>
                                <td className="py-3 pr-4" style={{ color: C.muted }}>{st.id}</td>
                                <td className="py-3 pr-4 font-medium" style={{ color: C.text }}>{st.section}</td>
                                <td className="py-3 pr-4 font-mono text-xs font-semibold" style={{ color: st.rfid ? C.text : C.muted }}>
                                  {st.rfid || "—"}
                                </td>
                                <td className="py-3 pr-4">
                                  <span
                                    className="px-2.5 py-1 rounded-full text-xs font-semibold"
                                    style={st.rfid ? { background: C.greenSoft, color: C.greenDark } : { background: "#f3f4f6", color: C.muted }}
                                  >
                                    {st.rfid ? "Registered" : "No card"}
                                  </span>
                                </td>
                                <td className="py-3 pr-5">
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      onClick={() => openStudentModal("edit", st)}
                                      title="Edit student"
                                      aria-label={`Edit ${st.name}`}
                                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                                      style={{ color: C.text, background: "#f3f4f6" }}
                                    >
                                      <Pencil className="w-3.5 h-3.5" /> Edit
                                    </button>
                                    <button
                                      onClick={() => archiveStudent(st)}
                                      title="Archive student"
                                      aria-label={`Archive ${st.name}`}
                                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                                      style={{ color: C.amber, background: C.amberSoft }}
                                    >
                                      <Archive className="w-3.5 h-3.5" /> Archive
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                            {shownRoster.length === 0 && (
                              <tr>
                                <td colSpan={6} className="py-10 text-center text-sm" style={{ color: C.muted }}>
                                  {roster.length === 0
                                    ? "No students in this class yet. Use Add students to enroll some."
                                    : "No students match your search."}
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                      <Pagination page={rosterPaged.page} totalPages={rosterPaged.totalPages} total={rosterPaged.total} onChange={setRosterPage} />
                    </section>
                  </>
                )}
              </>
            );
          })()}

          {/* ============================ ATTENDANCE ============================ */}
          {tab === "attendance" && renderAttendance(false)}

          {/* ============================== STUDENTS ============================== */}
          {tab === "students" && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={exportStudentsCsv}
                    disabled={filteredStudents.length === 0}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
                    style={{ background: C.surface, color: C.text, border: `1px solid ${C.border}`, boxShadow: "0 1px 2px rgba(16,24,40,.05)" }}
                  >
                    <Download className="w-4 h-4" /> Export
                  </button>
                  <button
                    onClick={() => openStudentModal("add")}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
                    style={{ background: C.green }}
                  >
                    <Plus className="w-4 h-4" /> Add student
                  </button>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: C.muted }} />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    maxLength={SEARCH_MAX}
                    placeholder="Search name or ID"
                    className="pl-9 pr-3 py-2.5 rounded-xl text-sm outline-none"
                    style={inputStyle}
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-3">
                <div className={selectWrap}>
                  <select value={fsYear} onChange={e => setFsYear(e.target.value)} className={selectCls} style={inputStyle}>
                    <option value="all">All years</option>
                    {studentYears.map(y => (
                      <option key={y} value={String(y)}>Year {y}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: C.muted }} />
                </div>
                <div className={selectWrap}>
                  <select value={fsSection} onChange={e => setFsSection(e.target.value)} className={selectCls} style={inputStyle}>
                    <option value="all">All sections</option>
                    {studentSections.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: C.muted }} />
                </div>
                <div className={selectWrap}>
                  <select value={fsProgram} onChange={e => setFsProgram(e.target.value)} className={selectCls} style={inputStyle}>
                    <option value="all">All programs</option>
                    {studentPrograms.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: C.muted }} />
                </div>
              </div>

              <section className="rounded-2xl overflow-hidden" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[900px]">
                    <thead>
                      <tr className="text-left text-xs" style={{ color: C.muted, background: C.bg }}>
                        <th className="py-3 pl-5 pr-4 font-medium">Student</th>
                        <th className="py-3 pr-4 font-medium">Student ID</th>
                        <th className="py-3 pr-4 font-medium">Program</th>
                        <th className="py-3 pr-4 font-medium">Year</th>
                        <th className="py-3 pr-4 font-medium">Section</th>
                        <th className="py-3 pr-4 font-medium">RFID UID</th>
                        <th className="py-3 pr-4 font-medium">Card status</th>
                        <th className="py-3 pr-5 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stuPaged.items.map(st => (
                        <tr key={st.id} style={{ borderTop: `1px solid ${C.border}` }}>
                          <td className="py-3 pl-5 pr-4">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                                style={{ background: C.greenSoft, color: C.greenDark, border: `1px solid ${C.greenEdge}` }}
                              >
                                {initials(st.name)}
                              </div>
                              <span className="font-semibold" style={{ color: C.text }}>{st.lastName}, {st.firstName}</span>
                            </div>
                          </td>
                          <td className="py-3 pr-4" style={{ color: C.muted }}>{st.id}</td>
                          <td className="py-3 pr-4 font-medium" style={{ color: C.text }}>{st.program}</td>
                          <td className="py-3 pr-4 font-medium" style={{ color: C.text }}>{st.year}</td>
                          <td className="py-3 pr-4 font-medium" style={{ color: C.text }}>{st.section}</td>
                          <td className="py-3 pr-4 font-mono text-xs font-semibold" style={{ color: st.rfid ? C.text : C.muted }}>
                            {st.rfid || "—"}
                          </td>
                          <td className="py-3 pr-4">
                            <span
                              className="px-2.5 py-1 rounded-full text-xs font-semibold"
                              style={
                                st.rfid
                                  ? { background: C.greenSoft, color: C.greenDark }
                                  : { background: "#f3f4f6", color: C.muted }
                              }
                            >
                              {st.rfid ? "Registered" : "No card"}
                            </span>
                          </td>
                          <td className="py-3 pr-5">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => openStudentModal("view", st)}
                                title="View student"
                                aria-label={`View ${st.name}`}
                                className="p-2 rounded-md"
                                style={{ color: C.muted }}
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => openStudentModal("edit", st)}
                                title="Edit student"
                                aria-label={`Edit ${st.name}`}
                                className="p-2 rounded-md"
                                style={{ color: C.muted }}
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => archiveStudent(st)}
                                title="Archive student"
                                aria-label={`Archive ${st.name}`}
                                className="p-2 rounded-md"
                                style={{ color: C.muted }}
                              >
                                <Archive className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredStudents.length === 0 && (
                        <tr>
                          <td colSpan={8} className="py-10 text-center text-sm" style={{ color: C.muted }}>
                            No students match your search.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <Pagination page={stuPaged.page} totalPages={stuPaged.totalPages} total={stuPaged.total} onChange={setStuPage} />
              </section>
            </>
          )}

          {/* ============================== ARCHIVE ============================== */}
          {tab === "archive" && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-3">
                  {([
                    { id: "students", label: `Students ${archivedStudents.length}`, icon: Users },
                    { id: "classes", label: `Classes ${archivedClasses.length}`, icon: GraduationCap },
                  ] as const).map(t => {
                    const Icon = t.icon;
                    const active = archiveView === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => setArchiveView(t.id)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
                        style={{
                          background: active ? C.ink : C.surface,
                          color: active ? "#fff" : C.text,
                          border: `1px solid ${active ? C.ink : C.border}`,
                          boxShadow: "0 1px 2px rgba(16,24,40,.05)",
                        }}
                      >
                        <Icon className="w-4 h-4" /> {t.label}
                      </button>
                    );
                  })}
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: C.muted }} />
                  <input
                    value={archiveSearch}
                    onChange={e => setArchiveSearch(e.target.value)}
                    maxLength={SEARCH_MAX}
                    placeholder={archiveView === "students" ? "Search name or ID" : "Search class or code"}
                    className="pl-9 pr-3 py-2.5 rounded-xl text-sm outline-none"
                    style={inputStyle}
                  />
                </div>
              </div>

              {archiveView === "students" ? (
                <section className="rounded-2xl overflow-hidden" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[720px]">
                      <thead>
                        <tr className="text-left text-xs" style={{ color: C.muted, background: C.bg }}>
                          <th className="py-3 pl-5 pr-4 font-medium">Student</th>
                          <th className="py-3 pr-4 font-medium">Student ID</th>
                          <th className="py-3 pr-4 font-medium">Program</th>
                          <th className="py-3 pr-4 font-medium">Section</th>
                          <th className="py-3 pr-5 font-medium text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {arcStuPaged.items.map(st => (
                          <tr key={st.id} style={{ borderTop: `1px solid ${C.border}` }}>
                            <td className="py-3 pl-5 pr-4">
                              <div className="flex items-center gap-3">
                                <div
                                  className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                                  style={{ background: "#f3f4f6", color: C.muted }}
                                >
                                  {initials(st.name)}
                                </div>
                                <span className="font-semibold" style={{ color: C.text }}>{st.lastName}, {st.firstName}</span>
                              </div>
                            </td>
                            <td className="py-3 pr-4" style={{ color: C.muted }}>{st.id}</td>
                            <td className="py-3 pr-4 font-medium" style={{ color: C.text }}>{st.program}</td>
                            <td className="py-3 pr-4 font-medium" style={{ color: C.text }}>{st.section}</td>
                            <td className="py-3 pr-5">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => restoreStudent(st)}
                                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                                  style={{ color: C.greenDark, background: C.greenSoft }}
                                >
                                  <ArchiveRestore className="w-3.5 h-3.5" /> Restore
                                </button>
                                <button
                                  onClick={() => deleteStudentForever(st)}
                                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                                  style={{ color: C.red, background: "#fef2f2" }}
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {shownArchivedStudents.length === 0 && (
                          <tr>
                            <td colSpan={5} className="py-10 text-center text-sm" style={{ color: C.muted }}>
                              {archivedStudents.length === 0
                                ? "No archived students. Archive a student from the Students tab or a class roster."
                                : "No archived students match your search."}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <Pagination page={arcStuPaged.page} totalPages={arcStuPaged.totalPages} total={arcStuPaged.total} onChange={setArcStuPage} />
                </section>
              ) : (
                <section className="rounded-2xl overflow-hidden" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[760px]">
                      <thead>
                        <tr className="text-left text-xs" style={{ color: C.muted, background: C.bg }}>
                          <th className="py-3 pl-5 pr-4 font-medium">Class</th>
                          <th className="py-3 pr-4 font-medium">Subject code</th>
                          <th className="py-3 pr-4 font-medium">Year</th>
                          <th className="py-3 pr-4 font-medium">Schedule</th>
                          <th className="py-3 pr-4 font-medium">Students</th>
                          <th className="py-3 pr-5 font-medium text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {arcClsPaged.items.map(c => (
                          <tr key={c.id} style={{ borderTop: `1px solid ${C.border}` }}>
                            <td className="py-3 pl-5 pr-4">
                              <div className="flex items-center gap-3">
                                <div
                                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                                  style={{ background: "#f3f4f6" }}
                                >
                                  <GraduationCap className="w-4 h-4" style={{ color: C.muted }} />
                                </div>
                                <span className="font-semibold" style={{ color: C.text }}>{c.name}</span>
                              </div>
                            </td>
                            <td className="py-3 pr-4 font-medium" style={{ color: C.text }}>{c.code}</td>
                            <td className="py-3 pr-4 font-medium" style={{ color: C.text }}>Year {c.year}</td>
                            <td className="py-3 pr-4" style={{ color: C.muted }}>{c.schedule} · {c.room}</td>
                            <td className="py-3 pr-4 font-medium" style={{ color: C.text }}>
                              {students.filter(s => !s.archived && s.classIds.includes(c.id)).length}
                            </td>
                            <td className="py-3 pr-5">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => restoreClass(c)}
                                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                                  style={{ color: C.greenDark, background: C.greenSoft }}
                                >
                                  <ArchiveRestore className="w-3.5 h-3.5" /> Restore
                                </button>
                                <button
                                  onClick={() => deleteClassForever(c)}
                                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                                  style={{ color: C.red, background: "#fef2f2" }}
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {shownArchivedClasses.length === 0 && (
                          <tr>
                            <td colSpan={6} className="py-10 text-center text-sm" style={{ color: C.muted }}>
                              {archivedClasses.length === 0
                                ? "No archived classes. Open a class and use Archive class."
                                : "No archived classes match your search."}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <Pagination page={arcClsPaged.page} totalPages={arcClsPaged.totalPages} total={arcClsPaged.total} onChange={setArcClsPage} />
                </section>
              )}
            </>
          )}
        </div>
      </main>

      {/* ============================ SIGN OUT CONFIRMATION ============================ */}
      {confirmSignOut && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(17,24,39,.45)" }}
          onClick={() => setConfirmSignOut(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-6"
            style={{ background: C.surface }}
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="signout-title"
          >
            <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: "#fee2e2" }}>
              <LogOut className="w-5 h-5" style={{ color: C.red }} />
            </div>
            <h2 id="signout-title" className="text-lg font-bold" style={{ color: C.text }}>Sign out?</h2>
            <p className="text-sm mt-1" style={{ color: C.muted }}>
              You will need to sign in again to view your classes and attendance records.
            </p>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setConfirmSignOut(false)}
                className="px-4 py-2.5 rounded-lg text-sm font-medium"
                style={{ background: C.bg, color: C.muted, border: `1px solid ${C.border}` }}
              >
                Cancel
              </button>
              <button
                onClick={logout}
                className="px-4 py-2.5 rounded-lg text-sm font-semibold text-white"
                style={{ background: C.red }}
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================ ARCHIVE / DELETE CONFIRMATION ============================ */}
      {confirmDlg && (() => {
        const isDelete = confirmDlg.tone === "delete";
        const accent = isDelete ? C.red : C.amber;
        const soft = isDelete ? "#fee2e2" : C.amberSoft;
        const Icon = isDelete ? Trash2 : Archive;
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(17,24,39,.45)" }}
            onClick={() => setConfirmDlg(null)}
          >
            <div
              className="w-full max-w-sm rounded-2xl p-6 text-center"
              style={{ background: C.surface, boxShadow: "0 20px 40px rgba(16,24,40,.18)", animation: "toastIn .2s ease-out" }}
              onClick={e => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="confirm-title"
            >
              <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: soft }}>
                <Icon className="w-6 h-6" style={{ color: accent }} />
              </div>
              <h2 id="confirm-title" className="text-lg font-bold" style={{ color: C.text }}>{confirmDlg.title}</h2>
              <p
                className="inline-block max-w-full truncate text-sm font-semibold mt-2 px-3 py-1 rounded-lg"
                style={{ background: C.bg, color: C.text, border: `1px solid ${C.border}` }}
              >
                {confirmDlg.subject}
              </p>
              <p className="text-sm mt-3" style={{ color: C.muted }}>{confirmDlg.message}</p>
              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => setConfirmDlg(null)}
                  className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium"
                  style={{ background: C.bg, color: C.muted, border: `1px solid ${C.border}` }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    confirmDlg.onConfirm();
                    setConfirmDlg(null);
                  }}
                  className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-white"
                  style={{ background: accent }}
                >
                  {confirmDlg.confirmLabel}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ============================ TOAST ============================ */}
      {toast && (() => {
        const meta = {
          success: { Icon: CheckCircle2, color: C.green, soft: C.greenSoft },
          archive: { Icon: Archive, color: C.amber, soft: C.amberSoft },
          delete: { Icon: Trash2, color: C.red, soft: "#fee2e2" },
        }[toast.kind];
        const Icon = meta.Icon;
        return (
          <div
            role="status"
            aria-live="polite"
            className="fixed bottom-6 right-6 z-[60] flex items-center gap-3 rounded-xl pl-3 pr-2 py-3 max-w-sm"
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              boxShadow: "0 8px 24px rgba(16,24,40,.12)",
              animation: "toastIn .2s ease-out",
            }}
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: meta.soft }}>
              <Icon className="w-4 h-4" style={{ color: meta.color }} />
            </div>
            <p className="text-sm font-medium" style={{ color: C.text }}>{toast.msg}</p>
            <button onClick={() => setToast(null)} aria-label="Dismiss" className="p-1.5 rounded-md shrink-0" style={{ color: C.muted }}>
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })()}

      {/* ============================ ADD CLASS MODAL ============================ */}
      {showAdd && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(17,24,39,.45)" }}
          onClick={() => setShowAdd(false)}
        >
          <div
            className="w-full max-w-md max-h-[90vh] overflow-y-auto overflow-x-hidden rounded-2xl p-6"
            style={{ background: C.surface }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold" style={{ color: C.text }}>{editingClassId ? "Edit class" : "Add class"}</h2>
              <button onClick={() => setShowAdd(false)} aria-label="Close" style={{ color: C.muted }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddClass} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="min-w-0">
                  <label className="block text-sm font-medium mb-1.5" style={{ color: C.muted }}>Class name</label>
                  <input
                    value={newName}
                    onChange={e => setNewName(cleanWords(e.target.value))}
                    maxLength={MAX_LEN}
                    placeholder="BSIT 3"
                    className="w-full min-w-0 px-3 py-2.5 rounded-lg text-sm outline-none"
                    style={inputStyle}
                  />
                </div>
                <div className="min-w-0">
                  <label className="block text-sm font-medium mb-1.5" style={{ color: C.muted }}>Subject code</label>
                  <input
                    value={newCode}
                    onChange={e => setNewCode(cleanCode(e.target.value))}
                    maxLength={MAX_LEN}
                    placeholder="ITP415"
                    className="w-full min-w-0 px-3 py-2.5 rounded-lg text-sm outline-none"
                    style={inputStyle}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="min-w-0">
                  <label className="block text-sm font-medium mb-1.5" style={{ color: C.muted }}>Year level</label>
                  <select
                    value={newYear}
                    onChange={e => setNewYear(Number(e.target.value))}
                    className="w-full min-w-0 px-3 py-2.5 rounded-lg text-sm outline-none"
                    style={inputStyle}
                  >
                    {[1, 2, 3, 4].map(y => (
                      <option key={y} value={y}>Year {y}</option>
                    ))}
                  </select>
                </div>
                <div className="min-w-0">
                  <label className="block text-sm font-medium mb-1.5" style={{ color: C.muted }}>Room</label>
                  <input
                    value={newRoom}
                    onChange={e => setNewRoom(cleanWords(e.target.value))}
                    maxLength={MAX_LEN}
                    placeholder="Room 201"
                    className="w-full min-w-0 px-3 py-2.5 rounded-lg text-sm outline-none"
                    style={inputStyle}
                  />
                </div>
              </div>

              <div className="min-w-0">
                <label className="block text-sm font-medium mb-1.5" style={{ color: C.muted }}>Days</label>
                <div className="grid grid-cols-3 gap-2">
                  {WEEK_DAYS.map(d => {
                    const checked = newDays.includes(d);
                    return (
                      <label
                        key={d}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer min-w-0"
                        style={{
                          border: `1px solid ${checked ? C.green : C.border}`,
                          background: checked ? C.greenSoft : C.surface,
                          color: C.text,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setNewDays(prev => (prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]))
                          }
                          style={{ accentColor: C.green }}
                        />
                        <span>{d}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="min-w-0">
                  <label className="block text-sm font-medium mb-1.5" style={{ color: C.muted }}>Start time</label>
                  <input
                    type="time"
                    value={newStart}
                    min={MIN_TIME}
                    max={MAX_TIME}
                    onChange={e => setNewStart(e.target.value)}
                    className="w-full min-w-0 px-3 py-2.5 rounded-lg text-sm outline-none"
                    style={inputStyle}
                  />
                </div>
                <div className="min-w-0">
                  <label className="block text-sm font-medium mb-1.5" style={{ color: C.muted }}>End time</label>
                  <input
                    type="time"
                    value={newEnd}
                    min={MIN_TIME}
                    max={MAX_TIME}
                    onChange={e => setNewEnd(e.target.value)}
                    className="w-full min-w-0 px-3 py-2.5 rounded-lg text-sm outline-none"
                    style={inputStyle}
                  />
                </div>
              </div>
              <p className="text-xs" style={{ color: C.muted }}>Classes run from 6:00 AM to 10:00 PM.</p>

              {classError && <p className="text-sm" style={{ color: C.red }}>{classError}</p>}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="px-4 py-2.5 rounded-lg text-sm font-medium"
                  style={{ background: C.bg, color: C.muted, border: `1px solid ${C.border}` }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-lg text-sm font-semibold text-white"
                  style={{ background: C.green }}
                >
                  {editingClassId ? "Save changes" : "Add class"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================== ADD STUDENTS TO CLASS MODAL ======================== */}
      {addStudentsOpen && openClassItem && (() => {
        const q = pickSearch.trim().toLowerCase();
        const available = activeStudents.filter(
          x => !x.classIds.includes(openClassItem.id) && (!q || x.name.toLowerCase().includes(q) || x.id.includes(q))
        );
        const noneLeft = activeStudents.every(x => x.classIds.includes(openClassItem.id));
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(17,24,39,.45)" }}
            onClick={() => setAddStudentsOpen(false)}
          >
            <div
              className="w-full max-w-md max-h-[90vh] flex flex-col rounded-2xl p-6"
              style={{ background: C.surface }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-lg font-bold" style={{ color: C.text }}>Add students</h2>
                <button onClick={() => setAddStudentsOpen(false)} aria-label="Close" style={{ color: C.muted }}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs mb-4" style={{ color: C.muted }}>
                Pick registered students to enroll in {openClassItem.name} · {openClassItem.code}.
              </p>

              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: C.muted }} />
                <input
                  value={pickSearch}
                  onChange={e => setPickSearch(e.target.value)}
                  maxLength={SEARCH_MAX}
                  placeholder="Search name or ID"
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg text-sm outline-none"
                  style={inputStyle}
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 min-h-[120px]">
                {available.map(x => {
                  const checked = pickIds.includes(x.id);
                  return (
                    <label
                      key={x.id}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer"
                      style={{ border: `1px solid ${checked ? C.green : C.border}`, background: checked ? C.greenSoft : C.surface }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => setPickIds(prev => (prev.includes(x.id) ? prev.filter(i => i !== x.id) : [...prev, x.id]))}
                        style={{ accentColor: C.green }}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: C.text }}>{x.lastName}, {x.firstName}</p>
                        <p className="text-xs" style={{ color: C.muted }}>{x.id} · {x.section}</p>
                      </div>
                    </label>
                  );
                })}
                {available.length === 0 && (
                  <p className="text-sm text-center py-8" style={{ color: C.muted }}>
                    {noneLeft
                      ? "Every registered student is already in this class. Register new students in the Students tab."
                      : "No students match your search."}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  onClick={() => setAddStudentsOpen(false)}
                  className="px-4 py-2.5 rounded-lg text-sm font-medium"
                  style={{ background: C.bg, color: C.muted, border: `1px solid ${C.border}` }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => addPickedToClass(openClassItem)}
                  disabled={pickIds.length === 0}
                  className="px-4 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                  style={{ background: C.green }}
                >
                  {pickIds.length > 0 ? `Add ${pickIds.length} student${pickIds.length === 1 ? "" : "s"}` : "Add students"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ======================== STUDENT MODAL (add / edit / view) ======================== */}
      {studentModal && (() => {
        const mode = studentModal.mode;
        const viewing = mode === "view";
        const current = students.find(x => x.id === studentModal.id);
        const title = mode === "add" ? "Add student" : mode === "edit" ? "Edit student" : "Student details";
        const label = "block text-sm font-medium mb-1.5";
        const field = "w-full min-w-0 px-3 py-2.5 rounded-lg text-sm outline-none";
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(17,24,39,.45)" }}
            onClick={() => setStudentModal(null)}
          >
            <div
              className="w-full max-w-lg max-h-[90vh] overflow-y-auto overflow-x-hidden rounded-2xl p-6"
              style={{ background: C.surface }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold" style={{ color: C.text }}>{title}</h2>
                <button onClick={() => setStudentModal(null)} aria-label="Close" style={{ color: C.muted }}>
                  <X className="w-5 h-5" />
                </button>
              </div>

              {viewing && current ? (
                <div className="space-y-5">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-semibold"
                      style={{ background: C.greenSoft, color: C.greenDark, border: `1px solid ${C.greenEdge}` }}
                    >
                      {initials(current.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold" style={{ color: C.text }}>{current.lastName}, {current.firstName}</p>
                      <p className="text-xs truncate" style={{ color: C.muted }}>{current.email}</p>
                    </div>
                  </div>
                  <dl className="grid grid-cols-2 gap-4 text-sm">
                    {[
                      ["Student ID", current.id],
                      ["Program", current.program],
                      ["Year", String(current.year)],
                      ["Section", current.section],
                      ["RFID UID", current.rfid || "—"],
                      ["Card status", current.rfid ? "Registered" : "No card"],
                    ].map(([k, v]) => (
                      <div key={k}>
                        <dt className="text-xs" style={{ color: C.muted }}>{k}</dt>
                        <dd className="font-semibold" style={{ color: C.text }}>{v}</dd>
                      </div>
                    ))}
                  </dl>
                  <div>
                    <p className="text-xs mb-2" style={{ color: C.muted }}>Classes</p>
                    <div className="flex flex-wrap gap-1.5">
                      {current.classIds.map(id => {
                        const c = classes.find(x => x.id === id);
                        return c ? (
                          <span
                            key={id}
                            className="px-2 py-0.5 rounded-md text-xs"
                            style={{ background: C.greenSoft, color: C.greenDark, border: `1px solid ${C.greenEdge}` }}
                          >
                            {c.name} · {c.code}{c.archived ? " (archived)" : ""}
                          </span>
                        ) : null;
                      })}
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setStudentModal(null)}
                      className="px-4 py-2.5 rounded-lg text-sm font-medium"
                      style={{ background: C.bg, color: C.muted, border: `1px solid ${C.border}` }}
                    >
                      Close
                    </button>
                    <button
                      onClick={() => openStudentModal("edit", current)}
                      className="px-4 py-2.5 rounded-lg text-sm font-semibold text-white"
                      style={{ background: C.green }}
                    >
                      Edit student
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSaveStudent} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="min-w-0">
                      <label className={label} style={{ color: C.muted }}>First name</label>
                      <input value={sFirst} onChange={e => setSFirst(cleanName(e.target.value))} maxLength={MAX_LEN} placeholder="Juan" className={field} style={inputStyle} />
                    </div>
                    <div className="min-w-0">
                      <label className={label} style={{ color: C.muted }}>Last name</label>
                      <input value={sLast} onChange={e => setSLast(cleanName(e.target.value))} maxLength={MAX_LEN} placeholder="Dela Cruz" className={field} style={inputStyle} />
                    </div>
                  </div>
                  <div>
                    <label className={label} style={{ color: C.muted }}>Gordon College email</label>
                    <div
                      className="flex items-center rounded-lg overflow-hidden"
                      style={{ ...inputStyle, ...(mode === "edit" ? { background: C.bg } : {}) }}
                    >
                      <input
                        type="text"
                        inputMode="numeric"
                        value={sEmail}
                        onChange={e => setSEmail(cleanStudentNo(e.target.value))}
                        readOnly={mode === "edit"}
                        maxLength={9}
                        placeholder="202310417"
                        className="flex-1 min-w-0 px-3 py-2.5 text-sm outline-none bg-transparent"
                        style={{ color: mode === "edit" ? C.muted : C.text }}
                      />
                      <span className="pr-3 text-sm shrink-0" style={{ color: C.muted }}>{EMAIL_DOMAIN}</span>
                    </div>
                    {mode === "add" && (
                      <p className="text-xs mt-1" style={{ color: C.muted }}>
                        Type the 9-digit student number starting with 20. It becomes the student ID.
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="min-w-0">
                      <label className={label} style={{ color: C.muted }}>Program</label>
                      <input value={sProgram} onChange={e => setSProgram(cleanProgram(e.target.value))} maxLength={PROGRAM_MAX} placeholder="BSIT" className={field} style={inputStyle} />
                    </div>
                    <div className="min-w-0">
                      <label className={label} style={{ color: C.muted }}>Year</label>
                      <select value={sYear} onChange={e => setSYear(Number(e.target.value))} className={field} style={inputStyle}>
                        {[1, 2, 3, 4].map(y => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>
                    <div className="min-w-0">
                      <label className={label} style={{ color: C.muted }}>Section</label>
                      <input value={sSection} onChange={e => setSSection(cleanSection(e.target.value))} maxLength={SECTION_MAX} placeholder="BSIT 4B" className={field} style={inputStyle} />
                    </div>
                  </div>
                  <div>
                    <label className={label} style={{ color: C.muted }}>RFID UID (optional)</label>
                    <input
                      value={sRfid}
                      onChange={e => setSRfid(e.target.value.toUpperCase())}
                      placeholder="7F3A91C2"
                      className={`${field} font-mono`}
                      style={inputStyle}
                    />
                    <p className="text-xs mt-1" style={{ color: C.muted }}>Leave blank if the student has no card yet.</p>
                  </div>
                  <div>
                    <p className={label} style={{ color: C.muted }}>Classes</p>
                    <div className="grid grid-cols-2 gap-2">
                      {activeClasses.map(c => (
                        <label
                          key={c.id}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer min-w-0"
                          style={{ border: `1px solid ${sClassIds.includes(c.id) ? C.green : C.border}`, background: sClassIds.includes(c.id) ? C.greenSoft : C.surface, color: C.text }}
                        >
                          <input
                            type="checkbox"
                            checked={sClassIds.includes(c.id)}
                            onChange={() => toggleClass(c.id)}
                            style={{ accentColor: C.green }}
                          />
                          <span className="truncate">{c.name} · {c.code}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {sError && <p className="text-sm" style={{ color: C.red }}>{sError}</p>}

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setStudentModal(null)}
                      className="px-4 py-2.5 rounded-lg text-sm font-medium"
                      style={{ background: C.bg, color: C.muted, border: `1px solid ${C.border}` }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2.5 rounded-lg text-sm font-semibold text-white"
                      style={{ background: C.green }}
                    >
                      {mode === "add" ? "Add student" : "Save changes"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}