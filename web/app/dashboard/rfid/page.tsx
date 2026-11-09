"use client";

import { useState, FormEvent } from "react";
import { Plus, Search, Loader2, X, ChevronDown } from "lucide-react";
import { useCards, useRegisteredStudents } from "@/hooks/useFirebase";
import { Card, CardHeader } from "@/components/Card";
import { ActiveBadge } from "@/components/StatusBadge";
import ConfirmModal from "@/components/ConfirmModal";
import { useToast } from "@/components/Toast";
import { validateUID, formatUID } from "@/lib/utils";
import type { RFIDCard } from "@/lib/types";
import { TableSkeletonRows } from "@/components/LoadingSkeleton";

const MAX_LEN = 40;
const ROLES = ["Student", "Teacher", "Admin"];

// Letters (including accented ones like ñ) and spaces only, max 40 characters
const cleanName = (v: string) => v.replace(/[^\p{L} ]/gu, "").slice(0, MAX_LEN);
const NAME_PATTERN = /^[\p{L}]+(?: [\p{L}]+)*$/u;

export default function RFIDManagementPage() {
  const toast = useToast();
  const { cards, addCard, updateCard, deleteCard } = useCards();
  const { students, loading: studentsLoading } = useRegisteredStudents();
  const [search, setSearch]     = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editCard, setEditCard]   = useState<RFIDCard | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RFIDCard | null>(null);
  const [saving, setSaving]    = useState(false);
  const [form, setForm]        = useState({ uid: "", name: "", role: "Student", active: true });
  const [formErr, setFormErr]  = useState("");

  const filteredStudents = students.filter(student =>
    !search ||
    student.name.toLowerCase().includes(search.toLowerCase()) ||
    student.studentId.toLowerCase().includes(search.toLowerCase()) ||
    (student.rfidUid ?? "").toLowerCase().includes(search.toLowerCase())
  );

  function openAdd() {
    setEditCard(null);
    setForm({ uid: "", name: "", role: "Student", active: true });
    setFormErr("");
    setShowModal(true);
  }

  function openEdit(card: RFIDCard) {
    setEditCard(card);
    setForm({
      uid: card.uid,
      name: card.name,
      role: ROLES.includes(card.role) ? card.role : "Student",
      active: card.active,
    });
    setFormErr("");
    setShowModal(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const uid = formatUID(form.uid);
    const name = form.name.trim().replace(/\s+/g, " ");
    if (!uid) { setFormErr("UID is required."); return; }
    if (uid.length > MAX_LEN) { setFormErr(`UID must be ${MAX_LEN} characters or fewer.`); return; }
    if (!validateUID(uid)) { setFormErr("Invalid UID format. Use hex bytes (e.g. 3C:18:19:49)."); return; }
    if (!name) { setFormErr("Cardholder name is required."); return; }
    if (name.length > MAX_LEN) { setFormErr(`Name must be ${MAX_LEN} characters or fewer.`); return; }
    if (!NAME_PATTERN.test(name)) { setFormErr("Name can only contain letters and spaces."); return; }

    if (!editCard) {
      const dup = cards.find(c => c.uid.toUpperCase() === uid);
      if (dup) { setFormErr(`UID already registered to "${dup.name}".`); return; }
    }

    setFormErr(""); setSaving(true);
    try {
      if (editCard) {
        await updateCard(editCard.key, { name, role: form.role, active: form.active, updatedAt: new Date().toISOString() });
        toast("Card updated successfully", "success");
      } else {
        await addCard({ uid, name, role: form.role, active: form.active, createdAt: new Date().toISOString() });
        toast("Card registered successfully", "success");
      }
      setShowModal(false);
    } catch (err: unknown) {
      setFormErr("Error: " + (err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(card: RFIDCard) {
    try {
      await updateCard(card.key, { active: !card.active });
      toast(`Card ${card.active ? "disabled" : "enabled"}`, "success");
    } catch (err: unknown) {
      toast("Error: " + (err as Error).message, "error");
    }
  }

  async function handleDelete(card: RFIDCard) {
    try {
      await deleteCard(card.key);
      toast("Card deleted", "success");
    } catch (err: unknown) {
      toast("Error: " + (err as Error).message, "error");
    }
    setDeleteTarget(null);
  }

  const inputStyle = {
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    color: "var(--text-main)",
  };

  const modalInputStyle = {
    background: "#f0fdf4",
    border: "1px solid var(--border)",
    color: "var(--text-main)",
  };

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold" style={{ color: "var(--text-main)" }}>RFID Management</h1>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by UID or name..."
            className="w-full pl-9 pr-3 py-2 rounded-lg text-sm outline-none"
            style={inputStyle}
            onFocus={e => (e.target.style.borderColor = "#16a34a")}
            onBlur={e  => (e.target.style.borderColor = "#bbf7d0")}
          />
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
          style={{ background: "var(--primary)" }}
          onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = "var(--primary-hover)")}
          onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = "var(--primary)")}
        >
          <Plus className="w-4 h-4" /> Add Card
        </button>
      </div>

      <Card>
        <CardHeader
          title="Registered Students"
          badge={
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(22,163,74,.10)", color: "#15803d" }}>
              {students.length} students
            </span>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead style={{ background: "var(--bg-card2)" }}>
              <tr>
                {["Student ID", "Student Name", "RFID UID", "Program", "Status"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody aria-busy={studentsLoading}>
              {studentsLoading ? (
                <TableSkeletonRows columns={5} />
              ) : filteredStudents.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-sm" style={{ color: "var(--text-muted)" }}>{search ? "No students match your search" : "No students registered yet"}</td></tr>
              ) : filteredStudents.map(student => (
                <tr
                  key={student.key}
                  className="transition-colors"
                  style={{ borderBottom: "1px solid var(--border)" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#f0fdf4")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <td className="px-4 py-3"><code className="text-xs" style={{ color: "var(--text-muted)" }}>{student.studentId}</code></td>
                  <td className="px-4 py-3 font-medium" style={{ color: "var(--text-main)" }}>{student.name}</td>
                  <td className="px-4 py-3"><code className="text-xs" style={{ color: "var(--text-muted)" }}>{student.rfidUid || "Not assigned"}</code></td>
                  <td className="px-4 py-3 text-sm" style={{ color: "var(--text-muted)" }}>{student.program || "—"}</td>
                  <td className="px-4 py-3"><ActiveBadge active={Boolean(student.rfidUid) && !student.archived} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,.45)", backdropFilter: "blur(4px)" }}>
          <div className="rounded-xl w-full max-w-md animate-slide-in shadow-2xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
              <h3 className="font-semibold text-sm" style={{ color: "var(--text-main)" }}>{editCard ? "Edit RFID Card" : "Add RFID Card"}</h3>
              <button onClick={() => setShowModal(false)} className="hover:opacity-60" style={{ color: "var(--text-muted)" }}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>
                  RFID UID <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.uid}
                  onChange={e => setForm(p => ({ ...p, uid: e.target.value.slice(0, MAX_LEN) }))}
                  maxLength={MAX_LEN}
                  readOnly={!!editCard}
                  placeholder="e.g. 3C:18:19:49" className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                  style={{ ...modalInputStyle, opacity: editCard ? 0.6 : 1 }}
                  onFocus={e => (e.target.style.borderColor = "#16a34a")}
                  onBlur={e  => (e.target.style.borderColor = "#bbf7d0")}
                />
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Format: XX:XX:XX:XX (colon-separated hex bytes), up to {MAX_LEN} characters</p>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>
                  Cardholder Name <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: cleanName(e.target.value) }))}
                  maxLength={MAX_LEN}
                  placeholder="e.g. Juan dela Cruz" className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                  style={modalInputStyle}
                  onFocus={e => (e.target.style.borderColor = "#16a34a")}
                  onBlur={e  => (e.target.style.borderColor = "#bbf7d0")}
                />
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Letters and spaces only, up to {MAX_LEN} characters ({form.name.length}/{MAX_LEN})</p>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>Role</label>
                <div className="relative">
                  <select
                    value={form.role}
                    onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                    className="w-full appearance-none px-3 py-2.5 pr-9 rounded-lg text-sm outline-none"
                    style={modalInputStyle}
                    onFocus={e => (e.target.style.borderColor = "#16a34a")}
                    onBlur={e  => (e.target.style.borderColor = "#bbf7d0")}
                  >
                    {ROLES.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-muted)" }} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>Status</label>
                <div className="flex gap-4">
                  {[{ label: "Active", value: true }, { label: "Disabled", value: false }].map(opt => (
                    <label key={String(opt.value)} className="flex items-center gap-2 cursor-pointer text-sm" style={{ color: "var(--text-main)" }}>
                      <input
                        type="radio" name="active"
                        checked={form.active === opt.value}
                        onChange={() => setForm(p => ({ ...p, active: opt.value }))}
                        style={{ accentColor: "#16a34a" }}
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>
              {formErr && <p className="text-xs text-red-600">{formErr}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button" onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg text-sm transition-colors hover:bg-green-50"
                  style={{ border: "1px solid var(--border)", color: "var(--text-muted)" }}
                >
                  Cancel
                </button>
                <button
                  type="submit" disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60 transition-colors"
                  style={{ background: "var(--primary)" }}
                  onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = "var(--primary-hover)")}
                  onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = "var(--primary)")}
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {editCard ? "Update Card" : "Save Card"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Delete Card"
          message={`Remove "${deleteTarget.name}" from the authorized list? This cannot be undone.`}
          onConfirm={() => handleDelete(deleteTarget)}
          onCancel={() => setDeleteTarget(null)}
          confirmLabel="Delete"
        />
      )}
    </div>
  );
}