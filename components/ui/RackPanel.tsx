import { ReactNode } from 'react';
import clsx from 'clsx';

interface RackPanelProps {
  children: ReactNode;
  title?: string;
  eyebrow?: string;
  action?: ReactNode;
  className?: string;
}

// Pannello stile modulo rack da studio hardware: bordo netto, header con
// vite decorativa agli angoli (dettaglio da hardware reale), zero border-radius.
export function RackPanel({ children, title, eyebrow, action, className }: RackPanelProps) {
  return (
    <div className={clsx('relative border border-stroke bg-panel', className)}>
      {/* Viti decorative agli angoli — dettaglio hardware */}
      <div className="absolute top-1.5 left-1.5 w-1 h-1 rounded-full bg-stroke" />
      <div className="absolute top-1.5 right-1.5 w-1 h-1 rounded-full bg-stroke" />

      {(title || eyebrow) && (
        <div className="flex items-center justify-between border-b border-stroke px-4 py-3">
          <div>
            {eyebrow && (
              <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-cement mb-0.5">
                {eyebrow}
              </div>
            )}
            {title && <div className="font-display text-lg tracking-wide text-chalk">{title}</div>}
          </div>
          {action}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}
