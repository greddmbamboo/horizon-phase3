'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { cn } from '@horizon/ui';

const NAV = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Opportunity Overview', href: '/opportunity' },
  { label: 'Company Review', href: '/companies' },
  { label: 'People', href: '/people' },
  { label: 'Outreach', href: '/outreach' },
  { label: 'Communication Settings', href: '/settings' },
];

export function Sidebar({ clientName, engagement, unread }: { clientName: string; engagement: string; unread: number }) {
  const path = usePathname();
  return (
    <aside className="sticky top-0 flex h-screen w-[220px] shrink-0 flex-col gap-1 border-r border-rail-edge bg-rail px-4 py-5 text-rail-ink">
      <div className="text-lg font-bold leading-tight">{clientName}</div>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-rail-muted">Client Portal</div>
      <div className="flex flex-col gap-1 pb-4 pt-4">
        <span className="text-[11px] font-medium text-rail-muted">Engagement</span>
        <button className="flex items-center gap-2 rounded-md border border-line-strong bg-page px-2.5 py-2 text-left text-[13px] font-medium" aria-label="Switch engagement">
          <span className="flex-1">{engagement}</span><ChevronDown size={14} className="text-muted" />
        </button>
      </div>
      <nav className="flex flex-col gap-1">
        {NAV.map((n) => {
          const active = path === n.href || path.startsWith(n.href + '/');
          return (
            <Link key={n.href} href={n.href} aria-current={active ? 'page' : undefined}
              className={cn('hz-focus relative flex items-center gap-2 rounded-md px-3 py-2 text-[13px]', active ? 'bg-rail-active font-semibold' : 'hover:bg-sunk')}>
              {active && <span className="absolute left-0 top-2 h-5 w-[3px] rounded bg-rail-marker" />}
              <span className="flex-1">{n.label}</span>
              {n.label === 'Dashboard' && unread > 0 && <span className="rounded-full bg-accent px-1.5 text-[10px] font-semibold text-accent-fg">{unread}</span>}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto text-[11px] font-medium text-rail-muted">Powered by Hofund Horizon</div>
    </aside>
  );
}
