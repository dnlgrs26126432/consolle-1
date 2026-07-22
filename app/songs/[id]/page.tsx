'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Sparkles, Wand2, History } from 'lucide-react';
import { RackPanel } from '@/components/ui/RackPanel';
import { Pad } from '@/components/ui/Pad';
import { Waveform } from '@/components/ui/Waveform';
import { StructureEditor } from '@/components/studio/StructureEditor';
import { AudioCompare } from '@/components/studio/AudioCompare';
import { GENRE_LABELS, type Song, type LyricsVersion, type AudioVersion, type StructureSection } from '@/lib/types';

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

  const currentLyrics = lyricsVersions.find((v) => v.is_current);

  const loadSong = useCallback(async () => {
    const res = await fetch(`/api/songs/${songId}`);
    const data = await res.json();
    setSong(data.song);
    setLyricsVersions(data.lyrics_versions || []);
    setAudioVersions(data.audio_versions || []);
    setLoading(false);
  }, [songId]);

  useEffect(() => {
    loadSong();
  }, [loadSong]);

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

  async function generateLyrics() {
    if (!song) return;
    setGeneratingLyrics(true);
    try {
      const res = await fetch('/api/lyrics/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          song_id: songId,
          title: song.title,
          genre: song.genre,
          mood: song.mood,
          reference_artists: song.reference_artists,
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
      }
    } finally {
      setGeneratingLyrics(false);
    }
  }

  async function generateAudio() {
    if (!audioPrompt.trim()) return;
    setGeneratingAudio(true);
    try {
      const label = `Take ${audioVersions.length + 1}`;
      const res = await fetch('/api/audio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          song_id: songId,
          lyrics_version_id: currentLyrics?.id || null,
          prompt: audioPrompt,
          version_label: label,
        }),
      });
      const data = await res.json();
      if (data.audio_version) {
        setAudioVersions((prev) => [data.audio_version, ...prev]);
        setAudioPrompt('');
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
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8 grid gap-6 lg:grid-cols-[380px_1fr]">
        {/* Colonna sinistra: struttura */}
        <div className="space-y-6">
          <RackPanel eyebrow="Arrangiamento" title="Struttura brano">
            <StructureEditor structure={song.structure} onChange={updateStructure} />
          </RackPanel>

          <RackPanel eyebrow="Metadata" title="Dettagli">
            <div className="space-y-3 font-mono text-xs">
              <div className="flex justify-between border-b border-stroke pb-2">
                <span className="text-cement">BPM</span>
                <span className="text-chalk">{song.bpm || '—'}</span>
              </div>
              <div className="flex justify-between border-b border-stroke pb-2">
                <span className="text-cement">Key</span>
                <span className="text-chalk">{song.key_signature || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-cement">Riferimenti</span>
                <span className="text-chalk text-right">{song.reference_artists || '—'}</span>
              </div>
            </div>
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
                onKeyDown={(e) => e.key === 'Enter' && generateAudio()}
              />
              <Pad
                variant="primary"
                icon={<Sparkles size={15} />}
                onClick={generateAudio}
                disabled={generatingAudio || !audioPrompt.trim()}
              >
                {generatingAudio ? '...' : 'Genera'}
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
    </main>
  );
}
