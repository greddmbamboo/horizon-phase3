'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@horizon/ui';

const NAV = [
  { label: 'Discovery', href: '/discovery' },
  { label: 'Opportunity Overview', href: '/opportunity' },
  { label: 'Review Group', href: '/review-group' },
  { label: 'People Directory', href: '/people' },
  { label: 'Sharing and Decisions', href: '/decisions' },
  { label: 'Outreach Queue', href: '/queue' },
  { label: 'Messaging', href: '/messaging' },
];

export function Sidebar({ queueCount }: { queueCount: number }) {
  const path = usePathname();
  return (
    <aside className="sticky top-0 flex h-screen w-[220px] shrink-0 flex-col gap-1 bg-rail px-4 py-5 text-rail-ink">
      <div className="text-[22px] font-bold leading-tight">hofund</div>
      <div className="mb-5 text-[11px] font-semibold uppercase tracking-wider text-rail-muted">Operator App</div>
      <nav className="flex flex-col gap-1">
        {NAV.map((n) => {
          const active = path === n.href || path.startsWith(n.href + '/');
          return (
            <Link key={n.href} href={n.href} aria-current={active ? 'page' : undefined}
              className={cn('relative flex items-center rounded-md px-3 py-2 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-rail-marker', active ? 'bg-rail-active font-semibold' : 'text-rail-muted hover:bg-rail-active/60 hover:text-rail-ink')}>
              {active && <span className="absolute left-0 top-2 h-5 w-[3px] rounded bg-rail-marker" />}
              <span className="flex-1">{n.label}</span>
              {n.href === '/queue' && queueCount > 0 && <span className="rounded-full bg-rail-marker px-1.5 text-[10px] font-semibold text-ink">{queueCount}</span>}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto text-[11px] text-rail-muted">Signed in as Addler Pluviose</div>
    </aside>
  );
}
