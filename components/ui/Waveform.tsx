'use client';

import { useMemo } from 'react';
import clsx from 'clsx';

interface WaveformProps {
  state?: 'idle' | 'processing' | 'playing';
  barCount?: number;
  className?: string;
}

// Waveform da VU-meter: barre con altezze pseudo-random stabili (seed su index),
// animate solo quando lo stato lo richiede. Elemento firma della station.
export function Waveform({ state = 'idle', barCount = 24, className }: WaveformProps) {
  const heights = useMemo(
    () =>
      Array.from({ length: barCount }, (_, i) => {
        // pseudo-random deterministico per barra, per non ricalcolare ad ogni render
        const seed = Math.sin(i * 12.9898) * 43758.5453;
        return 0.25 + (seed - Math.floor(seed)) * 0.75;
      }),
    [barCount]
  );

  return (
    <div className={clsx('flex items-end gap-[3px] h-10', className)} aria-hidden="true">
      {heights.map((h, i) => (
        <div
          key={i}
          className={clsx(
            'w-[3px] rounded-none origin-bottom transition-colors',
            state === 'idle' && 'bg-stroke',
            state === 'processing' && 'bg-acid/70 animate-pulse_bar',
            state === 'playing' && 'bg-acid'
          )}
          style={{
            height: '100%',
            transform: state === 'idle' ? `scaleY(${h * 0.4})` : `scaleY(${h})`,
            animationDelay: state === 'processing' ? `${i * 0.045}s` : undefined,
          }}
        />
      ))}
    </div>
  );
}
