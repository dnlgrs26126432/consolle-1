'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Music2 } from 'lucide-react';
import clsx from 'clsx';
import { RackPanel } from '@/components/ui/RackPanel';
import { Pad } from '@/components/ui/Pad';
import { GENRE_LABELS, type Genre, type Song } from '@/lib/types';

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [songs, setSongs] = useState<Song[]>([]);
  const [projectName, setProjectName] = useState('');
  const [loading, setLoading] = useState(true);
  const [showNewSong, setShowNewSong] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newGenre, setNewGenre] = useState<Genre>('milan-drill');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadProject();
  }, [projectId]);

  async function loadProject() {
    setLoading(true);
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      const project = data.projects?.find((p: any) => p.id === projectId);
      if (project) {
        setProjectName(project.name);
        setSongs(project.songs || []);
      }
    } finally {
      setLoading(false);
    }
  }

  async function createSong() {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/songs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          title: newTitle,
          genre: newGenre,
          structure: [
            { id: 'i1', type: 'intro', bars: 4 },
            { id: 'v1', type: 'verse', bars: 16 },
            { id: 'h1', type: 'hook', bars: 8 },
            { id: 'v2', type: 'verse', bars: 16 },
            { id: 'h2', type: 'hook', bars: 8 },
            { id: 'o1', type: 'outro', bars: 4 },
          ],
        }),
      });
      const data = await res.json();
      if (data.song) {
        router.push(`/songs/${data.song.id}`);
      }
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className="min-h-screen bg-base">
      <header className="border-b border-stroke px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-cement hover:text-acid transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="font-display text-2xl tracking-wide text-chalk uppercase">
            {loading ? '...' : projectName}
          </h1>
        </div>
        <Pad variant="primary" icon={<Plus size={16} />} onClick={() => setShowNewSong(true)}>
          Nuova Traccia
        </Pad>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-10">
        {showNewSong && (
          <RackPanel eyebrow="Setup" title="Nuova traccia" className="mb-8">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="font-mono text-[11px] uppercase tracking-wide text-cement block mb-1.5">
                  Titolo
                </label>
                <input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="es. Cemento Armato"
                  className="w-full bg-base border border-stroke px-3 py-2 text-chalk font-body text-sm focus:border-acid outline-none"
                />
              </div>
              <div>
                <label className="font-mono text-[11px] uppercase tracking-wide text-cement block mb-1.5">
                  Genere
                </label>
                <select
                  value={newGenre}
                  onChange={(e) => setNewGenre(e.target.value as Genre)}
                  className="w-full bg-base border border-stroke px-3 py-2 text-chalk font-body text-sm focus:border-acid outline-none"
                >
                  {Object.entries(GENRE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <Pad variant="primary" onClick={createSong} disabled={creating || !newTitle.trim()}>
                {creating ? 'Creazione...' : 'Crea traccia'}
              </Pad>
              <Pad variant="ghost" onClick={() => setShowNewSong(false)}>
                Annulla
              </Pad>
            </div>
          </RackPanel>
        )}

        {loading ? (
          <div className="font-mono text-cement text-sm py-20 text-center">Caricamento...</div>
        ) : songs.length === 0 ? (
          <div className="border border-dashed border-stroke py-20 text-center">
            <Music2 className="mx-auto mb-3 text-cement" size={32} />
            <p className="font-display text-lg text-chalk mb-1">Nessuna traccia ancora</p>
            <p className="font-mono text-xs text-cement">Crea la prima traccia di questo progetto</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {songs.map((song) => (
              <Link key={song.id} href={`/songs/${song.id}`}>
                <RackPanel className="h-full hover:border-acid transition-colors cursor-pointer group">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-[10px] uppercase tracking-wide text-acid">
                      {GENRE_LABELS[song.genre]}
                    </span>
                    <span
                      className={clsx(
                        'font-mono text-[10px] uppercase tracking-wide px-1.5 py-0.5 border',
                        song.status === 'final' && 'border-acid text-acid',
                        song.status === 'in_progress' && 'border-gold text-gold',
                        song.status === 'draft' && 'border-cement text-cement'
                      )}
                    >
                      {song.status}
                    </span>
                  </div>
                  <h3 className="font-display text-xl text-chalk group-hover:text-acid transition-colors">
                    {song.title}
                  </h3>
                  {song.bpm && (
                    <p className="font-mono text-xs text-cement mt-1">{song.bpm} BPM</p>
                  )}
                </RackPanel>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
