"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import type { Movimento, UltimaPosizione } from "@/lib/types";

const Mappa = dynamic(() => import("./Mappa").then((m) => m.Mappa), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-sm text-gray-400">
      Caricamento mappa...
    </div>
  ),
});

export function DashboardClient({
  posizioniIniziali,
}: {
  posizioniIniziali: UltimaPosizione[];
}) {
  const [posizioni, setPosizioni] = useState(posizioniIniziali);
  const [filtro, setFiltro] = useState("");
  const [selezionato, setSelezionato] = useState<string | null>(null);
  const [storico, setStorico] = useState<Movimento[]>([]);

  useEffect(() => {
    const supabase = createClient();

    async function ricarica() {
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
        () => ricarica()
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

  const posizioniFiltrate = useMemo(() => {
    if (!filtro.trim()) return posizioni;
    const q = filtro.toLowerCase();
    return posizioni.filter(
      (p) =>
        p.codice.toLowerCase().includes(q) ||
        (p.cliente ?? "").toLowerCase().includes(q)
    );
  }, [posizioni, filtro]);

  const cassoneSelezionato = posizioni.find((p) => p.cassone_id === selezionato);

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
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
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
            <h2 className="font-semibold text-gray-900">
              {cassoneSelezionato.codice}
            </h2>
            <p className="text-sm text-gray-500">Storico movimenti</p>
            <ul className="mt-3 space-y-3">
              {storico.map((m) => (
                <li key={m.id} className="rounded-lg border border-gray-200 p-3 text-sm">
                  <p className="text-gray-500">
                    {new Date(m.created_at).toLocaleString("it-IT")}
                  </p>
                  {m.cliente && <p>Cliente: {m.cliente}</p>}
                  {m.quantita != null && <p>Quantità: {m.quantita}</p>}
                  {m.dimensioni && <p>Dimensioni: {m.dimensioni}</p>}
                  {m.note && <p>Note: {m.note}</p>}
                  <p className="text-gray-400">
                    {m.lat.toFixed(5)}, {m.lng.toFixed(5)}
                  </p>
                </li>
              ))}
              {storico.length === 0 && (
                <p className="text-sm text-gray-400">Nessun movimento.</p>
              )}
            </ul>
          </div>
        ) : (
          <ul className="flex-1 divide-y divide-gray-200 overflow-y-auto">
            {posizioniFiltrate.map((p) => (
              <li key={p.cassone_id}>
                <button
                  onClick={() => setSelezionato(p.cassone_id)}
                  className="block w-full px-4 py-3 text-left hover:bg-gray-50"
                >
                  <p className="font-medium text-gray-900">{p.codice}</p>
                  <p className="text-sm text-gray-500">
                    {p.cliente || "Nessun cliente"}
                    {p.quantita != null ? ` · qtà ${p.quantita}` : ""}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(p.ultimo_movimento).toLocaleString("it-IT")} ·{" "}
                    {p.ultimo_dipendente}
                  </p>
                </button>
              </li>
            ))}
            {posizioniFiltrate.length === 0 && (
              <p className="p-4 text-sm text-gray-400">Nessun cassone trovato.</p>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
