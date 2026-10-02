import { NextResponse } from 'next/server';
import { ODOO_DB, ODOO_URL } from '@/lib/server';

// Brute-force guard: 5 wrong passwords per login+IP in 10 minutes -> locked for the rest of the window.
const FAILS = new Map<string, { n: number; first: number }>();
const WINDOW = 10 * 60 * 1000, MAX = 5;
const keyOf = (req: Request, login: string) =>
  `${(req.headers.get('x-forwarded-for') || 'local').split(',')[0].trim()}|${String(login).toLowerCase()}`;

export async function POST(req: Request) {
  const { login, password } = await req.json();
  const key = keyOf(req, login);
  const f = FAILS.get(key);
  if (f && Date.now() - f.first > WINDOW) FAILS.delete(key);
  const cur = FAILS.get(key);
  if (cur && cur.n >= MAX) {
    const mins = Math.ceil((WINDOW - (Date.now() - cur.first)) / 60000);
    return NextResponse.json({ error: `Too many wrong attempts. Try again in ${mins} minute(s).` }, { status: 429 });
  }
  const params: Record<string, string> = { login, password };
  if (ODOO_DB) params.db = ODOO_DB;
  let res: Response;
  try {
    res = await fetch(`${ODOO_URL}/web/session/authenticate`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'call', params }),
    });
  } catch {
    return NextResponse.json({ error: `Cannot reach Odoo at ${ODOO_URL}` }, { status: 502 });
  }
  const data = await res.json();
  if (data.error || !data.result?.uid) {
    const c = FAILS.get(key) || { n: 0, first: Date.now() };
    FAILS.set(key, { n: c.n + 1, first: c.first });
    return NextResponse.json({ error: data.error?.data?.message || 'Wrong login or password' }, { status: 401 });
  }
  FAILS.delete(key);
  const setCookie = res.headers.getSetCookie?.() || [];
  const sid = setCookie.map((c) => /session_id=([^;]+)/.exec(c)?.[1]).find(Boolean);
  if (!sid) return NextResponse.json({ error: 'Odoo did not return a session' }, { status: 502 });
  const secure = (req.headers.get('x-forwarded-proto') || new URL(req.url).protocol.replace(':', '')) === 'https';
  const out = NextResponse.json({ uid: data.result.uid, name: data.result.name });
  out.cookies.set('odoo_sid', sid, { httpOnly: true, secure, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 7 });
  out.cookies.set('otm_user', JSON.stringify({ uid: data.result.uid, name: data.result.name }),
    { secure, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 7 });
  return out;
}
