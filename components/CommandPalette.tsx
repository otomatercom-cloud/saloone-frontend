'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { CONFIG } from '@/lib/config';
import { searchRead } from '@/lib/odoo';
import { loadAccess } from '@/lib/access';

type Hit = { key: string; group: string; label: string; href: string };
const SEARCHABLE = ['bookings', 'customers', 'services', 'staff', 'expenses', 'payouts'];

export default function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [term, setTerm] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);
  const [busy, setBusy] = useState(false);
  const [idx, setIdx] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const [allowed, setAllowed] = useState<Set<string> | null>(null);
  useEffect(() => { loadAccess().then(setAllowed); }, []);

  const pages: Hit[] = useMemo(() => [
    { key: 'p-dash', group: 'Go to', label: 'Dashboard', href: '/' },
    { key: 'p-new', group: 'Go to', label: 'New booking', href: '/bookings/new' },
    { key: 'p-ci', group: 'Go to', label: 'Check-in board', href: '/checkin' },
    { key: 'p-cal', group: 'Go to', label: 'Staff calendar', href: '/calendar' },
    ...CONFIG.filter((c) => !allowed || allowed.has(c.model)).map((c) => ({ key: 'p-' + c.slug, group: 'Go to', label: c.title, href: `/${c.slug}` })),
  ], [allowed]);

  useEffect(() => { if (open) { setTerm(''); setHits([]); setIdx(0); setTimeout(() => input.current?.focus(), 30); } }, [open]);

  useEffect(() => {
    const t = term.trim();
    if (!open) return;
    if (t.length < 2) { setHits([]); return; }
    setBusy(true);
    let live = true;
    const h = setTimeout(async () => {
      const found: Hit[] = [];
      await Promise.all(SEARCHABLE.map(async (slug) => {
        const cfg = CONFIG.find((c) => c.slug === slug);
        if (!cfg || (allowed && !allowed.has(cfg.model))) return;
        try {
          const fields = cfg.search;
          const domain: any[] = [...(cfg.domain || [])];
          fields.forEach((_, i) => i < fields.length - 1 && domain.push('|'));
          fields.forEach((f) => domain.push([f, 'ilike', t]));
          const rows = await searchRead(cfg.model, domain, ['display_name'], { limit: 4, context: { active_test: false } });
          rows.forEach((r) => found.push({ key: `${slug}-${r.id}`, group: cfg.title, label: r.display_name, href: `/${slug}/${r.id}` }));
        } catch { /* no access to this model: skip */ }
      }));
      if (live) { setHits(found); setIdx(0); setBusy(false); }
    }, 250);
    return () => { live = false; clearTimeout(h); };
  }, [term, open]);

  const list = term.trim().length < 2
    ? pages.slice(0, 8)
    : [...hits, ...pages.filter((p) => p.label.toLowerCase().includes(term.trim().toLowerCase())).slice(0, 4)];

  function go(h?: Hit) { if (!h) return; onClose(); router.push(h.href); }
  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => Math.min(list.length - 1, i + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => Math.max(0, i - 1)); }
    else if (e.key === 'Enter') go(list[idx]);
    else if (e.key === 'Escape') onClose();
  }
  if (!open) return null;
  let last = '';
  return (
    <div className="cmd-back" onMouseDown={onClose}>
      <div className="cmd" onMouseDown={(e) => e.stopPropagation()}>
        <div className="cmd-in"><Search size={18} />
          <input ref={input} value={term} onChange={(e) => setTerm(e.target.value)} onKeyDown={onKey} placeholder="Search bookings, customers, staff… or jump to a page" />
          <kbd>Esc</kbd>
        </div>
        <div className="cmd-list">
          {busy && <div className="cmd-hint">Searching…</div>}
          {!busy && term.trim().length >= 2 && !list.length && <div className="cmd-hint">No results</div>}
          {list.map((h, i) => {
            const head = h.group !== last ? (last = h.group, <div className="cmd-grp">{h.group}</div>) : null;
            return <div key={h.key}>{head}
              <button className={`cmd-item ${i === idx ? 'on' : ''}`} onMouseEnter={() => setIdx(i)} onClick={() => go(h)}>{h.label}</button></div>;
          })}
        </div>
        <div className="cmd-foot"><span>↑↓ navigate</span><span>↵ open</span><span>Esc close</span></div>
      </div>
    </div>
  );
}
