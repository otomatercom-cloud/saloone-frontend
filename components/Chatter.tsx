'use client';
import { useCallback, useEffect, useState } from 'react';
import { rpc, searchRead } from '@/lib/odoo';
import { localDt, stripHtml } from '@/lib/util';
import { Spinner, useToast } from './ui';

export function Chatter({ model, id }: { model: string; id: number }) {
  const { push } = useToast();
  const [msgs, setMsgs] = useState<any[] | null>(null);
  const [hist, setHist] = useState<any[]>([]);
  const [tab, setTab] = useState<'history' | 'notes'>('history');
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    try {
      const [m, h] = await Promise.all([
        searchRead('mail.message', [['model', '=', model], ['res_id', '=', id], ['message_type', '=', 'comment']], ['body', 'author_id', 'date'], { order: 'id desc', limit: 60 }),
        rpc<any[]>('salon.dashboard', 'get_history', [model, id]).catch(() => []),
      ]);
      setMsgs(m.filter((x: any) => stripHtml(x.body))); setHist(h);
    } catch (e: any) { push(e.message, 'err'); setMsgs([]); }
  }, [model, id, push]);
  useEffect(() => { load(); }, [load]);

  async function post() {
    try {
      await rpc(model, 'message_post', [[id]], { body: note, message_type: 'comment', subtype_xmlid: 'mail.mt_note' });
      setNote(''); load();
    } catch (e: any) { push(e.message, 'err'); }
  }

  return (
    <aside className="chatter">
      <div className="tabs">
        <button className={tab === 'history' ? 'on' : ''} onClick={() => setTab('history')}>Changes ({hist.length})</button>
        <button className={tab === 'notes' ? 'on' : ''} onClick={() => setTab('notes')}>Notes &amp; log</button>
      </div>
      {!msgs ? <Spinner /> : tab === 'history' ? (
        <ul className="timeline">
          {hist.map((h, i) => (
            <li key={i}>
              <div className="when">{localDt(h.date)} · {h.user || 'System'}</div>
              <div>{h.field}: <span className="muted">{h.old || '—'}</span> → <b>{h.new || '—'}</b></div>
            </li>
          ))}
          {!hist.length && <li className="muted">No changes yet</li>}
        </ul>
      ) : (
        <>
          <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Write an internal note…" />
          <button className="btn primary sm" disabled={!note.trim()} onClick={post}>Log note</button>
          <ul className="timeline">
            {msgs.map((m) => (
              <li key={m.id}>
                <div className="when">{localDt(m.date)} · {m.author_id?.[1] || 'System'}</div>
                <div className="pre">{stripHtml(m.body)}</div>
              </li>
            ))}
          </ul>
        </>
      )}
    </aside>
  );
}
