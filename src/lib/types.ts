export type Ruolo = "dipendente" | "admin";

export type TipoOperazione = "prelievo" | "consegna" | "spostamento";

export const TIPI_OPERAZIONE: { value: TipoOperazione; label: string }[] = [
  { value: "prelievo", label: "Prelievo" },
  { value: "consegna", label: "Consegna" },
  { value: "spostamento", label: "Spostamento" },
];

export interface Profile {
  id: string;
  nome: string;
  ruolo: Ruolo;
  created_at: string;
}

export interface Cassone {
  id: string;
  codice: string;
  dimensioni: string | null;
  note: string | null;
  creato_da: string | null;
  created_at: string;
}

export interface Movimento {
  id: string;
  cassone_id: string;
  dipendente_id: string;
  cliente: string | null;
  targa: string;
  nome_autista: string;
  tipo_operazione: TipoOperazione;
  dimensioni: string | null;
  note: string | null;
  foto_urls: string[];
  lat: number;
  lng: number;
  accuratezza_metri: number | null;
  created_at: string;
}

export interface UltimaPosizione {
  cassone_id: string;
  cliente: string | null;
  targa: string;
  nome_autista: string;
  tipo_operazione: TipoOperazione;
  dimensioni: string | null;
  lat: number;
  lng: number;
  ultimo_movimento: string;
  codice: string;
  ultimo_dipendente: string;
}
