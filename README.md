# Consolle1 — Promo Music Station

Studio di produzione musicale AI-assistita: crea progetti, traccia canzoni con struttura sezioni (intro/verse/hook/...), genera testi in italiano con Claude (Anthropic) e genera audio via kie.ai (API Suno-compatible), con confronto tra take multiple.

## Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- Supabase (Postgres + Storage) come backend
- Anthropic SDK per la generazione dei testi
- kie.ai per la generazione audio

## Setup

1. Installa le dipendenze:

   ```bash
   npm install
   ```

2. Crea un progetto su [Supabase](https://supabase.com), poi esegui [`supabase/schema.sql`](supabase/schema.sql) nell'SQL editor per creare tabelle e storage bucket.

   Se il progetto Supabase esiste gia' (aggiornamento da una versione precedente), ri-esegui lo stesso script: le nuove colonne della console di generazione (`custom_genre`, `energy`, `is_dark`, `target_duration_seconds`, `instrumental`, `chords_notes`, `director_notes`) vengono aggiunte in modo idempotente con `alter table ... add column if not exists`.

3. Copia `.env.example` in `.env.local` e compila le variabili:

   ```bash
   cp .env.example .env.local
   ```

   - `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`: da Supabase > Project Settings > API
   - `ANTHROPIC_API_KEY`: da [console.anthropic.com](https://console.anthropic.com)
   - `KIE_AI_API_KEY`: da [kie.ai](https://kie.ai)

4. Avvia il dev server:

   ```bash
   npm run dev
   ```

## Struttura

```
app/
  page.tsx                        dashboard progetti + progetti recenti
  projects/[id]/page.tsx          elenco tracce di un progetto
  songs/[id]/page.tsx             editor traccia (struttura, dettagli, testi, audio)
  songs/[id]/scheda-tecnica/      scheda tecnica stampabile/esportabile in PDF
  api/                            route handlers (projects, songs, lyrics, audio, title)
components/
  ui/                             Pad, RackPanel, Waveform, Toggle, Slider
  studio/                         StructureEditor, AudioCompare, GenreChips,
                                   DurationPicker, AudioUpload, GenerationPreviewModal
lib/
  supabase.ts                     client Supabase lato server
  types.ts                        tipi condivisi (Project, Song, ...)
  sessionCounter.ts                contatore generazioni della sessione (sessionStorage)
  projectHistory.ts               storico ultimi 10 progetti aperti (localStorage)
supabase/
  schema.sql                      schema DB + storage bucket + migrazione console
```

## Console di generazione traccia

Nella pagina di editor traccia (`/songs/[id]`) sono disponibili:

- **Genere personalizzato**: chip dei generi pre-compilati + campo libero, che si aggiunge al genere nel prompt di generazione.
- **Riferimento artistico** ("Suona come...") incluso nel prompt di generazione audio.
- **Titolo automatico AI**: pulsante accanto al campo titolo che genera un titolo con Claude a partire da concept, genere e mood.
- **Energia** e **Dark**: parametri creativi inclusi nel prompt.
- **Durata**: 30s / 1min / 2min / 3min.
- **Strumentale**: toggle on/off passato direttamente a kie.ai.
- **Traccia di riferimento**: upload MP3/WAV con player integrato, nome file, durata e rimozione.
- **Note di regia** e **accordi/note armoniche**: campi liberi per istruzioni aggiuntive al producer, inclusi nella scheda tecnica.
- **Preview prima di generare**: prima di lanciare la generazione audio si apre un riepilogo completo di tutti i parametri, con "Conferma e Genera" o "Modifica" per tornare indietro.
- **Contatore generazioni**: mostra quante generazioni (testi + audio) sono state fatte nella sessione corrente.
- **Scheda tecnica**: vista stampabile con titolo, testi, accordi, parametri e riferimento artistico — dal pulsante "Stampa / Esporta PDF" si sceglie "Salva come PDF" nel dialogo di stampa del browser per ottenere il file da mandare al producer.

Sulla dashboard (`/`), il pannello **Progetti recenti** mostra gli ultimi 10 progetti aperti (localStorage) per riaprirli rapidamente.
