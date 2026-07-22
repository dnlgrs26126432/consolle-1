-- Promo Music Station — Schema Supabase
-- Esegui questo nell'SQL Editor di Supabase per creare la struttura completa.

create extension if not exists "uuid-ossp";

-- ============================================
-- PROGETTI
-- ============================================
create table if not exists projects (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- CANZONI
-- ============================================
create table if not exists songs (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects(id) on delete cascade,
  title text not null,
  genre text not null default 'trap-italiana', -- es. milan-drill, trap-italiana, conscious-hip-hop
  mood text,
  bpm int,
  key_signature text,
  reference_artists text, -- es. "Shiva, Sfera Ebbasta"
  structure jsonb default '[]'::jsonb, -- es. [{"type":"intro","bars":4},{"type":"verse","bars":16},...]
  status text default 'draft', -- draft | in_progress | final
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- VERSIONI LYRICS (versioning testi nel tempo)
-- ============================================
create table if not exists lyrics_versions (
  id uuid primary key default uuid_generate_v4(),
  song_id uuid references songs(id) on delete cascade,
  version_number int not null,
  content text not null, -- testo completo strutturato per sezioni
  concept_notes text, -- note creative/concept associate
  generated_by_ai boolean default false,
  ai_prompt_used text,
  is_current boolean default false,
  created_at timestamptz default now()
);

-- ============================================
-- VERSIONI AUDIO (per A/B testing generazioni kie.ai)
-- ============================================
create table if not exists audio_versions (
  id uuid primary key default uuid_generate_v4(),
  song_id uuid references songs(id) on delete cascade,
  lyrics_version_id uuid references lyrics_versions(id) on delete set null,
  version_label text, -- es. "Take A", "Take B"
  provider text default 'kie.ai',
  job_id text, -- id del job asincrono lato provider
  status text default 'pending', -- pending | processing | completed | failed
  prompt_used text not null, -- il one-line prompt usato per generare
  audio_url text, -- url finale (dopo download su Supabase Storage)
  external_audio_url text, -- url temporaneo dal provider prima del mirror
  duration_seconds numeric,
  is_favorite boolean default false,
  error_message text,
  created_at timestamptz default now(),
  completed_at timestamptz
);

-- ============================================
-- INDICI
-- ============================================
create index if not exists idx_songs_project on songs(project_id);
create index if not exists idx_lyrics_song on lyrics_versions(song_id);
create index if not exists idx_audio_song on audio_versions(song_id);
create index if not exists idx_audio_job on audio_versions(job_id);

-- ============================================
-- TRIGGER updated_at
-- ============================================
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_projects_updated on projects;
create trigger trg_projects_updated before update on projects
  for each row execute function set_updated_at();

drop trigger if exists trg_songs_updated on songs;
create trigger trg_songs_updated before update on songs
  for each row execute function set_updated_at();

-- ============================================
-- STORAGE BUCKET per audio (esegui a parte se serve via UI Supabase)
-- ============================================
insert into storage.buckets (id, name, public)
values ('audio-generations', 'audio-generations', true)
on conflict (id) do nothing;
