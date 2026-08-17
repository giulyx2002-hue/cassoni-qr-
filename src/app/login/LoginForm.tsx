"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/Logo";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errore, setErrore] = useState<string | null>(null);
  const [caricamento, setCaricamento] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrore(null);
    setCaricamento(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setCaricamento(false);

    if (error) {
      setErrore("Credenziali non valide. Riprova.");
      return;
    }

    router.replace(searchParams.get("redirect") || "/");
    router.refresh();
  }

  return (
    <div className="w-full max-w-sm rounded-2xl border border-gray-100 bg-white p-8 shadow-lg shadow-gray-200/50">
      <div className="mb-6 flex justify-center">
        <Logo className="h-12" />
      </div>
      <h1 className="mb-1 text-lg font-semibold text-gray-900">Tracciamento Cassoni</h1>
      <p className="mb-6 text-sm text-gray-700">Accedi con le tue credenziali</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/30"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Password
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/30"
          />
        </div>

        {errore && (
          <p className="rounded-lg bg-brand-orange-light px-3 py-2 text-sm text-brand-orange-dark">
            {errore}
          </p>
        )}

        <button
          type="submit"
          disabled={caricamento}
          className="w-full rounded-lg bg-brand-green-dark px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-green-dark/90 disabled:opacity-50"
        >
          {caricamento ? "Accesso in corso..." : "Accedi"}
        </button>
      </form>
    </div>
  );
}
