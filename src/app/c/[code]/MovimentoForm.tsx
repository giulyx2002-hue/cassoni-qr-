"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Cassone, TipoOperazione } from "@/lib/types";
import { TIPI_OPERAZIONE } from "@/lib/types";
import { SchermataCard } from "@/components/SchermataCard";
import { Logo } from "@/components/Logo";
import { FirmaCanvas, type FirmaCanvasHandle } from "@/components/FirmaCanvas";
import { generaPdfConsegna } from "@/lib/pdfConsegna";

type StatoPosizione =
  | { fase: "in-corso" }
  | { fase: "ok"; lat: number; lng: number; accuratezza: number }
  | { fase: "errore"; messaggio: string };

type StatoFinale =
  | { fase: "salvato" }
  | { fase: "salvato-email-ok"; email: string }
  | { fase: "salvato-email-errore"; email: string };

export function MovimentoForm({ codice }: { codice: string }) {
  const [cassone, setCassone] = useState<Cassone | null | undefined>(undefined);
  const [posizione, setPosizione] = useState<StatoPosizione>({ fase: "in-corso" });
  const [cliente, setCliente] = useState("");
  const [clienteEmail, setClienteEmail] = useState("");
  const [targa, setTarga] = useState("");
  const [nomeAutista, setNomeAutista] = useState("");
  const [tipoOperazione, setTipoOperazione] = useState<TipoOperazione | "">("");
  const [dimensioni, setDimensioni] = useState("");
  const [note, setNote] = useState("");
  const [foto, setFoto] = useState<File[]>([]);
  const anteprimeFoto = useMemo(() => foto.map((file) => URL.createObjectURL(file)), [foto]);
  const firmaRef = useRef<FirmaCanvasHandle>(null);
  const [salvataggio, setSalvataggio] = useState(false);
  const [messaggioSalvataggio, setMessaggioSalvataggio] = useState<string | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [salvato, setSalvato] = useState<StatoFinale | null>(null);

  const isConsegna = tipoOperazione === "consegna";

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

  useEffect(() => {
    return () => anteprimeFoto.forEach((u) => URL.revokeObjectURL(u));
  }, [anteprimeFoto]);

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

  function rimuoviFoto(indice: number) {
    setFoto((prev) => prev.filter((_, i) => i !== indice));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (posizione.fase !== "ok" || !cassone) return;

    if (!tipoOperazione) {
      setErrore("Seleziona il tipo di operazione.");
      return;
    }
    if (foto.length === 0) {
      setErrore("Allega almeno una foto dello stato del cassone.");
      return;
    }
    if (isConsegna && !clienteEmail) {
      setErrore("Inserisci l'email del cliente per la consegna.");
      return;
    }
    if (isConsegna && (firmaRef.current?.isEmpty() ?? true)) {
      setErrore("Fai firmare il cliente prima di registrare la consegna.");
      return;
    }

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

    setMessaggioSalvataggio("Caricamento foto in corso...");
    const fotoUrls: string[] = [];
    for (const file of foto) {
      const percorso = `${cassone.id}/${Date.now()}-${crypto.randomUUID()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("foto-cassoni")
        .upload(percorso, file);

      if (uploadError) {
        setErrore(`Errore nel caricamento foto: ${uploadError.message}`);
        setSalvataggio(false);
        setMessaggioSalvataggio(null);
        return;
      }

      const { data } = supabase.storage.from("foto-cassoni").getPublicUrl(percorso);
      fotoUrls.push(data.publicUrl);
    }

    let firmaUrl: string | null = null;
    let pdfUrl: string | null = null;
    const dataOra = new Date();

    if (isConsegna) {
      const firmaBlob = await firmaRef.current?.toBlob();
      if (!firmaBlob) {
        setErrore("Errore nella cattura della firma, riprova.");
        setSalvataggio(false);
        setMessaggioSalvataggio(null);
        return;
      }

      setMessaggioSalvataggio("Salvataggio firma in corso...");
      const percorsoFirma = `${cassone.id}/firma-${Date.now()}.png`;
      const { error: erroreFirma } = await supabase.storage
        .from("documenti-movimento")
        .upload(percorsoFirma, firmaBlob, { contentType: "image/png" });

      if (erroreFirma) {
        setErrore(`Errore nel salvataggio della firma: ${erroreFirma.message}`);
        setSalvataggio(false);
        setMessaggioSalvataggio(null);
        return;
      }
      firmaUrl = supabase.storage.from("documenti-movimento").getPublicUrl(percorsoFirma).data.publicUrl;

      setMessaggioSalvataggio("Generazione PDF in corso...");
      const pdfBlob = await generaPdfConsegna({
        codiceCassone: cassone.codice,
        cliente,
        clienteEmail,
        targa,
        nomeAutista,
        tipoOperazione,
        dimensioni,
        note,
        lat: posizione.lat,
        lng: posizione.lng,
        foto,
        firmaBlob,
        dataOra,
      });

      const percorsoPdf = `${cassone.id}/consegna-${Date.now()}.pdf`;
      const { error: errorePdf } = await supabase.storage
        .from("documenti-movimento")
        .upload(percorsoPdf, pdfBlob, { contentType: "application/pdf" });

      if (errorePdf) {
        setErrore(`Errore nel salvataggio del PDF: ${errorePdf.message}`);
        setSalvataggio(false);
        setMessaggioSalvataggio(null);
        return;
      }
      pdfUrl = supabase.storage.from("documenti-movimento").getPublicUrl(percorsoPdf).data.publicUrl;
    }

    setMessaggioSalvataggio("Salvataggio movimento in corso...");
    const { error } = await supabase.from("movimenti").insert({
      cassone_id: cassone.id,
      dipendente_id: user.id,
      cliente: cliente || null,
      cliente_email: clienteEmail || null,
      targa,
      nome_autista: nomeAutista,
      tipo_operazione: tipoOperazione,
      dimensioni: dimensioni || null,
      note: note || null,
      foto_urls: fotoUrls,
      firma_url: firmaUrl,
      pdf_url: pdfUrl,
      lat: posizione.lat,
      lng: posizione.lng,
      accuratezza_metri: posizione.accuratezza,
    });

    if (error) {
      setSalvataggio(false);
      setMessaggioSalvataggio(null);
      setErrore(`Errore nel salvataggio: ${error.message}`);
      return;
    }

    if (isConsegna && pdfUrl) {
      setMessaggioSalvataggio("Invio email al cliente in corso...");
      try {
        const risposta = await fetch("/api/invia-pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: clienteEmail, pdfUrl, codice: cassone.codice, cliente }),
        });
        setSalvato(
          risposta.ok
            ? { fase: "salvato-email-ok", email: clienteEmail }
            : { fase: "salvato-email-errore", email: clienteEmail }
        );
      } catch {
        setSalvato({ fase: "salvato-email-errore", email: clienteEmail });
      }
    } else {
      setSalvato({ fase: "salvato" });
    }

    setSalvataggio(false);
    setMessaggioSalvataggio(null);
  }

  if (cassone === undefined) {
    return <CentroMessaggio>Ricerca cassone {codice}...</CentroMessaggio>;
  }

  if (cassone === null) {
    return (
      <CentroMessaggio>
        <p className="text-brand-orange-dark">Nessun cassone trovato con codice {codice}.</p>
        <Link href="/scansiona" className="mt-4 inline-block text-sm text-gray-500 hover:text-gray-900">
          Riprova la scansione
        </Link>
      </CentroMessaggio>
    );
  }

  if (salvato) {
    return (
      <CentroMessaggio>
        <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-green-light text-brand-green-dark">
          <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="h-6 w-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </span>
        <p className="text-lg font-semibold text-gray-900">Movimento registrato</p>
        <p className="mt-1 text-sm text-gray-500">Cassone {cassone.codice}</p>
        {salvato.fase === "salvato-email-ok" && (
          <p className="mt-3 rounded-lg bg-brand-green-light px-3 py-2 text-sm text-brand-green-dark">
            PDF inviato a {salvato.email}
          </p>
        )}
        {salvato.fase === "salvato-email-errore" && (
          <p className="mt-3 rounded-lg bg-brand-orange-light px-3 py-2 text-sm text-brand-orange-dark">
            Movimento salvato, ma l&apos;invio del PDF a {salvato.email} non è riuscito. Il documento
            resta disponibile in dashboard.
          </p>
        )}
        <Link href="/" className="mt-4 inline-block text-sm text-gray-500 hover:text-gray-900">
          Torna alla home
        </Link>
      </CentroMessaggio>
    );
  }

  return (
    <SchermataCard>
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-lg shadow-gray-200/50">
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
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/30"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Targa camion
            </label>
            <input
              type="text"
              required
              value={targa}
              onChange={(e) => setTarga(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/30"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Nome autista
            </label>
            <input
              type="text"
              required
              value={nomeAutista}
              onChange={(e) => setNomeAutista(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/30"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Tipo operazione
            </label>
            <select
              required
              value={tipoOperazione}
              onChange={(e) => setTipoOperazione(e.target.value as TipoOperazione)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/30"
            >
              <option value="" disabled>
                Seleziona...
              </option>
              {TIPI_OPERAZIONE.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Dimensioni</label>
            <input
              type="text"
              value={dimensioni}
              onChange={(e) => setDimensioni(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/30"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Note</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/30"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Foto stato cassone (almeno una)
            </label>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              onChange={(e) => setFoto((prev) => [...prev, ...Array.from(e.target.files ?? [])])}
              className="w-full text-sm"
            />
            {anteprimeFoto.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {anteprimeFoto.map((src, i) => (
                  <div key={src} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" className="h-16 w-16 rounded-lg object-cover" />
                    <button
                      type="button"
                      onClick={() => rimuoviFoto(i)}
                      className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-gray-900 text-xs text-white"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {isConsegna && (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Email cliente
                </label>
                <input
                  type="email"
                  required
                  value={clienteEmail}
                  onChange={(e) => setClienteEmail(e.target.value)}
                  placeholder="cliente@esempio.it"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/30"
                />
                <p className="mt-1 text-xs text-gray-400">
                  Riceverà via email il PDF con lo stato del cassone e la firma.
                </p>
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700">
                    Firma cliente
                  </label>
                  <button
                    type="button"
                    onClick={() => firmaRef.current?.clear()}
                    className="text-xs text-gray-500 hover:text-gray-900"
                  >
                    Cancella
                  </button>
                </div>
                <FirmaCanvas ref={firmaRef} />
                <p className="mt-1 text-xs text-gray-400">
                  Fai firmare il cliente col dito o con il mouse nel riquadro qui sopra.
                </p>
              </div>
            </>
          )}

          {errore && (
            <p className="rounded-lg bg-brand-orange-light px-3 py-2 text-sm text-brand-orange-dark">
              {errore}
            </p>
          )}

          <button
            type="submit"
            disabled={salvataggio || posizione.fase !== "ok"}
            className="w-full rounded-lg bg-brand-green-dark px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-green-dark/90 disabled:opacity-50"
          >
            {salvataggio ? messaggioSalvataggio ?? "Salvataggio in corso..." : "Registra movimento"}
          </button>
        </form>

        <Link href="/" className="mt-4 block text-center text-sm text-gray-500 hover:text-gray-900">
          Annulla
        </Link>
      </div>
    </SchermataCard>
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
      <div className="rounded-lg bg-brand-orange-light px-3 py-2 text-sm text-brand-orange-dark">
        <p>{posizione.messaggio}</p>
        <button onClick={onRiprova} className="mt-1 underline">
          Riprova
        </button>
      </div>
    );
  }
  return (
    <p className="rounded-lg bg-brand-green-light px-3 py-2 text-sm text-brand-green-dark">
      Posizione rilevata (±{Math.round(posizione.accuratezza)} m)
    </p>
  );
}

function CentroMessaggio({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gradient-to-b from-brand-green-light/60 to-gray-50 px-4">
      <Logo className="h-9" />
      <div className="max-w-sm rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-lg shadow-gray-200/50">
        {children}
      </div>
    </div>
  );
}
