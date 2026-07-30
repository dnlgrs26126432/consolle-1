'use client';

// Storico progetti: ultimi 10 progetti aperti, salvati in localStorage
// per poterli riaprire rapidamente da dashboard senza dover
// scorrere l'elenco completo caricato da Supabase.

export interface RecentProject {
  id: string;
  name: string;
  opened_at: string;
}

const STORAGE_KEY = 'consolle_recent_projects';
const MAX_ITEMS = 10;

export function getRecentProjects(): RecentProject[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export function pushRecentProject(id: string, name: string): RecentProject[] {
  if (typeof window === 'undefined') return [];
  const existing = getRecentProjects().filter((p) => p.id !== id);
  const next = [{ id, name, opened_at: new Date().toISOString() }, ...existing].slice(0, MAX_ITEMS);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function removeRecentProject(id: string): RecentProject[] {
  if (typeof window === 'undefined') return [];
  const next = getRecentProjects().filter((p) => p.id !== id);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}
