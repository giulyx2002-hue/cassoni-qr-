# Tracciamento Cassoni

Web app (PWA) per generare QR sulle casse scarrabili, scansionarli da smartphone,
registrare posizione GPS + dettagli del movimento (cliente, quantità, dimensioni)
e vedere tutto su una dashboard con mappa in tempo reale.

Stack: **Next.js** (App Router) + **Supabase** (Postgres, autenticazione, realtime).

## 1. Crea il progetto Supabase

1. Vai su [supabase.com](https://supabase.com), crea un account e un nuovo progetto (gratuito).
2. Nel progetto, apri **SQL Editor** ed esegui tutto il contenuto di [`supabase/schema.sql`](supabase/schema.sql).
   Questo crea le tabelle `profiles`, `cassoni`, `movimenti`, la vista `ultima_posizione`,
   le policy di sicurezza (RLS) e abilita il realtime.
3. Vai in **Project Settings → API** e copia:
   - `Project URL`
   - `anon public key`

## 2. Configura le variabili d'ambiente

Copia `.env.local.example` in `.env.local` e incolla i valori copiati sopra:

```bash
cp .env.local.example .env.local
```

## 3. Installa e avvia

```bash
npm install
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000).

## 4. Crea i primi utenti

Non esiste una pagina di registrazione pubblica (per evitare accessi non autorizzati
all'app aziendale). Gli utenti si creano da Supabase:

1. **Authentication → Users → Add user** → inserisci email e password del dipendente.
2. Alla creazione, un trigger crea automaticamente una riga in `profiles` con ruolo
   `dipendente`.
3. Per rendere un utente **admin** (accesso alla dashboard), vai in **Table Editor →
   profiles**, trova la riga dell'utente e cambia `ruolo` in `admin`.

## Come funziona

- **Genera QR** (`/genera`): un dipendente crea un nuovo cassone; viene generato un
  codice univoco e un QR (contenente un link tipo `https://tuoapp.it/c/AB12CD3`) da
  stampare e attaccare fisicamente al cassone.
- **Scansiona** (`/scansiona`): apre la fotocamera nel browser, legge il QR e apre
  la pagina del cassone.
- **Pagina cassone** (`/c/[codice]`): rilevata automaticamente la posizione GPS,
  mostra un form per cliente, quantità, dimensioni e note. Ogni invio crea un nuovo
  "movimento" collegato a quel cassone.
- **Dashboard** (`/dashboard`, solo admin): mappa con l'ultima posizione nota di ogni
  cassone, elenco filtrabile, storico movimenti per cassone, aggiornamento in tempo
  reale quando un dipendente scansiona.

## Installare l'app sul telefono (PWA)

Aprendo il sito da Chrome (Android) o Safari (iOS), è possibile scegliere
"Aggiungi a schermata Home" per usarla come un'app installata, con icona propria.

## Deploy in produzione

Il modo più semplice è [Vercel](https://vercel.com/new): collega il repository,
imposta le stesse variabili d'ambiente di `.env.local` nelle impostazioni del
progetto Vercel, e ottieni una URL HTTPS pubblica (necessaria per fotocamera e GPS,
che i browser abilitano solo su connessioni sicure).

## Note

- Le icone in `public/icons/` sono placeholder generati automaticamente: sostituiscile
  con il logo dell'azienda quando pronto (stesse dimensioni: 180×180, 192×192, 512×512).
- Non è richiesto supporto offline: la scansione richiede connessione internet attiva.
