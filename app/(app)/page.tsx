'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { money } from '@/lib/util';
import { rpc } from '@/lib/odoo';
import { Spinner, useToast } from '@/components/ui';
import { Columns, Donut } from '@/components/Charts';
import MyWork from '@/components/MyWork';

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const monthStart = () => { const d = new Date(); d.setDate(1); return ymd(d); };

const KPIS: { key: string; label: string; kind: 'money' | 'count' | 'pct'; tone: string; go?: string }[] = [
  { key: 'revenue', label: 'Revenue', kind: 'money', tone: 'good' },
  { key: 'est_profit', label: 'Est. profit', kind: 'money', tone: 'good' },
  { key: 'bookings', label: 'Bookings', kind: 'count', tone: 'info', go: 'bookings' },
  { key: 'completed', label: 'Completed', kind: 'count', tone: 'good', go: 'bookings' },
  { key: 'avg_bill', label: 'Average bill', kind: 'money', tone: 'info' },
  { key: 'customers', label: 'Customers', kind: 'count', tone: 'info' },
  { key: 'new_customers', label: 'New customers', kind: 'count', tone: 'good' },
  { key: 'repeat_rate', label: 'Repeat rate', kind: 'pct', tone: 'good' },
  { key: 'cancelled', label: 'Cancelled', kind: 'count', tone: 'warn', go: 'bookings' },
  { key: 'no_show', label: 'No-shows', kind: 'count', tone: 'bad', go: 'bookings' },
  { key: 'no_show_rate', label: 'No-show rate', kind: 'pct', tone: 'bad' },
  { key: 'discount', label: 'Discounts given', kind: 'money', tone: 'warn' },
  { key: 'commission', label: 'Staff commission', kind: 'money', tone: 'warn' },
  { key: 'expenses', label: 'Expenses', kind: 'money', tone: 'warn' },
  { key: 'staff_working', label: 'Staff working', kind: 'count', tone: 'info' },
];

export default function Dashboard() {
  const router = useRouter();
  const { push } = useToast();
  const [data, setData] = useState<any>(null);
  const [meta, setMeta] = useState<any>(null);
  const [f, setF] = useState<{ from: string; to: string; emp: number | ''; prod: number | '' }>({ from: monthStart(), to: ymd(new Date()), emp: '', prod: '' });
  useEffect(() => { rpc('salon.booking', 'get_booking_meta', []).then(setMeta).catch(() => {}); }, []);

  const load = useCallback(() => {
    rpc('salon.dashboard', 'get_dashboard_data', [], { date_from: f.from, date_to: f.to, employee_id: f.emp || false, product_id: f.prod || false })
      .then(setData).catch((e) => push(e.message, 'err'));
  }, [f, push]);
  useEffect(() => { load(); }, [load]);

  if (!data) return <Spinner />;
  const cur = data.currency;
  const fmtK = (k: (typeof KPIS)[number]) => {
    const v = data.kpis[k.key] ?? 0;
    return k.kind === 'money' ? `${cur} ${money(v)}` : k.kind === 'pct' ? `${money(v)}%` : Number(v).toLocaleString();
  };
  const rows = (c: any[] = []) => c.map((r) => ({ key: r.label, label: r.label, value: Math.round((r.value || 0) * 100) / 100 }));
  const days = rows(data.charts.revenue_by_day).slice(-14).map((r) => ({ ...r, label: r.label.slice(5) }));
  return (
    <div>
      <div className="page-head"><h1>Dashboard</h1></div>
      <MyWork />
      <div className="filters">
        <input type="date" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} />
        <input type="date" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} />
        <select value={f.emp} onChange={(e) => setF({ ...f, emp: e.target.value ? Number(e.target.value) : '' })}>
          <option value="">All staff</option>{(meta?.staff || []).map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={f.prod} onChange={(e) => setF({ ...f, prod: e.target.value ? Number(e.target.value) : '' })}>
          <option value="">All services</option>{(meta?.services || []).map((s: any) => <option key={s.id} value={s.id}>{s.display_name}</option>)}
        </select>
        <button className="btn ghost sm" onClick={() => setF({ from: ymd(new Date()), to: ymd(new Date()), emp: '', prod: '' })}>Today</button>
        <button className="btn ghost sm" onClick={() => setF({ from: monthStart(), to: ymd(new Date()), emp: '', prod: '' })}>This month</button>
      </div>
      <div className="kpis">
        {KPIS.map((k) => (
          <button key={k.key} className={`kpi ${k.tone}`} onClick={() => k.go && router.push(`/${k.go}`)}>
            <span className="kpi-label">{k.label}</span>
            <span className="kpi-value">{fmtK(k)}</span>
          </button>
        ))}
      </div>
      <div className="cards2">
        <section className="card"><h3>Revenue by day</h3><Columns rows={days} /></section>
        <section className="card"><h3>Booking status</h3><Donut rows={rows(data.charts.booking_status)} /></section>
        <section className="card"><h3>Revenue by staff</h3><Columns rows={rows(data.charts.revenue_by_staff).slice(0, 8)} /></section>
        <section className="card"><h3>Revenue by service</h3><Donut rows={rows(data.charts.revenue_by_service).slice(0, 8)} /></section>
        <section className="card"><h3>Commission by staff</h3><Columns rows={rows(data.charts.commission_by_staff).slice(0, 8)} /></section>
        <section className="card"><h3>Expenses by category</h3><Donut rows={rows(data.charts.expenses_by_category).slice(0, 8)} /></section>
      </div>
    </div>
  );
}
