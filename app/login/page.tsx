"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { getClientAuth } from "@/lib/firebase-client";
import { signInWithEmailAndPassword } from "firebase/auth";

const DEFAULT_ORG_ID =
  process.env.NEXT_PUBLIC_DEFAULT_ORG_ID ?? "neon-lunchbox";

const OWNER_REDIRECT = `/hq/${encodeURIComponent(
  DEFAULT_ORG_ID,
)}/bitgalaxy`;

export default function BitGalaxyLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const auth = getClientAuth();
      await signInWithEmailAndPassword(auth, email.trim(), password);

      // ✅ ALWAYS route owner to NeonHQ BitGalaxy console for default org
      router.push(OWNER_REDIRECT);
    } catch (err: any) {
      console.error("Login error:", err);
      const code = err?.code;

      if (
        code === "auth/user-not-found" ||
        code === "auth/wrong-password" ||
        code === "auth/invalid-credential"
      ) {
        setError("Invalid email or password.");
      } else if (code === "auth/too-many-requests") {
        setError("Too many attempts. Try again later.");
      } else {
        setError("Unable to sign in. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black text-sky-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-sky-500/40 bg-slate-950/80 p-8 shadow-2xl shadow-sky-900/60 backdrop-blur">
        <header className="mb-8 text-center space-y-2">
          <p className="text-[11px] uppercase tracking-[0.35em] text-sky-400/80">
            NeonHQ · BitGalaxy
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-sky-50">
            Owner Sign-In
          </h1>
          <p className="text-sm text-slate-400">
            Log in to access your NeonHQ Dashboard.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="block text-xs font-medium uppercase tracking-[0.18em] text-slate-300"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-50 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-500/70"
              placeholder="owner@yourbusiness.com"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="password"
              className="block text-xs font-medium uppercase tracking-[0.18em] text-slate-300"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-50 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-500/70"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-xs text-rose-400 bg-rose-950/40 border border-rose-700/60 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 inline-flex w-full items-center justify-center rounded-lg bg-sky-500 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/40 transition hover:bg-sky-400 disabled:bg-slate-600"
          >
            {submitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-500 space-y-1">
          <p>Access controlled through NeonHQ owner portal.</p>
          <p className="text-[10px] text-slate-600">
            No staff logins. Customers use account locator.
          </p>
        </div>
      </div>
    </main>
  );
}