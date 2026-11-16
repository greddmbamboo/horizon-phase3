import Link from 'next/link';
import { getState } from '@horizon/outreach/data';
import { companyById, contactById, contactsFor, flaggedEmails, fmtDay, fmtDayTime, strategyForCompany, unresolvedFlags } from '@horizon/outreach';
import { Banner, EmptyState, PageHeader, PersonCell, Pill, Table, btnClass, cn } from '@horizon/ui';
import { SendingBar } from '@/components/SendingBar';

const TABS = [
  { key: 'writing', label: 'Strategies Being Written' },
  { key: 'strategy', label: 'Strategy Waiting on You' },
  { key: 'flagged', label: 'Flagged Emails' },
  { key: 'unmatched', label: 'Unmatched Replies' },
  { key: 'interest', label: 'Possible Acquisition Interest' },
];

export default async function Queue({ searchParams }: { searchParams: Promise<{ tab?: string; sent?: string }> }) {
  const q = await searchParams;
  const s = await getState();
  const accepted = s.companies.filter((c) => c.decision === 'accepted');
  const writing = accepted.filter((c) => { const st = strategyForCompany(s, c.id); return st?.status === 'generating'; });
  const waiting = s.strategies.filter((x) => x.status === 'consultant_review' || (x.status === 'changes_requested' && strategyForCompany(s, x.companyId)?.id === x.id));
  const flagged = flaggedEmails(s);
  const interest = s.readiness.filter((r) => r.status === 'needs_review');
  const counts: Record<string, number> = { writing: writing.length, strategy: waiting.length, flagged: flagged.length, unmatched: 0, interest: interest.length };
  const tab = q.tab ?? (waiting.length ? 'strategy' : flagged.length ? 'flagged' : interest.length ? 'interest' : 'strategy');

  return (
    <>
      <PageHeader back={{ href: '/messaging', label: 'Messaging' }} title="Outreach Queue" subtitle={`${s.engagement.name} · messages and replies that need your action`} />
      <SendingBar s={s} />
      {q.sent && <Banner tone="success" title="Sent to the client for review">The client is notified once every email in the batch has cleared review.</Banner>}
      <nav className="flex flex-wrap gap-1 border-b border-line">
        {TABS.map((t) => (
          <Link key={t.key} href={`/queue?tab=${t.key}`} className={cn('-mb-px border-b-2 px-3 py-2.5 text-[13px]', tab === t.key ? 'border-accent font-semibold' : 'border-transparent text-muted hover:text-ink')}>
            {t.label} ({counts[t.key]})
          </Link>
        ))}
      </nav>

      {tab === 'writing' && (writing.length ? (
        <Table head={['Company', 'Accepted', 'Status', '']}>{writing.map((c) => <tr key={c.id}><td className="font-semibold">{c.name}</td><td>{fmtDay(c.decidedAt)}</td><td><Pill tone="In Progress">Being written</Pill></td><td /></tr>)}</Table>
      ) : <EmptyState title="No strategies being written">New strategies are drafted automatically when the client accepts a company.</EmptyState>)}

      {tab === 'strategy' && (waiting.length ? (
        <Table head={['Company', 'Accepted', 'People available', 'Blockers', 'Status', '']}>
          {waiting.map((st) => {
            const c = companyById(s, st.companyId)!;
            const people = contactsFor(s, c.id);
            const missing = people.filter((p) => !p.email).length;
            const open = st.attention.filter((a) => !a.resolved);
            return (
              <tr key={st.id}>
                <td className="font-semibold">{c.name}</td>
                <td>{fmtDay(c.decidedAt)} · v{st.version}</td>
                <td><PersonCell name={`${people.length || st.rows.length} people`} sub={missing ? `${missing} email missing` : 'All contact details found'} /></td>
                <td className="max-w-[220px] text-muted">{open.length ? open[0].text : '—'}</td>
                <td>{st.status === 'changes_requested' ? <Pill tone="Needs Action">Changes requested</Pill> : <Pill tone="Needs Action">Needs attention</Pill>}</td>
                <td className="text-right"><Link className={btnClass('link')} href={`/queue/strategy/${st.id}`}>View</Link></td>
              </tr>
            );
          })}
        </Table>
      ) : <EmptyState title="Nothing waiting on you">New strategies appear here when they’re ready for your review.</EmptyState>)}

      {tab === 'flagged' && (flagged.length ? (
        <Table head={['Email to', 'Held since', 'Issues', 'Reason', 'Status', '']}>
          {flagged.map((e) => {
            const ct = contactById(s, e.contactId)!;
            const open = unresolvedFlags(e);
            return (
              <tr key={e.id}>
                <td><PersonCell name={ct.name} sub={`${ct.title.split(' · ')[0]} · ${companyById(s, e.companyId)!.name}`} /></td>
                <td>{fmtDay(e.versions[0].at)}</td>
                <td className="font-semibold">{open.length ? `${open.length} issue${open.length > 1 ? 's' : ''} to fix` : 'Ready to send'}</td>
                <td className="max-w-[220px] text-muted">{open[0]?.title ?? 'All issues fixed'}</td>
                <td><Pill tone="Needs Action">Needs attention</Pill></td>
                <td className="text-right"><Link className={btnClass('link')} href={`/queue/email/${e.id}`}>Review</Link></td>
              </tr>
            );
          })}
        </Table>
      ) : <EmptyState title="No flagged emails">Emails that fail a writing check are held here before the client sees them.</EmptyState>)}

      {tab === 'unmatched' && <EmptyState title="No unmatched replies">Replies we can’t link to a sent email appear here for you to attach.</EmptyState>}

      {tab === 'interest' && (interest.length ? (
        <Table head={['Person', 'Replied', 'Sentiment', 'Why it’s here', 'Status', '']}>
          {interest.map((r) => {
            const ct = contactById(s, r.contactId)!;
            const m = [...s.messages].reverse().find((x) => x.contactId === ct.id && x.direction === 'in');
            return (
              <tr key={r.contactId}>
                <td><PersonCell name={ct.name} sub={`${ct.title.split(' · ')[0]} · ${companyById(s, ct.companyId)!.name}`} /></td>
                <td>{fmtDayTime(m?.at)}</td>
                <td><PersonCell name={m?.analysis?.sentiment ?? '—'} sub="Analysis" /></td>
                <td className="max-w-[240px] text-muted">{m?.analysis?.evidence}</td>
                <td><Pill tone="Needs Action">Needs attention</Pill></td>
                <td className="text-right"><Link className={btnClass('link')} href={`/queue/thread/${ct.id}`}>Review</Link></td>
              </tr>
            );
          })}
        </Table>
      ) : <EmptyState title="No possible interest to review">Replies that suggest acquisition interest appear here for you to confirm.</EmptyState>)}
    </>
  );
}
