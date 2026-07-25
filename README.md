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
  page.tsx                     dashboard progetti
  projects/[id]/page.tsx       elenco tracce di un progetto
  songs/[id]/page.tsx          editor traccia (struttura, testi, audio)
  api/                         route handlers (projects, songs, lyrics, audio)
components/
  ui/                          Pad, RackPanel, Waveform
  studio/                      StructureEditor, AudioCompare
lib/
  supabase.ts                  client Supabase lato server
  types.ts                     tipi condivisi (Project, Song, ...)
supabase/
  schema.sql                   schema DB + storage bucket
```
