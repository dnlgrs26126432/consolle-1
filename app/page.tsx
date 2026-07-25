'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Disc3, FolderOpen } from 'lucide-react';
import { RackPanel } from '@/components/ui/RackPanel';
import { Pad } from '@/components/ui/Pad';
import { Waveform } from '@/components/ui/Waveform';
import type { Project } from '@/lib/types';

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewProject, setShowNewProject] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    setLoading(true);
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      setProjects(data.projects || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function createProject() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, description: newDesc }),
      });
      const data = await res.json();
      if (data.project) {
        setProjects((prev) => [data.project, ...prev]);
        setNewName('');
        setNewDesc('');
        setShowNewProject(false);
      }
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className="min-h-screen bg-base">
      {/* Header */}
      <header className="border-b border-stroke px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Waveform state="idle" barCount={16} className="h-8" />
          <div>
            <h1 className="font-display text-2xl tracking-wide text-chalk uppercase">
              Promo Music <span className="text-acid">Station</span>
            </h1>
            <p className="font-mono text-xs text-cement mt-0.5">
              testi · concept · audio generato — tutto in un posto
            </p>
          </div>
        </div>
        <Pad variant="primary" icon={<Plus size={16} />} onClick={() => setShowNewProject(true)}>
          Nuovo Progetto
        </Pad>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-10">
        {showNewProject && (
          <RackPanel eyebrow="Setup" title="Nuovo progetto" className="mb-8">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="font-mono text-[11px] uppercase tracking-wide text-cement block mb-1.5">
                  Nome progetto
                </label>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="es. Cemento Armato EP"
                  className="w-full bg-base border border-stroke px-3 py-2 text-chalk font-body text-sm focus:border-acid outline-none"
                />
              </div>
              <div>
                <label className="font-mono text-[11px] uppercase tracking-wide text-cement block mb-1.5">
                  Descrizione (opzionale)
                </label>
                <input
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="es. Collab drill con Shiva e Sfera"
                  className="w-full bg-base border border-stroke px-3 py-2 text-chalk font-body text-sm focus:border-acid outline-none"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <Pad variant="primary" onClick={createProject} disabled={creating || !newName.trim()}>
                {creating ? 'Creazione...' : 'Crea progetto'}
              </Pad>
              <Pad variant="ghost" onClick={() => setShowNewProject(false)}>
                Annulla
              </Pad>
            </div>
          </RackPanel>
        )}

        {loading ? (
          <div className="font-mono text-cement text-sm py-20 text-center">Caricamento progetti...</div>
        ) : projects.length === 0 ? (
          <div className="border border-dashed border-stroke py-20 text-center">
            <FolderOpen className="mx-auto mb-3 text-cement" size={32} />
            <p className="font-display text-lg text-chalk mb-1">Nessun progetto ancora</p>
            <p className="font-mono text-xs text-cement">
              Crea il primo progetto per iniziare a scrivere e generare
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Link key={project.id} href={`/projects/${project.id}`}>
                <RackPanel className="h-full hover:border-acid transition-colors cursor-pointer group">
                  <div className="flex items-start justify-between mb-3">
                    <Disc3 className="text-cement group-hover:text-acid transition-colors" size={20} />
                    <span className="font-mono text-[10px] text-cement">
                      {project.songs?.length || 0} tracce
                    </span>
                  </div>
                  <h3 className="font-display text-xl text-chalk group-hover:text-acid transition-colors mb-1">
                    {project.name}
                  </h3>
                  {project.description && (
                    <p className="font-body text-sm text-cement line-clamp-2">{project.description}</p>
                  )}
                </RackPanel>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
