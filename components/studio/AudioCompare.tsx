'use client';

import { useRef, useState } from 'react';
import { Play, Pause, Star, RefreshCw, AlertCircle } from 'lucide-react';
import clsx from 'clsx';
import { Waveform } from '@/components/ui/Waveform';
import type { AudioVersion } from '@/lib/types';

interface AudioCompareProps {
  versions: AudioVersion[];
  onToggleFavorite: (id: string, current: boolean) => void;
  onRefreshStatus: (id: string) => void;
}

function AudioCard({
  version,
  onToggleFavorite,
  onRefreshStatus,
}: {
  version: AudioVersion;
  onToggleFavorite: (id: string, current: boolean) => void;
  onRefreshStatus: (id: string) => void;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  function togglePlay() {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setPlaying(!playing);
  }

  return (
    <div
      className={clsx(
        'relative border bg-panel-raised p-4 flex flex-col gap-3',
        version.is_favorite ? 'border-acid' : 'border-stroke'
      )}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs uppercase tracking-wide text-chalk">
          {version.version_label || 'Take'}
        </span>
        <button
          onClick={() => onToggleFavorite(version.id, version.is_favorite)}
          className={clsx(
            'transition-colors',
            version.is_favorite ? 'text-acid' : 'text-cement hover:text-acid'
          )}
          aria-label="Segna come preferita"
        >
          <Star size={16} fill={version.is_favorite ? 'currentColor' : 'none'} />
        </button>
      </div>

      {version.status === 'completed' && version.audio_url && (
        <>
          <audio
            ref={audioRef}
            src={version.audio_url}
            onEnded={() => setPlaying(false)}
            className="hidden"
          />
          <button
            onClick={togglePlay}
            className="flex items-center gap-3 border border-stroke px-3 py-2 hover:border-acid transition-colors group"
          >
            {playing ? (
              <Pause size={16} className="text-acid shrink-0" />
            ) : (
              <Play size={16} className="text-cement group-hover:text-acid shrink-0" />
            )}
            <Waveform state={playing ? 'playing' : 'idle'} barCount={20} className="h-6 flex-1" />
          </button>
          {version.duration_seconds && (
            <span className="font-mono text-[10px] text-cement">
              {Math.floor(version.duration_seconds / 60)}:
              {String(Math.round(version.duration_seconds % 60)).padStart(2, '0')}
            </span>
          )}
        </>
      )}

      {(version.status === 'pending' || version.status === 'processing') && (
        <div className="flex items-center gap-3 border border-stroke px-3 py-3">
          <Waveform state="processing" barCount={20} className="h-6 flex-1" />
          <button
            onClick={() => onRefreshStatus(version.id)}
            className="text-cement hover:text-acid transition-colors shrink-0"
            aria-label="Aggiorna stato"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      )}

      {version.status === 'failed' && (
        <div className="flex items-center gap-2 border border-signal/40 bg-signal/5 px-3 py-2">
          <AlertCircle size={14} className="text-signal shrink-0" />
          <span className="font-mono text-[11px] text-signal">
            {version.error_message || 'Generazione fallita'}
          </span>
        </div>
      )}

      <p className="font-body text-xs text-cement line-clamp-2" title={version.prompt_used}>
        {version.prompt_used}
      </p>
    </div>
  );
}

export function AudioCompare({ versions, onToggleFavorite, onRefreshStatus }: AudioCompareProps) {
  if (versions.length === 0) {
    return (
      <div className="border border-dashed border-stroke py-10 text-center font-mono text-xs text-cement">
        Nessuna generazione audio ancora. Lancia la prima take qui sopra.
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {versions.map((v) => (
        <AudioCard
          key={v.id}
          version={v}
          onToggleFavorite={onToggleFavorite}
          onRefreshStatus={onRefreshStatus}
        />
      ))}
    </div>
  );
}
