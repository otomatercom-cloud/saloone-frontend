import { NextResponse } from 'next/server';

export async function POST() {
  const out = NextResponse.json({ ok: true });
  out.cookies.delete('odoo_sid');
  out.cookies.delete('otm_user');
  return out;
}
