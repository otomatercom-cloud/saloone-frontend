import { NextRequest, NextResponse } from 'next/server';
import { ODOO_URL } from '@/lib/server';

// Thin proxy: the browser never talks to Odoo directly (no CORS, the Odoo session id stays in an httpOnly cookie).
export async function POST(req: NextRequest) {
  const sid = req.cookies.get('odoo_sid')?.value;
  if (!sid) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
  const { model, method, args = [], kwargs = {} } = await req.json();
  if (!/^[a-z0-9_.]+$/.test(model) || !/^[a-z][a-z0-9_]*$/.test(method)) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
  let res: Response;
  try {
    res = await fetch(`${ODOO_URL}/web/dataset/call_kw/${model}/${method}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: `session_id=${sid}` },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'call', params: { model, method, args, kwargs } }),
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json({ error: `Cannot reach Odoo at ${ODOO_URL}` }, { status: 502 });
  }
  const data = await res.json();
  if (data.error) {
    const name = data.error.data?.name || '';
    const expired = name.includes('SessionExpired');
    return NextResponse.json(
      { error: data.error.data?.message || data.error.message || 'Odoo error', kind: name },
      { status: expired ? 401 : 400 });
  }
  return NextResponse.json({ result: data.result });
}
