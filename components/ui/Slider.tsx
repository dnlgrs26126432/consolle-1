'use client';

interface SliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  valueLabel?: string;
  className?: string;
}

// Slider stile fader da mixer: track netto, thumb acid, valore in mono.
export function Slider({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  label,
  valueLabel,
  className,
}: SliderProps) {
  return (
    <div className={className}>
      {label && (
        <div className="flex items-center justify-between mb-1.5">
          <label className="font-mono text-[11px] uppercase tracking-wide text-cement">{label}</label>
          <span className="font-mono text-[11px] text-acid">{valueLabel ?? value}</span>
        </div>
      )}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 appearance-none bg-stroke accent-acid cursor-pointer"
      />
    </div>
  );
}
