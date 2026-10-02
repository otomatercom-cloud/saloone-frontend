'use client';
import { CONFIG } from './config';

let cache: Promise<Set<string>> | null = null;
const KEY = (uid: number) => `otm.access.${uid}`;
const uidNow = () => {
  try { const m = document.cookie.split('; ').find((c) => c.startsWith('otm_user=')); return m ? JSON.parse(decodeURIComponent(m.split('=')[1])).uid : 0; } catch { return 0; }
};

/** Last known access list for this user, so the menu renders instantly and correctly on refresh. */
export function cachedAccess(): Set<string> | null {
  try { const v = localStorage.getItem(KEY(uidNow())); return v ? new Set(JSON.parse(v)) : null; } catch { return null; }
}

/** Models the signed-in user may read (Odoo's own access rights decide). Always re-checked once per page load. */
export function loadAccess(): Promise<Set<string>> {
  if (!cache) {
    cache = fetch('/api/access', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ models: CONFIG.map((c) => c.model).concat(['salon.booking.line']) }),
    }).then(async (r) => {
      if (r.status === 401) { location.href = '/login'; return new Set<string>(); }
      const j = await r.json();
      const set = new Set<string>(j.models || []);
      try { localStorage.setItem(KEY(uidNow()), JSON.stringify([...set])); } catch { /* ignore */ }
      return set;
    }).catch(() => { cache = null; return cachedAccess() || new Set<string>(); });
  }
  return cache;
}
export const resetAccess = () => {
  cache = null;
  try { localStorage.removeItem(KEY(uidNow())); } catch { /* ignore */ }
};
