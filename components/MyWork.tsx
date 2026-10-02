'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CalendarClock, CreditCard, CheckCircle2, FileText, Wallet, UserCheck, Hourglass } from 'lucide-react';
import { searchCount } from '@/lib/odoo';

const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

type Item = { key: string; label: string; slug: string; model: string; domain: any[]; icon: any; tone: string };
const ITEMS = (): Item[] => [
  { key: 'today', label: "Today's bookings", slug: 'bookings', model: 'salon.booking', domain: [['booking_date', '=', today()], ['state', 'not in', ['cancelled', 'no_show']]], icon: CalendarClock, tone: 'info' },
  { key: 'arrive', label: 'Waiting to check in', slug: 'bookings', model: 'salon.booking', domain: [['booking_date', '=', today()], ['state', '=', 'confirmed']], icon: UserCheck, tone: 'warn' },
  { key: 'svc', label: 'In service now', slug: 'bookings', model: 'salon.booking', domain: [['state', 'in', ['checked_in', 'in_service']]], icon: Hourglass, tone: 'info' },
  { key: 'bill', label: 'To invoice / collect', slug: 'bookings', model: 'salon.booking', domain: [['state', '=', 'completed']], icon: CreditCard, tone: 'bad' },
  { key: 'exp', label: 'Expenses to approve', slug: 'expenses', model: 'salon.expense', domain: [['state', '=', 'draft']], icon: FileText, tone: 'warn' },
  { key: 'pay', label: 'Payouts to approve / pay', slug: 'payouts', model: 'salon.staff.payout', domain: [['state', 'in', ['calculated', 'approved']]], icon: Wallet, tone: 'warn' },
];

export default function MyWork() {
  const [rows, setRows] = useState<(Item & { n: number })[] | null>(null);
  useEffect(() => {
    let live = true;
    Promise.all(ITEMS().map(async (i) => {
      try { return { ...i, n: await searchCount(i.model, i.domain) }; } catch { return null; } // no access -> hidden
    })).then((r) => live && setRows(r.filter(Boolean) as any));
    return () => { live = false; };
  }, []);
  if (!rows || !rows.length) return null;
  const open = rows.filter((r) => r.n > 0);
  return (
    <section className="card mywork">
      <div className="mw-head"><h3>Needs attention</h3>
        <span className="muted">{open.length ? `${open.reduce((a, r) => a + r.n, 0)} item(s)` : 'All caught up'}</span></div>
      {!open.length ? <p className="mw-clear"><CheckCircle2 size={18} /> Nothing waiting right now.</p> : (
        <div className="mw-grid">
          {open.map((r) => {
            const I = r.icon;
            return (
              <Link key={r.key} className={`mw-item ${r.tone}`} href={`/${r.slug}?domain=${encodeURIComponent(JSON.stringify(r.domain))}&title=${encodeURIComponent(r.label)}`}>
                <span className="mw-ico"><I size={18} /></span>
                <span className="mw-n">{r.n}</span>
                <span className="mw-l">{r.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
