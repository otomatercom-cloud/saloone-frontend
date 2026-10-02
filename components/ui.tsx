'use client';
import { createContext, useCallback, useContext, useState, ReactNode } from 'react';
import { tone } from '@/lib/util';

type ToastCtx = { push: (msg: string, kind?: 'ok' | 'err') => void };
const Ctx = createContext<ToastCtx>({ push: () => {} });
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<{ id: number; msg: string; kind: string }[]>([]);
  const push = useCallback((msg: string, kind: 'ok' | 'err' = 'ok') => {
    const id = Date.now() + Math.random();
    setItems((x) => [...x, { id, msg, kind }]);
    setTimeout(() => setItems((x) => x.filter((i) => i.id !== id)), kind === 'err' ? 9000 : 3500);
  }, []);
  return (
    <Ctx.Provider value={{ push }}>
      {children}
      <div className="toasts">
        {items.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`} onClick={() => setItems((x) => x.filter((i) => i.id !== t.id))}>
            {t.msg}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export const Badge = ({ state, label }: { state: string; label?: string }) => (
  <span className={`badge ${tone(state)}`}>{label ?? state.replace(/_/g, ' ')}</span>
);

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="modal-bg" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head"><h3>{title}</h3><button className="btn ghost sm" onClick={onClose}>✕</button></div>
        {children}
      </div>
    </div>
  );
}

export const Spinner = () => <div className="spinner">Loading…</div>;
