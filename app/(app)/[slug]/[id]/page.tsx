'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { BY_SLUG } from '@/lib/config';
import { SCHEMA } from '@/lib/schema';
import { stateFieldOf, stateFieldsFor } from '@/lib/actions';
import { fieldsGet, readRecord } from '@/lib/odoo';
import { FILENAME_FIELD } from '@/components/FieldInput';
import { fmt } from '@/lib/util';
import { ActionButtons } from '@/components/ActionBar';
import { Chatter } from '@/components/Chatter';
import { RecordForm } from '@/components/RecordForm';
import { Related } from '@/components/Related';
import { Badge, Spinner, useToast } from '@/components/ui';

export default function DetailPage() {
  const { slug, id } = useParams<{ slug: string; id: string }>();
  const cfg = BY_SLUG[slug];
  const rid = Number(id);
  const router = useRouter();
  const { push } = useToast();
  const [chatKey, setChatKey] = useState(0);
  const [rec, setRec] = useState<any>(null);
  const [selDef, setSelDef] = useState<any>(null);
  const [dirty, setDirty] = useState(false);
  const [tab, setTab] = useState(0);

  const fields = useMemo(() => {
    if (!cfg) return [];
    return [...new Set([...cfg.sections.flatMap((s) => s.fields), ...stateFieldsFor(cfg.model), 'display_name'])];
  }, [cfg]);

  const load = useCallback(async () => {
    if (!cfg) return;
    try {
      const d = await fieldsGet(cfg.model);
      setSelDef(d[stateFieldOf(cfg.model)]);
      const names = fields.filter((f) => d[f] && d[f].type !== 'binary');
      fields.filter((f) => d[f]?.type === 'binary').forEach((f) => { const fn = FILENAME_FIELD(f); if (d[fn]) names.push(fn); });
      setRec(await readRecord(cfg.model, rid, names));
    } catch (e: any) { push(e.message, 'err'); }
  }, [cfg, rid, fields, push]);
  useEffect(() => { setRec(null); load(); }, [load]);

  if (!cfg) return <p>Unknown page.</p>;
  if (!rec) return <Spinner />;
  const sf = stateFieldOf(cfg.model);
  const states = Object.keys(SCHEMA[cfg.model]?.states || {});
  const tops = (cfg.tabs || []).filter((t) => t.top);
  const tabs = (cfg.tabs || []).filter((t) => !t.top);
  return (
    <div>
      <div className="page-head">
        <button className="btn ghost sm" onClick={() => router.push(`/${cfg.slug}`)}>← {cfg.title}</button>
        <h1>{rec.display_name}</h1>
        {rec[sf] && <Badge state={rec[sf]} label={fmt(rec[sf], selDef)} />}
        <button className="btn ghost sm noprint" style={{ marginLeft: 'auto' }} onClick={() => window.print()}>🖨 Print</button>
      </div>
      <div className="toolbar"><ActionButtons model={cfg.model} rec={rec} onDone={() => { load(); setChatKey((k) => k + 1); }} dirty={dirty} /></div>
      {states.length > 0 && !(rec[sf] === 'cancelled' || rec[sf] === 'no_show') && (
        <ol className="path">
          {states.map((s) => <li key={s} className={s === rec[sf] ? 'now' : ''}>{SCHEMA[cfg.model].states[s]}</li>)}
        </ol>
      )}
      {tops.map((t) => (
        <section key={t.title} className="tabs-box top-card">
          <h3>{t.title}</h3>
          <Related tab={t} parentId={rid} parent={rec} onChange={load} />
        </section>
      ))}
      <div className="split">
        <div>
          {tabs.length > 0 && (
            <section className="tabs-box">
              <div className="tabs">{tabs.map((t, i) => <button key={t.title} className={tab === i ? 'on' : ''} onClick={() => setTab(i)}>{t.title}</button>)}</div>
              <Related key={`${cfg.slug}-${tab}-${rid}`} tab={tabs[tab]} parentId={rid} parent={rec} onChange={load} />
            </section>
          )}
          <RecordForm model={cfg.model} mode="edit" record={rec} sections={cfg.sections} onSaved={load} onDirty={setDirty} prefillToday={cfg.prefillToday} />
        </div>
        <Chatter key={chatKey} model={cfg.model} id={rid} />
      </div>
    </div>
  );
}
