"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Cassone } from "@/lib/types";

type StatoPosizione =
  | { fase: "in-corso" }
  | { fase: "ok"; lat: number; lng: number; accuratezza: number }
  | { fase: "errore"; messaggio: string };

export function MovimentoForm({ codice }: { codice: string }) {
  const [cassone, setCassone] = useState<Cassone | null | undefined>(undefined);
  const [posizione, setPosizione] = useState<StatoPosizione>({ fase: "in-corso" });
  const [cliente, setCliente] = useState("");
  const [quantita, setQuantita] = useState("");
  const [dimensioni, setDimensioni] = useState("");
  const [note, setNote] = useState("");
  const [salvataggio, setSalvataggio] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [salvato, setSalvato] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("cassoni")
      .select("*")
      .eq("codice", codice)
      .maybeSingle()
      .then(({ data }) => {
        setCassone(data as Cassone | null);
        if (data?.dimensioni) setDimensioni(data.dimensioni);
      });
  }, [codice]);

  function avviaRilevamento() {
    if (!navigator.geolocation) {
      setPosizione({ fase: "errore", messaggio: "Il dispositivo non supporta la geolocalizzazione." });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setPosizione({
          fase: "ok",
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuratezza: pos.coords.accuracy,
        }),
      () =>
        setPosizione({
          fase: "errore",
          messaggio: "Permesso di posizione negato o non disponibile.",
        }),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  function richiediPosizione() {
    setPosizione({ fase: "in-corso" });
    avviaRilevamento();
  }

  useEffect(() => {
    // avviaRilevamento aggiorna lo stato solo dentro le callback asincrone
    // della Geolocation API, non in modo sincrono nel corpo dell'effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    avviaRilevamento();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (posizione.fase !== "ok" || !cassone) return;

    setSalvataggio(true);
    setErrore(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setErrore("Sessione scaduta, effettua di nuovo l'accesso.");
      setSalvataggio(false);
      return;
    }

    const { error } = await supabase.from("movimenti").insert({
      cassone_id: cassone.id,
      dipendente_id: user.id,
      cliente: cliente || null,
      quantita: quantita ? Number(quantita) : null,
      dimensioni: dimensioni || null,
      note: note || null,
      lat: posizione.lat,
      lng: posizione.lng,
      accuratezza_metri: posizione.accuratezza,
    });

    setSalvataggio(false);

    if (error) {
      setErrore(`Errore nel salvataggio: ${error.message}`);
      return;
    }

    setSalvato(true);
  }

  if (cassone === undefined) {
    return <CentroMessaggio>Ricerca cassone {codice}...</CentroMessaggio>;
  }

  if (cassone === null) {
    return (
      <CentroMessaggio>
        <p className="text-red-600">Nessun cassone trovato con codice {codice}.</p>
        <Link href="/scansiona" className="mt-4 inline-block text-sm text-gray-500 hover:text-gray-900">
          Riprova la scansione
        </Link>
      </CentroMessaggio>
    );
  }

  if (salvato) {
    return (
      <CentroMessaggio>
        <p className="text-lg font-semibold text-gray-900">Movimento registrato</p>
        <p className="mt-1 text-sm text-gray-500">Cassone {cassone.codice}</p>
        <Link href="/" className="mt-4 inline-block text-sm text-gray-500 hover:text-gray-900">
          Torna alla home
        </Link>
      </CentroMessaggio>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-sm rounded-xl bg-white p-6 shadow-sm">
        <h1 className="mb-1 text-lg font-semibold text-gray-900">
          Cassone {cassone.codice}
        </h1>

        <PosizioneStato posizione={posizione} onRiprova={richiediPosizione} />

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Cliente</label>
            <input
              type="text"
              value={cliente}
              onChange={(e) => setCliente(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Quantità</label>
            <input
              type="number"
              min={0}
              value={quantita}
              onChange={(e) => setQuantita(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Dimensioni</label>
            <input
              type="text"
              value={dimensioni}
              onChange={(e) => setDimensioni(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Note</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
            />
          </div>

          {errore && <p className="text-sm text-red-600">{errore}</p>}

          <button
            type="submit"
            disabled={salvataggio || posizione.fase !== "ok"}
            className="w-full rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {salvataggio ? "Salvataggio in corso..." : "Registra movimento"}
          </button>
        </form>

        <Link href="/" className="mt-4 block text-center text-sm text-gray-500 hover:text-gray-900">
          Annulla
        </Link>
      </div>
    </div>
  );
}

function PosizioneStato({
  posizione,
  onRiprova,
}: {
  posizione: StatoPosizione;
  onRiprova: () => void;
}) {
  if (posizione.fase === "in-corso") {
    return <p className="text-sm text-gray-500">Rilevamento posizione in corso...</p>;
  }
  if (posizione.fase === "errore") {
    return (
      <div className="text-sm text-red-600">
        <p>{posizione.messaggio}</p>
        <button onClick={onRiprova} className="mt-1 underline">
          Riprova
        </button>
      </div>
    );
  }
  return (
    <p className="text-sm text-green-700">
      Posizione rilevata (±{Math.round(posizione.accuratezza)} m)
    </p>
  );
}

function CentroMessaggio({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="max-w-sm text-center">{children}</div>
    </div>
  );
}
