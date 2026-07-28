"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import type { Cassone, Movimento, TipoOperazione, UltimaPosizione } from "@/lib/types";
import { TIPI_OPERAZIONE } from "@/lib/types";

const Mappa = dynamic(() => import("./Mappa").then((m) => m.Mappa), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-sm text-gray-400">
      Caricamento mappa...
    </div>
  ),
});

function labelOperazione(tipo: TipoOperazione) {
  return TIPI_OPERAZIONE.find((t) => t.value === tipo)?.label ?? tipo;
}

export function DashboardClient({
  posizioniIniziali,
  cassoniIniziali,
}: {
  posizioniIniziali: UltimaPosizione[];
  cassoniIniziali: Cassone[];
}) {
  const [posizioni, setPosizioni] = useState(posizioniIniziali);
  const [tuttiCassoni, setTuttiCassoni] = useState(cassoniIniziali);
  const [filtro, setFiltro] = useState("");
  const [selezionato, setSelezionato] = useState<string | null>(null);
  const [storico, setStorico] = useState<Movimento[]>([]);

  useEffect(() => {
    const supabase = createClient();

    async function ricaricaPosizioni() {
      const { data } = await supabase
        .from("ultima_posizione")
        .select("*")
        .order("ultimo_movimento", { ascending: false });
      setPosizioni((data as UltimaPosizione[]) ?? []);
    }

    const canale = supabase
      .channel("movimenti-dashboard")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "movimenti" },
        () => ricaricaPosizioni()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canale);
    };
  }, []);

  useEffect(() => {
    if (!selezionato) return;
    const supabase = createClient();
    supabase
      .from("movimenti")
      .select("*")
      .eq("cassone_id", selezionato)
      .order("created_at", { ascending: false })
      .then(({ data }) => setStorico((data as Movimento[]) ?? []));
  }, [selezionato]);

  const posizionePerCassone = useMemo(() => {
    const mappa = new Map<string, UltimaPosizione>();
    posizioni.forEach((p) => mappa.set(p.cassone_id, p));
    return mappa;
  }, [posizioni]);

  const cassoniFiltrati = useMemo(() => {
    if (!filtro.trim()) return tuttiCassoni;
    const q = filtro.toLowerCase();
    return tuttiCassoni.filter((c) => {
      const pos = posizionePerCassone.get(c.id);
      return (
        c.codice.toLowerCase().includes(q) ||
        (pos?.cliente ?? "").toLowerCase().includes(q)
      );
    });
  }, [tuttiCassoni, posizionePerCassone, filtro]);

  const posizioniFiltrate = useMemo(
    () => posizioni.filter((p) => cassoniFiltrati.some((c) => c.id === p.cassone_id)),
    [posizioni, cassoniFiltrati]
  );

  const cassoneSelezionato = tuttiCassoni.find((c) => c.id === selezionato);

  async function eliminaCassone(cassone: Cassone) {
    if (!confirm(`Eliminare definitivamente il cassone ${cassone.codice} e tutto il suo storico?`)) {
      return;
    }
    const supabase = createClient();
    const { error } = await supabase.from("cassoni").delete().eq("id", cassone.id);
    if (error) {
      alert(`Errore nell'eliminazione: ${error.message}`);
      return;
    }
    setTuttiCassoni((prev) => prev.filter((c) => c.id !== cassone.id));
    setPosizioni((prev) => prev.filter((p) => p.cassone_id !== cassone.id));
    setSelezionato(null);
  }

  async function aggiornaCassone(cassone: Cassone, dimensioni: string, note: string) {
    const supabase = createClient();
    const { error } = await supabase
      .from("cassoni")
      .update({ dimensioni: dimensioni || null, note: note || null })
      .eq("id", cassone.id);
    if (error) {
      alert(`Errore nel salvataggio: ${error.message}`);
      return false;
    }
    setTuttiCassoni((prev) =>
      prev.map((c) => (c.id === cassone.id ? { ...c, dimensioni: dimensioni || null, note: note || null } : c))
    );
    return true;
  }

  async function eliminaMovimento(movimento: Movimento) {
    if (!confirm("Eliminare questo movimento?")) return;
    const supabase = createClient();
    const { error } = await supabase.from("movimenti").delete().eq("id", movimento.id);
    if (error) {
      alert(`Errore nell'eliminazione: ${error.message}`);
      return;
    }
    setStorico((prev) => prev.filter((m) => m.id !== movimento.id));
  }

  async function aggiornaMovimento(id: string, campi: Partial<Movimento>) {
    const supabase = createClient();
    const { error } = await supabase.from("movimenti").update(campi).eq("id", id);
    if (error) {
      alert(`Errore nel salvataggio: ${error.message}`);
      return false;
    }
    setStorico((prev) => prev.map((m) => (m.id === id ? { ...m, ...campi } : m)));
    return true;
  }

  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <div className="h-72 w-full border-b border-gray-200 md:h-auto md:flex-1 md:border-b-0 md:border-r">
        <Mappa posizioni={posizioniFiltrate} onSeleziona={setSelezionato} />
      </div>

      <div className="flex w-full flex-col md:w-96">
        <div className="border-b border-gray-200 p-3">
          <input
            type="text"
            placeholder="Filtra per codice o cliente..."
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/30"
          />
        </div>

        {selezionato && cassoneSelezionato ? (
          <div className="flex-1 overflow-y-auto p-3">
            <button
              onClick={() => setSelezionato(null)}
              className="mb-3 text-sm text-gray-500 hover:text-gray-900"
            >
              ← Torna all&apos;elenco
            </button>

            <GestioneCassone
              key={cassoneSelezionato.id}
              cassone={cassoneSelezionato}
              onSalva={aggiornaCassone}
              onElimina={() => eliminaCassone(cassoneSelezionato)}
            />

            <p className="mb-2 mt-5 text-sm font-medium text-gray-700">Storico movimenti</p>
            <ul className="space-y-3">
              {storico.map((m) => (
                <MovimentoItem
                  key={m.id}
                  movimento={m}
                  onSalva={(campi) => aggiornaMovimento(m.id, campi)}
                  onElimina={() => eliminaMovimento(m)}
                />
              ))}
              {storico.length === 0 && (
                <p className="text-sm text-gray-400">Nessun movimento.</p>
              )}
            </ul>
          </div>
        ) : (
          <ul className="flex-1 divide-y divide-gray-200 overflow-y-auto">
            {cassoniFiltrati.map((c) => {
              const pos = posizionePerCassone.get(c.id);
              return (
                <li key={c.id}>
                  <button
                    onClick={() => setSelezionato(c.id)}
                    className="block w-full px-4 py-3 text-left transition-colors hover:bg-brand-green-light/40"
                  >
                    <p className="font-medium text-gray-900">{c.codice}</p>
                    {pos ? (
                      <>
                        <p className="text-sm text-gray-500">
                          {pos.cliente || "Nessun cliente"} · {labelOperazione(pos.tipo_operazione)}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(pos.ultimo_movimento).toLocaleString("it-IT")} ·{" "}
                          {pos.ultimo_dipendente}
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-gray-400">Nessun movimento registrato</p>
                    )}
                  </button>
                </li>
              );
            })}
            {cassoniFiltrati.length === 0 && (
              <p className="p-4 text-sm text-gray-400">Nessun cassone trovato.</p>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}

function GestioneCassone({
  cassone,
  onSalva,
  onElimina,
}: {
  cassone: Cassone;
  onSalva: (cassone: Cassone, dimensioni: string, note: string) => Promise<boolean>;
  onElimina: () => void;
}) {
  const [modifica, setModifica] = useState(false);
  const [dimensioni, setDimensioni] = useState(cassone.dimensioni ?? "");
  const [note, setNote] = useState(cassone.note ?? "");
  const [salvataggio, setSalvataggio] = useState(false);

  async function salva() {
    setSalvataggio(true);
    const ok = await onSalva(cassone, dimensioni, note);
    setSalvataggio(false);
    if (ok) setModifica(false);
  }

  return (
    <div className="rounded-lg border border-gray-200 p-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">{cassone.codice}</h2>
        {!modifica && (
          <div className="flex gap-2">
            <button onClick={() => setModifica(true)} className="text-sm text-brand-green-dark hover:text-brand-green-dark/80">
              Modifica
            </button>
            <button onClick={onElimina} className="text-sm text-red-600 hover:text-red-800">
              Elimina
            </button>
          </div>
        )}
      </div>

      {modifica ? (
        <div className="mt-2 space-y-2">
          <input
            type="text"
            placeholder="Dimensioni"
            value={dimensioni}
            onChange={(e) => setDimensioni(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/30"
          />
          <textarea
            placeholder="Note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/30"
          />
          <div className="flex gap-2">
            <button
              onClick={salva}
              disabled={salvataggio}
              className="rounded-lg bg-brand-green-dark px-3 py-1.5 text-sm text-white transition-colors hover:bg-brand-green-dark/90 disabled:opacity-50"
            >
              {salvataggio ? "Salvataggio..." : "Salva"}
            </button>
            <button
              onClick={() => setModifica(false)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700"
            >
              Annulla
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-1 text-sm text-gray-500">
          {cassone.dimensioni && <p>{cassone.dimensioni}</p>}
          {cassone.note && <p>{cassone.note}</p>}
        </div>
      )}
    </div>
  );
}

function MovimentoItem({
  movimento,
  onSalva,
  onElimina,
}: {
  movimento: Movimento;
  onSalva: (campi: Partial<Movimento>) => Promise<boolean>;
  onElimina: () => void;
}) {
  const [modifica, setModifica] = useState(false);
  const [cliente, setCliente] = useState(movimento.cliente ?? "");
  const [clienteEmail, setClienteEmail] = useState(movimento.cliente_email ?? "");
  const [targa, setTarga] = useState(movimento.targa);
  const [nomeAutista, setNomeAutista] = useState(movimento.nome_autista);
  const [tipoOperazione, setTipoOperazione] = useState<TipoOperazione>(movimento.tipo_operazione);
  const [dimensioni, setDimensioni] = useState(movimento.dimensioni ?? "");
  const [note, setNote] = useState(movimento.note ?? "");
  const [salvataggio, setSalvataggio] = useState(false);

  async function salva() {
    setSalvataggio(true);
    const ok = await onSalva({
      cliente: cliente || null,
      cliente_email: clienteEmail || null,
      targa,
      nome_autista: nomeAutista,
      tipo_operazione: tipoOperazione,
      dimensioni: dimensioni || null,
      note: note || null,
    });
    setSalvataggio(false);
    if (ok) setModifica(false);
  }

  if (modifica) {
    return (
      <li className="rounded-lg border border-gray-200 p-3 text-sm">
        <div className="space-y-2">
          <input
            value={cliente}
            onChange={(e) => setCliente(e.target.value)}
            placeholder="Cliente"
            className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/30"
          />
          <input
            type="email"
            value={clienteEmail}
            onChange={(e) => setClienteEmail(e.target.value)}
            placeholder="Email cliente"
            className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/30"
          />
          <input
            value={targa}
            onChange={(e) => setTarga(e.target.value)}
            placeholder="Targa"
            className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/30"
          />
          <input
            value={nomeAutista}
            onChange={(e) => setNomeAutista(e.target.value)}
            placeholder="Nome autista"
            className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/30"
          />
          <select
            value={tipoOperazione}
            onChange={(e) => setTipoOperazione(e.target.value as TipoOperazione)}
            className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/30"
          >
            {TIPI_OPERAZIONE.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <input
            value={dimensioni}
            onChange={(e) => setDimensioni(e.target.value)}
            placeholder="Dimensioni"
            className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/30"
          />
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note"
            rows={2}
            className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/30"
          />
          <div className="flex gap-2">
            <button
              onClick={salva}
              disabled={salvataggio}
              className="rounded-lg bg-brand-green-dark px-3 py-1.5 text-sm text-white transition-colors hover:bg-brand-green-dark/90 disabled:opacity-50"
            >
              {salvataggio ? "Salvataggio..." : "Salva"}
            </button>
            <button
              onClick={() => setModifica(false)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700"
            >
              Annulla
            </button>
          </div>
        </div>
      </li>
    );
  }

  return (
    <li className="rounded-lg border border-gray-200 p-3 text-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="text-gray-500">{new Date(movimento.created_at).toLocaleString("it-IT")}</p>
        <div className="flex shrink-0 gap-2">
          <button onClick={() => setModifica(true)} className="text-brand-green-dark hover:text-brand-green-dark/80">
            Modifica
          </button>
          <button onClick={onElimina} className="text-red-600 hover:text-red-800">
            Elimina
          </button>
        </div>
      </div>
      <p className="font-medium">{labelOperazione(movimento.tipo_operazione)}</p>
      {movimento.cliente && <p>Cliente: {movimento.cliente}</p>}
      {movimento.cliente_email && <p>Email cliente: {movimento.cliente_email}</p>}
      <p>Targa: {movimento.targa}</p>
      <p>Autista: {movimento.nome_autista}</p>
      {movimento.dimensioni && <p>Dimensioni: {movimento.dimensioni}</p>}
      {movimento.note && <p>Note: {movimento.note}</p>}
      <p className="text-gray-400">
        {movimento.lat.toFixed(5)}, {movimento.lng.toFixed(5)}
      </p>
      {movimento.foto_urls.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {movimento.foto_urls.map((url) => (
            <a key={url} href={url} target="_blank" rel="noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="Stato cassone" className="h-16 w-16 rounded-lg object-cover" />
            </a>
          ))}
        </div>
      )}
      {(movimento.firma_url || movimento.pdf_url) && (
        <div className="mt-2 flex items-center gap-3 border-t border-gray-100 pt-2">
          {movimento.firma_url && (
            <a href={movimento.firma_url} target="_blank" rel="noreferrer" className="shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={movimento.firma_url}
                alt="Firma cliente"
                className="h-12 w-24 rounded-lg border border-gray-200 bg-white object-contain"
              />
            </a>
          )}
          {movimento.pdf_url && (
            <a
              href={movimento.pdf_url}
              target="_blank"
              rel="noreferrer"
              className="text-brand-green-dark underline hover:text-brand-green-dark/80"
            >
              Apri PDF di consegna
            </a>
          )}
        </div>
      )}
    </li>
  );
}
