'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { actionsFor, Act } from '@/lib/actions';
import { BY_MODEL } from '@/lib/config';
import { rpc } from '@/lib/odoo';
import { Modal, useToast } from './ui';

/** Runs one workflow action. Role checks, prerequisites and state rules are enforced by Odoo; its message is shown as is. */
export async function runAction(model: string, id: number, act: Act, reason: string | undefined, router: ReturnType<typeof useRouter>, push: (m: string, k?: 'ok' | 'err') => void) {
  const WIZ: Record<string, string> = { action_cancel_wizard: 'cancel', action_no_show_wizard: 'no_show' };
  if (WIZ[act.method]) {
    // cancel / no-show go through the reason wizard (it also routes "confirmed" cancellations of non-managers to approval)
    const wid = await rpc<number>('salon.booking.reason.wizard', 'create', [{ booking_id: id, mode: WIZ[act.method], reason: reason || false }]);
    const r = await rpc<any>('salon.booking.reason.wizard', 'action_confirm', [[wid]]);
    const msg = r?.params?.message;
    if (msg) push(msg, 'ok'); else push(`${act.label} done`);
    return false;
  }
  const res = await rpc<any>(model, act.method, [[id]], act.reason || reason ? { reason: reason || undefined } : {});
  if (res && typeof res === 'object' && res.res_model && res.res_id && BY_MODEL[res.res_model]) {
    push(`${act.label} done`);
    router.push(`/${BY_MODEL[res.res_model].slug}/${res.res_id}`);
    return true;
  }
  push(`${act.label} done`);
  return false;
}

export function ActionButtons({ model, rec, onDone, dirty, small }: { model: string; rec: any; onDone: () => void; dirty?: boolean; small?: boolean }) {
  const router = useRouter();
  const { push } = useToast();
  const [ask, setAsk] = useState<Act | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [paying, setPaying] = useState(false);
  const acts = actionsFor(model, rec);
  if (!acts.length) return null;
  const nextIdx = small ? -1 : acts.findIndex((a) => a.tone === 'primary');

  async function go(act: Act, why?: string) {
    if (dirty) { push('Save or discard your changes first.', 'err'); return; }
    setBusy(true);
    try {
      const moved = await runAction(model, rec.id, act, why, router, push);
      if (!moved) onDone();
    } catch (e: any) { push(e.message, 'err'); } finally { setBusy(false); setAsk(null); setReason(''); }
  }

  return (
    <>
      <span className="actions">
        {acts.map((a, i) => (
          <button key={a.method} disabled={busy} className={`btn ${a.tone} ${small ? 'sm' : ''} ${i === nextIdx ? 'next' : ''}`} title={i === nextIdx ? 'Suggested next step' : undefined}
            onClick={(e) => { e.stopPropagation(); a.payment ? setPaying(true) : a.reason ? setAsk(a) : go(a); }}>{i === nextIdx ? `Next: ${a.label} →` : a.label}</button>
        ))}
      </span>
      {paying && <PaymentModal rec={rec} onClose={() => setPaying(false)} onDone={() => { setPaying(false); onDone(); }} />}
      {ask && (
        <Modal title={ask.label} onClose={() => setAsk(null)}>
          <label className="field wide"><span>Reason</span>
            <textarea autoFocus rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="A reason is required for this action" />
          </label>
          <div className="savebar">
            <button className={`btn ${ask.tone}`} disabled={busy || !reason.trim()} onClick={() => go(ask, reason.trim())}>{ask.label}</button>
            <button className="btn ghost" onClick={() => setAsk(null)}>Back</button>
          </div>
        </Modal>
      )}
    </>
  );
}

/** Register one (possibly partial) payment on the booking invoice; repeat for split payments. */
function PaymentModal({ rec, onClose, onDone }: { rec: any; onClose: () => void; onDone: () => void }) {
  const { push } = useToast();
  const [journals, setJournals] = useState<{ id: number; name: string; type: string }[]>([]);
  const [journal, setJournal] = useState<number | ''>('');
  const [amount, setAmount] = useState<number>(rec.amount_due || 0);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    rpc<any>('salon.booking', 'get_booking_meta', []).then((m) => { setJournals(m.journals || []); if (m.journals?.[0]) setJournal(m.journals[0].id); }).catch((e) => push(e.message, 'err'));
  }, [push]);
  async function pay() {
    setBusy(true);
    try {
      const st = await rpc<string>('salon.booking', 'register_payment', [[rec.id]], { journal_id: journal, amount });
      push(st === 'paid' ? 'Fully paid - you can now mark the booking paid' : 'Partial payment recorded');
      onDone();
    } catch (e: any) { push(e.message, 'err'); setBusy(false); }
  }
  return (
    <Modal title={`Register payment - ${rec.display_name || rec.name || ''}`} onClose={onClose}>
      <p className="muted">Amount still due: <b>{rec.amount_due}</b>. Use several payments to split between cash / card / UPI.</p>
      <label className="field"><span>Payment method</span>
        <select value={journal} onChange={(e) => setJournal(Number(e.target.value))}>
          {journals.map((j) => <option key={j.id} value={j.id}>{j.name} ({j.type})</option>)}
        </select></label>
      <label className="field"><span>Amount</span><input type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(Number(e.target.value))} /></label>
      <div className="savebar">
        <button className="btn primary" disabled={busy || !journal || amount <= 0} onClick={pay}>{busy ? 'Saving…' : 'Register payment'}</button>
        <button className="btn ghost" onClick={onClose}>Back</button>
      </div>
    </Modal>
  );
}
