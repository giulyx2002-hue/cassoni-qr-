"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/client";
import { generaCodice } from "@/lib/codice";
import { SchermataCard } from "@/components/SchermataCard";

interface CassoneCreato {
  codice: string;
  dimensioni: string;
  note: string;
  qrDataUrl: string;
}

export default function GeneraPage() {
  const [dimensioni, setDimensioni] = useState("");
  const [note, setNote] = useState("");
  const [caricamento, setCaricamento] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [creato, setCreato] = useState<CassoneCreato | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrore(null);
    setCaricamento(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setErrore("Sessione scaduta, effettua di nuovo l'accesso.");
      setCaricamento(false);
      return;
    }

    // Riprova con un nuovo codice nel raro caso di collisione
    let ultimoErrore: string | null = null;
    for (let tentativo = 0; tentativo < 3; tentativo++) {
      const codice = generaCodice();
      const { error } = await supabase.from("cassoni").insert({
        codice,
        dimensioni: dimensioni || null,
        note: note || null,
        creato_da: user.id,
      });

      if (!error) {
        const url = `${window.location.origin}/c/${codice}`;
        const qrDataUrl = await QRCode.toDataURL(url, { width: 400, margin: 1 });
        setCreato({ codice, dimensioni, note, qrDataUrl });
        ultimoErrore = null;
        break;
      }

      ultimoErrore = error.code === "23505" ? "collisione" : error.message;
      if (error.code !== "23505") break;
    }

    if (ultimoErrore && ultimoErrore !== "collisione") {
      setErrore(`Errore nel salvataggio: ${ultimoErrore}`);
    } else if (ultimoErrore === "collisione") {
      setErrore("Riprova, si è verificato un conflitto di codice.");
    }

    setCaricamento(false);
  }

  function nuovoCassone() {
    setCreato(null);
    setDimensioni("");
    setNote("");
  }

  if (creato) {
    return (
      <SchermataCard>
        <div className="rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-lg shadow-gray-200/50 print:shadow-none">
          <Image
            src={creato.qrDataUrl}
            alt={`QR cassone ${creato.codice}`}
            width={400}
            height={400}
            unoptimized
            className="mx-auto w-64"
          />
          <p className="mt-4 text-lg font-semibold tracking-wide text-gray-900">
            {creato.codice}
          </p>
          {creato.dimensioni && (
            <p className="text-sm text-gray-500">{creato.dimensioni}</p>
          )}
          {creato.note && <p className="text-sm text-gray-500">{creato.note}</p>}

          <div className="mt-6 flex gap-3 print:hidden">
            <button
              onClick={() => window.print()}
              className="flex-1 rounded-lg bg-brand-green-dark px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-green-dark/90"
            >
              Stampa
            </button>
            <button
              onClick={nuovoCassone}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Nuovo cassone
            </button>
          </div>
          <Link
            href="/"
            className="mt-4 block text-sm text-gray-500 hover:text-gray-900 print:hidden"
          >
            Torna alla home
          </Link>
        </div>
      </SchermataCard>
    );
  }

  return (
    <SchermataCard>
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-lg shadow-gray-200/50">
        <h1 className="mb-1 text-lg font-semibold text-gray-900">
          Genera nuovo cassone
        </h1>
        <p className="mb-6 text-sm text-gray-500">
          Crea un QR univoco da stampare sul cassone
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Dimensioni
            </label>
            <input
              type="text"
              placeholder="es. 3x2x1,5 m"
              value={dimensioni}
              onChange={(e) => setDimensioni(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/30"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Note
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
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
            {caricamento ? "Creazione in corso..." : "Genera QR"}
          </button>
        </form>

        <Link
          href="/"
          className="mt-4 block text-center text-sm text-gray-500 hover:text-gray-900"
        >
          Annulla
        </Link>
      </div>
    </SchermataCard>
  );
}
