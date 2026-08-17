export type Ruolo = "dipendente" | "admin";

export type TipoOperazione = "prelievo" | "consegna" | "spostamento";

export const TIPI_OPERAZIONE: { value: TipoOperazione; label: string }[] = [
  { value: "prelievo", label: "Prelievo" },
  { value: "consegna", label: "Consegna" },
  { value: "spostamento", label: "Spostamento" },
];

export const TIPOLOGIE_CASSA: string[] = [
  "Compattatore BTE",
  "Compattatore Carnovali",
  "Compattatore Locatelli",
  "Compattatore Sosmar",
  "Cassone scarrabile da mc 5,00",
  "Cassone scarrabile da mc 10,00",
  "Cassone scarrabile da mc 15,00",
  "Cassone scarrabile da mc 20,00",
  "Cassa scarrabile mc 22,08",
  "Cassone scarrabile da mc 25,00",
  "Cassone scarrabile da mc 27,6",
  "Cassone scarrabile da mc 30,00",
  "Cassone scarrabile mc 33,00",
  "Attrezzature grasso",
  "Cassone scarrabile tetto idraulico 25 mc",
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
  cliente_email: string | null;
  firma_url: string | null;
  firma_autista_url: string | null;
  pdf_url: string | null;
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
