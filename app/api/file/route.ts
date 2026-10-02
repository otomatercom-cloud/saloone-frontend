import { NextRequest, NextResponse } from 'next/server';
import { ODOO_URL } from '@/lib/server';

// download an attachment/binary field through the logged-in Odoo session
export async function GET(req: NextRequest) {
  const sid = req.cookies.get('odoo_sid')?.value;
  if (!sid) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
  const q = req.nextUrl.searchParams;
  const model = q.get('model') || '', id = q.get('id') || '', field = q.get('field') || '';
  if (!/^[a-z0-9_.]+$/.test(model) || !/^\d+$/.test(id) || !/^[a-z0-9_]+$/.test(field)) return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  const r = await fetch(`${ODOO_URL}/web/content/${model}/${id}/${field}?download=true`, { headers: { cookie: `session_id=${sid}` }, cache: 'no-store' });
  if (!r.ok) return NextResponse.json({ error: 'File not available' }, { status: r.status });
  return new NextResponse(r.body, { headers: {
    'content-type': r.headers.get('content-type') || 'application/octet-stream',
    'content-disposition': r.headers.get('content-disposition') || 'attachment',
  } });
}
