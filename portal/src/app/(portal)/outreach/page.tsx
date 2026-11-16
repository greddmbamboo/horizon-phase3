import Link from 'next/link';
import { getState } from '@horizon/outreach/data';
import { contactsFor, fmtDay, nextStepFor, readinessFor, strategyForCompany } from '@horizon/outreach';
import { EmptyState, PageHeader, PersonCell, Pill, StatCard, Table, Tabs, btnClass } from '@horizon/ui';

export default async function OutreachList() {
  const s = await getState();
  const accepted = s.companies.filter((c) => c.decision === 'accepted');
  const toReview = s.batches.filter((b) => b.status === 'reviewing').reduce((n, b) => n + s.emails.filter((e) => e.batchId === b.id).length, 0);
  const newReplies = s.messages.filter((m) => m.direction === 'in').length;
  const ready = s.readiness.filter((r) => r.status === 'confirmed').length;
  const sent = s.messages.filter((m) => m.direction === 'out').length;
  return (
    <>
      <PageHeader title="Outreach" subtitle={`${s.engagement.name} engagement · ${accepted.length} accepted companies`} />
      <Tabs items={[{ label: 'Companies', href: '/outreach', active: true }, { label: 'Relationship Summary', href: '/outreach/relationships' }]} />
      {accepted.length === 0 ? (
        <EmptyState title="No accepted companies yet" action={<Link className={btnClass('primary')} href="/companies">Go to Company Review</Link>}>
          When you accept a company in Company Review, your consultant prepares an outreach plan and it appears here.
        </EmptyState>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard label="To review & send" value={toReview} />
            <StatCard label="New replies" value={newReplies} />
            <StatCard label="Ready for acquisition meeting" value={ready} />
            <StatCard label="Emails sent" value={sent} />
          </div>
          <Table head={['Company', 'Next step', 'People', 'Replies', 'Meeting readiness', '']}>
            {accepted.map((c) => {
              const step = nextStepFor(s, c);
              const st = strategyForCompany(s, c.id);
              const people = contactsFor(s, c.id);
              const contacted = people.filter((p) => s.messages.some((m) => m.contactId === p.id && m.direction === 'out')).length;
              const replies = s.messages.filter((m) => m.companyId === c.id && m.direction === 'in').length;
              const conf = people.find((p) => readinessFor(s, p.id)?.status === 'confirmed');
              return (
                <tr key={c.id}>
                  <td><PersonCell name={c.name} sub={`Accepted ${fmtDay(c.decidedAt)}`} /></td>
                  <td><Pill tone={step.tone}>{step.label}</Pill></td>
                  <td>{st ? <PersonCell name={`${st.rows.length} in strategy`} sub={contacted ? `${contacted} contacted` : 'None contacted'} /> : <span className="text-muted">—</span>}</td>
                  <td>{replies ? <span className="rounded border border-line-strong px-2 py-0.5 text-xs">{replies} new</span> : <span className="text-muted">—</span>}</td>
                  <td>{conf ? <span className="font-semibold">Confirmed ready</span> : <span className="text-muted">—</span>}</td>
                  <td className="text-right"><Link className={btnClass('link')} href={step.href}>View</Link></td>
                </tr>
              );
            })}
          </Table>
        </>
      )}
    </>
  );
}
