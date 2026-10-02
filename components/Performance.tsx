'use client';
import { useEffect, useState } from 'react';
import { money } from '@/lib/util';

type Row = { name: string; services: number; revenue: number; commission: number };
const METRICS = [
  { k: 'revenue', label: 'Revenue' },
  { k: 'services', label: 'Services done' },
  { k: 'commission', label: 'Commission' },
  { k: 'avg', label: 'Avg / service' },
] as const;
const COLORS = ['#C2410C', '#D97706', '#7C2D12', '#F59E0B', '#B45309', '#EA580C', '#A16207', '#92400E'];

export default function Performance({ title, who, rows, currency }: { title: string; who?: string; rows: Row[]; currency: string }) {
  const [metric, setMetric] = useState<(typeof METRICS)[number]['k']>('revenue');
  const [p, setP] = useState(0);
  useEffect(() => {
    let raf = 0; const t0 = performance.now();
    setP(0);
    const step = (t: number) => { const x = Math.min(1, (t - t0) / 800); setP(1 - Math.pow(1 - x, 3)); if (x < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [metric, rows]);
  if (!rows.length) return null;
  const val = (r: Row) => (metric === 'avg' ? (r.services ? r.revenue / r.services : 0) : ((r as any)[metric] as number));
  const fmt = (v: number) => (metric === 'services' ? String(v) : `${currency} ${money(v)}`);
  const sorted = [...rows].sort((a, b) => val(b) - val(a));
  const max = Math.max(1, ...sorted.map(val));
  const tot = rows.reduce((a, r) => ({ services: a.services + r.services, revenue: a.revenue + r.revenue, commission: a.commission + r.commission }), { services: 0, revenue: 0, commission: 0 });
  return (
    <section className="card perf">
      <div className="perf-head">
        <h3>{title}</h3>
        <div className="seg">
          {METRICS.map((m) => <button key={m.k} className={metric === m.k ? 'on' : ''} onClick={() => setMetric(m.k)}>{m.label}</button>)}
        </div>
      </div>
      <div className="perf-sum">
        <div><span>Services done</span><b>{tot.services}</b></div>
        <div><span>Revenue</span><b>{currency} {money(tot.revenue)}</b></div>
        <div><span>Commission</span><b>{currency} {money(tot.commission)}</b></div>
        <div><span>Avg / service</span><b>{currency} {money(tot.services ? tot.revenue / tot.services : 0)}</b></div>
      </div>
      <div className="perf-bars">
        {sorted.map((r, i) => (
          <div key={r.name + i} className="perf-row">
            <span className="rank">{i + 1}</span>
            <span className="pname" title={r.name}>{i === 0 ? '🏆 ' : ''}{r.name}</span>
            <div className="ptrack"><i style={{ width: `${(val(r) / max) * 100 * p}%`, background: `linear-gradient(90deg, ${COLORS[i % COLORS.length]}, ${COLORS[i % COLORS.length]}bb)` }} /></div>
            <b>{fmt(val(r))}</b>
          </div>
        ))}
      </div>
    </section>
  );
}
