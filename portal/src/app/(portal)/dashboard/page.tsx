import Link from 'next/link';
import { getState } from '@horizon/outreach/data';
import { fmtDay, fmtDayTime, nextStepFor } from '@horizon/outreach';
import { markNotificationsRead } from '@horizon/outreach/server-actions';
import { Card, PageHeader, Pill, StatCard, btnClass, cn } from '@horizon/ui';
import { SubmitButton } from '@horizon/ui/client';

export default async function Dashboard() {
  const s = await getState();
  const accepted = s.companies.filter((c) => c.decision === 'accepted');
  const attention = [
    ...s.companies.filter((c) => c.decision === 'waiting').map((c) => ({ title: 'Company waiting on your decision', sub: c.name, tone: 'Needs Action' as const, label: 'Waiting on you', href: `/companies/${c.slug}`, cta: 'Review' })),
    ...accepted.map((c) => ({ c, step: nextStepFor(s, c) })).filter((x) => x.step.tone === 'Needs Action').map(({ c, step }) => ({ title: step.label.startsWith('Review &') ? 'Emails to review' : step.label === 'Review strategy' ? 'Outreach plan ready' : 'New reply', sub: c.name, tone: step.tone, label: step.label, href: step.href, cta: 'Open' })),
  ];
  const notes = s.notifications.filter((n) => n.side === 'client').slice(0, 8);
  const sent = s.messages.filter((m) => m.direction === 'out').length;
  return (
    <>
      <PageHeader title="Dashboard" subtitle={`${s.engagement.name} · updated ${fmtDayTime(s.now)}`} />
      <Card className="overflow-hidden">
        <div className="flex items-center px-5 py-4"><h2 className="text-[17px] font-semibold">Needs Your Attention</h2><span className="ml-auto text-[13px] text-muted">{attention.length} items</span></div>
        {attention.length === 0 && <div className="border-t border-line px-5 py-6 text-sm text-muted">Nothing needs you right now. We’ll let you know when something does.</div>}
        {attention.map((a, i) => (
          <div key={i} className="flex flex-wrap items-center gap-4 border-t border-line px-5 py-3.5">
            <div className="flex flex-1 flex-col"><span className="text-sm font-semibold">{a.title}</span><span className="text-[13px] text-muted">{a.sub}</span></div>
            <Pill tone={a.tone}>{a.label}</Pill>
            <Link href={a.href} className={btnClass('link')}>{a.cta}</Link>
          </div>
        ))}
      </Card>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Accepted companies" value={accepted.length} />
        <StatCard label="Emails sent" value={sent} />
        <StatCard label="Replies" value={s.messages.filter((m) => m.direction === 'in').length} />
        <StatCard label="Ready to meet" value={s.readiness.filter((r) => r.status === 'confirmed').length} />
      </div>
      <Card className="flex flex-col gap-3 p-5">
        <div className="flex items-center"><h2 className="text-[17px] font-semibold">Notifications</h2>
          {notes.some((n) => !n.read) && <form action={markNotificationsRead} className="ml-auto"><input type="hidden" name="side" value="client" /><SubmitButton variant="link">Mark All as Read</SubmitButton></form>}</div>
        {notes.length === 0 && <p className="text-sm text-muted">No notifications yet.</p>}
        {notes.map((n) => (
          <Link key={n.id} href={n.href} className="flex items-start gap-3 rounded-md px-1 py-2 hover:bg-sunk">
            <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', n.read ? 'bg-transparent' : 'bg-accent')} />
            <span className="flex flex-1 flex-col"><span className={cn('text-sm', n.read ? 'font-medium' : 'font-semibold')}>{n.title}</span><span className="text-[13px] text-muted">{n.detail}</span></span>
            <span className="text-xs text-muted">{fmtDay(n.at)}</span>
          </Link>
        ))}
      </Card>
    </>
  );
}
