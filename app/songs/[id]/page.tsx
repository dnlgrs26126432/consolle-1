'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Sparkles, Wand2, History, FileText, Zap } from 'lucide-react';
import { RackPanel } from '@/components/ui/RackPanel';
import { Pad } from '@/components/ui/Pad';
import { Waveform } from '@/components/ui/Waveform';
import { Toggle } from '@/components/ui/Toggle';
import { Slider } from '@/components/ui/Slider';
import { StructureEditor } from '@/components/studio/StructureEditor';
import { AudioCompare } from '@/components/studio/AudioCompare';
import { GenreChips } from '@/components/studio/GenreChips';
import { DurationPicker } from '@/components/studio/DurationPicker';
import { AudioUpload } from '@/components/studio/AudioUpload';
import { GenerationPreviewModal, type PreviewItem } from '@/components/studio/GenerationPreviewModal';
import { getGenerationCount, incrementGenerationCount, subscribeGenerationCount } from '@/lib/sessionCounter';
import {
  GENRE_LABELS,
  DURATION_LABELS,
  type Song,
  type LyricsVersion,
  type AudioVersion,
  type StructureSection,
  type Genre,
  type DurationOption,
} from '@/lib/types';

export default function SongEditorPage() {
  const params = useParams();
  const songId = params.id as string;

  const [song, setSong] = useState<Song | null>(null);
  const [lyricsVersions, setLyricsVersions] = useState<LyricsVersion[]>([]);
  const [audioVersions, setAudioVersions] = useState<AudioVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showVersionHistory, setShowVersionHistory] = useState(false);

  // Form generazione lyrics
  const [conceptBrief, setConceptBrief] = useState('');
  const [generatingLyrics, setGeneratingLyrics] = useState(false);

  // Form generazione audio
  const [audioPrompt, setAudioPrompt] = useState('');
  const [generatingAudio, setGeneratingAudio] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Titolo automatico AI
  const [editTitle, setEditTitle] = useState('');
  const [generatingTitle, setGeneratingTitle] = useState(false);

  // Dettagli / parametri creativi
  const [editGenre, setEditGenre] = useState<Genre>('trap-italiana');
  const [editCustomGenre, setEditCustomGenre] = useState('');
  const [editMood, setEditMood] = useState('');
  const [editBpm, setEditBpm] = useState('');
  const [editKey, setEditKey] = useState('');
  const [editReferenceArtists, setEditReferenceArtists] = useState('');
  const [energy, setEnergy] = useState(50);
  const [isDark, setIsDark] = useState(false);
  const [duration, setDuration] = useState<DurationOption>(120);
  const [instrumental, setInstrumental] = useState(false);
  const [chordsNotes, setChordsNotes] = useState('');
  const [directorNotes, setDirectorNotes] = useState('');
  const [savingDetails, setSavingDetails] = useState(false);

  // Upload traccia di riferimento
  const [referenceAudioFile, setReferenceAudioFile] = useState<File | null>(null);

  // Contatore generazioni sessione
  const [generationCount, setGenerationCount] = useState(0);

  const currentLyrics = lyricsVersions.find((v) => v.is_current);

  const loadSong = useCallback(async () => {
    const res = await fetch(`/api/songs/${songId}`);
    const data = await res.json();
    const loadedSong: Song = data.song;
    setSong(loadedSong);
    setLyricsVersions(data.lyrics_versions || []);
    setAudioVersions(data.audio_versions || []);
    setLoading(false);

    if (loadedSong) {
      setEditTitle(loadedSong.title || '');
      setEditGenre(loadedSong.genre || 'trap-italiana');
      setEditCustomGenre(loadedSong.custom_genre || '');
      setEditMood(loadedSong.mood || '');
      setEditBpm(loadedSong.bpm ? String(loadedSong.bpm) : '');
      setEditKey(loadedSong.key_signature || '');
      setEditReferenceArtists(loadedSong.reference_artists || '');
      setEnergy(loadedSong.energy ?? 50);
      setIsDark(!!loadedSong.is_dark);
      setDuration((loadedSong.target_duration_seconds as DurationOption) || 120);
      setInstrumental(!!loadedSong.instrumental);
      setChordsNotes(loadedSong.chords_notes || '');
      setDirectorNotes(loadedSong.director_notes || '');
    }
  }, [songId]);

  useEffect(() => {
    loadSong();
  }, [loadSong]);

  useEffect(() => {
    setGenerationCount(getGenerationCount());
    const unsubscribe = subscribeGenerationCount(setGenerationCount);
    return unsubscribe;
  }, []);

  // Polling automatico per versioni audio ancora in processing
  useEffect(() => {
    const processing = audioVersions.filter((v) => v.status === 'processing' || v.status === 'pending');
    if (processing.length === 0) return;

    const interval = setInterval(async () => {
      for (const v of processing) {
        await refreshAudioStatus(v.id, false);
      }
    }, 5000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioVersions]);

  async function updateStructure(structure: StructureSection[]) {
    if (!song) return;
    setSong({ ...song, structure });
    await fetch(`/api/songs/${songId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ structure }),
    });
  }

  async function saveDetails() {
    if (!song) return;
    setSavingDetails(true);
    try {
      const payload = {
        title: editTitle.trim() || song.title,
        genre: editGenre,
        custom_genre: editCustomGenre.trim() || null,
        mood: editMood.trim() || null,
        bpm: editBpm ? Number(editBpm) : null,
        key_signature: editKey.trim() || null,
        reference_artists: editReferenceArtists.trim() || null,
        energy,
        is_dark: isDark,
        target_duration_seconds: duration,
        instrumental,
        chords_notes: chordsNotes.trim() || null,
        director_notes: directorNotes.trim() || null,
      };
      const res = await fetch(`/api/songs/${songId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.song) setSong(data.song);
    } finally {
      setSavingDetails(false);
    }
  }

  async function generateTitle() {
    setGeneratingTitle(true);
    try {
      const res = await fetch('/api/title/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          concept: conceptBrief || directorNotes,
          genre: editGenre,
          mood: editMood,
        }),
      });
      const data = await res.json();
      if (data.title) setEditTitle(data.title);
      else if (data.error) alert(data.error);
    } finally {
      setGeneratingTitle(false);
    }
  }

  async function generateLyrics() {
    if (!song) return;
    setGeneratingLyrics(true);
    try {
      const res = await fetch('/api/lyrics/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          song_id: songId,
          title: editTitle || song.title,
          genre: editGenre,
          mood: editMood,
          reference_artists: editReferenceArtists,
          structure: song.structure,
          concept_brief: conceptBrief,
        }),
      });
      const data = await res.json();
      if (data.lyrics_version) {
        setLyricsVersions((prev) => [
          data.lyrics_version,
          ...prev.map((v) => ({ ...v, is_current: false })),
        ]);
        setConceptBrief('');
        incrementGenerationCount();
      } else if (data.error) {
        alert(data.error);
      }
    } finally {
      setGeneratingLyrics(false);
    }
  }

  function buildFinalAudioPrompt(): string {
    const parts: string[] = [];
    if (audioPrompt.trim()) parts.push(audioPrompt.trim());

    const genreText = [GENRE_LABELS[editGenre], editCustomGenre.trim()].filter(Boolean).join(', ');
    if (genreText) parts.push(`Genere: ${genreText}`);
    if (editMood.trim()) parts.push(`Mood: ${editMood.trim()}`);
    if (editReferenceArtists.trim()) parts.push(`Suona come: ${editReferenceArtists.trim()}`);
    parts.push(`Energia: ${energy}/100`);
    if (isDark) parts.push('Atmosfera dark');
    parts.push(`Durata target: ${DURATION_LABELS[duration]}`);
    if (directorNotes.trim()) parts.push(`Note di regia: ${directorNotes.trim()}`);
    if (referenceAudioFile) parts.push(`Traccia di riferimento caricata: ${referenceAudioFile.name}`);

    return parts.join(' — ');
  }

  function openPreview() {
    if (!audioPrompt.trim()) return;
    setPreviewOpen(true);
  }

  async function generateAudio() {
    const finalPrompt = buildFinalAudioPrompt();
    if (!finalPrompt.trim()) return;
    setGeneratingAudio(true);
    try {
      const label = `Take ${audioVersions.length + 1}`;
      const res = await fetch('/api/audio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          song_id: songId,
          lyrics_version_id: currentLyrics?.id || null,
          prompt: finalPrompt,
          version_label: label,
          instrumental,
        }),
      });
      const data = await res.json();
      if (data.audio_version) {
        setAudioVersions((prev) => [data.audio_version, ...prev]);
        setAudioPrompt('');
        incrementGenerationCount();
        setPreviewOpen(false);
      } else if (data.error) {
        alert(data.error);
      }
    } finally {
      setGeneratingAudio(false);
    }
  }

  async function refreshAudioStatus(id: string, showLoading = true) {
    const res = await fetch(`/api/audio/status/${id}`);
    const data = await res.json();
    if (data.audio_version) {
      setAudioVersions((prev) => prev.map((v) => (v.id === id ? data.audio_version : v)));
    }
  }

  async function toggleFavorite(id: string, current: boolean) {
    setAudioVersions((prev) =>
      prev.map((v) => (v.id === id ? { ...v, is_favorite: !current } : v))
    );
    await fetch(`/api/audio/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_favorite: !current }),
    });
  }

  function selectLyricsVersion(version: LyricsVersion) {
    setLyricsVersions((prev) =>
      prev.map((v) => ({ ...v, is_current: v.id === version.id }))
    );
    setShowVersionHistory(false);
  }

  const totalBars = useMemo(
    () => (song ? song.structure.reduce((sum, s) => sum + s.bars, 0) : 0),
    [song]
  );

  const previewItems: PreviewItem[] = useMemo(() => {
    if (!song) return [];
    const genreText = [GENRE_LABELS[editGenre], editCustomGenre.trim()].filter(Boolean).join(' / ');
    return [
      { label: 'Titolo', value: editTitle || song.title },
      { label: 'Genere', value: genreText },
      { label: 'Mood', value: editMood },
      { label: 'BPM', value: editBpm },
      { label: "Tonalita'", value: editKey },
      { label: 'Struttura', value: `${song.structure.length} sezioni · ${totalBars} battute` },
      { label: 'Energia', value: `${energy}/100` },
      { label: 'Dark', value: isDark ? 'Si' : 'No' },
      { label: 'Durata', value: DURATION_LABELS[duration] },
      { label: 'Strumentale', value: instrumental ? 'Si' : 'No' },
      { label: 'Riferimento artistico', value: editReferenceArtists },
      { label: 'Note di regia', value: directorNotes },
    ];
  }, [song, editGenre, editCustomGenre, editTitle, editMood, editBpm, editKey, totalBars, energy, isDark, duration, instrumental, editReferenceArtists, directorNotes]);

  if (loading) {
    return (
      <main className="min-h-screen bg-base flex items-center justify-center">
        <Waveform state="processing" barCount={30} className="h-16" />
      </main>
    );
  }

  if (!song) {
    return (
      <main className="min-h-screen bg-base flex items-center justify-center">
        <p className="font-mono text-cement">Traccia non trovata</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-base pb-20">
      <header className="border-b border-stroke px-6 py-5 flex items-center justify-between sticky top-0 bg-base/95 backdrop-blur z-10">
        <div className="flex items-center gap-4 min-w-0">
          <Link href={`/projects/${song.project_id}`} className="text-cement hover:text-acid transition-colors shrink-0">
            <ArrowLeft size={20} />
          </Link>
          <div className="min-w-0">
            <h1 className="font-display text-2xl tracking-wide text-chalk uppercase truncate">
              {song.title}
            </h1>
            <p className="font-mono text-xs text-acid">{GENRE_LABELS[song.genre]}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <span className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide text-cement">
            <Zap size={13} className="text-acid" />
            {generationCount} generazioni · sessione
          </span>
          <Link
            href={`/songs/${songId}/scheda-tecnica`}
            target="_blank"
            className="flex items-center gap-1.5 border border-stroke px-3 py-2 font-mono text-[11px] uppercase tracking-wide text-cement hover:border-acid hover:text-acid transition-colors"
          >
            <FileText size={13} /> Scheda tecnica
          </Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8 grid gap-6 lg:grid-cols-[380px_1fr]">
        {/* Colonna sinistra: struttura + dettagli + parametri creativi */}
        <div className="space-y-6">
          <RackPanel eyebrow="Arrangiamento" title="Struttura brano">
            <StructureEditor structure={song.structure} onChange={updateStructure} />
          </RackPanel>

          <RackPanel eyebrow="Metadata" title="Dettagli">
            <div className="space-y-4">
              <div>
                <label className="font-mono text-[11px] uppercase tracking-wide text-cement block mb-1.5">
                  Titolo
                </label>
                <div className="flex gap-2">
                  <input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Titolo del brano"
                    className="flex-1 bg-base border border-stroke px-3 py-2 text-chalk font-body text-sm focus:border-acid outline-none"
                  />
                  <button
                    onClick={generateTitle}
                    disabled={generatingTitle}
                    title="Genera titolo con AI"
                    className="flex items-center justify-center border border-stroke px-3 text-cement hover:border-acid hover:text-acid transition-colors disabled:opacity-40"
                  >
                    <Sparkles size={15} className={generatingTitle ? 'animate-pulse' : ''} />
                  </button>
                </div>
              </div>

              <GenreChips
                value={editGenre}
                onChange={setEditGenre}
                customValue={editCustomGenre}
                onCustomChange={setEditCustomGenre}
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-mono text-[11px] uppercase tracking-wide text-cement block mb-1.5">
                    Mood
                  </label>
                  <input
                    value={editMood}
                    onChange={(e) => setEditMood(e.target.value)}
                    placeholder="es. malinconico"
                    className="w-full bg-base border border-stroke px-3 py-2 text-chalk font-body text-sm focus:border-acid outline-none"
                  />
                </div>
                <div>
                  <label className="font-mono text-[11px] uppercase tracking-wide text-cement block mb-1.5">
                    BPM
                  </label>
                  <input
                    value={editBpm}
                    onChange={(e) => setEditBpm(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="es. 140"
                    className="w-full bg-base border border-stroke px-3 py-2 text-chalk font-body text-sm focus:border-acid outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-mono text-[11px] uppercase tracking-wide text-cement block mb-1.5">
                    Tonalita'
                  </label>
                  <input
                    value={editKey}
                    onChange={(e) => setEditKey(e.target.value)}
                    placeholder="es. Cm"
                    className="w-full bg-base border border-stroke px-3 py-2 text-chalk font-body text-sm focus:border-acid outline-none"
                  />
                </div>
                <div>
                  <label className="font-mono text-[11px] uppercase tracking-wide text-cement block mb-1.5">
                    Strumentale
                  </label>
                  <Toggle checked={instrumental} onChange={setInstrumental} labelOn="Si" labelOff="No" className="w-full justify-center" />
                </div>
              </div>

              <div>
                <label className="font-mono text-[11px] uppercase tracking-wide text-cement block mb-1.5">
                  Riferimento artistico
                </label>
                <input
                  value={editReferenceArtists}
                  onChange={(e) => setEditReferenceArtists(e.target.value)}
                  placeholder="Suona come... es. Shiva x Drake"
                  className="w-full bg-base border border-stroke px-3 py-2 text-chalk font-body text-sm focus:border-acid outline-none"
                />
              </div>

              <Slider label="Energia" value={energy} onChange={setEnergy} valueLabel={`${energy}/100`} />

              <div className="flex items-center justify-between">
                <label className="font-mono text-[11px] uppercase tracking-wide text-cement">
                  Atmosfera dark
                </label>
                <Toggle checked={isDark} onChange={setIsDark} labelOn="Si" labelOff="No" />
              </div>

              <DurationPicker value={duration} onChange={setDuration} />

              <div>
                <label className="font-mono text-[11px] uppercase tracking-wide text-cement block mb-1.5">
                  Accordi / note armoniche (opzionale)
                </label>
                <textarea
                  value={chordsNotes}
                  onChange={(e) => setChordsNotes(e.target.value)}
                  placeholder="es. Am - F - C - G sul hook"
                  rows={2}
                  className="w-full bg-base border border-stroke px-3 py-2 text-chalk font-body text-sm focus:border-acid outline-none resize-none"
                />
              </div>

              <div>
                <label className="font-mono text-[11px] uppercase tracking-wide text-cement block mb-1.5">
                  Note di regia
                </label>
                <textarea
                  value={directorNotes}
                  onChange={(e) => setDirectorNotes(e.target.value)}
                  placeholder="Istruzioni aggiuntive per il producer..."
                  rows={2}
                  className="w-full bg-base border border-stroke px-3 py-2 text-chalk font-body text-sm focus:border-acid outline-none resize-none"
                />
              </div>

              <Pad variant="ghost" onClick={saveDetails} disabled={savingDetails} className="w-full">
                {savingDetails ? 'Salvataggio...' : 'Salva dettagli'}
              </Pad>
            </div>
          </RackPanel>

          <RackPanel eyebrow="Reference" title="Traccia di riferimento">
            <AudioUpload onFileChange={setReferenceAudioFile} />
          </RackPanel>
        </div>

        {/* Colonna destra: lyrics + audio */}
        <div className="space-y-6">
          {/* Generazione lyrics */}
          <RackPanel
            eyebrow="Testi & Concept"
            title="Genera lyrics"
            action={
              lyricsVersions.length > 0 && (
                <button
                  onClick={() => setShowVersionHistory(!showVersionHistory)}
                  className="flex items-center gap-1.5 text-cement hover:text-acid transition-colors font-mono text-[11px] uppercase"
                >
                  <History size={13} />v{currentLyrics?.version_number} · {lyricsVersions.length} versioni
                </button>
              )
            }
          >
            {showVersionHistory && (
              <div className="mb-4 border border-stroke divide-y divide-stroke">
                {lyricsVersions.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => selectLyricsVersion(v)}
                    className={`w-full text-left px-3 py-2 font-mono text-xs hover:bg-panel-raised transition-colors flex justify-between ${
                      v.is_current ? 'text-acid' : 'text-cement'
                    }`}
                  >
                    <span>Versione {v.version_number}</span>
                    <span>{new Date(v.created_at).toLocaleString('it-IT')}</span>
                  </button>
                ))}
              </div>
            )}

            <textarea
              value={conceptBrief}
              onChange={(e) => setConceptBrief(e.target.value)}
              placeholder="Concept/brief opzionale — es. 'tema: ascesa dal quartiere, tono aggressivo ma con un hook malinconico'"
              rows={2}
              className="w-full bg-base border border-stroke px-3 py-2 text-chalk font-body text-sm focus:border-acid outline-none resize-none mb-3"
            />
            <Pad
              variant="primary"
              icon={<Wand2 size={15} />}
              onClick={generateLyrics}
              disabled={generatingLyrics || song.structure.length === 0}
            >
              {generatingLyrics ? 'Scrittura in corso...' : 'Genera testo con Claude'}
            </Pad>

            {currentLyrics && (
              <div className="mt-5 border border-stroke bg-panel-raised p-4 max-h-96 overflow-y-auto">
                <pre className="font-body text-sm text-chalk whitespace-pre-wrap leading-relaxed">
                  {currentLyrics.content}
                </pre>
              </div>
            )}
          </RackPanel>

          {/* Generazione audio */}
          <RackPanel eyebrow="Produzione" title="Genera audio">
            <div className="flex gap-2 mb-4">
              <input
                value={audioPrompt}
                onChange={(e) => setAudioPrompt(e.target.value)}
                placeholder="Prompt one-line per ProducerAI/kie.ai — es. 'milan drill aggressiva, 808 pesanti, hook melodico'"
                className="flex-1 bg-base border border-stroke px-3 py-2 text-chalk font-body text-sm focus:border-acid outline-none"
                onKeyDown={(e) => e.key === 'Enter' && openPreview()}
              />
              <Pad
                variant="primary"
                icon={<Sparkles size={15} />}
                onClick={openPreview}
                disabled={generatingAudio || !audioPrompt.trim()}
              >
                Genera
              </Pad>
            </div>

            <AudioCompare
              versions={audioVersions}
              onToggleFavorite={toggleFavorite}
              onRefreshStatus={(id) => refreshAudioStatus(id, true)}
            />
          </RackPanel>
        </div>
      </div>

      <GenerationPreviewModal
        open={previewOpen}
        items={previewItems}
        lyricsPreview={currentLyrics?.content}
        loading={generatingAudio}
        onConfirm={generateAudio}
        onEdit={() => setPreviewOpen(false)}
      />
    </main>
  );
}
