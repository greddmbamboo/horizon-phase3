'use client';
import { useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import { FlaskConical, X } from 'lucide-react';
import { btnClass } from './index';
import type { ComponentProps, ReactNode } from 'react';

/**
 * Keeps the page in sync with changes made in the other app: re-fetches server data
 * every few seconds while the tab is visible. (Production: swap for Supabase Realtime.)
 */
export function LiveRefresh({ every = 4000 }: { every?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => { if (document.visibilityState === 'visible') router.refresh(); }, every);
    const onFocus = () => router.refresh();
    window.addEventListener('focus', onFocus);
    return () => { clearInterval(t); window.removeEventListener('focus', onFocus); };
  }, [router, every]);
  return null;
}

/** Marks an email reviewed after it has been on screen for 2 seconds (PRD rule). */
export function AutoReviewed({ emailId, reviewed, action }: { emailId: string; reviewed: boolean; action: (id: string) => Promise<void> }) {
  const router = useRouter();
  useEffect(() => {
    if (reviewed) return;
    const t = setTimeout(async () => { await action(emailId); router.refresh(); }, 2000);
    return () => clearTimeout(t);
  }, [emailId, reviewed, action, router]);
  return null;
}

/** Submit button that shows a working state while its form's server action runs. */
export function SubmitButton({ variant = 'primary', children, pendingLabel, className, disabled, ...p }: ComponentProps<'button'> & { variant?: 'primary' | 'secondary' | 'link' | 'danger'; pendingLabel?: ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" {...p} disabled={pending || disabled} className={btnClass(variant, className)}>
      {pending ? pendingLabel ?? children : children}
    </button>
  );
}

/** "Working…" overlay with a spinner, used for rewrite/regenerate steps. */
export function Spinner({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-[13px] text-muted">
      <span className="hz-spin inline-block h-4 w-4 rounded-full border-2 border-accent border-t-transparent" /> {label}
    </span>
  );
}

/**
 * Prototype-only control panel: simulates what happens outside the app (replies arriving,
 * time passing) and resets the shared demo data. Not part of the product.
 */
export function DemoPanel({ children, otherApp }: { children: ReactNode; otherApp?: { href: string; label: string } }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);
  return (
    <div ref={ref} className="fixed bottom-14 left-4 z-30 print:hidden">
      {open && (
        <div className="mb-2 w-80 rounded-xl border border-line bg-page p-4 shadow-modal">
          <div className="mb-3 flex items-center gap-2">
            <FlaskConical size={16} className="text-muted" />
            <div className="text-sm font-semibold">Demo controls</div>
            <button className="ml-auto text-muted hover:text-ink" onClick={() => setOpen(false)} aria-label="Close demo controls"><X size={16} /></button>
          </div>
          <p className="mb-3 text-xs text-muted">Prototype only. These simulate things that happen outside the app.</p>
          <div className="flex flex-col gap-2">{children}</div>
          {otherApp && <a className={btnClass('link', 'mt-3 inline-block text-xs')} href={otherApp.href} target="_blank" rel="noreferrer">{otherApp.label} ↗</a>}
        </div>
      )}
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 rounded-full border border-line bg-page px-3.5 py-2 text-xs font-semibold text-ink shadow-modal hover:bg-sunk" aria-expanded={open}>
        <FlaskConical size={14} /> Demo
      </button>
    </div>
  );
}
