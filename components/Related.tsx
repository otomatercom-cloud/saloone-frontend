'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Tab } from '@/lib/config';
import { stateFieldOf, stateFieldsFor } from '@/lib/actions';
import { FieldDef, fieldsGet, rpc, searchRead, withM2MNames } from '@/lib/odoo';
import { fmt } from '@/lib/util';
import { ActionButtons } from './ActionBar';
import { RecordForm } from './RecordForm';
import { Badge, Modal, Spinner, useToast } from './ui';

export function Cell({ name, def, value, stateField }: { name: string; def?: FieldDef; value: any; stateField: string }) {
  if (name === stateField && def?.type === 'selection') return value ? <Badge state={value} label={fmt(value, def)} /> : null;
  return <>{fmt(value, def)}</>;
}

export function Related({ tab, parentId, parent, onChange }: { tab: Tab; parentId: number; parent: any; onChange?: () => void }) {
  const router = useRouter();
  const { push } = useToast();
  const [rows, setRows] = useState<any[] | null>(null);
  const [defs, setDefs] = useState<Record<string, FieldDef>>({});
  const [adding, setAdding] = useState(false);
  const value = tab.parentField ? parent?.[tab.parentField]?.[0] : parentId;
  const sf = stateFieldOf(tab.model);
  const [editing, setEditing] = useState<any>(null);
  const { push: _p } = useToast();

  const load = useCallback(async () => {
    if (!value) { setRows([]); return; }
    try {
      const d = await fieldsGet(tab.model);
      setDefs(d);
      const fields = [...new Set([...tab.columns.filter((c) => d[c]), ...stateFieldsFor(tab.model).filter((c) => d[c])])];
      const list = await withM2MNames(await searchRead(tab.model, [[tab.field, '=', value]], fields, { order: tab.order || 'id', limit: 100, context: { active_test: false } }), d, tab.columns);
      setRows(list);
    } catch (e: any) { push(e.message, 'err'); setRows([]); }
  }, [tab, value, push]);
  useEffect(() => { load(); }, [load]);

  if (!rows) return <Spinner />;
  const cols = tab.columns.filter((c) => defs[c]);
  return (
    <div>
      <div className="tab-head">
        <span className="muted">{rows.length} record(s)</span>
        {tab.create && !tab.parentField && !tab.noAdd && <button className="btn primary sm" onClick={() => setAdding(true)}>+ Add</button>}
      </div>
      <div className="table-wrap">
        <table className="tbl">
          <thead><tr>{cols.map((c) => <th key={c}>{defs[c].string}</th>)}{(tab.rowActions || tab.deletable) && <th />}</tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className={tab.link || tab.edit ? 'click' : ''} onClick={() => (tab.link ? router.push(`/${tab.link}/${r.id}`) : tab.edit && setEditing(r))}>
                {cols.map((c) => <td key={c}><Cell name={c} def={defs[c]} value={r[c]} stateField={sf} /></td>)}
                {(tab.rowActions || tab.deletable) && <td className="right">
                  {tab.rowActions && <ActionButtons model={tab.model} rec={r} onDone={() => { load(); onChange?.(); }} small />}
                  {tab.deletable && <button className="btn danger sm" title="Remove" onClick={async (e) => { e.stopPropagation(); if (!confirm('Remove this row?')) return; try { await rpc(tab.model, 'unlink', [[r.id]]); load(); onChange?.(); } catch (err: any) { _p(err.message, 'err'); } }}>✕</button>}
                </td>}
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={cols.length + 1} className="muted center">Nothing here yet</td></tr>}
          </tbody>
        </table>
      </div>
      {editing && tab.edit && (
        <Modal title={`Edit ${tab.title.replace(/s$/, '')}`} onClose={() => setEditing(null)}>
          <RecordForm model={tab.model} mode="edit" record={editing} sections={[{ title: 'Details', fields: tab.edit }]}
            onSaved={() => { setEditing(null); load(); onChange?.(); }} />
        </Modal>
      )}
      {adding && tab.create && (
        <Modal title={`New ${tab.title.replace(/s$/, '')}`} onClose={() => setAdding(false)}>
          <RecordForm model={tab.model} mode="create" sections={[{ title: 'Details', fields: tab.create }]}
            defaults={{ [tab.field]: value }} onSaved={() => { setAdding(false); load(); onChange?.(); }} />
        </Modal>
      )}
    </div>
  );
}
