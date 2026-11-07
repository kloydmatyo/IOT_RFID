"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function RootPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      router.replace(user ? "/dashboard" : "/login");
    }
  }, [user, loading, router]);

  return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: "var(--bg)" }}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#16a34a", borderTopColor: "transparent" }} />
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading...</p>
      </div>
    </div>
  );
}
