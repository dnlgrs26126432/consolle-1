'use client';

import { ButtonHTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';

interface PadProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'ghost' | 'danger';
  icon?: ReactNode;
}

// Bottone stile pad hardware: bordo netto, nessun radius morbido,
// feedback "pressed" via scale + cambio colore, non ombra soft.
export function Pad({ children, variant = 'primary', icon, className, ...props }: PadProps) {
  return (
    <button
      className={clsx(
        'group relative flex items-center justify-center gap-2 px-5 py-3 font-mono text-sm font-medium tracking-wide uppercase',
        'border transition-all duration-100 active:scale-[0.97]',
        'disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100',
        variant === 'primary' &&
          'bg-acid text-base border-acid hover:bg-acid-dim hover:border-acid-dim',
        variant === 'ghost' &&
          'bg-transparent text-chalk border-stroke hover:border-acid hover:text-acid',
        variant === 'danger' &&
          'bg-transparent text-signal border-signal/50 hover:bg-signal/10',
        className
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
