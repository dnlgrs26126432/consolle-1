export type Genre =
  | 'milan-drill'
  | 'trap-italiana'
  | 'conscious-hip-hop'
  | 'reggaeton-italiano'
  | 'pop-urban'
  | 'custom';

export const GENRE_LABELS: Record<Genre, string> = {
  'milan-drill': 'Milan Drill',
  'trap-italiana': 'Trap Italiana Melodica',
  'conscious-hip-hop': 'Conscious Hip-Hop',
  'reggaeton-italiano': 'Reggaeton Italiano',
  'pop-urban': 'Pop Urban',
  custom: 'Genere Custom',
};

export interface StructureSection {
  id: string;
  type: 'intro' | 'verse' | 'hook' | 'bridge' | 'outro' | 'ad-lib' | 'break';
  bars: number;
  label?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  songs?: Song[];
}

export interface Song {
  id: string;
  project_id: string;
  title: string;
  genre: Genre;
  mood: string | null;
  bpm: number | null;
  key_signature: string | null;
  reference_artists: string | null;
  structure: StructureSection[];
  status: 'draft' | 'in_progress' | 'final';
  created_at: string;
  updated_at: string;
}

export interface LyricsVersion {
  id: string;
  song_id: string;
  version_number: number;
  content: string;
  concept_notes: string | null;
  generated_by_ai: boolean;
  ai_prompt_used: string | null;
  is_current: boolean;
  created_at: string;
}

export interface AudioVersion {
  id: string;
  song_id: string;
  lyrics_version_id: string | null;
  version_label: string | null;
  provider: string;
  job_id: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  prompt_used: string;
  audio_url: string | null;
  external_audio_url: string | null;
  duration_seconds: number | null;
  is_favorite: boolean;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}
