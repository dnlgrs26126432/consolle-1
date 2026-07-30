'use client';

import clsx from 'clsx';
import { GENRE_LABELS, type Genre } from '@/lib/types';

interface GenreChipsProps {
  value: Genre;
  onChange: (genre: Genre) => void;
  customValue: string;
  onCustomChange: (value: string) => void;
}

// Chip dei generi pre-compilati + campo libero "genere personalizzato" sotto.
// Se il campo libero e' compilato, si aggiunge al genere nel prompt di generazione.
export function GenreChips({ value, onChange, customValue, onCustomChange }: GenreChipsProps) {
  return (
    <div>
      <label className="font-mono text-[11px] uppercase tracking-wide text-cement block mb-1.5">
        Genere
      </label>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {Object.entries(GENRE_LABELS).map(([genreValue, label]) => (
          <button
            key={genreValue}
            type="button"
            onClick={() => onChange(genreValue as Genre)}
            className={clsx(
              'border px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-wide transition-colors',
              value === genreValue
                ? 'bg-acid text-base border-acid'
                : 'bg-transparent text-cement border-stroke hover:border-acid hover:text-acid'
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <label className="font-mono text-[11px] uppercase tracking-wide text-cement block mb-1.5">
        Genere personalizzato (opzionale)
      </label>
      <input
        value={customValue}
        onChange={(e) => onCustomChange(e.target.value)}
        placeholder="es. drill uk influenzata da afrobeat"
        className="w-full bg-base border border-stroke px-3 py-2 text-chalk font-body text-sm focus:border-acid outline-none"
      />
    </div>
  );
}
