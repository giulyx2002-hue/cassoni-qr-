# Tracciamento Cassoni

Web app (PWA) per generare QR sulle casse scarrabili, scansionarli da smartphone,
registrare posizione GPS + dettagli del movimento (cliente, targa camion, autista,
tipo operazione, dimensioni, foto dello stato) e vedere/gestire tutto su una
dashboard con mappa in tempo reale. Per le consegne, il cliente firma sul telefono
del dipendente e riceve automaticamente via email un PDF con lo stato del cassone.

Stack: **Next.js** (App Router) + **Supabase** (Postgres, autenticazione, realtime,
storage) + **Resend** (invio email).

## 1. Crea il progetto Supabase

1. Vai su [supabase.com](https://supabase.com), crea un account e un nuovo progetto (gratuito).
2. Nel progetto, apri **SQL Editor** ed esegui tutto il contenuto di [`supabase/schema.sql`](supabase/schema.sql).
   Questo crea le tabelle `profiles`, `cassoni`, `movimenti`, la vista `ultima_posizione`,
   il bucket storage per le foto, le policy di sicurezza (RLS) e abilita il realtime.
3. Vai in **Project Settings → API** e copia:
   - `Project URL`
   - `anon public key` (o la "publishable key" nel nuovo formato `sb_publishable_...`)

### Se il progetto Supabase esisteva già prima di targa/autista/foto

Se hai creato il progetto Supabase prima che venissero aggiunti i campi targa,
nome autista, tipo operazione e foto (cioè avevi già eseguito la prima versione
di `schema.sql`), esegui invece nell'**SQL Editor** il contenuto di
[`supabase/migrations/002_dettagli_movimento.sql`](supabase/migrations/002_dettagli_movimento.sql).
Aggiorna la tabella `movimenti` (rimuove `quantita`, aggiunge i nuovi campi),
crea il bucket foto e aggiunge i permessi di modifica/eliminazione per l'admin,
senza perdere i dati già presenti.

Se invece il progetto esisteva già ma non ha ancora email cliente/firma/PDF,
esegui anche [`supabase/migrations/003_firma_pdf_email.sql`](supabase/migrations/003_firma_pdf_email.sql).

## 2. Crea un account Resend (per l'invio email)

1. Vai su [resend.com](https://resend.com) e crea un account gratuito (3.000 email/mese incluse).
2. Vai su **API Keys → Create API Key**, copia la chiave (inizia con `re_`).
3. Per inviare email a indirizzi qualsiasi (non solo alla tua email di test) devi
   verificare un dominio: **Domains → Add Domain**, inserisci un (sotto)dominio
   dell'azienda (es. `mail.morgans.it`) e segui le istruzioni per aggiungere i
   record DNS. Senza dominio verificato puoi comunque testare inviando solo
   all'indirizzo con cui ti sei registrato su Resend.
4. Una volta verificato il dominio, scegli un indirizzo mittente su quel dominio
   (es. `consegne@mail.morgans.it`).

## 3. Configura le variabili d'ambiente

Copia `.env.local.example` in `.env.local`:

```bash
cp .env.local.example .env.local
```

E compila:
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`: dal passo 1.
- `RESEND_API_KEY`: dal passo 2.
- `RESEND_FROM_EMAIL`: l'indirizzo mittente verificato (passo 2.4). Finché non
  verifichi un dominio, puoi lasciarlo vuoto: verrà usato `onboarding@resend.dev`,
  utilizzabile solo per test verso la tua stessa email Resend.

## 4. Installa e avvia

```bash
npm install
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000).

## 5. Crea i primi utenti

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
  mostra un form per cliente, targa camion, nome autista, tipo operazione
  (prelievo/consegna/spostamento), dimensioni, note e almeno una foto dello stato
  del cassone (obbligatoria). Ogni invio crea un nuovo "movimento" collegato a
  quel cassone e carica le foto nello storage Supabase.
- **Consegna al cliente**: se il tipo operazione è "Consegna", il form chiede anche
  l'email del cliente e la sua firma (raccolta direttamente sullo schermo del
  telefono del dipendente). Al salvataggio viene generato automaticamente un PDF
  con i dati del movimento, le foto e la firma, salvato nello storage e inviato
  via email al cliente (tramite Resend).
- **Dashboard** (`/dashboard`, solo admin): mappa con l'ultima posizione nota di ogni
  cassone, elenco di tutti i cassoni (anche quelli mai scansionati) filtrabile,
  storico movimenti per cassone con foto (e firma/PDF per le consegne),
  aggiornamento in tempo reale quando un dipendente scansiona. L'admin può
  modificare o eliminare sia i singoli movimenti sia un cassone intero (con
  tutto il suo storico).

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
