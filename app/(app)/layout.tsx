'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';
import { CONFIG, GROUPS } from '@/lib/config';
import { ICONS } from '@/components/icons';
import { LogOut, Menu, Moon, Rows3, Search, Sun } from 'lucide-react';
import CommandPalette from '@/components/CommandPalette';
import Bell from '@/components/Bell';
import Logo from '@/components/Logo';
import { cachedAccess, loadAccess, resetAccess } from '@/lib/access';

// custom pages that are not plain lists; shown when the user can read bookings
const EXTRA: Record<string, { href: string; title: string; icon: string }[]> = {
  'Front desk': [
    { href: '/bookings/new', title: 'New booking', icon: 'newbooking' },
    { href: '/checkin', title: 'Check-in board', icon: 'checkin' },
    { href: '/calendar', title: 'Staff calendar', icon: 'calendar' },
  ],
};

export default function AppLayout({ children }: { children: ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ name: string } | null>(null);
  const [menu, setMenu] = useState(false);
  const [allowed, setAllowed] = useState<Set<string> | null>(null);
  useEffect(() => { setAllowed(cachedAccess()); loadAccess().then(setAllowed); }, []);
  const [cmd, setCmd] = useState(false);
  const [dark, setDark] = useState(false);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    try { setDark(localStorage.getItem('otm.theme') === 'dark'); setCompact(localStorage.getItem('otm.density') === 'compact'); } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    document.documentElement.dataset.density = compact ? 'compact' : 'comfy';
    try { localStorage.setItem('otm.theme', dark ? 'dark' : 'light'); localStorage.setItem('otm.density', compact ? 'compact' : 'comfy'); } catch { /* ignore */ }
  }, [dark, compact]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setCmd((v) => !v); }
      else if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test((e.target as HTMLElement).tagName)) { e.preventDefault(); setCmd(true); }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);

  useEffect(() => {
    const m = document.cookie.split('; ').find((c) => c.startsWith('otm_user='));
    if (!m) { router.replace('/login'); return; }
    try { setUser(JSON.parse(decodeURIComponent(m.split('=')[1]))); } catch { router.replace('/login'); }
  }, [router]);
  useEffect(() => setMenu(false), [path]);
  // sign out automatically after a period without activity (default 30 min)
  useEffect(() => {
    const limit = Number(process.env.NEXT_PUBLIC_IDLE_MINUTES || 30) * 60000;
    if (!limit) return;
    let t: ReturnType<typeof setTimeout>;
    const reset = () => { clearTimeout(t); t = setTimeout(async () => { await fetch('/api/logout', { method: 'POST' }); location.href = '/login?idle=1'; }, limit); };
    const ev = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    ev.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => { clearTimeout(t); ev.forEach((e) => window.removeEventListener(e, reset)); };
  }, []);
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, []);

  async function logout() {
    await fetch('/api/logout', { method: 'POST' });
    resetAccess();
    router.replace('/login');
  }
  if (!user) return <div style={{ padding: '2rem', color: '#7a8190' }}>Loading…</div>;
  const on = (href: string) => (href === '/' ? path === '/' : path === href || path.startsWith(href + '/'));
  const Ico = ({ k }: { k: string }) => { const I = ICONS[k]; return I ? <I size={17} strokeWidth={1.9} /> : null; };
  const current = CONFIG.find((c) => path.startsWith('/' + c.slug));
  const crumb = path === '/' ? 'Dashboard' : path.startsWith('/bookings/new') ? 'New booking' : path.startsWith('/checkin') ? 'Check-in board' : path.startsWith('/calendar') ? 'Staff calendar' : current?.title || '';
  const initials = user.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div className="shell">
      <button className="burger" onClick={() => setMenu(!menu)} aria-label="Menu"><Menu size={20} /></button>
      <nav className={`side ${menu ? 'open' : ''}`}>
        <div className="brand"><Logo height={36} name={process.env.NEXT_PUBLIC_APP_NAME || 'Saloone'} sub="Salon management" /></div>
        <Link href="/" className={on('/') ? 'on' : ''}><Ico k="dashboard" />Dashboard</Link>
        {!allowed && <div className="side-skel"><i /><i /><i /><i /><i /><i /></div>}
        {allowed && GROUPS.map((g) => {
          const items = CONFIG.filter((c) => c.group === g && (!allowed || allowed.has(c.model)));
          if (allowed && !items.length) return null;
          return (
          <div key={g}>
            <div className="grp">{g}</div>
            {items.map((c) => (
              <Link key={c.slug} href={`/${c.slug}`} className={on(`/${c.slug}`) && !(c.slug === 'bookings' && path.startsWith('/bookings/new')) ? 'on' : ''}><Ico k={c.slug} />{c.title}</Link>
            ))}
            {(EXTRA[g] || []).filter((e) => !allowed || allowed.has('salon.booking')).map((e) => <Link key={e.href} href={e.href} className={on(e.href) ? 'on' : ''}><Ico k={e.icon} />{e.title}</Link>)}
          </div>
          );
        })}
      </nav>
      <div className="content">
        <header className="topbar">
          <div className="crumb"><span>Saloone</span><i>/</i><b>{crumb}</b></div>
          <button className="searchbtn" onClick={() => setCmd(true)}><Search size={15} /><span>Search…</span><kbd>Ctrl K</kbd></button>
          <div className="who">
            <Bell />
            <button className="icon-btn" title={dark ? 'Light mode' : 'Dark mode'} onClick={() => setDark(!dark)}>{dark ? <Sun size={16} /> : <Moon size={16} />}</button>
            <button className={`icon-btn ${compact ? 'on' : ''}`} title="Compact tables" onClick={() => setCompact(!compact)}><Rows3 size={16} /></button>
            <span className="avatar">{initials}</span>
            <span className="who-name">{user.name}</span>
            <button className="btn ghost sm" onClick={logout}><LogOut size={14} /> Sign out</button>
          </div>
        </header>
        <main className="main">{children}</main>
        <CommandPalette open={cmd} onClose={() => setCmd(false)} />
        <nav className="bottomnav">
          <Link href="/" className={on('/') ? 'on' : ''}><Ico k="dashboard" /><span>Home</span></Link>
          {(!allowed || allowed.has('salon.booking')) && <Link href="/bookings" className={on('/bookings') && !on('/bookings/new') ? 'on' : ''}><Ico k="bookings" /><span>Bookings</span></Link>}
          {(!allowed || allowed.has('salon.booking')) && <Link href="/bookings/new" className={on('/bookings/new') ? 'on' : ''}><Ico k="newbooking" /><span>New</span></Link>}
          <button onClick={() => setCmd(true)}><Search size={17} /><span>Search</span></button>
          <button onClick={() => setMenu(!menu)}><Menu size={17} /><span>Menu</span></button>
        </nav>
      </div>
    </div>
  );
}
