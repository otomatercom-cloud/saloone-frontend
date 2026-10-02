'use client';
import { useEffect, useState } from 'react';
import { money } from '@/lib/util';

type Series = { key: string; name: string; kind: string; values: number[] };
type Data = { labels: string[]; currency: string; series: Series[] };
const COLOR: Record<string, string> = { revenue: '#C2410C', bookings: '#7C2D12', commission: '#F59E0B', expenses: '#B45309' };

export default function Trends({ data }: { data: Data }) {
  const [key, setKey] = useState('revenue');
  const [p, setP] = useState(0);
  const [hov, setHov] = useState<number | null>(null);
  useEffect(() => {
    let raf = 0; const t0 = performance.now(); setP(0);
    const step = (t: number) => { const x = Math.min(1, (t - t0) / 900); setP(1 - Math.pow(1 - x, 3)); if (x < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [key]);
  const s = data.series.find((x) => x.key === key) || data.series[0];
  if (!s || data.series.every((x) => x.values.every((v) => !v))) return null;
  const fmt = (v: number) => (s.kind === 'sum' ? `${data.currency} ${money(v)}` : String(v));
  const W = 900, H = 230, L = 40, R = 40, T = 26, B = 32;
  const max = Math.max(1, ...s.values), n = s.values.length;
  const x = (i: number) => L + (n === 1 ? (W - L - R) / 2 : (i * (W - L - R)) / (n - 1));
  const y = (v: number) => T + (H - T - B) * (1 - (v / max) * p);
  const pts = s.values.map((v, i) => [x(i), y(v)] as const);
  const line = pts.map(([a, b], i) => `${i ? 'L' : 'M'}${a},${b}`).join(' ');
  const area = `${line} L${x(n - 1)},${H - B} L${x(0)},${H - B} Z`;
  const c = COLOR[s.key] || '#C2410C';
  return (
    <section className="card trend">
      <div className="perf-head">
        <h3>Monthly trend</h3>
        <div className="seg">{data.series.map((m) => <button key={m.key} className={key === m.key ? 'on' : ''} onClick={() => setKey(m.key)}>{m.name}</button>)}</div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="trend-svg" onMouseLeave={() => setHov(null)}>
        <defs><linearGradient id="tg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={c} stopOpacity=".35" /><stop offset="1" stopColor={c} stopOpacity="0" /></linearGradient></defs>
        {[0, .5, 1].map((g) => <line key={g} x1={L} x2={W - R} y1={T + (H - T - B) * g} y2={T + (H - T - B) * g} className="t-grid" />)}
        <path d={area} fill="url(#tg)" /><path d={line} fill="none" stroke={c} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {pts.map(([a, b], i) => (
          <g key={i} onMouseEnter={() => setHov(i)}>
            <rect x={a - 24} y={0} width={48} height={H} fill="transparent" />
            <circle cx={a} cy={b} r={hov === i ? 6 : 4} fill="#fff" stroke={c} strokeWidth="2.5" />
            <text x={a} y={H - 10} textAnchor="middle" className="t-lbl">{data.labels[i]}</text>
            {hov === i && <g><rect x={Math.min(Math.max(a - 55, 2), W - 112)} y={Math.max(b - 36, 0)} width="110" height="24" rx="7" fill="#3B1A0B" />
              <text x={Math.min(Math.max(a, 57), W - 57)} y={Math.max(b - 20, 16)} textAnchor="middle" className="t-tip">{fmt(s.values[i])}</text></g>}
          </g>
        ))}
      </svg>
    </section>
  );
}
