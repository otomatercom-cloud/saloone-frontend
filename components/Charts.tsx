'use client';
import { useEffect, useState } from 'react';

type Row = { key: string; label: string; value: number };
const PALETTE = ['#C2410C', '#D97706', '#7C2D12', '#F59E0B', '#B45309', '#EA580C', '#A16207', '#92400E', '#78716C'];

function useGrow() {
  const [p, setP] = useState(0);
  useEffect(() => {
    let raf = 0; const t0 = performance.now();
    const step = (t: number) => { const x = Math.min(1, (t - t0) / 900); setP(1 - Math.pow(1 - x, 3)); if (x < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);
  return p;
}

export function Donut({ rows }: { rows: Row[] }) {
  const p = useGrow();
  const [hov, setHov] = useState<number | null>(null);
  const total = rows.reduce((a, r) => a + r.value, 0);
  if (!total) return <p className="muted">No data</p>;
  const R = 52, C = 2 * Math.PI * R;
  let acc = 0;
  return (
    <div className="donut-wrap">
      <svg viewBox="0 0 140 140" className="donut">
        <circle cx="70" cy="70" r={R} fill="none" stroke="#EFE2CF" strokeWidth="18" />
        {rows.map((r, i) => {
          const len = (r.value / total) * C * p;
          const off = -acc * p; acc += (r.value / total) * C;
          return <circle key={r.key} cx="70" cy="70" r={R} fill="none" stroke={PALETTE[i % PALETTE.length]}
            strokeWidth={hov === i ? 22 : 18} strokeDasharray={`${len} ${C - len}`} strokeDashoffset={off}
            transform="rotate(-90 70 70)" onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)} style={{ transition: 'stroke-width .15s' }} />;
        })}
        <text x="70" y="66" textAnchor="middle" className="d-num">{hov !== null ? rows[hov].value : total}</text>
        <text x="70" y="82" textAnchor="middle" className="d-lbl">{hov !== null ? rows[hov].label.slice(0, 14) : 'Total'}</text>
      </svg>
      <ul className="legend">
        {rows.map((r, i) => (
          <li key={r.key} onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)} className={hov === i ? 'on' : ''}>
            <i style={{ background: PALETTE[i % PALETTE.length] }} /><span>{r.label}</span><b>{r.value}</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Columns({ rows }: { rows: Row[] }) {
  const p = useGrow();
  const [hov, setHov] = useState<number | null>(null);
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (!rows.length) return <p className="muted">No data</p>;
  const W = 320, H = 170, pad = 24, bw = Math.min(34, (W - pad * 2) / rows.length - 8);
  const step = (W - pad * 2) / rows.length;
  return (
    <svg viewBox={`0 0 ${W} ${H + 34}`} className="cols">
      <defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#F59E5B" /><stop offset="1" stopColor="#C2410C" /></linearGradient></defs>
      {[0, .25, .5, .75, 1].map((g) => <line key={g} x1={pad} x2={W - pad} y1={H - g * (H - 20)} y2={H - g * (H - 20)} stroke="#EFE2CF" />)}
      {rows.map((r, i) => {
        const h = (r.value / max) * (H - 28) * p, x = pad + i * step + (step - bw) / 2;
        return (
          <g key={r.key} onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)}>
            <rect x={x} y={H - h} width={bw} height={h} rx="6" fill={hov === i ? '#9A3412' : 'url(#cg)'} />
            <text x={x + bw / 2} y={H - h - 6} textAnchor="middle" className="c-val">{r.value}</text>
            <text x={x + bw / 2} y={H + 14} textAnchor="middle" className="c-lbl">{r.label.length > 9 ? r.label.slice(0, 8) + '…' : r.label}</text>
            <title>{r.label}: {r.value}</title>
          </g>
        );
      })}
    </svg>
  );
}
