'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { BY_SLUG } from '@/lib/config';
import { SCHEMA } from '@/lib/schema';
import { stateFieldOf } from '@/lib/actions';
import { FieldDef, fieldsGet, searchCount, searchRead, withM2MNames } from '@/lib/odoo';
import { Cell } from '@/components/Related';
import { Spinner, useToast } from '@/components/ui';

const PAGE = 25;
const QUICK = [['mine', 'My records'], ['today', 'Created today'], ['month', 'This month']] as const;
const startOfDayUtc = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x.toISOString().slice(0, 19).replace('T', ' '); };
const uidOf = () => { try { const m = document.cookie.split('; ').find((c) => c.startsWith('otm_user=')); return m ? JSON.parse(decodeURIComponent(m.split('=')[1])).uid : 0; } catch { return 0; } };
const csvCell = (v: any) => { const t = String(v ?? '').replace(/\r?\n/g, ' '); return /[",]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };

export default function ListPage() {
  const { slug } = useParams<{ slug: string }>();
  const cfg = BY_SLUG[slug];
  const router = useRouter();
  const sp = useSearchParams();
  const { push } = useToast();
  const [defs, setDefs] = useState<Record<string, FieldDef> | null>(null);
  const [rows, setRows] = useState<any[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [term, setTerm] = useState('');
  const [state, setState] = useState('');
  const [quick, setQuick] = useState('');
  const [busyExp, setBusyExp] = useState(false);
  const [denied, setDenied] = useState(false);
  const sf = cfg ? stateFieldOf(cfg.model) : 'status';
  const presetDomain = useMemo(() => { try { return JSON.parse(sp.get('domain') || '[]'); } catch { return []; } }, [sp]);

  useEffect(() => {
    try { const v = JSON.parse(localStorage.getItem('otm.list.' + slug) || '{}'); setState(v.state || ''); setQuick(v.quick || ''); } catch { /* ignore */ }
  }, [slug]);
  useEffect(() => { try { localStorage.setItem('otm.list.' + slug, JSON.stringify({ state, quick })); } catch { /* ignore */ } }, [slug, state, quick]);
  useEffect(() => { if (cfg) fieldsGet(cfg.model).then(setDefs).catch((e) => { if (/not allowed|access/i.test(e.message)) setDenied(true); else push(e.message, 'err'); }); }, [cfg, push]);
  const states = defs?.[sf]?.selection || (cfg && SCHEMA[cfg.model] ? Object.entries(SCHEMA[cfg.model].states) : []);

  const buildDomain = useCallback(() => {
    const domain: any[] = [...(cfg?.domain || []), ...presetDomain];
    if (!cfg || !defs) return domain;
    if (state) domain.push([sf, '=', state]);
    if (quick === 'mine') domain.push(['create_uid', '=', uidOf()]);
    if (quick === 'today') domain.push(['create_date', '>=', startOfDayUtc(new Date())]);
    if (quick === 'month') { const d = new Date(); d.setDate(1); domain.push(['create_date', '>=', startOfDayUtc(d)]); }
    const fields = cfg.search.filter((f) => defs[f]);
    if (term && fields.length) {
      fields.forEach((_, i) => i < fields.length - 1 && domain.push('|'));
      fields.forEach((f) => domain.push([f, 'ilike', term]));
    }
    return domain;
  }, [cfg, defs, presetDomain, state, quick, sf, term]);

  async function exportCsv() {
    if (!cfg || !defs) return;
    setBusyExp(true);
    try {
      const cols = cfg.columns.filter((c) => defs[c]);
      const data = await searchRead(cfg.model, buildDomain(), cols, { limit: 5000, order: cfg.order || 'id desc', context: { active_test: false } }).then((r) => withM2MNames(r, defs, cols));
      const cell = (c: string, v: any) => {
        const d = defs[c];
        if (v === false || v == null) return '';
        if (d.type === 'many2one') return v[1];
        if (d.type === 'many2many') return v.names || '';
        if (d.type === 'selection') return d.selection?.find(([k]) => k === v)?.[1] ?? v;
        return v;
      };
      const lines = [cols.map((c) => csvCell(defs[c].string)).join(','), ...data.map((r) => cols.map((c) => csvCell(cell(c, r[c]))).join(','))];
      const url = URL.createObjectURL(new Blob(['\ufeff' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }));
      const a = document.createElement('a'); a.href = url; a.download = `${cfg.slug}-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
      URL.revokeObjectURL(url);
      push(`Exported ${data.length} record(s)`);
    } catch (e: any) { push(e.message, 'err'); } finally { setBusyExp(false); }
  }

  useEffect(() => {
    if (!cfg || !defs) return;
    const domain = buildDomain();
    setRows(null);
    const h = setTimeout(() => {
      Promise.all([
        searchCount(cfg.model, domain),
        searchRead(cfg.model, domain, cfg.columns.filter((c) => defs[c]), { limit: PAGE, offset: page * PAGE, order: cfg.order || 'id desc', context: { active_test: false } }).then((r) => withM2MNames(r, defs, cfg.columns)),
      ]).then(([n, r]) => { setTotal(n); setRows(r); }).catch((e) => { if (/not allowed to access/i.test(e.message)) setDenied(true); else push(e.message, 'err'); setRows([]); });
    }, term ? 250 : 0);
    return () => clearTimeout(h);
  }, [cfg, defs, term, page, buildDomain, push]);

  if (!cfg) return <p>Unknown page.</p>;
  if (denied) return <div className="card center" style={{ padding: '2.5rem' }}><h3>No access to {cfg.title}</h3><p className="muted">Your role does not include this section. Ask your administrator if you need it.</p><Link className="btn primary" href="/">Back to dashboard</Link></div>;
  const cols = cfg.columns.filter((c) => defs?.[c]);
  const pages = Math.max(1, Math.ceil(total / PAGE));
  return (
    <div>
      <div className="page-head">
        <h1>{sp.get('title') || cfg.title}</h1>
        {cfg.create && !cfg.readonly && <Link className="btn primary" href={cfg.newHref || `/${cfg.slug}/new`}>+ New {cfg.singular.toLowerCase()}</Link>}
      </div>
      <div className="filters">
        <input className="search" placeholder={`Search ${cfg.title.toLowerCase()}…`} value={term} onChange={(e) => { setTerm(e.target.value); setPage(0); }} />
        {!cfg.noQuick && QUICK.map(([k, l]) => (
          <button key={k} className={`chipf ${quick === k ? 'on' : ''}`} onClick={() => { setQuick(quick === k ? '' : k); setPage(0); }}>{l}</button>
        ))}
        <button className="btn ghost sm" style={{ marginLeft: 'auto' }} disabled={busyExp || !rows} onClick={exportCsv}>⬇ Export CSV</button>
        {presetDomain.length > 0 && <Link className="btn ghost sm" href={`/${cfg.slug}`}>✕ clear dashboard filter</Link>}
      </div>
      {states.length > 0 && (
        <div className="chips-row">
          <button className={`chipf ${!state ? 'on' : ''}`} onClick={() => { setState(''); setPage(0); }}>All</button>
          {states.map(([k, l]: any) => (
            <button key={k} className={`chipf ${state === k ? 'on' : ''}`} onClick={() => { setState(k); setPage(0); }}>{l}</button>
          ))}
        </div>
      )}
      {!rows || !defs ? <Spinner /> : (
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr>{cols.map((c) => <th key={c}>{defs[c].string}</th>)}</tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className={cfg.readonly ? '' : 'click'} onClick={() => !cfg.readonly && router.push(`/${cfg.slug}/${r.id}`)}>
                  {cols.map((c) => <td key={c}><Cell name={c} def={defs[c]} value={r[c]} stateField={sf} /></td>)}
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={cols.length} className="muted center">Nothing to show</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      <div className="pager">
        <span className="muted">{total} record(s)</span>
        <button className="btn ghost sm" disabled={page === 0} onClick={() => setPage(page - 1)}>‹ Prev</button>
        <span>{page + 1} / {pages}</span>
        <button className="btn ghost sm" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)}>Next ›</button>
      </div>
    </div>
  );
}
