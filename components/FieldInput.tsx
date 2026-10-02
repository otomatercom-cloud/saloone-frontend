'use client';
import { useEffect, useRef, useState } from 'react';
import { FieldDef, nameSearch, rpc } from '@/lib/odoo';
import { useToast } from './ui';
import { fmt, localToUtc, utcToLocal } from '@/lib/util';

export type Pair = [number, string];
const TIME_FIELDS = ['start_time', 'end_time'];

export const floatToTime = (v: number) => {
  const h = Math.floor(v || 0), m = Math.round(((v || 0) - h) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};
export const FILENAME_FIELD = (n: string) => (n === 'signed_document' ? 'signed_filename' : `${n}_filename`);
export const readFile = (f: File) => new Promise<string>((res, rej) => {
  const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1] || ''); r.onerror = () => rej(new Error('Cannot read file')); r.readAsDataURL(f);
});
export const timeToFloat = (s: string) => { const [h, m] = s.split(':').map(Number); return (h || 0) + (m || 0) / 60; };

/** value shape in the form: m2o -> [id,name]|false, m2m -> [id,name][] ; everything else as Odoo returns it */
export function toWire(def: FieldDef, v: any) {
  switch (def.type) {
    case 'many2one': return Array.isArray(v) ? v[0] : false;
    case 'many2many': return [[6, 0, (v || []).map((p: Pair) => p[0])]];
    case 'integer': case 'float': case 'monetary': return v === '' || v === null || v === undefined ? 0 : Number(v);
    case 'date': case 'datetime': return v || false;
    case 'binary': return v || false;
    default: return v === undefined ? false : v;
  }
}

const RELDOMAIN: Record<string, any[]> = { 'hr.employee': [['salon_is_staff', '=', true]], 'product.product': [['is_salon_service', '=', true]], 'product.template': [['is_salon_service', '=', true]] };
function M2O({ rel, value, onChange, disabled }: { rel: string; value: any; onChange: (v: any) => void; disabled?: boolean }) {
  const [term, setTerm] = useState('');
  const [opts, setOpts] = useState<Pair[]>([]);
  const [open, setOpen] = useState(false);
  const t = useRef<any>(null);
  const { push } = useToast();
  // customers can be created on the spot when the name is not in the list
  const canCreate = rel === 'res.partner';
  const typed = term.trim();
  const exact = opts.some((o) => o[1].trim().toLowerCase() === typed.toLowerCase());
  async function createNew() {
    try {
      const pair = await rpc<Pair>('res.partner', 'name_create', [typed]);
      onChange(pair); setOpen(false); push(`Customer "${typed}" created`);
    } catch (e: any) { push(e.message || 'Could not create the customer', 'err'); }
  }
  useEffect(() => {
    if (!open) return;
    clearTimeout(t.current);
    t.current = setTimeout(() => nameSearch(rel, term, RELDOMAIN[rel]).then(setOpts).catch(() => setOpts([])), 200);
    return () => clearTimeout(t.current);
  }, [term, open, rel]);
  return (
    <div className="m2o">
      <input disabled={disabled} value={open ? term : Array.isArray(value) ? value[1] : ''}
        placeholder={open ? 'Type to search…' : 'Select…'}
        onFocus={() => { setOpen(true); setTerm(''); }} onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={(e) => setTerm(e.target.value)} />
      {open && (
        <div className="m2o-list">
          {Array.isArray(value) && <div className="m2o-opt muted" onMouseDown={() => { onChange(false); setOpen(false); }}>— clear —</div>}
          {opts.map((o) => <div key={o[0]} className="m2o-opt" onMouseDown={() => { onChange(o); setOpen(false); }}>{o[1]}</div>)}
          {canCreate && typed && !exact && <div className="m2o-opt create" onMouseDown={createNew}>+ Create customer “{typed}”</div>}
          {!opts.length && !(canCreate && typed) && <div className="m2o-opt muted">No result</div>}
        </div>
      )}
    </div>
  );
}

function M2M({ rel, value, onChange, disabled }: { rel: string; value: Pair[]; onChange: (v: Pair[]) => void; disabled?: boolean }) {
  const [term, setTerm] = useState('');
  const [opts, setOpts] = useState<Pair[]>([]);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const h = setTimeout(() => nameSearch(rel, term, RELDOMAIN[rel]).then(setOpts).catch(() => setOpts([])), 200);
    return () => clearTimeout(h);
  }, [term, open, rel]);
  const cur = value || [];
  return (
    <div className="m2m">
      <div className="chips">
        {cur.map((p) => (
          <span key={p[0]} className="chip">{p[1]}{!disabled && <b onClick={() => onChange(cur.filter((x) => x[0] !== p[0]))}>×</b>}</span>
        ))}
      </div>
      {!disabled && (
        <div className="m2o">
          <input value={term} placeholder="Add…" onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)} onChange={(e) => setTerm(e.target.value)} />
          {open && (
            <div className="m2o-list">
              {opts.filter((o) => !cur.some((c) => c[0] === o[0])).map((o) => (
                <div key={o[0]} className="m2o-opt" onMouseDown={() => { onChange([...cur, o]); setTerm(''); }}>{o[1]}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function FieldInput({ name, def, value, onChange, readonly, fileName, download }: { name: string; def: FieldDef; value: any; onChange: (v: any, fileName?: string) => void; readonly?: boolean; fileName?: string; download?: string }) {
  if (def.type === 'binary') {
    return (
      <div className="filebox">
        {download && fileName && <a className="btn ghost sm" href={download} target="_blank" rel="noreferrer">⬇ {fileName}</a>}
        {!readonly && !def.readonly && (
          <input type="file" onChange={async (e) => { const f = e.target.files?.[0]; if (f) onChange(await readFile(f), f.name); }} />
        )}
        {value && typeof value === 'string' && <span className="muted">new file ready – press Save</span>}
        {!fileName && !value && <span className="muted">No file</span>}
      </div>
    );
  }
  const ro = readonly || def.readonly;
  if (ro && def.type !== 'boolean') {
    if (def.type === 'many2many') return <div className="ro">{(value || []).map((p: Pair) => p[1]).join(', ') || '—'}</div>;
    if (TIME_FIELDS.includes(name) && def.type === 'float') return <div className="ro">{floatToTime(value)}</div>;
    const text = fmt(value, def);
    return <div className={`ro ${def.type === 'text' || def.type === 'html' ? 'pre' : ''}`}>{text || '—'}</div>;
  }
  switch (def.type) {
    case 'boolean':
      return <input type="checkbox" disabled={ro} checked={!!value} onChange={(e) => onChange(e.target.checked)} />;
    case 'selection':
      return (
        <select value={value || ''} onChange={(e) => onChange(e.target.value || false)}>
          <option value="" />
          {def.selection?.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      );
    case 'many2one': return <M2O rel={def.relation!} value={value} onChange={onChange} />;
    case 'many2many': return <M2M rel={def.relation!} value={value} onChange={onChange} />;
    case 'text': case 'html':
      return <textarea rows={3} value={def.type === 'html' ? fmt(value, def) : value || ''} onChange={(e) => onChange(e.target.value)} />;
    case 'integer': return <input type="number" step="1" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />;
    case 'float': case 'monetary':
      if (TIME_FIELDS.includes(name)) return <input type="time" value={floatToTime(value)} onChange={(e) => onChange(timeToFloat(e.target.value))} />;
      return <input type="number" step="0.01" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />;
    case 'date': return <input type="date" value={value || ''} onChange={(e) => onChange(e.target.value)} />;
    case 'datetime':
      return <input type="datetime-local" value={value ? utcToLocal(String(value)) : ''} onChange={(e) => onChange(e.target.value ? localToUtc(e.target.value) : false)} />;
    default: return <input value={value || ''} onChange={(e) => onChange(e.target.value)} />;
  }
}
