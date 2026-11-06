"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Mail, Lock, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const router    = useRouter();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
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

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "var(--bg)" }}
    >
      <div
        className="w-full max-w-sm rounded-xl p-8 shadow-2xl"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style={{ background: "rgba(79,142,247,.12)" }}>
            <ShieldCheck className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="text-xl font-bold">RFID Access Control</h1>
          <p className="text-sm mt-1" style={{ color: "#8892b0" }}>Administrator Login</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "#8892b0" }}>Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#8892b0" }} />
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@example.com"
                className="w-full pl-9 pr-3 py-2.5 rounded-lg text-sm outline-none transition-colors"
                style={{ background: "#12151f", border: "1px solid var(--border)", color: "#e2e8f0" }}
                onFocus={e => (e.target.style.borderColor = "var(--primary)")}
                onBlur={e  => (e.target.style.borderColor = "var(--border)")}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "#8892b0" }}>Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#8892b0" }} />
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full pl-9 pr-3 py-2.5 rounded-lg text-sm outline-none transition-colors"
                style={{ background: "#12151f", border: "1px solid var(--border)", color: "#e2e8f0" }}
                onFocus={e => (e.target.style.borderColor = "var(--primary)")}
                onBlur={e  => (e.target.style.borderColor = "var(--border)")}
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium text-sm transition-all disabled:opacity-60"
            style={{ background: "var(--primary)", color: "#fff" }}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
