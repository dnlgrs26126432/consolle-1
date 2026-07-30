'use client';

import clsx from 'clsx';
import { DURATION_OPTIONS, DURATION_LABELS, type DurationOption } from '@/lib/types';

interface DurationPickerProps {
  value: DurationOption;
  onChange: (value: DurationOption) => void;
  className?: string;
}

// Slider/selettore durata: 30s / 1min / 2min / 3min.
export function DurationPicker({ value, onChange, className }: DurationPickerProps) {
  return (
    <div className={className}>
      <label className="font-mono text-[11px] uppercase tracking-wide text-cement block mb-1.5">
        Durata
      </label>
      <div className="inline-flex border border-stroke overflow-hidden">
        {DURATION_OPTIONS.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={clsx(
              'px-3 py-1.5 font-mono text-[11px] uppercase tracking-wide transition-colors border-r border-stroke last:border-r-0',
              value === opt ? 'bg-acid text-base' : 'bg-transparent text-cement hover:text-acid'
            )}
          >
            {DURATION_LABELS[opt]}
          </button>
        ))}
      </div>
    </div>
  );
}
