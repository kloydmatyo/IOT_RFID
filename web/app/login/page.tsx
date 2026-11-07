"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, Loader2, Eye, EyeOff, ArrowLeft, CreditCard, LayoutDashboard, Download, ShieldCheck, GraduationCap, ArrowRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { TEST_TEACHER, TEACHER_SESSION_KEY } from "@/lib/mockTeacher";

const SITE_NAME = "GC RFID Attendance";

const C = {
  bg: "#ffffff",
  surface: "#ffffff",
  border: "#e8ece9",
  text: "#111827",
  muted: "#5b6472",
  green: "#16a34a",
  greenDark: "#15803d",
  greenSoft: "#ecfdf3",
  greenEdge: "#dcfce7",
  ink: "#10231a",
  red: "#dc2626",
  redSoft: "#fef2f2",
};

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [role, setRole] = useState<"admin" | "teacher">("admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Teacher login (test account, no database / Firebase)
    if (role === "teacher") {
      if (email === TEST_TEACHER.email && password === TEST_TEACHER.password) {
        sessionStorage.setItem(
          TEACHER_SESSION_KEY,
          JSON.stringify({ name: TEST_TEACHER.name, email: TEST_TEACHER.email })
        );
        router.replace("/teacher");
      } else {
        setError("Invalid teacher email or password.");
      }
      setLoading(false);
      return;
    }

    // Admin login (Firebase)
    try {
      await login(email, password);
      router.replace("/dashboard");
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? "";
      if (code === "auth/user-not-found" || code === "auth/wrong-password" || code === "auth/invalid-credential") {
        setError("Invalid email or password.");
      } else if (code === "auth/too-many-requests") {
        setError("Too many attempts. Try again later.");
      } else if (code === "auth/network-request-failed") {
        setError("Network error. Check your connection.");
      } else {
        setError("Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  const points = [
    { icon: CreditCard, text: "Every RFID tap, recorded with time in and time out" },
    { icon: LayoutDashboard, text: "A live view of who is present, late, or absent" },
    { icon: Download, text: "Filter your records and export them to CSV" },
  ];

  return (
    <div className="min-h-screen grid lg:grid-cols-2" style={{ background: C.bg, fontFamily: "'Poppins', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
        .gc-field { background: ${C.surface}; border: 1px solid ${C.border}; color: ${C.text}; transition: border-color .15s, box-shadow .15s; }
        .gc-field:focus { border-color: ${C.green}; box-shadow: 0 0 0 3px ${C.greenEdge}; }
        .gc-submit { background: ${C.green}; color: #fff; transition: background .15s; }
        .gc-submit:hover:not(:disabled) { background: ${C.greenDark}; transform: translateY(-1px); box-shadow: 0 12px 24px rgba(22,163,74,.24); }
        .gc-submit:focus-visible, .gc-role:focus-visible, .gc-back:focus-visible { outline: 2px solid ${C.green}; outline-offset: 3px; }
        .gc-back { color: ${C.muted}; transition: color .15s; }
        .gc-back:hover { color: ${C.green}; }
        .gc-dots { background-image: radial-gradient(rgba(34,197,94,.16) 1.2px, transparent 1.2px); background-size: 28px 28px; }
        .gc-auth-card { animation: auth-enter .55s cubic-bezier(.2,.8,.2,1) both; box-shadow: 0 24px 70px rgba(16,35,26,.09), 0 2px 6px rgba(16,35,26,.03); }
        .gc-brand-content { animation: auth-enter .7s cubic-bezier(.2,.8,.2,1) both; }
        .gc-role { transition: background .2s, color .2s, transform .2s, box-shadow .2s; }
        .gc-role:hover { transform: translateY(-1px); }
        .gc-field:focus { outline: none; }
        .gc-decor { position:absolute; border:1px solid rgba(22,163,74,.1); border-radius:9999px; pointer-events:none; }
        @keyframes auth-enter { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
        @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration:.01ms !important; animation-iteration-count:1 !important; transition-duration:.01ms !important; } }
      `}</style>

      {/* ========================= BRAND PANEL (desktop) ========================= */}
      <aside className="hidden lg:flex relative flex-col justify-between px-10 xl:px-16 py-10 xl:py-12 overflow-hidden border-r" style={{ background: C.surface, borderColor: C.border }}>
        <div className="gc-decor w-[32rem] h-[32rem] -right-52 -top-32" aria-hidden="true" />
        <div className="gc-decor w-[24rem] h-[24rem] -right-28 -top-0" aria-hidden="true" />
        <div className="absolute -left-32 bottom-10 w-80 h-80 rounded-full blur-3xl opacity-10" style={{ background: "#22c55e" }} aria-hidden="true" />
        <div className="gc-dots absolute inset-0 opacity-50" aria-hidden="true" />
        <div className="relative mx-auto w-full max-w-[38rem] flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/gclogo.png" alt="Gordon College logo" className="w-12 h-12 rounded-full object-contain" />
          <span className="text-base font-bold tracking-tight" style={{ color: C.text }}>{SITE_NAME}</span>
        </div>

        <div className="relative mx-auto w-full max-w-[38rem] gc-brand-content">
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold mb-6" style={{ color: C.greenDark, background: C.greenSoft, border: `1px solid ${C.greenEdge}` }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: C.green }} /> Attendance, made simple
          </div>
          <h1 className="text-5xl xl:text-6xl 2xl:text-7xl font-extrabold leading-[1.05] tracking-tight" style={{ color: C.text }}>
            Welcome back.
            <br />
            <span style={{ color: C.green }}>Let&apos;s check who tapped in.</span>
          </h1>
          <ul className="mt-8 xl:mt-10 space-y-4 xl:space-y-5">
            {points.map(p => {
              const Icon = p.icon;
              return (
                <li key={p.text} className="flex items-center gap-4 text-base xl:text-lg" style={{ color: C.muted }}>
                  <span
                    className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: C.greenSoft }}
                  >
                    <Icon className="w-5 h-5" style={{ color: C.green }} />
                  </span>
                  {p.text}
                </li>
              );
            })}
          </ul>
          <div className="mt-8 xl:mt-10 flex items-center gap-4 rounded-2xl p-5" style={{ background: C.greenSoft, border: `1px solid ${C.greenEdge}` }}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ color: C.green, background: C.surface }}>
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <p className="text-base font-semibold" style={{ color: C.text }}>One tap. One reliable record.</p>
              <p className="text-sm mt-1" style={{ color: C.muted }}>Your attendance workspace, ready when you are.</p>
            </div>
          </div>
        </div>

        <p className="relative mx-auto w-full max-w-[38rem] text-sm" style={{ color: C.muted }}>
          RFID-Based Student Attendance Monitoring &middot; Gordon College
        </p>
      </aside>

      {/* ============================== FORM ============================== */}
      <main className="relative flex items-center justify-center px-5 py-10 sm:px-10 overflow-hidden">
        <div className="absolute -right-28 -top-24 w-80 h-80 rounded-full blur-3xl opacity-50 pointer-events-none" style={{ background: "#dcfce7" }} aria-hidden="true" />
        <div className="gc-auth-card relative w-full max-w-md rounded-3xl p-6 sm:p-9" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
          <Link href="/" className="gc-back inline-flex items-center gap-1.5 text-sm font-medium mb-8">
            <ArrowLeft className="w-4 h-4" /> Back to home
          </Link>

          {/* Logo shown on mobile, where the brand panel is hidden */}
          <div className="flex items-center gap-3 mb-6 lg:hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/gclogo.png" alt="Gordon College logo" className="w-10 h-10 rounded-full object-contain" />
            <span className="text-sm font-bold tracking-tight" style={{ color: C.text }}>{SITE_NAME}</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ color: C.greenDark, background: C.greenSoft, border: `1px solid ${C.greenEdge}` }}>
              {role === "admin" ? <ShieldCheck className="w-5 h-5" /> : <GraduationCap className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight" style={{ color: C.text }}>{role === "admin" ? "Administrator login" : "Teacher login"}</h2>
              <p className="text-xs mt-0.5" style={{ color: C.muted }}>Secure access to your attendance workspace</p>
            </div>
          </div>
          <p className="text-sm mt-2" style={{ color: C.muted }}>
            {role === "admin" ? "Sign in to the administrator dashboard." : "Sign in to view your classes and attendance."}
          </p>

          {/* Role toggle */}
          <div
            role="tablist"
            aria-label="Account type"
            className="flex gap-1 p-1 mt-7 rounded-2xl"
            style={{ background: C.greenSoft, border: `1px solid ${C.greenEdge}` }}
          >
            {(["admin", "teacher"] as const).map(r => (
              <button
                key={r}
                type="button"
                role="tab"
                aria-selected={role === r}
                onClick={() => {
                  setRole(r);
                  setError("");
                }}
                className="gc-role flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold capitalize"
                style={{
                  background: role === r ? C.green : "transparent",
                  color: role === r ? "#fff" : C.greenDark,
                  boxShadow: role === r ? "0 5px 12px rgba(22,163,74,.2)" : "none",
                }}
              >
                {r === "admin" ? <ShieldCheck className="w-4 h-4" /> : <GraduationCap className="w-4 h-4" />}
                {r}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 mt-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1.5" style={{ color: C.text }}>
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: C.muted }} />
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder={role === "admin" ? "admin@example.com" : "teacher@test.com"}
                  className="gc-field w-full pl-10 pr-3 py-3 rounded-xl text-sm outline-none"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1.5" style={{ color: C.text }}>
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: C.muted }} />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="gc-field w-full pl-10 pr-11 py-3 rounded-xl text-sm outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-md"
                  style={{ color: C.muted }}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p
                role="alert"
                className="text-sm font-medium px-3.5 py-2.5 rounded-lg"
                style={{ background: C.redSoft, color: C.red, border: "1px solid #fecaca" }}
              >
                {error}
              </p>
            )}

            {/* Test credentials hint (remove when connecting to the database) */}
            {role === "teacher" && (
              <p className="text-xs text-center" style={{ color: C.muted }}>
                Test: teacher@test.com / teacher123
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="gc-submit w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm disabled:opacity-60"
              style={{ boxShadow: "0 8px 20px rgba(22,163,74,.22)" }}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? "Signing in..." : <>{role === "admin" ? "Continue as administrator" : "Continue as teacher"} <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}