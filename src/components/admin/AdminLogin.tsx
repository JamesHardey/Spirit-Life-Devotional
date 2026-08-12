"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export function AdminLogin() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setBusy(false);
    if (res.ok) {
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.message ?? "Login failed");
    }
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6">
      <div className="mb-6 text-center">
        <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-white p-1.5 shadow-sm">
          <Image
            src="/icons/icon-192.png"
            alt="The Spirit Life C. & S. Church"
            width={48}
            height={48}
            className="h-full w-full rounded-full object-contain"
          />
        </span>
        <h1 className="font-serif text-2xl font-bold text-content-primary">Admin Access</h1>
        <p className="mt-1 text-sm text-content-secondary">
          Sign in to manage daily devotionals.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-3">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Admin password"
          className="w-full rounded-xl border border-white/10 bg-surface-input px-4 py-3 text-content-primary placeholder:text-content-muted focus:border-brand-amber-500 focus:outline-none"
          autoFocus
        />
        {error && <p className="text-sm text-brand-flame-400">{error}</p>}
        <button
          type="submit"
          disabled={busy || !password}
          className="w-full rounded-xl bg-brand-amber-700 py-3 font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
