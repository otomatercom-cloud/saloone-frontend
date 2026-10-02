import { NextRequest, NextResponse } from 'next/server';
import { ODOO_URL } from '@/lib/server';

// One request instead of ~21: the server asks Odoo (same machine, fast) in parallel and caches the answer briefly per session.
const memo = new Map<string, { at: number; models: string[] }>();
const TTL = 5 * 60 * 1000;

async function can(sid: string, model: string) {
  try {
    const r = await fetch(`${ODOO_URL}/web/dataset/call_kw/${model}/has_access`, {
      method: 'POST', cache: 'no-store',
      headers: { 'content-type': 'application/json', cookie: `session_id=${sid}` },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'call', params: { model, method: 'has_access', args: [[], 'read'], kwargs: {} } }),
    });
    const j = await r.json();
    if (j.error?.data?.name?.includes('SessionExpired')) throw new Error('expired');
    return j.result === true;
  } catch (e: any) { if (e.message === 'expired') throw e; return false; }
}

export async function POST(req: NextRequest) {
  const sid = req.cookies.get('odoo_sid')?.value;
  if (!sid) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
  const { models = [], fresh = false } = await req.json();
  const hit = memo.get(sid);
  if (!fresh && hit && Date.now() - hit.at < TTL) return NextResponse.json({ models: hit.models });
  try {
    const ok = await Promise.all((models as string[]).map(async (m) => ((await can(sid, m)) ? m : null)));
    const out = ok.filter(Boolean) as string[];
    memo.set(sid, { at: Date.now(), models: out });
    if (memo.size > 500) memo.delete(memo.keys().next().value as string);
    return NextResponse.json({ models: out });
  } catch { return NextResponse.json({ error: 'Session expired' }, { status: 401 }); }
}
