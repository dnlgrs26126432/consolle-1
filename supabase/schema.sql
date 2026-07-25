-- Schema Consolle1 / Promo Music Station
-- Esegui questo script nell'SQL editor del tuo progetto Supabase.

create extension if not exists "pgcrypto";

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists songs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  genre text not null default 'trap-italiana',
  mood text,
  bpm integer,
  key_signature text,
  reference_artists text,
  structure jsonb not null default '[]'::jsonb,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists lyrics_versions (
  id uuid primary key default gen_random_uuid(),
  song_id uuid not null references songs(id) on delete cascade,
  version_number integer not null,
  content text not null,
  concept_notes text,
  generated_by_ai boolean not null default false,
  ai_prompt_used text,
  is_current boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists audio_versions (
  id uuid primary key default gen_random_uuid(),
  song_id uuid not null references songs(id) on delete cascade,
  lyrics_version_id uuid references lyrics_versions(id) on delete set null,
  version_label text,
  provider text not null default 'kie.ai',
  job_id text not null,
  status text not null default 'pending',
  prompt_used text,
  audio_url text,
  external_audio_url text,
  duration_seconds numeric,
  error_message text,
  is_favorite boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_songs_project_id on songs(project_id);
create index if not exists idx_lyrics_versions_song_id on lyrics_versions(song_id);
create index if not exists idx_audio_versions_song_id on audio_versions(song_id);

-- Trigger per mantenere updated_at aggiornato
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_projects_updated_at on projects;
create trigger trg_projects_updated_at before update on projects
  for each row execute function set_updated_at();

drop trigger if exists trg_songs_updated_at on songs;
create trigger trg_songs_updated_at before update on songs
  for each row execute function set_updated_at();

-- Storage bucket per il mirror degli audio generati (usato da
-- app/api/audio/status/[id]/route.ts). Da creare anche da UI Supabase
-- se preferisci: Storage > New bucket > "audio-generations" (pubblico).
insert into storage.buckets (id, name, public)
values ('audio-generations', 'audio-generations', true)
on conflict (id) do nothing;
