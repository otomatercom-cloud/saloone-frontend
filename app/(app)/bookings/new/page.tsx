'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { rpc } from '@/lib/odoo';
import { money } from '@/lib/util';
import { Spinner, useToast } from '@/components/ui';

type Line = { product_id: number; employee_id: number | ''; quantity: number; discount_type: 'percent' | 'fixed'; discount_value: number };
const pad = (n: number) => String(n).padStart(2, '0');
function nextSlot() { const d = new Date(); d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; }
// Odoo stores naive UTC datetimes; the form works in the browser's local time
const toOdoo = (local: string) => new Date(local).toISOString().slice(0, 19).replace('T', ' ');
const SOURCES = [['walkin', 'Walk-in'], ['phone', 'Phone'], ['whatsapp', 'WhatsApp'], ['online', 'Online'], ['referral', 'Referral']];

export default function NewBooking() {
  const router = useRouter();
  const sp = useSearchParams();
  const { push } = useToast();
  const [meta, setMeta] = useState<any>(null);
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<[number, string][]>([]);
  const [partner, setPartner] = useState<[number, string] | null>(null);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [start, setStart] = useState(nextSlot());
  const [source, setSource] = useState('walkin');
  const [lines, setLines] = useState<Line[]>([]);
  const [busy, setBusy] = useState(false);
  const [limit, setLimit] = useState<number | null>(null);

  useEffect(() => {
    rpc('salon.booking', 'get_booking_meta', []).then(setMeta).catch((e) => push(e.message, 'err'));
    rpc<any>('salon.dashboard', 'get_app_context', []).then((c) => setLimit(c.discount_limit)).catch(() => {});
    const pid = Number(sp.get('partner_id'));
    if (pid) rpc<any[]>('res.partner', 'read', [[pid], ['display_name']]).then((r) => r[0] && setPartner([r[0].id, r[0].display_name])).catch(() => {});
  }, [push, sp]);
  useEffect(() => {
    if (q.trim().length < 2) { setHits([]); return; }
    const t = setTimeout(() => rpc<[number, string][]>('res.partner', 'name_search', [], { name: q, limit: 8 }).then(setHits).catch(() => setHits([])), 250);
    return () => clearTimeout(t);
  }, [q]);

  if (!meta) return <Spinner />;
  const svc = (id: number) => meta.services.find((s: any) => s.id === id);
  const total = lines.reduce((t, l) => { const g = (svc(l.product_id)?.lst_price ?? 0) * l.quantity; const d = l.discount_type === 'fixed' ? l.discount_value : (g * l.discount_value) / 100; return t + g - d; }, 0);
  const upd = (i: number, p: Partial<Line>) => setLines(lines.map((l, k) => (k === i ? { ...l, ...p } : l)));

  async function save() {
    setBusy(true);
    try {
      let pid = partner?.[0];
      if (!pid) {
        if (!newName.trim()) throw new Error('Choose a customer or enter a new customer name');
        pid = await rpc<number>('res.partner', 'create', [{ name: newName.trim(), phone: newPhone || false }]);
      }
      if (!lines.length) throw new Error('Add at least one service');
      const line_ids = lines.map((l) => [0, 0, { product_id: l.product_id, employee_id: l.employee_id || false, quantity: l.quantity, discount_type: l.discount_type, discount_value: l.discount_value }]);
      const id = await rpc<number>('salon.booking', 'create', [{ partner_id: pid, start_datetime: toOdoo(start), source, line_ids }]);
      push('Booking created');
      router.replace(`/bookings/${Array.isArray(id) ? (id as any)[0] : id}`);
    } catch (e: any) { push(e.message, 'err'); setBusy(false); }
  }

  return (
    <div>
      <div className="page-head"><h1>New booking</h1></div>
      <fieldset className="section"><legend>Customer</legend>
        {partner ? (
          <p><b>{partner[1]}</b> <button className="btn ghost sm" onClick={() => setPartner(null)}>Change</button></p>
        ) : (
          <div className="grid">
            <label className="field"><span>Find existing customer</span>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type 2+ letters of name / phone…" />
              {hits.length > 0 && <div className="m2o-list" style={{ position: 'static', marginTop: 4 }}>{hits.map((h) => <div key={h[0]} className="m2o-opt" onClick={() => { setPartner(h); setHits([]); }}>{h[1]}</div>)}</div>}
            </label>
            <label className="field"><span>…or new customer name</span><input value={newName} onChange={(e) => setNewName(e.target.value)} /></label>
            <label className="field"><span>Phone</span><input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} /></label>
          </div>
        )}
      </fieldset>
      <fieldset className="section"><legend>When</legend>
        <div className="grid">
          <label className="field"><span>Start</span><input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} /></label>
          <label className="field"><span>Source</span><select value={source} onChange={(e) => setSource(e.target.value)}>{SOURCES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
        </div>
      </fieldset>
      <fieldset className="section"><legend>Services</legend>
        <div className="table-wrap"><table className="tbl">
          <thead><tr><th>Service</th><th>Staff</th><th>Qty</th><th>Discount</th><th className="right">Price</th><th /></tr></thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i}>
                <td>{svc(l.product_id)?.display_name}</td>
                <td><select value={l.employee_id} onChange={(e) => upd(i, { employee_id: e.target.value ? Number(e.target.value) : '' })}>
                  <option value="">— assign —</option>{meta.staff.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></td>
                <td><input type="number" min={1} style={{ width: 64 }} value={l.quantity} onChange={(e) => upd(i, { quantity: Number(e.target.value) || 1 })} /></td>
                <td><select value={l.discount_type} onChange={(e) => upd(i, { discount_type: e.target.value as any })}><option value="percent">%</option><option value="fixed">Fixed</option></select>{' '}
                  <input type="number" min={0} style={{ width: 80 }} value={l.discount_value} onChange={(e) => upd(i, { discount_value: Number(e.target.value) || 0 })} /></td>
                <td className="right">{money((svc(l.product_id)?.lst_price ?? 0) * l.quantity)}</td>
                <td><button className="btn danger sm" onClick={() => setLines(lines.filter((_, k) => k !== i))}>✕</button></td>
              </tr>
            ))}
            {!lines.length && <tr><td colSpan={6} className="muted center">No services yet</td></tr>}
          </tbody>
        </table></div>
        <div className="filters" style={{ marginTop: '.8rem' }}>
          <select value="" onChange={(e) => e.target.value && setLines([...lines, { product_id: Number(e.target.value), employee_id: '', quantity: 1, discount_type: 'percent', discount_value: 0 }])}>
            <option value="">+ Add service…</option>{meta.services.map((s: any) => <option key={s.id} value={s.id}>{s.display_name} — {money(s.lst_price)}</option>)}
          </select>
          <b style={{ marginLeft: 'auto' }}>Estimated total (before tax): {money(total)}</b>
        </div>
        {limit !== null && <p className="muted">Your discount limit is {limit}%.</p>}
      </fieldset>
      <div className="savebar"><button className="btn primary" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save booking'}</button></div>
    </div>
  );
}
