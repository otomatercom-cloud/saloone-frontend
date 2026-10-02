'use client';
import { useEffect, useRef, useState } from 'react';

/** Shows /public/logo.png if you add one; otherwise the "S" mark + name. */
export default function Logo({ height = 34, badge = false, name, sub }: { height?: number; badge?: boolean; name?: string; sub?: string }) {
  const [missing, setMissing] = useState(false);
  const ref = useRef<HTMLImageElement>(null);
  // the image can fail before React attaches onError (server-rendered page), so check once on mount too
  useEffect(() => { const i = ref.current; if (i && i.complete && i.naturalWidth === 0) setMissing(true); }, []);
  if (missing) {
    return (<>
      <span className="logo-mark" style={{ width: height, height }}>S</span>
      {(name || sub) && <span>{name}{sub && <small>{sub}</small>}</span>}
    </>);
  }
  // eslint-disable-next-line @next/next/no-img-element
  const img = <img ref={ref} src="/logo.png" alt="Company logo" height={height} style={{ height, width: 'auto', maxWidth: 190, display: 'block', objectFit: 'contain' }} onError={() => setMissing(true)} />;
  return (<>
    {badge ? <span className="logo-badge">{img}</span> : img}
    {sub && <small className="logo-sub">{sub}</small>}
  </>);
}
