'use client';

import { useState } from 'react';
import { Plus, X, GripVertical } from 'lucide-react';
import clsx from 'clsx';
import { nanoid } from 'nanoid';
import type { StructureSection } from '@/lib/types';

interface StructureEditorProps {
  structure: StructureSection[];
  onChange: (structure: StructureSection[]) => void;
}

const SECTION_TYPES: { value: StructureSection['type']; label: string; color: string }[] = [
  { value: 'intro', label: 'Intro', color: 'bg-cement' },
  { value: 'verse', label: 'Verse', color: 'bg-chalk' },
  { value: 'hook', label: 'Hook', color: 'bg-acid' },
  { value: 'bridge', label: 'Bridge', color: 'bg-gold' },
  { value: 'break', label: 'Break', color: 'bg-signal' },
  { value: 'ad-lib', label: 'Ad-lib', color: 'bg-cement' },
  { value: 'outro', label: 'Outro', color: 'bg-cement' },
];

export function StructureEditor({ structure, onChange }: StructureEditorProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  function addSection(type: StructureSection['type']) {
    const defaultBars = type === 'hook' ? 8 : type === 'verse' ? 16 : 4;
    onChange([...structure, { id: nanoid(6), type, bars: defaultBars }]);
  }

  function removeSection(id: string) {
    onChange(structure.filter((s) => s.id !== id));
  }

  function updateBars(id: string, bars: number) {
    onChange(structure.map((s) => (s.id === id ? { ...s, bars: Math.max(1, bars) } : s)));
  }

  function handleDragStart(index: number) {
    setDragIndex(index);
  }

  function handleDragOver(e: React.DragEvent, overIndex: number) {
    e.preventDefault();
    if (dragIndex === null || dragIndex === overIndex) return;
    const reordered = [...structure];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(overIndex, 0, moved);
    setDragIndex(overIndex);
    onChange(reordered);
  }

  function handleDragEnd() {
    setDragIndex(null);
  }

  const totalBars = structure.reduce((sum, s) => sum + s.bars, 0);

  return (
    <div>
      <div className="space-y-1.5 mb-4 min-h-[60px]">
        {structure.length === 0 && (
          <div className="border border-dashed border-stroke py-6 text-center font-mono text-xs text-cement">
            Aggiungi sezioni per costruire la struttura
          </div>
        )}
        {structure.map((section, index) => {
          const typeInfo = SECTION_TYPES.find((t) => t.value === section.type);
          return (
            <div
              key={section.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={clsx(
                'flex items-center gap-3 bg-panel-raised border border-stroke px-3 py-2 cursor-grab active:cursor-grabbing transition-opacity',
                dragIndex === index && 'opacity-40'
              )}
            >
              <GripVertical size={14} className="text-cement shrink-0" />
              <div className={clsx('w-1.5 h-6 shrink-0', typeInfo?.color)} />
              <span className="font-mono text-sm text-chalk uppercase tracking-wide flex-1">
                {typeInfo?.label || section.type}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => updateBars(section.id, section.bars - 1)}
                  className="w-6 h-6 flex items-center justify-center border border-stroke text-cement hover:border-acid hover:text-acid font-mono text-xs"
                >
                  −
                </button>
                <span className="font-mono text-xs text-chalk w-14 text-center">{section.bars} bars</span>
                <button
                  onClick={() => updateBars(section.id, section.bars + 1)}
                  className="w-6 h-6 flex items-center justify-center border border-stroke text-cement hover:border-acid hover:text-acid font-mono text-xs"
                >
                  +
                </button>
              </div>
              <button
                onClick={() => removeSection(section.id)}
                className="text-cement hover:text-signal transition-colors shrink-0"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>

      {structure.length > 0 && (
        <div className="font-mono text-[11px] text-cement mb-4">
          Totale: <span className="text-acid">{totalBars} battute</span> · {structure.length} sezioni
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {SECTION_TYPES.map((type) => (
          <button
            key={type.value}
            onClick={() => addSection(type.value)}
            className="flex items-center gap-1.5 border border-stroke px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-wide text-cement hover:border-acid hover:text-acid transition-colors"
          >
            <Plus size={11} />
            {type.label}
          </button>
        ))}
      </div>
    </div>
  );
}
