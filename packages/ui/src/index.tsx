/**
 * Horizon shared components. Server-component friendly (no hooks) unless noted.
 * Interactive pieces (Modal) live in ./modal.tsx with 'use client'.
 */
import clsx from 'clsx';
import Link from 'next/link';
import { ArrowLeft, Check, X } from 'lucide-react';
import type { ComponentProps, CSSProperties, ReactNode } from 'react';

export const cn = (...a: Parameters<typeof clsx>) => clsx(...a);

/* ------------------------------------------------------------------ Buttons & links */

type BtnVariant = 'primary' | 'secondary' | 'link' | 'danger';
const btnBase = 'hz-focus inline-flex items-center justify-center gap-2 whitespace-nowrap text-[13px] font-medium transition-colors disabled:cursor-not-allowed';
export function btnClass(variant: BtnVariant = 'secondary', extra?: string) {
  return cn(
    btnBase,
    variant === 'primary' && 'rounded-md bg-action-bg px-[14px] py-2 text-action-fg hover:brightness-95 disabled:bg-disabled-bg disabled:text-disabled-fg disabled:hover:brightness-100',
    variant === 'secondary' && 'rounded-md border border-line-strong bg-page px-[14px] py-2 text-ink hover:bg-sunk disabled:text-disabled-fg',
    variant === 'danger' && 'rounded-md bg-status-failed px-[14px] py-2 text-white hover:brightness-95',
    variant === 'link' && 'text-link underline underline-offset-2 hover:opacity-80 disabled:text-disabled-fg disabled:no-underline',
    extra,
  );
}

export function Button({ variant = 'secondary', className, ...p }: ComponentProps<'button'> & { variant?: BtnVariant }) {
  return <button className={btnClass(variant, className)} {...p} />;
}

export function LinkButton({ variant = 'secondary', className, ...p }: ComponentProps<typeof Link> & { variant?: BtnVariant }) {
  return <Link className={btnClass(variant, className)} {...p} />;
}

/** Action rows are always right-aligned, primary action last (Hofund design rule). */
export function Actions({ children, className, start }: { children: ReactNode; className?: string; start?: ReactNode }) {
  return (
    <div className={cn('flex flex-wrap items-center gap-4', className)}>
      {start}
      <div className="ml-auto flex flex-wrap items-center justify-end gap-4">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ Status */

export type Tone = 'Needs Action' | 'In Progress' | 'Done' | 'Failed' | 'Inactive' | 'Updated';
const toneColor: Record<Tone, string> = {
  'Needs Action': 'bg-status-needs',
  'In Progress': 'bg-status-progress',
  Done: 'bg-status-done',
  Failed: 'bg-status-failed',
  Inactive: 'bg-status-inactive',
  Updated: 'bg-status-updated',
};

/** Status Pill: where something stands. White pill, grey outline, coloured dot. */
export function Pill({ tone, children, className }: { tone: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-line-strong bg-page px-2.5 py-1 text-xs font-medium leading-none text-ink', className)}>
      <span className={cn('h-2 w-2 shrink-0 rounded-full', toneColor[tone])} aria-hidden />
      {children}
    </span>
  );
}

/** Count bubble: only for to-dos (e.g. a tab that needs review). */
export function CountBadge({ n }: { n: number }) {
  return <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-semibold text-accent-fg">{n}</span>;
}

/** Numbered issue badge (Carrot 300). */
export function IssueBadge({ n }: { n: number }) {
  return <span className="inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-carrot-300 text-xs font-bold text-ink">{n}</span>;
}

export function CheckDot({ ok }: { ok: boolean }) {
  return ok ? (
    <span className="inline-flex h-[14px] w-[14px] items-center justify-center rounded-full bg-status-done text-white" aria-label="Passed"><Check size={10} strokeWidth={3} /></span>
  ) : (
    <span className="inline-flex h-[14px] w-[14px] items-center justify-center rounded-full border-[1.5px] border-status-failed text-status-failed" aria-label="Failed"><X size={9} strokeWidth={3} /></span>
  );
}

/* ------------------------------------------------------------------ Surfaces */

export function Card({ className, children, ...p }: ComponentProps<'div'>) {
  return <div className={cn('rounded-card border border-line bg-page', className)} {...p}>{children}</div>;
}

const bannerEdge: Record<string, string> = { info: 'bg-accent', success: 'bg-status-done', warn: 'bg-carrot-400', fail: 'bg-status-failed', muted: 'bg-status-inactive' };
const bannerDot: Record<string, string> = { info: 'bg-accent', success: 'bg-status-done', warn: 'bg-carrot-400', fail: 'bg-status-failed', muted: 'bg-status-inactive' };

/** Highlight banner: Parchment 400 surface with a coloured left edge. */
export function Banner({ tone = 'info', title, children, actions, className }: { tone?: 'info' | 'success' | 'warn' | 'fail' | 'muted'; title: ReactNode; children?: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <div className={cn('relative overflow-hidden rounded-card bg-highlight px-5 py-4', className)} role="status">
      <span className={cn('absolute inset-y-0 left-0 w-[3px]', bannerEdge[tone])} />
      <div className="flex flex-wrap items-center gap-2.5">
        <span className={cn('h-2.5 w-2.5 rounded-full', bannerDot[tone])} aria-hidden />
        <div className="text-[15px] font-semibold">{title}</div>
        {actions && <div className="ml-auto flex items-center gap-4">{actions}</div>}
      </div>
      {children && <div className="mt-1.5 text-[13px] leading-relaxed text-muted">{children}</div>}
    </div>
  );
}

export function PageHeader({ back, title, subtitle, right, status }: { back?: { href: string; label: string }; title: ReactNode; subtitle?: ReactNode; right?: ReactNode; status?: ReactNode }) {
  return (
    <header className="flex flex-col gap-3">
      {back && (
        <Link href={back.href} className="hz-focus inline-flex w-fit items-center gap-1.5 text-xs font-medium text-link hover:opacity-80">
          <ArrowLeft size={13} strokeWidth={2} /> {back.label}
        </Link>
      )}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-3">
          <h1 className="text-[22px] font-semibold leading-tight">{title}</h1>
          <div className="ml-auto flex items-center gap-3">{status}{right}</div>
        </div>
        {subtitle && <p className="font-serif text-[15px] text-muted">{subtitle}</p>}
      </div>
    </header>
  );
}

export function Tabs({ items }: { items: { label: string; href: string; active?: boolean; count?: number }[] }) {
  return (
    <nav className="flex gap-1 border-b border-line" aria-label="Sections">
      {items.map((t) => (
        <Link key={t.href} href={t.href} aria-current={t.active ? 'page' : undefined}
          className={cn('hz-focus -mb-px inline-flex items-center gap-2 border-b-2 px-3 py-2.5 text-[13px]', t.active ? 'border-accent font-semibold text-ink' : 'border-transparent text-muted hover:text-ink')}>
          {t.label}{t.count ? <CountBadge n={t.count} /> : null}
        </Link>
      ))}
    </nav>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <h2 className="text-[17px] font-semibold">{children}</h2>
      {right && <div className="ml-auto flex items-center gap-3 text-[13px] text-muted">{right}</div>}
    </div>
  );
}

export function StatCard({ label, value, note }: { label: string; value: ReactNode; note?: string }) {
  return (
    <div className="relative overflow-hidden rounded-card border border-line bg-page p-4">
      <span className="absolute inset-x-0 top-0 h-[3px] bg-accent" />
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1 text-[26px] font-semibold leading-tight">{value}</div>
      {note && <div className="mt-1 text-xs text-muted">{note}</div>}
    </div>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-card bg-sunk px-8 py-14 text-center">
      <div className="text-[17px] font-semibold">{title}</div>
      {children && <div className="max-w-md text-sm text-muted">{children}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function ErrorState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-card border border-line px-8 py-14 text-center">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-status-failed text-lg font-bold text-white">!</span>
      <div className="text-[17px] font-semibold">{title}</div>
      {children && <div className="max-w-md text-sm text-muted">{children}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function Skeleton({ className, style }: { className?: string; style?: CSSProperties }) {
  // A span, so it can stand in for text inside a <p> (e.g. a page subtitle while loading).
  return <span className={cn('hz-skeleton block', className)} style={style} />;
}

/** Loading placeholders matching the Figma loading frames: a row of stat cards and a table. */
export function SkeletonStats({ n = 4 }: { n?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-flow-col md:grid-cols-none" aria-hidden>
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="flex flex-col gap-2.5 rounded-card border border-line bg-page p-4"><Skeleton className="h-2.5 w-[90px]" /><Skeleton className="h-[22px] w-[50px]" /></div>
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 6 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-card border border-line" aria-hidden>
      <div className="flex gap-[60px] bg-sunk px-4 py-3.5">{[120, 80, 100, 90].map((w, i) => <Skeleton key={i} className="h-2.5" style={{ width: w }} />)}</div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-[60px] border-t border-line px-4 py-[18px]">
          <div className="flex flex-col gap-2"><Skeleton className="h-3 w-[160px]" /><Skeleton className="h-2.5 w-[100px]" /></div>
          {[80, 110, 90].map((w, i) => <Skeleton key={i} className="h-3" style={{ width: w }} />)}
        </div>
      ))}
    </div>
  );
}

/** Screen-reader announcement for a loading region. */
export function LoadingNote({ label }: { label: string }) {
  return <span className="sr-only" role="status">{label}</span>;
}

/* ------------------------------------------------------------------ Tables */

export function Table({ head, children, className }: { head: ReactNode[]; children: ReactNode; className?: string }) {
  return (
    <div className={cn('overflow-x-auto rounded-card border border-line', className)}>
      <table className="w-full border-collapse text-[13px]">
        <thead className="bg-sunk text-left text-xs text-muted">
          <tr>{head.map((h, i) => <th key={i} className="px-4 py-3 font-semibold">{h}</th>)}</tr>
        </thead>
        <tbody className="[&>tr]:border-t [&>tr]:border-line [&_td]:px-4 [&_td]:py-3.5 [&_td]:align-middle">{children}</tbody>
      </table>
    </div>
  );
}

export function PersonCell({ name, sub }: { name: string; sub?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-semibold text-ink">{name}</span>
      {sub && <span className="text-xs text-muted">{sub}</span>}
    </div>
  );
}

/* ------------------------------------------------------------------ Form fields */

export const checkboxClass = 'hz-focus h-[18px] w-[18px] shrink-0 rounded-[4px] accent-[rgb(var(--accent))]';

export const inputClass = 'hz-focus w-full rounded-md border border-line-strong bg-page px-3 py-2.5 text-sm text-ink placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent';

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-medium">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}

/* ------------------------------------------------------------------ Analysis line */

export function AnalysisRow({ items, action }: { items: string[]; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-parchment-600 pt-3 text-[13px]">
      <span className="text-accent" aria-hidden>✦</span>
      <span className="font-semibold">Analysis</span>
      {items.map((t) => <span key={t} className="text-muted">·&nbsp; {t}</span>)}
      {action && <span className="ml-auto">{action}</span>}
    </div>
  );
}
