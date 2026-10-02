'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { rpc, searchRead } from '@/lib/odoo';
import { Spinner, useToast } from '@/components/ui';

const START_H = 8, END_H = 21, PX = 56;
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const toOdoo = (d: Date) => d.toISOString().slice(0, 19).replace('T', ' ');
const fromOdoo = (s: string) => new Date(s.replace(' ', 'T') + 'Z');

export default function CalendarPage() {
  const router = useRouter();
  const { push } = useToast();
  const [day, setDay] = useState(ymd(new Date()));
  const [staff, setStaff] = useState<{ id: number; name: string }[]>([]);
  const [ev, setEv] = useState<any[] | null>(null);
  useEffect(() => { rpc<any>('salon.booking', 'get_booking_meta', []).then((m) => setStaff(m.staff)).catch((e) => push(e.message, 'err')); }, [push]);
  useEffect(() => {
    const d0 = new Date(day + 'T00:00:00'); const d1 = new Date(d0); d1.setDate(d1.getDate() + 1);
    setEv(null);
    searchRead('salon.booking.line', [['line_start', '<', toOdoo(d1)], ['line_end', '>', toOdoo(d0)], ['state', '!=', 'cancelled']],
      ['employee_id', 'line_start', 'line_end', 'product_id', 'partner_id', 'booking_id', 'booking_state']).then(setEv).catch((e) => { push(e.message, 'err'); setEv([]); });
  }, [day, push]);
  const shift = (n: number) => { const d = new Date(day + 'T00:00:00'); d.setDate(d.getDate() + n); setDay(ymd(d)); };
  const hours = Array.from({ length: END_H - START_H }, (_, i) => START_H + i);
  const top = (d: Date) => (d.getHours() + d.getMinutes() / 60 - START_H) * PX;
  return (
    <div>
      <div className="page-head"><h1>Staff calendar</h1>
        <span className="actions"><button className="btn ghost sm" onClick={() => shift(-1)}>←</button>
          <input type="date" value={day} onChange={(e) => setDay(e.target.value)} />
          <button className="btn ghost sm" onClick={() => shift(1)}>→</button>
          <button className="btn ghost sm" onClick={() => setDay(ymd(new Date()))}>Today</button></span></div>
      {!ev ? <Spinner /> : (
        <div className="cal" style={{ gridTemplateColumns: `54px repeat(${Math.max(staff.length, 1)}, minmax(150px,1fr))` }}>
          <div className="col"><div className="hd">&nbsp;</div><div style={{ position: 'relative', height: hours.length * PX }}>
            {hours.map((h) => <div key={h} className="muted" style={{ position: 'absolute', top: (h - START_H) * PX, left: 6, fontSize: '.72rem' }}>{h}:00</div>)}</div></div>
          {staff.map((s) => (
            <div className="col" key={s.id}><div className="hd">{s.name}</div>
              <div style={{ position: 'relative', height: hours.length * PX }}>
                {hours.map((h) => <div key={h} className="hr" style={{ top: (h - START_H) * PX }} />)}
                {ev.filter((e) => e.employee_id?.[0] === s.id).map((e) => {
                  const a = fromOdoo(e.line_start), b = fromOdoo(e.line_end);
                  return <div key={e.id} className="ev" style={{ top: Math.max(top(a), 0), height: Math.max(((b.getTime() - a.getTime()) / 36e5) * PX, 22) }}
                    onClick={() => router.push(`/bookings/${e.booking_id[0]}`)} title={e.booking_id[1]}>
                    <b>{e.partner_id?.[1]}</b><br />{e.product_id?.[1]}</div>;
                })}
              </div></div>
          ))}
        </div>
      )}
    </div>
  );
}
