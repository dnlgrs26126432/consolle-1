'use client';

import { X } from 'lucide-react';
import { Pad } from '@/components/ui/Pad';

export interface PreviewItem {
  label: string;
  value: string;
}

interface GenerationPreviewModalProps {
  open: boolean;
  items: PreviewItem[];
  lyricsPreview?: string | null;
  loading?: boolean;
  onConfirm: () => void;
  onEdit: () => void;
}

// Modale di riepilogo completo prima di generare: mostra tutti i parametri
// (titolo, genere, mood, BPM, tonalita', struttura, testi, energia, dark, ...)
// con Conferma e Genera / Modifica.
export function GenerationPreviewModal({
  open,
  items,
  lyricsPreview,
  loading,
  onConfirm,
  onEdit,
}: GenerationPreviewModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto border border-stroke bg-panel">
        <div className="absolute top-1.5 left-1.5 w-1 h-1 rounded-full bg-stroke" />
        <div className="absolute top-1.5 right-1.5 w-1 h-1 rounded-full bg-stroke" />

        <div className="flex items-center justify-between border-b border-stroke px-5 py-4">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-cement mb-0.5">
              Prima di generare
            </div>
            <div className="font-display text-lg tracking-wide text-chalk">Riepilogo generazione</div>
          </div>
          <button onClick={onEdit} className="text-cement hover:text-acid transition-colors" aria-label="Chiudi">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="border border-stroke divide-y divide-stroke">
            {items.map((item) => (
              <div key={item.label} className="flex justify-between gap-4 px-3 py-2.5">
                <span className="font-mono text-[11px] uppercase tracking-wide text-cement shrink-0">
                  {item.label}
                </span>
                <span className="font-body text-sm text-chalk text-right break-words">
                  {item.value || '—'}
                </span>
              </div>
            ))}
          </div>

          {lyricsPreview && (
            <div>
              <div className="font-mono text-[11px] uppercase tracking-wide text-cement mb-1.5">Testo</div>
              <div className="border border-stroke bg-panel-raised p-3 max-h-40 overflow-y-auto">
                <pre className="font-body text-xs text-chalk whitespace-pre-wrap leading-relaxed">
                  {lyricsPreview}
                </pre>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 border-t border-stroke px-5 py-4">
          <Pad variant="primary" onClick={onConfirm} disabled={loading} className="flex-1">
            {loading ? 'Generazione...' : 'Conferma e Genera'}
          </Pad>
          <Pad variant="ghost" onClick={onEdit} disabled={loading}>
            Modifica
          </Pad>
        </div>
      </div>
    </div>
  );
}
