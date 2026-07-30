'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Printer } from 'lucide-react';
import { GENRE_LABELS, DURATION_LABELS, type Song, type LyricsVersion, type DurationOption } from '@/lib/types';

// Vista "scheda tecnica" pronta per la stampa: titolo, testi, accordi,
// parametri e riferimento artistico da mandare al producer. Il pulsante
// Stampa apre il dialogo di stampa del browser: scegliendo "Salva come PDF"
// si ottiene il file da condividere.
export default function SchedaTecnicaPage() {
  const params = useParams();
  const songId = params.id as string;

  const [song, setSong] = useState<Song | null>(null);
  const [currentLyrics, setCurrentLyrics] = useState<LyricsVersion | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/songs/${songId}`);
      const data = await res.json();
      setSong(data.song);
      const lyrics: LyricsVersion[] = data.lyrics_versions || [];
      setCurrentLyrics(lyrics.find((v) => v.is_current) || lyrics[0] || null);
      setLoading(false);
    })();
  }, [songId]);

  if (loading) {
    return (
      <main className="min-h-screen bg-base flex items-center justify-center">
        <p className="font-mono text-cement text-sm">Caricamento scheda...</p>
      </main>
    );
  }

  if (!song) {
    return (
      <main className="min-h-screen bg-base flex items-center justify-center">
        <p className="font-mono text-cement text-sm">Traccia non trovata</p>
      </main>
    );
  }

  const genreLabel = [GENRE_LABELS[song.genre], song.custom_genre].filter(Boolean).join(' / ');
  const durationLabel = song.target_duration_seconds
    ? DURATION_LABELS[song.target_duration_seconds as DurationOption]
    : '—';

  return (
    <main className="min-h-screen bg-base print:bg-white print:text-black">
      <style>{`
        @media print {
          body { background: #ffffff !important; color: #111111 !important; }
          .scheda-card { border-color: #999999 !important; background: #ffffff !important; }
          .scheda-label { color: #555555 !important; }
          .scheda-value { color: #111111 !important; }
        }
      `}</style>

      <header className="border-b border-stroke px-6 py-5 flex items-center justify-between print:hidden">
        <Link
          href={`/songs/${songId}`}
          className="flex items-center gap-2 text-cement hover:text-acid transition-colors font-mono text-xs uppercase"
        >
          <ArrowLeft size={16} /> Torna alla traccia
        </Link>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-acid text-base px-4 py-2 font-mono text-xs uppercase tracking-wide hover:bg-acid-dim transition-colors"
        >
          <Printer size={15} /> Stampa / Esporta PDF
        </button>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-10 print:py-0">
        <div className="mb-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-cement scheda-label mb-1">
            Scheda tecnica
          </p>
          <h1 className="font-display text-3xl uppercase tracking-wide text-chalk scheda-value">
            {song.title}
          </h1>
        </div>

        <section className="scheda-card border border-stroke bg-panel mb-6">
          <div className="border-b border-stroke px-4 py-3 font-mono text-[11px] uppercase tracking-wide text-cement scheda-label">
            Parametri
          </div>
          <div className="p-4 grid grid-cols-2 gap-x-6 gap-y-3 font-mono text-xs">
            <Field label="Genere" value={genreLabel} />
            <Field label="Mood" value={song.mood || '—'} />
            <Field label="BPM" value={song.bpm ? String(song.bpm) : '—'} />
            <Field label="Tonalita'" value={song.key_signature || '—'} />
            <Field label="Energia" value={song.energy != null ? `${song.energy}/100` : '—'} />
            <Field label="Dark" value={song.is_dark ? 'Si' : 'No'} />
            <Field label="Durata" value={durationLabel} />
            <Field label="Strumentale" value={song.instrumental ? 'Si (senza voce)' : 'No (con voce)'} />
          </div>
        </section>

        <section className="scheda-card border border-stroke bg-panel mb-6">
          <div className="border-b border-stroke px-4 py-3 font-mono text-[11px] uppercase tracking-wide text-cement scheda-label">
            Riferimento artistico
          </div>
          <div className="p-4 font-body text-sm text-chalk scheda-value">
            {song.reference_artists || '—'}
          </div>
        </section>

        <section className="scheda-card border border-stroke bg-panel mb-6">
          <div className="border-b border-stroke px-4 py-3 font-mono text-[11px] uppercase tracking-wide text-cement scheda-label">
            Accordi / note armoniche
          </div>
          <div className="p-4 font-body text-sm text-chalk scheda-value whitespace-pre-wrap">
            {song.chords_notes || '—'}
          </div>
        </section>

        <section className="scheda-card border border-stroke bg-panel mb-6">
          <div className="border-b border-stroke px-4 py-3 font-mono text-[11px] uppercase tracking-wide text-cement scheda-label">
            Note di regia
          </div>
          <div className="p-4 font-body text-sm text-chalk scheda-value whitespace-pre-wrap">
            {song.director_notes || '—'}
          </div>
        </section>

        <section className="scheda-card border border-stroke bg-panel">
          <div className="border-b border-stroke px-4 py-3 font-mono text-[11px] uppercase tracking-wide text-cement scheda-label">
            Testo
          </div>
          <div className="p-4 font-body text-sm text-chalk scheda-value whitespace-pre-wrap leading-relaxed">
            {currentLyrics?.content || 'Nessun testo generato ancora.'}
          </div>
        </section>
      </div>
    </main>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-stroke pb-2 scheda-card">
      <span className="text-cement scheda-label">{label}</span>
      <span className="text-chalk scheda-value">{value}</span>
    </div>
  );
}
