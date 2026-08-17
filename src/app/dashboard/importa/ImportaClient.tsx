"use client";

import { useState } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/client";

type Esito = { fase: "inattivo" } | { fase: "in-corso" } | { fase: "ok"; messaggio: string } | { fase: "errore"; messaggio: string };

const COLONNE_TARGA = [
  "mez_targa1",
  "mez_targa2",
  "mez_targa_1_2",
  "mez_targa_2_2",
  "mez_targa_1_3",
  "mez_targa_2_3",
];

const COLONNE_AUTISTA = ["form_autista", "form_autista_2", "form_autista_3"];

function chunk<T>(elementi: T[], dimensione: number): T[][] {
  const risultato: T[][] = [];
  for (let i = 0; i < elementi.length; i += dimensione) {
    risultato.push(elementi.slice(i, i + dimensione));
  }
  return risultato;
}

async function leggiFoglio(file: File): Promise<Record<string, unknown>[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const primoFoglio = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(primoFoglio);
}

function valoriDistinti(righe: Record<string, unknown>[], colonne: string[]): string[] {
  const insieme = new Set<string>();
  for (const riga of righe) {
    for (const colonna of colonne) {
      const valore = riga[colonna];
      if (typeof valore === "string") {
        const pulito = valore.trim();
        if (pulito.length > 0) insieme.add(pulito);
      }
    }
  }
  return [...insieme];
}

function messaggioErrore(err: unknown): string {
  console.error(err);
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err) {
    return String((err as { message: unknown }).message);
  }
  try {
    return JSON.stringify(err);
  } catch {
    return "Errore sconosciuto durante l'importazione.";
  }
}

async function sincronizza(
  tabella: "clienti" | "mezzi" | "autisti",
  campo: "nome" | "targa",
  valori: string[]
) {
  const supabase = createClient();
  const gruppi = chunk(
    valori.map((v) => ({ [campo]: v })),
    500
  );
  for (const gruppo of gruppi) {
    const { error } = await supabase
      .from(tabella)
      .upsert(gruppo, { onConflict: campo, ignoreDuplicates: true });
    if (error) throw error;
  }
}

export function ImportaClient() {
  const [esitoClienti, setEsitoClienti] = useState<Esito>({ fase: "inattivo" });
  const [esitoMezzi, setEsitoMezzi] = useState<Esito>({ fase: "inattivo" });

  async function importaClienti(file: File) {
    setEsitoClienti({ fase: "in-corso" });
    try {
      const righe = await leggiFoglio(file);
      const nomi = valoriDistinti(righe, ["imp_ragsoc"]);
      if (nomi.length === 0) {
        setEsitoClienti({
          fase: "errore",
          messaggio: "Nessuna colonna 'imp_ragsoc' trovata nel file. Controlla che sia il file giusto.",
        });
        return;
      }
      await sincronizza("clienti", "nome", nomi);
      setEsitoClienti({ fase: "ok", messaggio: `${nomi.length} clienti trovati e sincronizzati.` });
    } catch (err) {
      setEsitoClienti({
        fase: "errore",
        messaggio: messaggioErrore(err),
      });
    }
  }

  async function importaMezziAutisti(file: File) {
    setEsitoMezzi({ fase: "in-corso" });
    try {
      const righe = await leggiFoglio(file);
      const targhe = valoriDistinti(righe, COLONNE_TARGA);
      const autisti = valoriDistinti(righe, COLONNE_AUTISTA);

      if (targhe.length === 0 && autisti.length === 0) {
        setEsitoMezzi({
          fase: "errore",
          messaggio: "Nessuna colonna targa/autista trovata nel file. Controlla che sia il file giusto.",
        });
        return;
      }

      if (targhe.length > 0) await sincronizza("mezzi", "targa", targhe);
      if (autisti.length > 0) await sincronizza("autisti", "nome", autisti);

      setEsitoMezzi({
        fase: "ok",
        messaggio: `${targhe.length} targhe e ${autisti.length} autisti trovati e sincronizzati.`,
      });
    } catch (err) {
      setEsitoMezzi({
        fase: "errore",
        messaggio: messaggioErrore(err),
      });
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <Link href="/dashboard" className="mb-6 inline-block text-sm text-gray-500 hover:text-gray-900">
        ← Torna alla dashboard
      </Link>

      <h1 className="mb-1 text-lg font-semibold text-gray-900">Importa dati dal gestionale</h1>
      <p className="mb-6 text-sm text-gray-500">
        Carica i file Excel esportati dal gestionale per aggiornare gli elenchi usati per
        l&apos;autocompletamento nel form del movimento. Puoi ripetere l&apos;importazione quando vuoi:
        i nomi già presenti non vengono duplicati.
      </p>

      <div className="space-y-4">
        <RiquadroImport
          titolo="Elenco clienti"
          descrizione="File tipo public_bsimp.xlsx — legge la colonna 'imp_ragsoc'."
          esito={esitoClienti}
          onFile={importaClienti}
        />
        <RiquadroImport
          titolo="Mezzi e autisti"
          descrizione="File tipo public_bsform.xlsx — legge le colonne targa e autista."
          esito={esitoMezzi}
          onFile={importaMezziAutisti}
        />
      </div>
    </main>
  );
}

function RiquadroImport({
  titolo,
  descrizione,
  esito,
  onFile,
}: {
  titolo: string;
  descrizione: string;
  esito: Esito;
  onFile: (file: File) => void;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <h2 className="font-medium text-gray-900">{titolo}</h2>
      <p className="mt-1 text-sm text-gray-500">{descrizione}</p>

      <input
        type="file"
        accept=".xlsx,.xls"
        disabled={esito.fase === "in-corso"}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = "";
        }}
        className="mt-3 w-full text-sm disabled:opacity-50"
      />

      {esito.fase === "in-corso" && (
        <p className="mt-2 text-sm text-gray-500">Importazione in corso...</p>
      )}
      {esito.fase === "ok" && (
        <p className="mt-2 rounded-lg bg-brand-green-light px-3 py-2 text-sm text-brand-green-dark">
          {esito.messaggio}
        </p>
      )}
      {esito.fase === "errore" && (
        <p className="mt-2 rounded-lg bg-brand-orange-light px-3 py-2 text-sm text-brand-orange-dark">
          {esito.messaggio}
        </p>
      )}
    </div>
  );
}
