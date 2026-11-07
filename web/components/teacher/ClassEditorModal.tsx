import type { Dispatch, FormEventHandler, SetStateAction } from "react";
import { X } from "lucide-react";
import { C, cleanCode, cleanWords, inputStyle, MAX_LEN, MAX_TIME, MIN_TIME, WEEK_DAYS } from "@/lib/teacher";

interface ClassEditorModalProps {
  editing: boolean;
  onClose: () => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
  name: string;
  setName: Dispatch<SetStateAction<string>>;
  code: string;
  setCode: Dispatch<SetStateAction<string>>;
  year: number;
  setYear: Dispatch<SetStateAction<number>>;
  room: string;
  setRoom: Dispatch<SetStateAction<string>>;
  days: string[];
  setDays: Dispatch<SetStateAction<string[]>>;
  start: string;
  setStart: Dispatch<SetStateAction<string>>;
  end: string;
  setEnd: Dispatch<SetStateAction<string>>;
  error: string;
}

export default function ClassEditorModal({
  editing,
  onClose,
  onSubmit,
  name,
  setName,
  code,
  setCode,
  year,
  setYear,
  room,
  setRoom,
  days,
  setDays,
  start,
  setStart,
  end,
  setEnd,
  error,
}: ClassEditorModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(17,24,39,.45)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md max-h-[90vh] overflow-y-auto overflow-x-hidden rounded-2xl p-6"
        style={{ background: C.surface }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold" style={{ color: C.text }}>{editing ? "Edit class" : "Add class"}</h2>
          <button onClick={onClose} aria-label="Close" style={{ color: C.muted }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="min-w-0">
              <label className="block text-sm font-medium mb-1.5" style={{ color: C.muted }}>Class name</label>
              <input
                value={name}
                onChange={e => setName(cleanWords(e.target.value))}
                maxLength={MAX_LEN}
                placeholder="BSIT 3"
                className="w-full min-w-0 px-3 py-2.5 rounded-lg text-sm outline-none"
                style={inputStyle}
              />
            </div>
            <div className="min-w-0">
              <label className="block text-sm font-medium mb-1.5" style={{ color: C.muted }}>Subject code</label>
              <input
                value={code}
                onChange={e => setCode(cleanCode(e.target.value))}
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
              <select value={year} onChange={e => setYear(Number(e.target.value))} className="w-full min-w-0 px-3 py-2.5 rounded-lg text-sm outline-none" style={inputStyle}>
                {[1, 2, 3, 4].map(y => <option key={y} value={y}>Year {y}</option>)}
              </select>
            </div>
            <div className="min-w-0">
              <label className="block text-sm font-medium mb-1.5" style={{ color: C.muted }}>Room</label>
              <input
                value={room}
                onChange={e => setRoom(cleanWords(e.target.value))}
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
              {WEEK_DAYS.map(day => {
                const checked = days.includes(day);
                return (
                  <label
                    key={day}
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
                      onChange={() => setDays(prev => prev.includes(day) ? prev.filter(x => x !== day) : [...prev, day])}
                      style={{ accentColor: C.green }}
                    />
                    <span>{day}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="min-w-0">
              <label className="block text-sm font-medium mb-1.5" style={{ color: C.muted }}>Start time</label>
              <input type="time" value={start} min={MIN_TIME} max={MAX_TIME} onChange={e => setStart(e.target.value)} className="w-full min-w-0 px-3 py-2.5 rounded-lg text-sm outline-none" style={inputStyle} />
            </div>
            <div className="min-w-0">
              <label className="block text-sm font-medium mb-1.5" style={{ color: C.muted }}>End time</label>
              <input type="time" value={end} min={MIN_TIME} max={MAX_TIME} onChange={e => setEnd(e.target.value)} className="w-full min-w-0 px-3 py-2.5 rounded-lg text-sm outline-none" style={inputStyle} />
            </div>
          </div>
          <p className="text-xs" style={{ color: C.muted }}>Classes run from 6:00 AM to 10:00 PM.</p>
          {error && <p className="text-sm" style={{ color: C.red }}>{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-lg text-sm font-medium" style={{ background: C.bg, color: C.muted, border: `1px solid ${C.border}` }}>
              Cancel
            </button>
            <button type="submit" className="px-4 py-2.5 rounded-lg text-sm font-semibold text-white" style={{ background: C.green }}>
              {editing ? "Save changes" : "Add class"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
