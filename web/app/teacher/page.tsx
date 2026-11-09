"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import type { FormEvent } from "react";
import dynamic from "next/dynamic";
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
  Trash2,
  Wifi,
  WifiOff,
  Play,
  Square,
  Loader2,
} from "lucide-react";
import { TEACHER_SESSION_KEY } from "@/lib/mockTeacher";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import TeacherSidebar from "@/components/teacher/TeacherSidebar";
import {
  C,
  CODE_RE,
  fmtDay,
  fmtDuration,
  fmtTime,
  initials,
  inputStyle,
  cardStyle,
  MAX_LEN,
  MAX_TIME,
  MIN_TIME,
  NAME_RE,
  PROGRAM_MAX,
  PROGRAM_RE,
  SEARCH_MAX,
  SECTION_MAX,
  STATUS_META,
  STUDENT_NO_RE,
  WEEK_DAYS,
  WORDS_RE,
  paginate,
  toMin,
  EMAIL_DOMAIN,
} from "@/lib/teacher";
import type { StatusFilter, Tab } from "@/lib/teacher";
import type { ClassRecord, StudentRecord, AttendanceRecord } from "@/lib/types";
import Pagination from "@/components/teacher/Pagination";
import {
  useClasses,
  useStudents,
  useActiveSession,
  useTodayAttendance,
  useAttendanceHistory,
  writeAttendanceRecord,
} from "@/hooks/useTeacher";

const ClassEditorModal = dynamic(() => import("@/components/teacher/ClassEditorModal"));
const AddStudentsModal  = dynamic(() => import("@/components/teacher/AddStudentsModal"));
const StudentModal      = dynamic(() => import("@/components/teacher/StudentModal"));

// ── helpers ───────────────────────────────────────────────────────────────────

function toISODate(d: Date) {
  return d.toISOString().substring(0, 10);
}

/** minutes since midnight from an epoch-ms value (handles string or number) */
function msToMin(ms: number | string) {
  const n = typeof ms === "string" ? parseInt(ms, 10) : ms;
  if (!n || isNaN(n)) return undefined;
  const d = new Date(n);
  return d.getHours() * 60 + d.getMinutes();
}

const LATE_GRACE_MIN = 10;

function deriveStatus(
  timeInMs: number,
  cls: ClassRecord
): "present" | "late" {
  const tapMin = msToMin(timeInMs);
  const startMin = toMin(cls.start);
  return tapMin > startMin + LATE_GRACE_MIN ? "late" : "present";
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function TeacherPage() {
  const router = useRouter();
  const [teacher, setTeacher] = useState<{ name: string; email: string; uid: string } | null>(null);

  /* ── session guard ── */
  useEffect(() => {
    const raw = sessionStorage.getItem(TEACHER_SESSION_KEY);
    if (!raw) { router.replace("/login"); return; }
    setTeacher(JSON.parse(raw));
  }, [router]);

  const teacherUid = teacher?.uid ?? null;

  /* ── Firebase data ── */
  const { classes, loading: classesLoading, addClass, updateClass, deleteClass } = useClasses(teacherUid);
  const { students, loading: studentsLoading, addStudent, updateStudent, deleteStudent } = useStudents(teacherUid);
  const { session: activeSession, startSession, stopSession } = useActiveSession();

  const today = toISODate(new Date());
  const activeClasses  = useMemo(() => classes.filter(c => !c.archived), [classes]);
  const activeStudents = useMemo(() => students.filter(s => !s.archived), [students]);
  const archivedClasses  = useMemo(() => classes.filter(c => c.archived), [classes]);
  const archivedStudents = useMemo(() => students.filter(s => s.archived), [students]);

  const activeClassKeys = useMemo(() => activeClasses.map(c => c.key), [activeClasses]);

  /* live today attendance */
  const todayRecords = useTodayAttendance(activeClassKeys, today);

  /* full history for attendance tab & charts */
  const { records: historyRecords, loading: historyLoading } = useAttendanceHistory(activeClassKeys);

  /* combine today + history (deduplicate by classKey+date+studentKey) */
  const allRecords = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    [...historyRecords, ...todayRecords].forEach(r => {
      map.set(`${r.classKey}|${r.date}|${r.studentKey}`, r);
    });
    return Array.from(map.values());
  }, [historyRecords, todayRecords]);

  /* ── UI state ── */
  const [collapsed, setCollapsed] = useState(false);
  const [tab, setTab] = useState<Tab>("dashboard");
  const [now, setNow] = useState<Date | null>(null);
  const [toast, setToast] = useState<{ msg: string; kind: "success" | "archive" | "delete" | "error" } | null>(null);
  const notify = useCallback((msg: string, kind: "success" | "archive" | "delete" | "error" = "success") => setToast({ msg, kind }), []);

  const [confirmDlg, setConfirmDlg] = useState<{
    tone: "archive" | "delete";
    title: string; subject: string; message: string; confirmLabel: string;
    onConfirm: () => void;
  } | null>(null);
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  // classes tab
  const [classSearch, setClassSearch]   = useState("");
  const [openClassId, setOpenClassId]   = useState<string | null>(null);
  const [classView, setClassView]       = useState<"attendance" | "students">("attendance");
  const [rosterSearch, setRosterSearch] = useState("");
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [showAdd, setShowAdd]           = useState(false);
  const [newName, setNewName]           = useState("");
  const [newCode, setNewCode]           = useState("");
  const [newYear, setNewYear]           = useState(1);
  const [newDays, setNewDays]           = useState<string[]>(["Mon", "Wed", "Fri"]);
  const [newStart, setNewStart]         = useState("08:00");
  const [newEnd, setNewEnd]             = useState("09:00");
  const [newRoom, setNewRoom]           = useState("");
  const [classError, setClassError]     = useState("");
  const [classSaving, setClassSaving]   = useState(false);

  // students tab
  const [search, setSearch]       = useState("");
  const [fsYear, setFsYear]       = useState("all");
  const [fsSection, setFsSection] = useState("all");
  const [fsProgram, setFsProgram] = useState("all");
  const [studentModal, setStudentModal] = useState<{ mode: "add" | "edit" | "view"; id?: string } | null>(null);
  const [sFirst, setSFirst]   = useState("");
  const [sLast, setSLast]     = useState("");
  const [sEmail, setSEmail]   = useState("");
  const [sProgram, setSProgram] = useState("");
  const [sYear, setSYear]     = useState(1);
  const [sSection, setSSection] = useState("");
  const [sRfid, setSRfid]     = useState("");
  const [sClassIds, setSClassIds] = useState<string[]>([]);
  const [sError, setSError]   = useState("");
  const [stuSaving, setStuSaving] = useState(false);

  // add-students-to-class modal
  const [addStudentsOpen, setAddStudentsOpen] = useState(false);
  const [pickIds, setPickIds]     = useState<string[]>([]);
  const [pickSearch, setPickSearch] = useState("");

  // attendance filters
  const [fStatus, setFStatus]   = useState<StatusFilter>("all");
  const [fSearch, setFSearch]   = useState("");
  const [fDate, setFDate]       = useState("all");
  const [fClass, setFClass]     = useState("all");
  const [fSection, setFSection] = useState("all");
  const [fYear, setFYear]       = useState("all");

  // edit attendance record modal
  const [editRec, setEditRec] = useState<{
    rec: AttendanceRecord;
    student: StudentRecord;
    cls: ClassRecord;
  } | null>(null);
  const [editDate,    setEditDate]    = useState("");
  const [editTimeIn,  setEditTimeIn]  = useState("");
  const [editTimeOut, setEditTimeOut] = useState("");
  const [editStatus,  setEditStatus]  = useState<AttendanceRecord["status"]>("present");
  const [editSaving,  setEditSaving]  = useState(false);
  const [editError,   setEditError]   = useState("");

  // pagination
  const [attPage, setAttPage]     = useState(1);
  const [rosterPage, setRosterPage] = useState(1);
  const [stuPage, setStuPage]     = useState(1);
  const [arcStuPage, setArcStuPage] = useState(1);
  const [arcClsPage, setArcClsPage] = useState(1);

  // archive tab
  const [archiveView, setArchiveView]   = useState<"students" | "classes">("students");
  const [archiveSearch, setArchiveSearch] = useState("");

  // active session UI
  const [sessionSaving, setSessionSaving] = useState(false);

  /* ── live clock ── */
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  /* ── start collapsed on small screens ── */
  useEffect(() => {
    if (window.innerWidth < 768) setCollapsed(true);
  }, []);

  /* ── reset pages on filter change ── */
  useEffect(() => setAttPage(1), [fStatus, fSearch, fDate, fClass, fSection, fYear, openClassId, tab]);
  useEffect(() => setRosterPage(1), [rosterSearch, openClassId, classView]);
  useEffect(() => setStuPage(1), [search, fsYear, fsSection, fsProgram]);
  useEffect(() => setArcStuPage(1), [archiveSearch, archiveView]);
  useEffect(() => setArcClsPage(1), [archiveSearch, archiveView]);

  /* ── auto-hide toast ── */
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  function logout() {
    sessionStorage.removeItem(TEACHER_SESSION_KEY);
    router.replace("/login");
  }

  /* ── derived helpers ── */
  const classStudents = useCallback(
    (cKey: string) => activeStudents.filter(s => s.classKeys?.includes(cKey)),
    [activeStudents]
  );

  /** Attendance records for a specific class on a given date */
  const recordsFor = useCallback(
    (classKey: string, date: string) =>
      allRecords.filter(r => r.classKey === classKey && r.date === date),
    [allRecords]
  );

  /** Attendance stats for one student across one class */
  function pairStats(classKey: string, studentKey: string) {
    const mine = allRecords.filter(r => r.classKey === classKey && r.studentKey === studentKey);
    const absent = mine.filter(r => r.status === "absent").length;
    const late   = mine.filter(r => r.status === "late").length;
    const total  = mine.length;
    const rate   = total === 0 ? 0 : Math.round(((total - absent) / total) * 100);
    return { absent, late, total, rate };
  }

  /* ── dashboard overview ── */
  const overview = useMemo(() => {
    let present = 0, notTapped = 0, totalAbsences = 0;
    for (const c of activeClasses) {
      const roster = classStudents(c.key);
      for (const s of roster) {
        const todayRec = todayRecords.find(r => r.classKey === c.key && r.studentKey === s.key);
        if (todayRec && todayRec.status !== "absent") present++;
        else notTapped++;
        totalAbsences += allRecords.filter(r => r.classKey === c.key && r.studentKey === s.key && r.status === "absent").length;
      }
    }
    return { present, notTapped, totalAbsences };
  }, [todayRecords, allRecords, activeClasses, classStudents]);

  const needsAttention = useMemo(() => {
    const list: { student: StudentRecord; cls: ClassRecord; absent: number; rate: number }[] = [];
    for (const c of activeClasses) {
      for (const s of classStudents(c.key)) {
        const { absent, rate, total } = pairStats(c.key, s.key);
        if (absent >= 3 || (total >= 3 && rate < 75)) {
          list.push({ student: s, cls: c, absent, rate });
        }
      }
    }
    return list.sort((a, b) => b.absent - a.absent);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allRecords, activeClasses, activeStudents]);

  const recentTaps = useMemo(() => {
    return todayRecords
      .filter(r => r.timeInMs !== undefined)
      .map(r => ({
        rec: r,
        student: activeStudents.find(s => s.key === r.studentKey),
        cls: activeClasses.find(c => c.key === r.classKey),
      }))
      .filter((x): x is { rec: AttendanceRecord; student: StudentRecord; cls: ClassRecord } => !!x.student && !!x.cls)
      .sort((a, b) => (b.rec.timeInMs ?? 0) - (a.rec.timeInMs ?? 0))
      .slice(0, 6);
  }, [todayRecords, activeStudents, activeClasses]);

  /* ── attendance rows for table (joined) ── */
  const rows = useMemo(() => {
    return allRecords
      .map(r => ({
        rec: r,
        student: activeStudents.find(s => s.key === r.studentKey),
        cls: activeClasses.find(c => c.key === r.classKey),
      }))
      .filter((x): x is { rec: AttendanceRecord; student: StudentRecord; cls: ClassRecord } => !!x.student && !!x.cls);
  }, [allRecords, activeStudents, activeClasses]);

  const scopeId = tab === "classes" ? openClassId : null;
  const dateOptions = Array.from(new Set(allRecords.map(r => r.date))).sort().reverse();
  const classCodes  = Array.from(new Set(activeClasses.map(c => c.code)));
  const sections    = Array.from(new Set(activeClasses.map(c => c.name)));
  const years       = Array.from(new Set(activeClasses.map(c => c.year))).sort();

  const baseRows = useMemo(() => {
    const q = fSearch.trim().toLowerCase();
    return rows.filter(r => {
      if (q && !r.student.name.toLowerCase().includes(q) && !r.student.studentId.includes(q)) return false;
      if (fDate !== "all" && r.rec.date !== fDate) return false;
      if (scopeId) {
        if (r.cls.key !== scopeId) return false;
      } else {
        if (fClass   !== "all" && r.cls.code !== fClass) return false;
        if (fSection !== "all" && r.cls.name !== fSection) return false;
        if (fYear    !== "all" && String(r.cls.year) !== fYear) return false;
      }
      return true;
    });
  }, [rows, fSearch, fDate, fClass, fSection, fYear, scopeId]);

  const chipCounts = useMemo(() => {
    const c = { all: baseRows.length, present: 0, late: 0, absent: 0, incomplete: 0 };
    for (const r of baseRows) c[r.rec.status]++;
    return c;
  }, [baseRows]);

  const visibleRows = useMemo(() => {
    const list = fStatus === "all" ? baseRows : baseRows.filter(r => r.rec.status === fStatus);
    return [...list].sort((a, b) => {
      if (a.rec.date !== b.rec.date) return a.rec.date < b.rec.date ? 1 : -1;
      return a.student.name.localeCompare(b.student.name);
    });
  }, [baseRows, fStatus]);

  /* ── class CRUD ── */
  function resetClassForm() {
    setNewName(""); setNewCode(""); setNewYear(1);
    setNewDays(["Mon", "Wed", "Fri"]);
    setNewStart("08:00"); setNewEnd("09:00");
    setNewRoom(""); setClassError("");
  }

  function openAddClass() { resetClassForm(); setEditingClassId(null); setShowAdd(true); }

  function openEditClass(c: ClassRecord) {
    setClassError(""); setEditingClassId(c.key);
    setNewName(c.name); setNewCode(c.code); setNewYear(c.year);
    const parsedDays = c.schedule.replace(/\s*\d{1,2}:\d{2}.*$/, "");
    setNewDays(parsedDays.split("/").filter(d => WEEK_DAYS.includes(d)));
    setNewStart(c.start); setNewEnd(c.end);
    setNewRoom(c.room === "No room set" ? "" : c.room);
    setShowAdd(true);
  }

  async function handleAddClass(e: FormEvent) {
    e.preventDefault();
    setClassError("");
    const name = newName.trim();
    const code = newCode.trim();
    const room = newRoom.trim();
    if (!name || !WORDS_RE.test(name)) return setClassError("Class name: letters and numbers only.");
    if (!code || !CODE_RE.test(code))  return setClassError("Subject code: letters and numbers only, no spaces.");
    if (room && !WORDS_RE.test(room))  return setClassError("Room: letters and numbers only.");
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

    setClassSaving(true);
    try {
      if (editingClassId) {
        await updateClass(editingClassId, { name, code: code.toUpperCase(), year: newYear, schedule, start: newStart, end: newEnd, room: roomValue });
        notify(`Updated ${name} · ${code.toUpperCase()}.`);
      } else {
        await addClass({ teacherUid: teacherUid!, name, code: code.toUpperCase(), year: newYear, schedule, start: newStart, end: newEnd, room: roomValue, createdAt: new Date().toISOString() });
        notify(`Added ${name} · ${code.toUpperCase()}.`);
      }
      resetClassForm(); setEditingClassId(null); setShowAdd(false);
    } catch {
      setClassError("Failed to save. Please try again.");
    } finally {
      setClassSaving(false);
    }
  }

  function archiveClass(c: ClassRecord) {
    setConfirmDlg({
      tone: "archive", title: "Archive this class?", subject: `${c.name} · ${c.code}`,
      message: "It will be hidden from your lists. You can restore it later from the Archive tab.",
      confirmLabel: "Archive",
      onConfirm: async () => {
        await updateClass(c.key, { archived: true });
        if (openClassId === c.key) setOpenClassId(null);
        notify(`${c.name} · ${c.code} was archived.`, "archive");
        setConfirmDlg(null);
      },
    });
  }

  function restoreClass(c: ClassRecord) {
    updateClass(c.key, { archived: false }).then(() =>
      notify(`Restored ${c.name} · ${c.code}.`)
    );
  }

  function deleteClassForever(c: ClassRecord) {
    setConfirmDlg({
      tone: "delete", title: "Delete this class permanently?", subject: `${c.name} · ${c.code}`,
      message: "Its attendance records will be deleted and students will be unenrolled. This cannot be undone.",
      confirmLabel: "Delete",
      onConfirm: async () => {
        // Unenroll all students
        const enrolled = students.filter(s => s.classKeys?.includes(c.key));
        await Promise.all(enrolled.map(s =>
          updateStudent(s.key, { classKeys: s.classKeys.filter(k => k !== c.key) })
        ));
        await deleteClass(c.key);
        notify(`${c.name} · ${c.code} was permanently deleted.`, "delete");
        setConfirmDlg(null);
      },
    });
  }

  /* ── student CRUD ── */
  function archiveStudent(st: StudentRecord) {
    setConfirmDlg({
      tone: "archive", title: "Archive this student?", subject: st.name,
      message: "They will be hidden from all classes. You can restore them later.",
      confirmLabel: "Archive",
      onConfirm: async () => {
        await updateStudent(st.key, { archived: true });
        notify(`${st.name} was archived.`, "archive");
        setConfirmDlg(null);
      },
    });
  }

  function restoreStudent(st: StudentRecord) {
    updateStudent(st.key, { archived: false }).then(() => notify(`Restored ${st.name}.`));
  }

  function deleteStudentForever(st: StudentRecord) {
    setConfirmDlg({
      tone: "delete", title: "Delete this student permanently?", subject: st.name,
      message: "Their attendance records will be deleted. This cannot be undone.",
      confirmLabel: "Delete",
      onConfirm: async () => {
        await deleteStudent(st.key);
        notify(`${st.name} was permanently deleted.`, "delete");
        setConfirmDlg(null);
      },
    });
  }

  function openStudentModal(mode: "add" | "edit" | "view", st?: StudentRecord) {
    setSError("");
    if (st) {
      setSFirst(st.firstName); setSLast(st.lastName); setSEmail(st.studentId);
      setSProgram(st.program); setSYear(st.year); setSSection(st.section);
      setSRfid(st.rfidUid ?? ""); setSClassIds(st.classKeys ?? []);
    } else {
      setSFirst(""); setSLast(""); setSEmail(""); setSProgram("");
      setSYear(1); setSSection(""); setSRfid("");
      setSClassIds(activeClasses[0] ? [activeClasses[0].key] : []);
    }
    setStudentModal({ mode, id: st?.key });
  }

  function toggleClass(id: string) {
    setSClassIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  async function handleSaveStudent(e: FormEvent) {
    e.preventDefault();
    if (!studentModal) return;
    setSError("");
    const first    = sFirst.trim();
    const last     = sLast.trim();
    const studentNo = sEmail.trim();
    const rfid     = sRfid.trim().toUpperCase().replace(/[^0-9A-F]/g, "");
    const adding   = studentModal.mode === "add";
    const program  = sProgram.trim();
    const section  = sSection.trim();

    if (!first || !last)              return setSError("Enter the student's first and last name.");
    if (!NAME_RE.test(first) || !NAME_RE.test(last)) return setSError("Names can only contain letters.");
    if (adding && !STUDENT_NO_RE.test(studentNo))
      return setSError("Student number must be 9 digits and start with 20.");
    const studentId = adding ? studentNo : (students.find(s => s.key === studentModal.id)?.studentId ?? studentNo);
    if (adding && students.some(x => x.studentId === studentId))
      return setSError("A student with this ID is already registered.");
    if (!program)                     return setSError("Enter the program, e.g. BSIT.");
    if (!PROGRAM_RE.test(program))    return setSError(`Program: letters only, up to ${PROGRAM_MAX} characters.`);
    if (!section)                     return setSError("Enter the section, e.g. BSIT 4B.");
    if (!WORDS_RE.test(section) || section.length > SECTION_MAX)
      return setSError(`Section: letters and numbers only, up to ${SECTION_MAX} characters.`);
    if (sClassIds.length === 0)       return setSError("Select at least one class.");
    if (rfid && !/^[0-9A-F]{4,16}$/.test(rfid))
      return setSError("RFID UID should be 4–16 hex characters.");
    if (rfid) {
      const dup = students.find(x => x.rfidUid === rfid && x.key !== studentModal.id);
      if (dup) return setSError(`That card is already assigned to ${dup.name}.`);
    }

    setStuSaving(true);
    try {
      const data: Omit<StudentRecord, "key"> = {
        teacherUid: teacherUid!,
        firstName: first, lastName: last,
        name: `${first} ${last}`,
        studentId,
        email: `${studentId}${EMAIL_DOMAIN}`,
        program: program.toUpperCase(),
        year: sYear,
        section: section.toUpperCase(),
        rfidUid: rfid,
        classKeys: sClassIds,
      };
      if (adding) {
        await addStudent(data);
        notify(`Added ${data.name}.`);
      } else {
        const existing = students.find(s => s.key === studentModal.id)!;
        // Preserve archived class enrollments
        const keptArchived = (existing.classKeys ?? []).filter(id => classes.find(c => c.key === id)?.archived);
        await updateStudent(studentModal.id!, { ...data, classKeys: [...sClassIds, ...keptArchived], archived: existing.archived });
        notify(`Updated ${data.name}.`);
      }
      setStudentModal(null);
    } catch {
      setSError("Failed to save. Please try again.");
    } finally {
      setStuSaving(false);
    }
  }

  /* add-students-to-class */
  function openAddStudents() { setPickIds([]); setPickSearch(""); setAddStudentsOpen(true); }

  async function addPickedToClass(cls: ClassRecord) {
    await Promise.all(
      pickIds.map(key => {
        const st = students.find(s => s.key === key)!;
        return updateStudent(key, { classKeys: [...(st.classKeys ?? []), cls.key] });
      })
    );
    notify(`Added ${pickIds.length} student${pickIds.length === 1 ? "" : "s"} to ${cls.name} · ${cls.code}.`);
    setAddStudentsOpen(false);
  }

  /* ── active session ── */
  async function handleStartSession(cls: ClassRecord) {
    setSessionSaving(true);
    try {
      await startSession(cls, teacherUid!);
      notify(`Started recording attendance for ${cls.name} · ${cls.code}.`);
    } catch {
      notify("Failed to start session.", "error");
    } finally {
      setSessionSaving(false);
    }
  }

  async function handleStopSession() {
    setSessionSaving(true);
    try {
      await stopSession();
      notify("Attendance session stopped.");
    } catch {
      notify("Failed to stop session.", "error");
    } finally {
      setSessionSaving(false);
    }
  }

  /* ── export CSV ── */
  function exportCsv() {
    const header = ["Student", "Student ID", "Class", "Section", "Date", "Status", "Time In", "Time Out", "Duration"];
    const lines = visibleRows.map(r => [
      r.student.name, r.student.studentId, r.cls.code, r.cls.name,
      fmtDay(r.rec.date), STATUS_META[r.rec.status].label,
      r.rec.timeInMs  ? fmtTime(msToMin(r.rec.timeInMs))  : "—",
      r.rec.timeOutMs ? fmtTime(msToMin(r.rec.timeOutMs)) : "—",
      r.rec.timeInMs && r.rec.timeOutMs ? fmtDuration(msToMin(r.rec.timeInMs), msToMin(r.rec.timeOutMs)) : "—",
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(","));
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `attendance-${today}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  function exportStudentsCsv() {
    const header = ["Last name", "First name", "Student ID", "Program", "Year", "Section", "RFID UID", "Card status"];
    const lines = filteredStudents.map(st => [
      st.lastName, st.firstName, st.studentId, st.program, st.year, st.section,
      st.rfidUid || "—", st.rfidUid ? "Registered" : "No card",
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(","));
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `students-${today}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  /* ── edit attendance record ── */
  function openEditRec(rec: AttendanceRecord, student: StudentRecord, cls: ClassRecord) {
    setEditRec({ rec, student, cls });
    setEditDate(rec.date);
    // Convert epoch ms back to HH:MM for the time inputs
    const tIn  = rec.timeInMs  ? msToMin(rec.timeInMs)  : undefined;
    const tOut = rec.timeOutMs ? msToMin(rec.timeOutMs) : undefined;
    const toHHMM = (min: number | undefined) => {
      if (min === undefined) return "";
      const h = Math.floor(min / 60).toString().padStart(2, "0");
      const m = (min % 60).toString().padStart(2, "0");
      return `${h}:${m}`;
    };
    setEditTimeIn(toHHMM(tIn));
    setEditTimeOut(toHHMM(tOut));
    setEditStatus(rec.status);
    setEditError("");
  }

  async function handleSaveEditRec() {
    if (!editRec) return;
    setEditError("");
    if (!editDate) { setEditError("Date is required."); return; }
    if (!editTimeIn) { setEditError("Time In is required."); return; }
    if (editTimeOut && editTimeOut <= editTimeIn) {
      setEditError("Time Out must be after Time In."); return;
    }

    // Build epoch ms from date + HH:MM (local PH time = UTC+8)
    const toEpochMs = (date: string, hhmm: string): number => {
      const [h, m] = hhmm.split(":").map(Number);
      const d = new Date(`${date}T${hhmm}:00+08:00`);
      return d.getTime();
    };

    const updated: AttendanceRecord = {
      ...editRec.rec,
      date:      editDate,
      status:    editStatus,
      timeInMs:  toEpochMs(editDate, editTimeIn),
      timeOutMs: editTimeOut ? toEpochMs(editDate, editTimeOut) : undefined,
      writtenBy: "manual",
    };

    setEditSaving(true);
    try {
      await writeAttendanceRecord(updated);
      notify("Attendance record updated.");
      setEditRec(null);
    } catch {
      setEditError("Failed to save. Please try again.");
    } finally {
      setEditSaving(false);
    }
  }

  /* ── loading guard ── */
  const loading = !teacher || classesLoading || studentsLoading;  if (loading) return <LoadingSkeleton variant="teacher" />;

  /* ── derived lists ── */
  const filteredClasses = activeClasses.filter(c => {
    const q = classSearch.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q) || `year ${c.year}`.includes(q);
  });

  const filteredStudents = activeStudents.filter(s => {
    const q = search.toLowerCase();
    if (q && !s.name.toLowerCase().includes(q) && !s.studentId.includes(q)) return false;
    if (fsYear    !== "all" && String(s.year)    !== fsYear)    return false;
    if (fsSection !== "all" && s.section         !== fsSection) return false;
    if (fsProgram !== "all" && s.program         !== fsProgram) return false;
    return true;
  });

  const studentYears    = Array.from(new Set(activeStudents.map(s => s.year))).sort();
  const studentSections = Array.from(new Set(activeStudents.map(s => s.section))).sort();
  const studentPrograms = Array.from(new Set(activeStudents.map(s => s.program))).sort();

  const aq = archiveSearch.trim().toLowerCase();
  const shownArchivedStudents = archivedStudents.filter(s => !aq || s.name.toLowerCase().includes(aq) || s.studentId.includes(aq));
  const shownArchivedClasses  = archivedClasses.filter(c => !aq || c.name.toLowerCase().includes(aq) || c.code.toLowerCase().includes(aq));

  const attPaged    = paginate(visibleRows, attPage);
  const stuPaged    = paginate(filteredStudents, stuPage);
  const arcStuPaged = paginate(shownArchivedStudents, arcStuPage);
  const arcClsPaged = paginate(shownArchivedClasses, arcClsPage);

  const timeText = now ? now.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true }) : "--:--:--";
  const dateText = now ? now.toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric", year: "numeric" }) : "";
  const initial  = (teacher.name?.trim()[0] ?? "T").toUpperCase();

  const chips: { id: StatusFilter; label: string; color?: string }[] = [
    { id: "all", label: "All records" },
    { id: "present",    label: "Present",    color: STATUS_META.present.color },
    { id: "late",       label: "Late",       color: STATUS_META.late.color },
    { id: "absent",     label: "Absent",     color: STATUS_META.absent.color },
    { id: "incomplete", label: "Incomplete", color: STATUS_META.incomplete.color },
  ];

  const navItems: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
    { id: "dashboard",  label: "Dashboard",  icon: LayoutDashboard },
    { id: "classes",    label: "Classes",    icon: Users },
    { id: "attendance", label: "Attendance", icon: ClipboardCheck },
    { id: "students",   label: "Students",   icon: UserPlus },
    { id: "archive",    label: "Archive",    icon: Archive },
  ];

  const pageTitle: Record<Tab, { title: string; sub: string }> = {
    dashboard:  { title: "Dashboard",  sub: "Today's RFID attendance at a glance." },
    classes:    { title: "Classes",    sub: "Create and manage your classes and students." },
    attendance: { title: "Attendance", sub: "RFID tap-in and tap-out records for your classes." },
    students:   { title: "Students",   sub: "Manage registered students and their RFID cards." },
    archive:    { title: "Archive",    sub: "Restore archived classes and students, or delete them for good." },
  };

  const selectWrap = "relative";
  const selectCls  = "w-full appearance-none px-4 py-3 pr-10 rounded-xl text-sm font-medium outline-none";

  const openClassItem = openClassId ? activeClasses.find(c => c.key === openClassId) ?? null : null;

  // ── renderAttendance (shared between Attendance tab and Classes > Attendance view) ──
  const renderAttendance = (scoped: boolean) => (
    <>
      <div className="flex flex-wrap gap-3">
        {chips.map(ch => {
          const active = fStatus === ch.id;
          return (
            <button key={ch.id} onClick={() => setFStatus(ch.id)}
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
        <div className="p-5 space-y-3">
          <div className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
            <Search className="w-4 h-4 shrink-0" style={{ color: C.muted }} />
            <input value={fSearch} onChange={e => setFSearch(e.target.value)} maxLength={SEARCH_MAX}
              placeholder="Search student name or ID"
              className="flex-1 bg-transparent outline-none text-sm" style={{ color: C.text }} />
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
                {[
                  { val: fClass,   set: setFClass,   opts: classCodes, label: "All classes",  fmt: (v: string) => v },
                  { val: fSection, set: setFSection, opts: sections,   label: "All sections", fmt: (v: string) => v },
                  { val: fYear,    set: setFYear,    opts: years.map(String), label: "All years", fmt: (v: string) => `Year ${v}` },
                ].map(({ val, set, opts, label, fmt }) => (
                  <div key={label} className={selectWrap}>
                    <select value={val} onChange={e => set(e.target.value)} className={selectCls} style={inputStyle}>
                      <option value="all">{label}</option>
                      {opts.map(o => <option key={o} value={o}>{fmt(o)}</option>)}
                    </select>
                    <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: C.muted }} />
                  </div>
                ))}
              </>
            )}
          </div>
          <button onClick={exportCsv} disabled={visibleRows.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
            style={{ background: C.surface, color: C.text, border: `1px solid ${C.border}`, boxShadow: "0 1px 2px rgba(16,24,40,.05)" }}>
            <Download className="w-4 h-4" /> Export
          </button>
        </div>

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
                <th className="py-3 pr-4 font-medium">Status</th>
                <th className="py-3 pr-4 font-medium">Time In</th>
                <th className="py-3 pr-4 font-medium">Time Out</th>
                <th className="py-3 pr-5 font-medium">Duration</th>
                <th className="py-3 pr-5 font-medium">Edit</th>
              </tr>
            </thead>
            <tbody>
              {historyLoading ? (
                <tr><td colSpan={scoped ? 7 : 9} className="py-10 text-center text-sm" style={{ color: C.muted }}>Loading records…</td></tr>
              ) : attPaged.items.length === 0 ? (
                <tr><td colSpan={scoped ? 7 : 9} className="py-10 text-center text-sm" style={{ color: C.muted }}>No attendance records match these filters.</td></tr>
              ) : attPaged.items.map(r => {
                const { rec, student, cls } = r;
                const tIn  = rec.timeInMs  ? msToMin(rec.timeInMs)  : undefined;
                const tOut = rec.timeOutMs ? msToMin(rec.timeOutMs) : undefined;
                const dash = { color: C.muted };
                return (
                  <tr key={`${rec.classKey}${rec.date}${rec.studentKey}`} style={{ borderTop: `1px solid ${C.border}` }}>
                    <td className="py-3 pl-5 pr-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                          style={{ background: C.greenSoft, color: C.greenDark, border: `1px solid ${C.greenEdge}` }}>
                          {initials(student.name)}
                        </div>
                        <div>
                          <p className="font-semibold" style={{ color: C.text }}>{student.name}</p>
                          <p className="text-xs" style={{ color: C.muted }}>{student.studentId}</p>
                        </div>
                      </div>
                    </td>
                    {!scoped && (
                      <>
                        <td className="py-3 pr-4 font-medium" style={{ color: C.text }}>{cls.code}</td>
                        <td className="py-3 pr-4 font-medium" style={{ color: C.text }}>{cls.name}</td>
                      </>
                    )}
                    <td className="py-3 pr-4 font-medium" style={{ color: C.text }}>{fmtDay(rec.date)}</td>
                    <td className="py-3 pr-4">
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold"
                        style={{ background: `${STATUS_META[rec.status].color}20`, color: STATUS_META[rec.status].color }}>
                        {STATUS_META[rec.status].label}
                      </span>
                    </td>
                    <td className="py-3 pr-4 font-medium" style={tIn === undefined ? dash : { color: C.text }}>{fmtTime(tIn)}</td>
                    <td className="py-3 pr-4 font-medium" style={tOut === undefined ? dash : { color: C.text }}>{fmtTime(tOut)}</td>
                    <td className="py-3 pr-4" style={dash}>{fmtDuration(tIn, tOut)}</td>
                    <td className="py-3 pr-5">
                      <button
                        onClick={() => openEditRec(rec, student, cls)}
                        title="Edit record"
                        className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-green-50"
                        style={{ border: `1px solid ${C.border}`, color: C.muted }}>
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination page={attPaged.page} totalPages={attPaged.totalPages} total={attPaged.total} onChange={setAttPage} />
      </section>
    </>
  );

  // ── JSX ──────────────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen" style={{ background: C.bg, fontFamily: "'Poppins', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap'); @keyframes toastIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }`}</style>

      <TeacherSidebar
        collapsed={collapsed} setCollapsed={setCollapsed}
        navItems={navItems} tab={tab} setTab={setTab}
        setOpenClassId={setOpenClassId}
        initial={initial} teacher={teacher}
        setConfirmSignOut={setConfirmSignOut}
      />

      <main className="flex-1 min-w-0 px-4 sm:px-10 py-8">
        <div className="max-w-6xl mx-auto space-y-6">

          {/* Page header */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: C.text }}>{pageTitle[tab].title}</h1>
              <p className="text-sm mt-1" style={{ color: C.muted }}>{pageTitle[tab].sub}</p>
            </div>
            <div className="flex items-center gap-3">
              {tab === "dashboard" && (
                <div className="flex items-center gap-3 rounded-xl px-4 py-2.5" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
                  <Clock className="w-5 h-5" style={{ color: C.green }} />
                  <div className="leading-tight">
                    <p className="text-base font-semibold tabular-nums" style={{ color: C.text }}>{timeText}</p>
                    <p className="text-[11px]" style={{ color: C.muted }}>{dateText}</p>
                  </div>
                </div>
              )}
              {tab === "classes" && !openClassId && (
                <button onClick={openAddClass}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white"
                  style={{ background: C.green }}>
                  <Plus className="w-4 h-4" /> Add Class
                </button>
              )}
            </div>
          </div>

          {/* ─── Active session banner ─────────────────────────────────────── */}
          {activeSession && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl px-5 py-4"
              style={{ background: C.greenSoft, border: `2px solid ${C.green}` }}>
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: C.green }} />
                <div>
                  <p className="text-sm font-bold" style={{ color: C.greenDark }}>
                    Recording: {activeSession.className} · {activeSession.classCode}
                  </p>
                  <p className="text-xs" style={{ color: C.green }}>
                    RFID taps are being recorded as attendance. Started {new Date(activeSession.startedAt).toLocaleTimeString()}.
                  </p>
                </div>
              </div>
              <button onClick={handleStopSession} disabled={sessionSaving}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
                style={{ background: C.red }}>
                {sessionSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4" />}
                Stop session
              </button>
            </div>
          )}

          {/* ─────────────────────────── DASHBOARD ────────────────────────── */}
          {tab === "dashboard" && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                {[
                  { label: "Classes",        value: activeClasses.length,     icon: BookOpen,      color: C.green, soft: C.greenSoft },
                  { label: "Students",       value: activeStudents.length,    icon: Users,         color: C.blue,  soft: C.blueSoft },
                  { label: "Present today",  value: overview.present,         icon: CheckCircle2,  color: C.green, soft: C.greenSoft },
                  { label: "Not yet tapped", value: overview.notTapped,       icon: Clock,         color: "#d97706", soft: "#fef3c7" },
                  { label: "Total absences", value: overview.totalAbsences,   icon: AlertTriangle, color: C.red,   soft: "#fee2e2" },
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

              {/* Class cards with Start Session button */}
              <div>
                <h2 className="text-base font-semibold mb-3" style={{ color: C.text }}>Today&apos;s attendance by class</h2>
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {activeClasses.map(c => {
                    const roster   = classStudents(c.key);
                    const todays   = recordsFor(c.key, today);
                    const present  = todays.filter(r => r.status === "present").length;
                    const late     = todays.filter(r => r.status === "late").length;
                    const notTapped = Math.max(roster.length - present - late, 0);
                    const total    = roster.length || 1;
                    const avg      = roster.length
                      ? Math.round(roster.reduce((sum, x) => sum + pairStats(c.key, x.key).rate, 0) / roster.length)
                      : 0;
                    const isActive = activeSession?.classKey === c.key && activeSession.active;
                    return (
                      <div key={c.key} className="rounded-2xl p-5 flex flex-col" style={{
                        ...cardStyle,
                        ...(isActive ? { border: `2px solid ${C.green}` } : {}),
                      }}>
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
                          {isActive ? (
                            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide shrink-0"
                              style={{ background: C.greenSoft, color: C.greenDark, border: `1px solid ${C.green}` }}>
                              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: C.green }} /> Live
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide shrink-0"
                              style={{ background: C.greenSoft, color: C.greenDark, border: `1px solid ${C.greenEdge}` }}>
                              Year {c.year}
                            </span>
                          )}
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

                        <div className="flex items-center justify-between mt-auto pt-4" style={{ borderTop: `1px solid ${C.border}` }}>
                          <div>
                            <p className="text-[11px]" style={{ color: C.muted }}>Avg attendance</p>
                            <p className="text-sm font-bold" style={{ color: avg < 75 && roster.length ? C.red : C.text }}>
                              {roster.length ? `${avg}%` : "—"}
                              <span className="font-medium text-xs" style={{ color: C.muted }}> · {roster.length} students</span>
                            </p>
                          </div>
                          {isActive ? (
                            <button onClick={handleStopSession} disabled={sessionSaving}
                              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg"
                              style={{ background: "#fee2e2", color: C.red }}>
                              {sessionSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Square className="w-3.5 h-3.5" />}
                              Stop
                            </button>
                          ) : (
                            <button onClick={() => handleStartSession(c)} disabled={sessionSaving || (!!activeSession && activeSession.active)}
                              title={activeSession?.active ? "Stop the current session first" : "Start recording attendance"}
                              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-40"
                              style={{ background: C.greenSoft, color: C.greenDark }}>
                              {sessionSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                              Start
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {activeClasses.length === 0 && (
                    <p className="col-span-full text-sm py-8 text-center" style={{ color: C.muted }}>
                      No classes yet. Go to the Classes tab and add one.
                    </p>
                  )}
                </div>
              </div>

              {/* Needs attention + recent taps */}
              <div className="grid lg:grid-cols-3 gap-5">
                <section className="lg:col-span-2 rounded-2xl overflow-hidden" style={cardStyle}>
                  <div className="p-5 pb-4">
                    <h2 className="font-semibold" style={{ color: C.text }}>Students to monitor</h2>
                    <p className="text-xs mt-0.5" style={{ color: C.muted }}>3 or more absences, or attendance rate below 75%.</p>
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
                            <th className="py-2.5 pr-5 font-medium">Rate</th>
                          </tr>
                        </thead>
                        <tbody>
                          {needsAttention.map(n => (
                            <tr key={n.student.key + n.cls.key} style={{ borderTop: `1px solid ${C.border}` }}>
                              <td className="py-3 pl-5 pr-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                                    style={{ background: C.greenSoft, color: C.greenDark, border: `1px solid ${C.greenEdge}` }}>
                                    {initials(n.student.name)}
                                  </div>
                                  <div>
                                    <p className="font-semibold" style={{ color: C.text }}>{n.student.name}</p>
                                    <p className="text-xs" style={{ color: C.muted }}>{n.student.studentId}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 pr-4 font-medium" style={{ color: C.text }}>{n.cls.name}</td>
                              <td className="py-3 pr-4">
                                <span className="px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: "#fee2e2", color: C.red }}>
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
                        <li key={`${r.rec.classKey}${r.rec.studentKey}`} className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                            style={{ background: C.greenSoft, color: C.greenDark, border: `1px solid ${C.greenEdge}` }}>
                            {initials(r.student.name)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold truncate" style={{ color: C.text }}>{r.student.name}</p>
                            <p className="text-xs truncate" style={{ color: C.muted }}>{r.cls.name} · {r.cls.code}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs font-semibold" style={{ color: C.text }}>
                              {r.rec.timeInMs ? fmtTime(msToMin(r.rec.timeInMs)) : "—"}
                            </p>
                            <p className="text-[11px] font-medium" style={{ color: STATUS_META[r.rec.status].color }}>
                              {r.rec.status === "late" ? "Late" : "On time"}
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

          {/* ──────────────────────────── CLASSES ─────────────────────────── */}
          {tab === "classes" && !openClassId && (
            <>
              <div className="flex items-center gap-3 rounded-xl px-4 py-3.5" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
                <Search className="w-4 h-4 shrink-0" style={{ color: C.muted }} />
                <input value={classSearch} onChange={e => setClassSearch(e.target.value)}
                  maxLength={SEARCH_MAX} placeholder="Search classes by name, course, or year..."
                  className="flex-1 bg-transparent outline-none text-sm font-medium" style={{ color: C.text }} />
              </div>
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredClasses.map(c => {
                  const count = classStudents(c.key).length;
                  return (
                    <button key={c.key} onClick={() => { setOpenClassId(c.key); setClassView("attendance"); }}
                      className="text-left rounded-2xl p-6" style={cardStyle}>
                      <div className="flex items-start justify-between">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: C.greenSoft }}>
                          <GraduationCap className="w-6 h-6" style={{ color: C.green }} />
                        </div>
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide"
                          style={{ background: C.greenSoft, color: C.greenDark, border: `1px solid ${C.greenEdge}` }}>
                          Year {c.year}
                        </span>
                      </div>
                      <h3 className="mt-5 text-lg font-bold" style={{ color: C.text }}>{c.name}</h3>
                      <p className="text-sm font-semibold mt-1" style={{ color: C.muted }}>{c.code}</p>
                      <p className="flex items-center gap-2 text-xs font-medium mt-3" style={{ color: C.muted }}>
                        <CalendarDays className="w-3.5 h-3.5" /> {fmtDay(c.createdAt?.substring(0, 10) ?? "")}
                      </p>
                      <div className="flex items-center justify-between mt-5 pt-4" style={{ borderTop: `1px solid ${C.border}` }}>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: C.blueSoft }}>
                            <Users className="w-4 h-4" style={{ color: C.blue }} />
                          </div>
                          <span className="text-sm font-bold" style={{ color: C.text }}>
                            {count} <span className="text-[10px] font-semibold uppercase" style={{ color: C.muted }}>{count === 1 ? "Student" : "Students"}</span>
                          </span>
                        </div>
                        <ClipboardCheck className="w-4 h-4" style={{ color: C.muted }} />
                      </div>
                    </button>
                  );
                })}
              </div>
              {filteredClasses.length === 0 && (
                <p className="text-sm text-center py-10" style={{ color: C.muted }}>No classes yet. Click Add Class to get started.</p>
              )}
            </>
          )}

          {tab === "classes" && openClassItem && (() => {
            const roster = classStudents(openClassItem.key);
            const q = rosterSearch.trim().toLowerCase();
            const shownRoster = roster.filter(x => !q || x.name.toLowerCase().includes(q) || x.studentId.includes(q));
            const rosterPaged = paginate(shownRoster, rosterPage);
            return (
              <>
                <button onClick={() => setOpenClassId(null)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold"
                  style={{ background: C.surface, color: C.text, border: `1px solid ${C.border}`, boxShadow: "0 1px 2px rgba(16,24,40,.05)" }}>
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
                    <button onClick={() => openEditClass(openClassItem)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
                      style={{ background: C.surface, color: C.text, border: `1px solid ${C.border}`, boxShadow: "0 1px 2px rgba(16,24,40,.05)" }}>
                      <Pencil className="w-4 h-4" /> Edit class
                    </button>
                    <button onClick={() => archiveClass(openClassItem)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
                      style={{ background: C.amberSoft, color: C.amber, border: `1px solid ${C.amberSoft}` }}>
                      <Archive className="w-4 h-4" /> Archive class
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  {([
                    { id: "attendance" as const, label: "Attendance", icon: ClipboardCheck },
                    { id: "students"   as const, label: `Students ${roster.length}`, icon: Users },
                  ]).map(t => {
                    const Icon = t.icon;
                    const active = classView === t.id;
                    return (
                      <button key={t.id} onClick={() => setClassView(t.id)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
                        style={{ background: active ? C.ink : C.surface, color: active ? "#fff" : C.text, border: `1px solid ${active ? C.ink : C.border}`, boxShadow: "0 1px 2px rgba(16,24,40,.05)" }}>
                        <Icon className="w-4 h-4" /> {t.label}
                      </button>
                    );
                  })}
                </div>

                {classView === "attendance" ? renderAttendance(true) : (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <button onClick={openAddStudents}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
                        style={{ background: C.green }}>
                        <UserPlus className="w-4 h-4" /> Add students
                      </button>
                    </div>
                    <div className="flex items-center gap-3 rounded-xl px-4 py-3.5" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
                      <Search className="w-4 h-4 shrink-0" style={{ color: C.muted }} />
                      <input value={rosterSearch} onChange={e => setRosterSearch(e.target.value)}
                        maxLength={SEARCH_MAX} placeholder="Search roster..."
                        className="flex-1 bg-transparent outline-none text-sm" style={{ color: C.text }} />
                    </div>
                    <section className="rounded-2xl overflow-hidden" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
                      <table className="w-full text-sm min-w-[480px]">
                        <thead>
                          <tr className="text-left text-xs" style={{ color: C.muted, background: C.bg }}>
                            <th className="py-3 pl-5 pr-4 font-medium">Student</th>
                            <th className="py-3 pr-4 font-medium">RFID</th>
                            <th className="py-3 pr-4 font-medium">Absences</th>
                            <th className="py-3 pr-5 font-medium">Rate</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rosterPaged.items.length === 0 ? (
                            <tr><td colSpan={4} className="py-10 text-center text-sm" style={{ color: C.muted }}>No students in this class yet.</td></tr>
                          ) : rosterPaged.items.map(s => {
                            const { absent, rate } = pairStats(openClassItem.key, s.key);
                            return (
                              <tr key={s.key} style={{ borderTop: `1px solid ${C.border}` }}>
                                <td className="py-3 pl-5 pr-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                                      style={{ background: C.greenSoft, color: C.greenDark, border: `1px solid ${C.greenEdge}` }}>
                                      {initials(s.name)}
                                    </div>
                                    <div>
                                      <p className="font-semibold" style={{ color: C.text }}>{s.name}</p>
                                      <p className="text-xs" style={{ color: C.muted }}>{s.studentId}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3 pr-4">
                                  {s.rfidUid ? (
                                    <span className="flex items-center gap-1.5 text-xs font-mono font-semibold" style={{ color: C.greenDark }}>
                                      <Wifi className="w-3.5 h-3.5" /> {s.rfidUid}
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1.5 text-xs" style={{ color: C.muted }}>
                                      <WifiOff className="w-3.5 h-3.5" /> No card
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 pr-4">
                                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold"
                                    style={{ background: absent >= 3 ? "#fee2e2" : C.bg, color: absent >= 3 ? C.red : C.muted }}>
                                    {absent}
                                  </span>
                                </td>
                                <td className="py-3 pr-5">
                                  <div className="flex items-center gap-2">
                                    <div className="h-2 w-20 rounded-full" style={{ background: "#e5e7eb" }}>
                                      <div className="h-2 rounded-full" style={{ width: `${rate}%`, background: rate < 75 ? C.red : C.green }} />
                                    </div>
                                    <span className="text-xs font-semibold" style={{ color: C.text }}>{rate}%</span>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      <Pagination page={rosterPaged.page} totalPages={rosterPaged.totalPages} total={rosterPaged.total} onChange={setRosterPage} />
                    </section>
                  </>
                )}
              </>
            );
          })()}

          {/* ─────────────────────────── ATTENDANCE ───────────────────────── */}
          {tab === "attendance" && renderAttendance(false)}

          {/* ──────────────────────────── STUDENTS ────────────────────────── */}
          {tab === "students" && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3 flex-1">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: C.muted }} />
                    <input value={search} onChange={e => setSearch(e.target.value)} maxLength={SEARCH_MAX}
                      placeholder="Search name or student ID..."
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
                  </div>
                  {[
                    { val: fsYear,    set: setFsYear,    opts: studentYears.map(String), label: "All years",    fmt: (v: string) => `Year ${v}` },
                    { val: fsSection, set: setFsSection, opts: studentSections,          label: "All sections", fmt: (v: string) => v },
                    { val: fsProgram, set: setFsProgram, opts: studentPrograms,          label: "All programs", fmt: (v: string) => v },
                  ].map(({ val, set, opts, label, fmt }) => (
                    <div key={label} className={selectWrap}>
                      <select value={val} onChange={e => set(e.target.value)} className="appearance-none px-4 py-2.5 pr-9 rounded-xl text-sm font-medium outline-none" style={inputStyle}>
                        <option value="all">{label}</option>
                        {opts.map(o => <option key={o} value={o}>{fmt(o)}</option>)}
                      </select>
                      <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: C.muted }} />
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={exportStudentsCsv} disabled={filteredStudents.length === 0}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40"
                    style={{ background: C.surface, color: C.text, border: `1px solid ${C.border}` }}>
                    <Download className="w-4 h-4" /> Export
                  </button>
                  <button onClick={() => openStudentModal("add")}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
                    style={{ background: C.green }}>
                    <Plus className="w-4 h-4" /> Add Student
                  </button>
                </div>
              </div>

              <section className="rounded-2xl overflow-hidden" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
                <table className="w-full text-sm min-w-[640px]">
                  <thead>
                    <tr className="text-left text-xs" style={{ color: C.muted, background: C.bg }}>
                      {["Student", "Program / Section", "RFID Card", "Classes", "Actions"].map(h => (
                        <th key={h} className="py-3 pl-5 pr-4 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {stuPaged.items.length === 0 ? (
                      <tr><td colSpan={5} className="py-10 text-center text-sm" style={{ color: C.muted }}>
                        {search || fsYear !== "all" || fsSection !== "all" || fsProgram !== "all"
                          ? "No students match your filters." : "No students yet. Click Add Student to get started."}
                      </td></tr>
                    ) : stuPaged.items.map(s => (
                      <tr key={s.key} style={{ borderTop: `1px solid ${C.border}` }}>
                        <td className="py-3 pl-5 pr-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                              style={{ background: C.greenSoft, color: C.greenDark, border: `1px solid ${C.greenEdge}` }}>
                              {initials(s.name)}
                            </div>
                            <div>
                              <p className="font-semibold" style={{ color: C.text }}>{s.name}</p>
                              <p className="text-xs" style={{ color: C.muted }}>{s.studentId}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 pr-4" style={{ color: C.muted }}>
                          <p className="text-xs font-semibold" style={{ color: C.text }}>{s.program} · Year {s.year}</p>
                          <p className="text-xs">{s.section}</p>
                        </td>
                        <td className="py-3 pr-4">
                          {s.rfidUid ? (
                            <span className="flex items-center gap-1.5 text-xs font-mono font-semibold" style={{ color: C.greenDark }}>
                              <Wifi className="w-3.5 h-3.5" /> {s.rfidUid}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 text-xs" style={{ color: C.muted }}>
                              <WifiOff className="w-3.5 h-3.5" /> No card
                            </span>
                          )}
                        </td>
                        <td className="py-3 pr-4 text-xs" style={{ color: C.muted }}>
                          {(s.classKeys ?? []).map(k => {
                            const cls = classes.find(c => c.key === k);
                            return cls ? <span key={k} className="mr-1">{cls.code}</span> : null;
                          })}
                        </td>
                        <td className="py-3 pr-4">
                          <div className="flex gap-1.5">
                            <button onClick={() => openStudentModal("view", s)} title="View"
                              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-green-50"
                              style={{ border: `1px solid ${C.border}`, color: C.muted }}>
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => openStudentModal("edit", s)} title="Edit"
                              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-green-50"
                              style={{ border: `1px solid ${C.border}`, color: C.muted }}>
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => archiveStudent(s)} title="Archive"
                              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-amber-50"
                              style={{ border: `1px solid ${C.border}`, color: C.muted }}>
                              <Archive className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <Pagination page={stuPaged.page} totalPages={stuPaged.totalPages} total={stuPaged.total} onChange={setStuPage} />
              </section>
            </>
          )}

          {/* ──────────────────────────── ARCHIVE ─────────────────────────── */}
          {tab === "archive" && (
            <>
              <div className="flex flex-wrap gap-3 items-center justify-between">
                <div className="flex gap-2">
                  {(["students", "classes"] as const).map(v => (
                    <button key={v} onClick={() => setArchiveView(v)}
                      className="px-4 py-2 rounded-xl text-sm font-semibold capitalize"
                      style={{ background: archiveView === v ? C.ink : C.surface, color: archiveView === v ? "#fff" : C.text, border: `1px solid ${archiveView === v ? C.ink : C.border}` }}>
                      {v}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: C.muted }} />
                  <input value={archiveSearch} onChange={e => setArchiveSearch(e.target.value)}
                    maxLength={SEARCH_MAX} placeholder={`Search archived ${archiveView}...`}
                    className="pl-9 pr-3 py-2.5 rounded-xl text-sm outline-none w-64" style={inputStyle} />
                </div>
              </div>

              {archiveView === "students" && (
                <section className="rounded-2xl overflow-hidden" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
                  <table className="w-full text-sm min-w-[480px]">
                    <thead>
                      <tr className="text-left text-xs" style={{ color: C.muted, background: C.bg }}>
                        {["Student", "Program", "Actions"].map(h => (
                          <th key={h} className="py-3 pl-5 pr-4 font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {arcStuPaged.items.length === 0 ? (
                        <tr><td colSpan={3} className="py-10 text-center text-sm" style={{ color: C.muted }}>No archived students.</td></tr>
                      ) : arcStuPaged.items.map(s => (
                        <tr key={s.key} style={{ borderTop: `1px solid ${C.border}` }}>
                          <td className="py-3 pl-5 pr-4">
                            <p className="font-semibold" style={{ color: C.text }}>{s.name}</p>
                            <p className="text-xs" style={{ color: C.muted }}>{s.studentId}</p>
                          </td>
                          <td className="py-3 pr-4 text-xs" style={{ color: C.muted }}>{s.program} · Year {s.year} · {s.section}</td>
                          <td className="py-3 pr-4">
                            <div className="flex gap-1.5">
                              <button onClick={() => restoreStudent(s)} title="Restore"
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                                style={{ background: C.greenSoft, color: C.greenDark, border: `1px solid ${C.greenEdge}` }}>
                                <ArchiveRestore className="w-3.5 h-3.5" /> Restore
                              </button>
                              <button onClick={() => deleteStudentForever(s)} title="Delete permanently"
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                                style={{ background: "#fee2e2", color: C.red }}>
                                <Trash2 className="w-3.5 h-3.5" /> Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <Pagination page={arcStuPaged.page} totalPages={arcStuPaged.totalPages} total={arcStuPaged.total} onChange={setArcStuPage} />
                </section>
              )}

              {archiveView === "classes" && (
                <section className="rounded-2xl overflow-hidden" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
                  <table className="w-full text-sm min-w-[480px]">
                    <thead>
                      <tr className="text-left text-xs" style={{ color: C.muted, background: C.bg }}>
                        {["Class", "Schedule", "Actions"].map(h => (
                          <th key={h} className="py-3 pl-5 pr-4 font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {arcClsPaged.items.length === 0 ? (
                        <tr><td colSpan={3} className="py-10 text-center text-sm" style={{ color: C.muted }}>No archived classes.</td></tr>
                      ) : arcClsPaged.items.map(c => (
                        <tr key={c.key} style={{ borderTop: `1px solid ${C.border}` }}>
                          <td className="py-3 pl-5 pr-4">
                            <p className="font-semibold" style={{ color: C.text }}>{c.name} · {c.code}</p>
                            <p className="text-xs" style={{ color: C.muted }}>Year {c.year}</p>
                          </td>
                          <td className="py-3 pr-4 text-xs" style={{ color: C.muted }}>{c.schedule} · {c.room}</td>
                          <td className="py-3 pr-4">
                            <div className="flex gap-1.5">
                              <button onClick={() => restoreClass(c)} title="Restore"
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                                style={{ background: C.greenSoft, color: C.greenDark, border: `1px solid ${C.greenEdge}` }}>
                                <ArchiveRestore className="w-3.5 h-3.5" /> Restore
                              </button>
                              <button onClick={() => deleteClassForever(c)} title="Delete permanently"
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                                style={{ background: "#fee2e2", color: C.red }}>
                                <Trash2 className="w-3.5 h-3.5" /> Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <Pagination page={arcClsPaged.page} totalPages={arcClsPaged.totalPages} total={arcClsPaged.total} onChange={setArcClsPage} />
                </section>
              )}
            </>
          )}

        </div>
      </main>

      {/* ─── Modals ───────────────────────────────────────────────────── */}

      {showAdd && (
        <ClassEditorModal
          editing={!!editingClassId}
          onClose={() => { setShowAdd(false); setEditingClassId(null); resetClassForm(); }}
          onSubmit={handleAddClass}
          name={newName} setName={setNewName}
          code={newCode} setCode={setNewCode}
          year={newYear} setYear={setNewYear}
          room={newRoom} setRoom={setNewRoom}
          days={newDays} setDays={setNewDays}
          start={newStart} setStart={setNewStart}
          end={newEnd} setEnd={setNewEnd}
          error={classError}
        />
      )}

      {addStudentsOpen && openClassItem && (
        <AddStudentsModal
          classItem={openClassItem}
          students={activeStudents.filter(s => !(s.classKeys ?? []).includes(openClassItem.key)).map(s => ({
            ...s, id: s.key, classIds: s.classKeys ?? [],
          }))}
          search={pickSearch} setSearch={setPickSearch}
          selectedIds={pickIds} setSelectedIds={setPickIds}
          onAdd={() => addPickedToClass(openClassItem)}
          onClose={() => setAddStudentsOpen(false)}
        />
      )}

      {studentModal && (
        <StudentModal
          modal={studentModal}
          students={activeStudents.map(s => ({ ...s, id: s.key, rfid: s.rfidUid ?? "", classIds: s.classKeys ?? [] }))}
          classes={activeClasses.map(c => ({ ...c, id: c.key, created: c.createdAt?.substring(0, 10) ?? "" }))}
          activeClasses={activeClasses.map(c => ({ ...c, id: c.key, created: c.createdAt?.substring(0, 10) ?? "" }))}
          onClose={() => setStudentModal(null)}
          onOpen={(mode, st) => {
            if (!st) { openStudentModal(mode); return; }
            const sr = activeStudents.find(x => x.key === st.id);
            if (sr) openStudentModal(mode, sr);
          }}
          onSave={handleSaveStudent}
          firstName={sFirst} setFirstName={setSFirst}
          lastName={sLast} setLastName={setSLast}
          emailId={sEmail} setEmailId={setSEmail}
          program={sProgram} setProgram={setSProgram}
          year={sYear} setYear={setSYear}
          section={sSection} setSection={setSSection}
          rfid={sRfid} setRfid={setSRfid}
          classIds={sClassIds} onToggleClass={toggleClass}
          error={sError}
        />
      )}

      {/* Confirm dialog */}
      {confirmDlg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(17,24,39,.45)" }}>
          <div className="w-full max-w-sm rounded-2xl p-6" style={{ background: C.surface }}>
            <h3 className="text-base font-bold mb-1" style={{ color: confirmDlg.tone === "delete" ? C.red : C.text }}>
              {confirmDlg.title}
            </h3>
            <p className="text-sm font-semibold mb-2" style={{ color: C.text }}>{confirmDlg.subject}</p>
            <p className="text-sm mb-6" style={{ color: C.muted }}>{confirmDlg.message}</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmDlg(null)}
                className="px-4 py-2.5 rounded-lg text-sm font-medium"
                style={{ background: C.bg, color: C.muted, border: `1px solid ${C.border}` }}>
                Cancel
              </button>
              <button onClick={confirmDlg.onConfirm}
                className="px-4 py-2.5 rounded-lg text-sm font-semibold text-white"
                style={{ background: confirmDlg.tone === "delete" ? C.red : C.amber }}>
                {confirmDlg.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sign-out confirm */}
      {confirmSignOut && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(17,24,39,.45)" }}>
          <div className="w-full max-w-sm rounded-2xl p-6" style={{ background: C.surface }}>
            <h3 className="text-base font-bold mb-2" style={{ color: C.text }}>Sign out?</h3>
            <p className="text-sm mb-6" style={{ color: C.muted }}>You will be returned to the login page.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmSignOut(false)}
                className="px-4 py-2.5 rounded-lg text-sm font-medium"
                style={{ background: C.bg, color: C.muted, border: `1px solid ${C.border}` }}>
                Cancel
              </button>
              <button onClick={logout}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white"
                style={{ background: C.red }}>
                <LogOut className="w-4 h-4" /> Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Edit Attendance Record Modal ─────────────────────────── */}
      {editRec && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(17,24,39,.45)" }}>
          <div className="w-full max-w-sm rounded-2xl p-6" style={{ background: C.surface }}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-bold" style={{ color: C.text }}>Edit Attendance</h3>
                <p className="text-xs mt-0.5" style={{ color: C.muted }}>
                  {editRec.student.name} · {editRec.cls.code}
                </p>
              </div>
              <button onClick={() => setEditRec(null)} style={{ color: C.muted }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Date */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: C.muted }}>Date</label>
                <input
                  type="date"
                  value={editDate}
                  onChange={e => setEditDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                  style={inputStyle}
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: C.muted }}>Status</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["present", "late", "absent", "incomplete"] as const).map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setEditStatus(s)}
                      className="px-3 py-2 rounded-lg text-xs font-semibold capitalize"
                      style={{
                        background: editStatus === s ? `${STATUS_META[s].color}20` : C.bg,
                        color: editStatus === s ? STATUS_META[s].color : C.muted,
                        border: `1px solid ${editStatus === s ? STATUS_META[s].color : C.border}`,
                      }}
                    >
                      {STATUS_META[s].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time In */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: C.muted }}>Time In</label>
                <input
                  type="time"
                  value={editTimeIn}
                  onChange={e => setEditTimeIn(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                  style={inputStyle}
                />
              </div>

              {/* Time Out */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: C.muted }}>
                  Time Out <span style={{ color: C.muted, fontWeight: 400 }}>(optional)</span>
                </label>
                <input
                  type="time"
                  value={editTimeOut}
                  onChange={e => setEditTimeOut(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                  style={inputStyle}
                />
              </div>

              {editError && <p className="text-xs" style={{ color: C.red }}>{editError}</p>}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setEditRec(null)}
                  className="px-4 py-2.5 rounded-lg text-sm font-medium"
                  style={{ background: C.bg, color: C.muted, border: `1px solid ${C.border}` }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEditRec}
                  disabled={editSaving}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-60"
                  style={{ background: C.green }}
                >
                  {editSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (        <div className="fixed bottom-6 right-6 z-[200] px-5 py-3.5 rounded-2xl text-sm font-semibold text-white shadow-xl"
          style={{
            background: toast.kind === "delete" ? C.red : toast.kind === "archive" ? C.amber : toast.kind === "error" ? C.red : C.green,
            animation: "toastIn .3s ease both",
          }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
