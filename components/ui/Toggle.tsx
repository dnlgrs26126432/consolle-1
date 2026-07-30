'use client';

import clsx from 'clsx';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  labelOn?: string;
  labelOff?: string;
  disabled?: boolean;
  className?: string;
}

// Switch stile hardware da consolle: due segmenti netti (ON/OFF),
// nessun radius morbido, coerente con Pad/RackPanel.
export function Toggle({
  checked,
  onChange,
  labelOn = 'ON',
  labelOff = 'OFF',
  disabled,
  className,
}: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={clsx(
        'inline-flex items-center border border-stroke overflow-hidden font-mono text-[11px] uppercase tracking-wide',
        'disabled:opacity-40 disabled:cursor-not-allowed transition-colors',
        className
      )}
    >
      <span
        className={clsx(
          'px-3 py-1.5 transition-colors',
          !checked ? 'bg-panel-raised text-chalk' : 'bg-transparent text-cement'
        )}
      >
        {labelOff}
      </span>
      <span
        className={clsx(
          'px-3 py-1.5 transition-colors',
          checked ? 'bg-acid text-base' : 'bg-transparent text-cement'
        )}
      >
        {labelOn}
      </span>
    </button>
  );
}
