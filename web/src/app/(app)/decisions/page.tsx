import { getState } from '@horizon/outreach/data';
import { fmtDay } from '@horizon/outreach';
import { PageHeader, Pill, PersonCell, Table, StatCard } from '@horizon/ui';

export default async function Decisions() {
  const s = await getState();
  const by = (d: string) => s.companies.filter((c) => c.decision === d).length;
  return (
    <>
      <PageHeader title="Sharing and Decisions" subtitle={`${s.engagement.name} · companies shared with ${s.engagement.clientName}`} />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Accepted" value={by('accepted')} />
        <StatCard label="Waiting on client" value={by('waiting')} />
        <StatCard label="Rejected" value={by('rejected')} />
      </div>
      <Table head={['Company', 'Shared', 'Version', 'Decision', 'Reason']}>
        {s.companies.map((c) => (
          <tr key={c.id}>
            <td><PersonCell name={c.name} sub={c.segment} /></td>
            <td>{fmtDay(c.sharedAt)}</td>
            <td>v{c.version}</td>
            <td>{c.decision === 'accepted' ? <Pill tone="Done">Accepted {fmtDay(c.decidedAt)}</Pill> : c.decision === 'rejected' ? <Pill tone="Inactive">Rejected {fmtDay(c.decidedAt)}</Pill> : <Pill tone="In Progress">Waiting on client</Pill>}</td>
            <td className="max-w-[260px] text-muted">{c.rejectReason ?? '—'}</td>
          </tr>
        ))}
      </Table>
    </>
  );
}
