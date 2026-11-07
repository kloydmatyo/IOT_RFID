import type { Dispatch, FormEventHandler, SetStateAction } from "react";
import { X } from "lucide-react";
import {
  C,
  ClassItem,
  cleanName,
  cleanProgram,
  cleanSection,
  cleanStudentNo,
  EMAIL_DOMAIN,
  inputStyle,
  MAX_LEN,
  PROGRAM_MAX,
  SECTION_MAX,
  Student,
  StudentModalMode,
} from "@/lib/teacher";
import { initials } from "@/lib/teacher";

interface StudentModalProps {
  modal: { mode: StudentModalMode; id?: string } | null;
  students: Student[];
  classes: ClassItem[];
  activeClasses: ClassItem[];
  onClose: () => void;
  onOpen: (mode: StudentModalMode, student?: Student) => void;
  onSave: FormEventHandler<HTMLFormElement>;
  firstName: string;
  setFirstName: Dispatch<SetStateAction<string>>;
  lastName: string;
  setLastName: Dispatch<SetStateAction<string>>;
  emailId: string;
  setEmailId: Dispatch<SetStateAction<string>>;
  program: string;
  setProgram: Dispatch<SetStateAction<string>>;
  year: number;
  setYear: Dispatch<SetStateAction<number>>;
  section: string;
  setSection: Dispatch<SetStateAction<string>>;
  rfid: string;
  setRfid: Dispatch<SetStateAction<string>>;
  classIds: string[];
  onToggleClass: (id: string) => void;
  error: string;
}

export default function StudentModal({
  modal,
  students,
  classes,
  activeClasses,
  onClose,
  onOpen,
  onSave,
  firstName,
  setFirstName,
  lastName,
  setLastName,
  emailId,
  setEmailId,
  program,
  setProgram,
  year,
  setYear,
  section,
  setSection,
  rfid,
  setRfid,
  classIds,
  onToggleClass,
  error,
}: StudentModalProps) {
  if (!modal) return null;

  const { mode } = modal;
  const viewing = mode === "view";
  const current = students.find(student => student.id === modal.id);
  const title = mode === "add" ? "Add student" : mode === "edit" ? "Edit student" : "Student details";
  const label = "block text-sm font-medium mb-1.5";
  const field = "w-full min-w-0 px-3 py-2.5 rounded-lg text-sm outline-none";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(17,24,39,.45)" }} onClick={onClose}>
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto overflow-x-hidden rounded-2xl p-6" style={{ background: C.surface }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold" style={{ color: C.text }}>{title}</h2>
          <button onClick={onClose} aria-label="Close" style={{ color: C.muted }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {viewing && current ? (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-semibold" style={{ background: C.greenSoft, color: C.greenDark, border: `1px solid ${C.greenEdge}` }}>
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
              ].map(([key, value]) => (
                <div key={key}>
                  <dt className="text-xs" style={{ color: C.muted }}>{key}</dt>
                  <dd className="font-semibold" style={{ color: C.text }}>{value}</dd>
                </div>
              ))}
            </dl>
            <div>
              <p className="text-xs mb-2" style={{ color: C.muted }}>Classes</p>
              <div className="flex flex-wrap gap-1.5">
                {current.classIds.map(id => {
                  const classItem = classes.find(item => item.id === id);
                  return classItem ? (
                    <span key={id} className="px-2 py-0.5 rounded-md text-xs" style={{ background: C.greenSoft, color: C.greenDark, border: `1px solid ${C.greenEdge}` }}>
                      {classItem.name} · {classItem.code}{classItem.archived ? " (archived)" : ""}
                    </span>
                  ) : null;
                })}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={onClose} className="px-4 py-2.5 rounded-lg text-sm font-medium" style={{ background: C.bg, color: C.muted, border: `1px solid ${C.border}` }}>
                Close
              </button>
              <button onClick={() => onOpen("edit", current)} className="px-4 py-2.5 rounded-lg text-sm font-semibold text-white" style={{ background: C.green }}>
                Edit student
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={onSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="min-w-0">
                <label className={label} style={{ color: C.muted }}>First name</label>
                <input value={firstName} onChange={e => setFirstName(cleanName(e.target.value))} maxLength={MAX_LEN} placeholder="Juan" className={field} style={inputStyle} />
              </div>
              <div className="min-w-0">
                <label className={label} style={{ color: C.muted }}>Last name</label>
                <input value={lastName} onChange={e => setLastName(cleanName(e.target.value))} maxLength={MAX_LEN} placeholder="Dela Cruz" className={field} style={inputStyle} />
              </div>
            </div>
            <div>
              <label className={label} style={{ color: C.muted }}>Gordon College email</label>
              <div className="flex items-center rounded-lg overflow-hidden" style={{ ...inputStyle, ...(mode === "edit" ? { background: C.bg } : {}) }}>
                <input
                  type="text"
                  inputMode="numeric"
                  value={emailId}
                  onChange={e => setEmailId(cleanStudentNo(e.target.value))}
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
                <input value={program} onChange={e => setProgram(cleanProgram(e.target.value))} maxLength={PROGRAM_MAX} placeholder="BSIT" className={field} style={inputStyle} />
              </div>
              <div className="min-w-0">
                <label className={label} style={{ color: C.muted }}>Year</label>
                <select value={year} onChange={e => setYear(Number(e.target.value))} className={field} style={inputStyle}>
                  {[1, 2, 3, 4].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div className="min-w-0">
                <label className={label} style={{ color: C.muted }}>Section</label>
                <input value={section} onChange={e => setSection(cleanSection(e.target.value))} maxLength={SECTION_MAX} placeholder="BSIT 4B" className={field} style={inputStyle} />
              </div>
            </div>
            <div>
              <label className={label} style={{ color: C.muted }}>RFID UID (optional)</label>
              <input value={rfid} onChange={e => setRfid(e.target.value.toUpperCase())} placeholder="7F3A91C2" className={`${field} font-mono`} style={inputStyle} />
              <p className="text-xs mt-1" style={{ color: C.muted }}>Leave blank if the student has no card yet.</p>
            </div>
            <div>
              <p className={label} style={{ color: C.muted }}>Classes</p>
              <div className="grid grid-cols-2 gap-2">
                {activeClasses.map(classItem => (
                  <label
                    key={classItem.id}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer min-w-0"
                    style={{
                      border: `1px solid ${classIds.includes(classItem.id) ? C.green : C.border}`,
                      background: classIds.includes(classItem.id) ? C.greenSoft : C.surface,
                      color: C.text,
                    }}
                  >
                    <input type="checkbox" checked={classIds.includes(classItem.id)} onChange={() => onToggleClass(classItem.id)} style={{ accentColor: C.green }} />
                    <span className="truncate">{classItem.name} · {classItem.code}</span>
                  </label>
                ))}
              </div>
            </div>
            {error && <p className="text-sm" style={{ color: C.red }}>{error}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-lg text-sm font-medium" style={{ background: C.bg, color: C.muted, border: `1px solid ${C.border}` }}>
                Cancel
              </button>
              <button type="submit" className="px-4 py-2.5 rounded-lg text-sm font-semibold text-white" style={{ background: C.green }}>
                {mode === "add" ? "Add student" : "Save changes"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
