'use client';
import { useEffect, useMemo, useState } from 'react';
import { FieldDef, fieldsGet, rpc } from '@/lib/odoo';
import { FieldInput, FILENAME_FIELD, Pair, toWire } from './FieldInput';
import { Spinner, useToast } from './ui';

type Section = { title: string; fields: string[] };

/** Generic form: labels, types and selections are read from Odoo, so it works for every model. */
export function RecordForm({ model, sections, record, defaults, mode, onSaved, onDirty, prefillToday }: {
  prefillToday?: string[]; model: string; sections: Section[]; record?: any; defaults?: Record<string, any>; mode: 'edit' | 'create';
  onSaved: (id: number) => void; onDirty?: (d: boolean) => void;
}) {
  const [defs, setDefs] = useState<Record<string, FieldDef> | null>(null);
  const [vals, setVals] = useState<Record<string, any>>({});
  const [orig, setOrig] = useState<Record<string, any>>({});
  const [busy, setBusy] = useState(false);
  const { push } = useToast();
  const shown = useMemo(() => sections.flatMap((s) => s.fields), [sections]);
  // a binary field travels together with its *_filename sibling
  const names = useMemo(() => [...shown, ...shown.filter((n) => defs?.[n]?.type === 'binary' && defs[FILENAME_FIELD(n)]).map(FILENAME_FIELD)], [shown, defs]);

  useEffect(() => {
    let live = true;
    (async () => {
      const d = await fieldsGet(model);
      let v: Record<string, any> = {};
      if (mode === 'create') {
        const known = names.filter((n) => d[n]);
        const dg = await rpc<Record<string, any>>(model, 'default_get', [known]).catch(() => ({}));
        for (const n of known) {
          const f = d[n]; let x = dg[n] ?? (f.type === 'boolean' ? false : f.type === 'many2many' ? [] : false);
          if (f.type === 'many2one' && typeof x === 'number') {
            const r = await rpc<[number, string][]>(f.relation!, 'read', [[x], ['display_name']]).then((a: any) => [[a[0].id, a[0].display_name]]).catch(() => []);
            x = r[0] || false;
          }
          if (f.type === 'many2many' && Array.isArray(x) && x.length && typeof x[0] === 'number') x = [];
          v[n] = x;
        }
        for (const [k, x] of Object.entries(defaults || {})) {
          const f = d[k];
          if (f?.type === 'many2one' && typeof x === 'number') {
            const r = await rpc<any[]>(f.relation!, 'read', [[x], ['display_name']]).catch(() => []);
            v[k] = r[0] ? [r[0].id, r[0].display_name] : false;
          } else v[k] = x;
        }
      } else {
        v = { ...record };
        for (const n of names) {
          const f = d[n];
          if (f?.type === 'many2many') {
            const ids: number[] = record[n] || [];
            v[n] = ids.length ? await rpc<any[]>(f.relation!, 'read', [ids, ['display_name']]).then((a) => a.map((r) => [r.id, r.display_name] as Pair)) : [];
          }
        }
      }
      const o = JSON.parse(JSON.stringify(v));
      if (mode === 'edit') {
        const t = new Date(); const today = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
        for (const k of prefillToday || []) if (d[k] && !v[k] && !d[k].readonly) v[k] = today;
      }
      if (live) { setDefs(d); setVals(v); setOrig(o); }
    })().catch((e) => push(e.message, 'err'));
    return () => { live = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model, record?.id, mode]);

  const dirtyKeys = useMemo(
    () => names.filter((n) => defs?.[n] && !defs[n].readonly && JSON.stringify(vals[n]) !== JSON.stringify(orig[n])),
    [vals, orig, defs, names]);
  useEffect(() => { onDirty?.(mode === 'edit' && dirtyKeys.length > 0); }, [dirtyKeys.length, mode, onDirty]);

  if (!defs) return <Spinner />;

  async function save() {
    setBusy(true);
    try {
      if (mode === 'create') {
        const payload: Record<string, any> = {};
        for (const n of names) if (defs![n] && !defs![n].readonly && vals[n] !== false && vals[n] !== '' ) payload[n] = toWire(defs![n], vals[n]);
        for (const [k, x] of Object.entries(defaults || {})) payload[k] = x;
        const missing = names.filter((n) => defs![n]?.required && !defs![n].readonly && (vals[n] === false || vals[n] === '' || vals[n] === undefined) && payload[n] === undefined);
        if (missing.length) throw new Error('Please fill: ' + missing.map((n) => defs![n].string).join(', '));
        const id = await rpc<number>(model, 'create', [payload]);
        push('Created'); onSaved(Array.isArray(id) ? (id as any)[0] : id);
      } else {
        const payload: Record<string, any> = {};
        for (const n of dirtyKeys) payload[n] = toWire(defs![n], vals[n]);
        await rpc(model, 'write', [[record.id], payload]);
        push('Saved'); setOrig(JSON.parse(JSON.stringify(vals))); onSaved(record.id);
      }
    } catch (e: any) { push(e.message, 'err'); } finally { setBusy(false); }
  }

  return (
    <div>
      {sections.map((s) => {
        const list = s.fields.filter((n) => defs[n]);
        if (!list.length) return null;
        return (
          <fieldset key={s.title} className="section">
            <legend>{s.title}</legend>
            <div className="grid">
              {list.map((n) => {
                const d = defs[n];
                const wide = d.type === 'text' || d.type === 'html' || d.type === 'many2many' || d.type === 'binary';
                return (
                  <label key={n} className={`field ${wide ? 'wide' : ''}`}>
                    <span>{d.string}{d.required && !d.readonly && ' *'}</span>
                    <FieldInput name={n} def={d} value={vals[n]} fileName={vals[FILENAME_FIELD(n)] || undefined}
                      download={d.type === 'binary' && record?.id && vals[FILENAME_FIELD(n)] && JSON.stringify(vals[n]) === JSON.stringify(orig[n]) ? `/api/file?model=${model}&id=${record.id}&field=${n}` : undefined}
                      onChange={(v, fname) => setVals((x) => ({ ...x, [n]: v, ...(fname !== undefined ? { [FILENAME_FIELD(n)]: fname } : {}) }))} />
                  </label>
                );
              })}
            </div>
          </fieldset>
        );
      })}
      {(mode === 'create' || dirtyKeys.length > 0) && (
        <div className="savebar">
          <button className="btn primary" disabled={busy} onClick={save}>{busy ? 'Saving…' : mode === 'create' ? 'Create' : 'Save changes'}</button>
          {mode === 'edit' && <button className="btn ghost" onClick={() => setVals(JSON.parse(JSON.stringify(orig)))}>Discard</button>}
        </div>
      )}
    </div>
  );
}
