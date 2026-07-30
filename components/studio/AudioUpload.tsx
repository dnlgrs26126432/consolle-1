'use client';

import { useEffect, useRef, useState } from 'react';
import { Upload, Trash2, Music } from 'lucide-react';
import { Waveform } from '@/components/ui/Waveform';

interface AudioUploadProps {
  onFileChange?: (file: File | null) => void;
  className?: string;
}

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '--:--';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Upload di una traccia audio di riferimento (MP3/WAV) dal dispositivo,
// con player integrato, nome file + durata e pulsante per eliminarla.
export function AudioUpload({ onFileChange, className }: AudioUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [url]);

  function handleFiles(fileList: FileList | null) {
    const picked = fileList?.[0];
    if (!picked) return;

    const isValid =
      /\.(mp3|wav)$/i.test(picked.name) || ['audio/mpeg', 'audio/wav', 'audio/x-wav'].includes(picked.type);

    if (!isValid) {
      setError('Formato non supportato: carica un file MP3 o WAV.');
      return;
    }

    setError(null);
    if (url) URL.revokeObjectURL(url);
    const objectUrl = URL.createObjectURL(picked);
    setFile(picked);
    setUrl(objectUrl);
    setDuration(null);
    onFileChange?.(picked);
  }

  function removeFile() {
    if (url) URL.revokeObjectURL(url);
    setFile(null);
    setUrl(null);
    setDuration(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
    onFileChange?.(null);
  }

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="file"
        accept=".mp3,.wav,audio/mpeg,audio/wav,audio/x-wav"
        onChange={(e) => handleFiles(e.target.files)}
        className="hidden"
      />

      {!file ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full flex flex-col items-center justify-center gap-2 border border-dashed border-stroke py-8 text-cement hover:border-acid hover:text-acid transition-colors"
        >
          <Upload size={20} />
          <span className="font-mono text-xs uppercase tracking-wide">Carica MP3 o WAV</span>
        </button>
      ) : (
        <div className="border border-stroke bg-panel-raised p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Music size={15} className="text-acid shrink-0" />
              <span className="font-mono text-xs text-chalk truncate" title={file.name}>
                {file.name}
              </span>
            </div>
            <button
              type="button"
              onClick={removeFile}
              className="text-cement hover:text-signal transition-colors shrink-0"
              aria-label="Elimina file audio"
            >
              <Trash2 size={15} />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <Waveform state="idle" barCount={18} className="h-6 flex-1" />
            <span className="font-mono text-[10px] text-cement shrink-0">
              {duration !== null ? formatDuration(duration) : '--:--'} · {formatSize(file.size)}
            </span>
          </div>

          {url && (
            <audio
              controls
              src={url}
              className="w-full"
              onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
            />
          )}
        </div>
      )}

      {error && <p className="font-mono text-[11px] text-signal mt-2">{error}</p>}
    </div>
  );
}
