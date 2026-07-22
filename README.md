# Promo Music Station

Studio di produzione musicale AI-assistita: scrivi concept e testi con Claude, generi audio reale via kie.ai, gestisci struttura del brano e versioning di testi/audio — tutto in un'unica app.

## Stack

- **Next.js 14** (App Router) + TypeScript + Tailwind
- **Supabase** — database Postgres + storage file per gli audio generati
- **Anthropic API** — generazione lyrics/concept
- **kie.ai** — generazione audio reale (stessa API già in uso su Promo Music Italia)

## Setup

### 1. Installa le dipendenze

```bash
npm install
```

### 2. Crea il progetto Supabase

1. Vai su [supabase.com](https://supabase.com) e crea un nuovo progetto
2. Vai su **SQL Editor** e incolla il contenuto di `supabase/schema.sql`, poi esegui
3. Vai su **Project Settings > API** e copia URL, anon key, service role key

### 3. Configura le variabili d'ambiente

Copia `.env.example` in `.env.local` e riempi con le tue chiavi:

```bash
cp .env.example .env.local
```

### 4. Avvia in locale

```bash
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000).

## Deploy su Vercel

1. Push del progetto su GitHub
2. Importa il repo su [vercel.com](https://vercel.com)
3. Aggiungi le stesse 4 variabili d'ambiente di `.env.example` nelle **Environment Variables** del progetto Vercel
4. Deploy

## Come funziona

### Struttura dati

```
Progetto
 └─ Canzone (genere, mood, bpm, struttura sezioni)
     ├─ Versioni Lyrics (ogni generazione salvata, puoi tornare a versioni precedenti)
     └─ Versioni Audio (ogni take da kie.ai salvata, confronto A/B, preferiti)
```

### Workflow tipico

1. Crea un progetto (es. un EP o singolo)
2. Crea una traccia, scegli genere (Milan Drill, Trap Italiana, Conscious Hip-Hop, ecc.)
3. Costruisci la struttura del brano trascinando le sezioni (intro/verse/hook/bridge/outro)
4. Genera il testo con Claude — aggiungi un brief opzionale per guidare il concept
5. Genera l'audio con un prompt one-line per kie.ai — lancia più "take" per fare A/B test
6. Confronta le versioni audio affiancate, segna la tua preferita

### Note tecniche

- La generazione audio su kie.ai è **asincrona**: l'app fa polling automatico ogni 5 secondi finché il job non è completo
- Gli audio completati vengono **mirrorati su Supabase Storage** (non dipendiamo dagli URL temporanei del provider)
- Il campo "preferito" sugli audio persiste lato server tramite `PATCH /api/audio/[id]`

## Roadmap possibile (non ancora implementata)

- Autenticazione multi-utente (per aprire l'accesso al team Promo Music Italia)
- Export progetto in PDF/Word con testi + link audio (riusando la skill docx)
- Generazione video/reel promozionali integrata (Kling AI / Runway ML)
- Libreria di preset per genere (prompt template salvati per Milan Drill, Trap Italiana, ecc.)
