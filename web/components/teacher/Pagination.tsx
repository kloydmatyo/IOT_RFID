import { ChevronLeft, ChevronRight } from "lucide-react";
import { C, PAGE_SIZE } from "@/lib/teacher";

export default function Pagination({
  page,
  totalPages,
  total,
  onChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  onChange: (page: number) => void;
}) {
  if (total <= PAGE_SIZE) return null;
  const start = (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, total);
  const btn = "flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold disabled:opacity-40";
  const btnStyle = { background: C.surface, color: C.text, border: `1px solid ${C.border}` };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3" style={{ borderTop: `1px solid ${C.border}` }}>
      <p className="text-xs" style={{ color: C.muted }}>Showing {start}-{end} of {total}</p>
      <div className="flex items-center gap-2">
        <button className={btn} style={btnStyle} disabled={page <= 1} onClick={() => onChange(page - 1)}>
          <ChevronLeft className="w-3.5 h-3.5" /> Prev
        </button>
        <span className="text-xs font-semibold px-1" style={{ color: C.text }}>Page {page} of {totalPages}</span>
        <button className={btn} style={btnStyle} disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
          Next <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
