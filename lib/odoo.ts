'use client';
export class OdooError extends Error {}

export async function rpc<T = any>(model: string, method: string, args: any[] = [], kwargs: Record<string, any> = {}): Promise<T> {
  const r = await fetch('/api/rpc', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model, method, args, kwargs }),
  });
  const j = await r.json().catch(() => ({ error: 'Invalid server response' }));
  if (r.status === 401 && typeof window !== 'undefined' && !location.pathname.startsWith('/login')) {
    location.href = '/login';
  }
  if (!r.ok || j.error) throw new OdooError(j.error || 'Request failed');
  return j.result as T;
}

export type FieldDef = {
  string: string; type: string; readonly?: boolean; required?: boolean;
  selection?: [string, string][]; relation?: string; currency_field?: string;
};
const cache = new Map<string, Promise<Record<string, FieldDef>>>();
export function fieldsGet(model: string) {
  if (!cache.has(model)) {
    try { const c = sessionStorage.getItem('otm.fields.' + model); if (c) cache.set(model, Promise.resolve(JSON.parse(c))); } catch { /* ignore */ }
  }
  if (!cache.has(model)) {
    cache.set(model, rpc<Record<string, FieldDef>>(model, 'fields_get', [],
      { attributes: ['string', 'type', 'readonly', 'required', 'selection', 'relation', 'currency_field'] })
      .then((d) => { try { sessionStorage.setItem('otm.fields.' + model, JSON.stringify(d)); } catch { /* ignore */ } return d; })
      .catch((e) => { cache.delete(model); throw e; }));
  }
  return cache.get(model)!;
}

export const searchRead = (model: string, domain: any[], fields: string[], opts: Record<string, any> = {}) =>
  rpc<any[]>(model, 'search_read', [domain], { fields, ...opts });
export const searchCount = (model: string, domain: any[]) => rpc<number>(model, 'search_count', [domain]);
export const nameSearch = (model: string, term: string, args: any[] = []) =>
  rpc<[number, string][]>(model, 'name_search', [], { name: term, domain: args, limit: 8 });

/** read one record; many2many ids are resolved to {id,name} for display */
export async function readRecord(model: string, id: number, fields: string[]) {
  const [rec] = await rpc<any[]>(model, 'read', [[id], fields]);
  if (!rec) throw new OdooError('Record not found');
  return rec;
}

/** replace many2many id lists by "name, name" text so lists show people instead of counts */
export async function withM2MNames(rows: any[], defs: Record<string, FieldDef>, cols: string[]) {
  for (const c of cols) {
    const d = defs[c];
    if (d?.type !== 'many2many') continue;
    const ids = [...new Set(rows.flatMap((r) => r[c] || []))] as number[];
    if (!ids.length) continue;
    const recs = await rpc<any[]>(d.relation!, 'read', [ids, ['display_name']]).catch(() => []);
    const name = new Map(recs.map((x) => [x.id, x.display_name]));
    rows.forEach((r) => { r[c] = { names: (r[c] || []).map((i: number) => name.get(i) || i).join(', ') }; });
  }
  return rows;
}
