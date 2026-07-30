export type Genre =
  | 'milan-drill'
  | 'trap-italiana'
  | 'conscious-hip-hop'
  | 'reggaeton-italiano'
  | 'pop-urban'
  | 'custom';

export const GENRE_LABELS: Record<Genre, string> = {
  'milan-drill': 'Milan Drill',
  'trap-italiana': 'Trap Italiana',
  'conscious-hip-hop': 'Conscious Hip-Hop',
  'reggaeton-italiano': 'Reggaeton Italiano',
  'pop-urban': 'Pop Urban',
  custom: 'Custom',
};

export type SongStatus = 'draft' | 'in_progress' | 'final';

export type StructureSectionType =
  | 'intro'
  | 'verse'
  | 'hook'
  | 'bridge'
  | 'break'
  | 'ad-lib'
  | 'outro';

export interface StructureSection {
  id: string;
  type: StructureSectionType;
  bars: number;
  label?: string;
}

// Durata target del brano generato - usata dallo slider durata (30s/1min/2min/3min)
export type DurationOption = 30 | 60 | 120 | 180;

export const DURATION_OPTIONS: DurationOption[] = [30, 60, 120, 180];

export const DURATION_LABELS: Record<DurationOption, string> = {
  30: '30s',
  60: '1 min',
  120: '2 min',
  180: '3 min',
};

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  created_at: string;
  updated_at: string;
  songs?: Song[];
}

export interface Song {
  id: string;
  project_id: string;
  title: string;
  genre: Genre;
  mood?: string | null;
  bpm?: number | null;
  key_signature?: string | null;
  reference_artists?: string | null;
  structure: StructureSection[];
  status: SongStatus;
  created_at: string;
  updated_at: string;
  // Genere libero: si aggiunge al genere selezionato nel prompt di generazione
  custom_genre?: string | null;
  // Energia del brano, 0-100
  energy?: number | null;
  // Atmosfera dark on/off
  is_dark?: boolean;
  // Durata target in secondi (30/60/120/180)
  target_duration_seconds?: DurationOption | null;
  // Brano strumentale (senza voce)
  instrumental?: boolean;
  // Note libere su accordi/progressione armonica, per la scheda tecnica
  chords_notes?: string | null;
  // Note di regia: istruzioni aggiuntive per il producer
  director_notes?: string | null;
}

export interface LyricsVersion {
  id: string;
  song_id: string;
  version_number: number;
  content: string;
  concept_notes?: string | null;
  generated_by_ai: boolean;
  ai_prompt_used?: string | null;
  is_current: boolean;
  created_at: string;
}

export type AudioVersionStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface AudioVersion {
  id: string;
  song_id: string;
  lyrics_version_id?: string | null;
  version_label: string;
  provider: string;
  job_id: string;
  status: AudioVersionStatus;
  prompt_used: string;
  audio_url?: string | null;
  external_audio_url?: string | null;
  duration_seconds?: number | null;
  error_message?: string | null;
  is_favorite: boolean;
  completed_at?: string | null;
  created_at: string;
}
