'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { rpc, searchRead } from '@/lib/odoo';
import { localDt } from '@/lib/util';
import { Badge, Spinner, useToast } from '@/components/ui';

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const NEXT: Record<string, [string, string]> = { confirmed: ['action_check_in', 'Check-in'], checked_in: ['action_start_service', 'Start service'], in_service: ['action_complete', 'Complete'] };

export default function CheckIn() {
  const { push } = useToast();
  const [rows, setRows] = useState<any[] | null>(null);
  const [busy, setBusy] = useState(0);
  const load = useCallback(() => {
    searchRead('salon.booking', [['booking_date', '=', ymd(new Date())], ['state', 'in', ['confirmed', 'checked_in', 'in_service']]],
      ['name', 'partner_id', 'start_datetime', 'state'], { order: 'start_datetime' }).then(setRows).catch((e) => { push(e.message, 'err'); setRows([]); });
  }, [push]);
  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);
  async function go(id: number, m: string) {
    setBusy(id);
    try { await rpc('salon.booking', m, [[id]]); load(); } catch (e: any) { push(e.message, 'err'); } finally { setBusy(0); }
  }
  if (!rows) return <Spinner />;
  return (
    <div>
      <div className="page-head"><h1>Check-in board</h1><span className="muted">Today's confirmed and in-progress bookings</span></div>
      <div className="cards2">
        {rows.map((b) => (
          <section className="card" key={b.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '.5rem' }}><b>{b.partner_id?.[1]}</b><Badge state={b.state} label={b.state.replace('_', ' ')} /></div>
            <div className="muted" style={{ margin: '.2rem 0 .7rem' }}>{b.name} · {localDt(b.start_datetime)}</div>
            <span className="actions">
              {NEXT[b.state] && <button className="btn primary" disabled={busy === b.id} onClick={() => go(b.id, NEXT[b.state][0])}>{NEXT[b.state][1]}</button>}
              <Link className="btn ghost" href={`/bookings/${b.id}`}>Open</Link>
            </span>
          </section>
        ))}
      </div>
      {!rows.length && <p className="muted">Nothing to check in right now.</p>}
    </div>
  );
}
