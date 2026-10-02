'use client';
import { useEffect, useState } from 'react';
import { Sun, Sunrise, Sunset, Moon } from 'lucide-react';

function part(h: number) {
  if (h < 5) return { t: 'Good night', Icon: Moon, cls: 'night' };
  if (h < 12) return { t: 'Good morning', Icon: Sunrise, cls: 'morning' };
  if (h < 17) return { t: 'Good afternoon', Icon: Sun, cls: 'afternoon' };
  if (h < 21) return { t: 'Good evening', Icon: Sunset, cls: 'evening' };
  return { t: 'Good night', Icon: Moon, cls: 'night' };
}

export default function Welcome({ subtitle }: { subtitle?: string }) {
  const [name, setName] = useState('');
  const [now, setNow] = useState<Date | null>(null);
  const [show, setShow] = useState(true);

  useEffect(() => {
    try {
      const m = document.cookie.split('; ').find((c) => c.startsWith('otm_user='));
      if (m) setName(JSON.parse(decodeURIComponent(m.split('=')[1])).name || '');
    } catch { /* ignore */ }
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  if (!now || !show) return null;
  const { t, Icon, cls } = part(now.getHours());
  const first = name.split(' ')[0];
  return (
    <section className={`welcome ${cls}`}>
      <span className="w-orb o1" /><span className="w-orb o2" /><span className="w-orb o3" />
      <div className="w-icon"><Icon size={34} /></div>
      <div className="w-text">
        <h2>{t}{first ? `, ${first}` : ''} <span className="wave">👋</span></h2>
        <p>{subtitle || 'Here is how the salon is doing today.'}</p>
      </div>
      <div className="w-time">
        <b>{now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</b>
        <span>{now.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
      </div>
      <button className="w-close" onClick={() => setShow(false)} aria-label="Dismiss">×</button>
    </section>
  );
}
