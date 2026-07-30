'use client';

// Contatore generazioni della sessione corrente (lyrics + audio).
// Usa sessionStorage: si azzera quando si chiude la scheda/il browser,
// resta condiviso tra le pagine finche' la sessione e' aperta.

const STORAGE_KEY = 'consolle_generation_count';
const EVENT_NAME = 'consolle:generation-count-changed';

export function getGenerationCount(): number {
  if (typeof window === 'undefined') return 0;
  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  const parsed = raw ? parseInt(raw, 10) : 0;
  return Number.isFinite(parsed) ? parsed : 0;
}

export function incrementGenerationCount(): number {
  if (typeof window === 'undefined') return 0;
  const next = getGenerationCount() + 1;
  window.sessionStorage.setItem(STORAGE_KEY, String(next));
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: next }));
  return next;
}

export function subscribeGenerationCount(callback: (count: number) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = (e: Event) => {
    const custom = e as CustomEvent<number>;
    callback(typeof custom.detail === 'number' ? custom.detail : getGenerationCount());
  };
  const storageHandler = () => callback(getGenerationCount());
  window.addEventListener(EVENT_NAME, handler);
  window.addEventListener('storage', storageHandler);
  return () => {
    window.removeEventListener(EVENT_NAME, handler);
    window.removeEventListener('storage', storageHandler);
  };
}
