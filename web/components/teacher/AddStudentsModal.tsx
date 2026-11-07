import type { Dispatch, SetStateAction } from "react";
import { Search, X } from "lucide-react";
import { C, ClassItem, inputStyle, SEARCH_MAX, Student } from "@/lib/teacher";

interface AddStudentsModalProps {
  classItem: ClassItem | null;
  students: Student[];
  search: string;
  setSearch: Dispatch<SetStateAction<string>>;
  selectedIds: string[];
  setSelectedIds: Dispatch<SetStateAction<string[]>>;
  onAdd: (classItem: ClassItem) => void;
  onClose: () => void;
}

export default function AddStudentsModal({
  classItem,
  students,
  search,
  setSearch,
  selectedIds,
  setSelectedIds,
  onAdd,
  onClose,
}: AddStudentsModalProps) {
  if (!classItem) return null;

  const q = search.trim().toLowerCase();
  const available = students.filter(
    student => !student.classIds.includes(classItem.id) &&
      (!q || student.name.toLowerCase().includes(q) || student.id.includes(q))
  );
  const noneLeft = students.every(student => student.classIds.includes(classItem.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(17,24,39,.45)" }} onClick={onClose}>
      <div className="w-full max-w-md max-h-[90vh] flex flex-col rounded-2xl p-6" style={{ background: C.surface }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-bold" style={{ color: C.text }}>Add students</h2>
          <button onClick={onClose} aria-label="Close" style={{ color: C.muted }}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs mb-4" style={{ color: C.muted }}>
          Pick registered students to enroll in {classItem.name} · {classItem.code}.
        </p>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: C.muted }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            maxLength={SEARCH_MAX}
            placeholder="Search name or ID"
            className="w-full pl-9 pr-3 py-2.5 rounded-lg text-sm outline-none"
            style={inputStyle}
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 min-h-[120px]">
          {available.map(student => {
            const checked = selectedIds.includes(student.id);
            return (
              <label
                key={student.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer"
                style={{ border: `1px solid ${checked ? C.green : C.border}`, background: checked ? C.greenSoft : C.surface }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => setSelectedIds(prev => prev.includes(student.id) ? prev.filter(id => id !== student.id) : [...prev, student.id])}
                  style={{ accentColor: C.green }}
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: C.text }}>{student.lastName}, {student.firstName}</p>
                  <p className="text-xs" style={{ color: C.muted }}>{student.id} · {student.section}</p>
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
          <button onClick={onClose} className="px-4 py-2.5 rounded-lg text-sm font-medium" style={{ background: C.bg, color: C.muted, border: `1px solid ${C.border}` }}>
            Cancel
          </button>
          <button
            onClick={() => onAdd(classItem)}
            disabled={selectedIds.length === 0}
            className="px-4 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: C.green }}
          >
            {selectedIds.length > 0 ? `Add ${selectedIds.length} student${selectedIds.length === 1 ? "" : "s"}` : "Add students"}
          </button>
        </div>
      </div>
    </div>
  );
}
