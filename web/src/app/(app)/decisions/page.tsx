import Link from 'next/link';
import { getState } from '@horizon/outreach/data';
import { fmtDay, type Company } from '@horizon/outreach';
import { removeFromClientView } from '@horizon/outreach/server-actions';
import { Actions, PageHeader, Pill, PersonCell, Table, StatCard, btnClass, inputClass } from '@horizon/ui';
import { Modal } from '@horizon/ui/modal';
import { SubmitButton } from '@horizon/ui/client';

const HERE = '/decisions';

function DecisionCell({ c }: { c: Company }) {
  if (c.removedAt) return <Pill tone="Inactive">Removed from client view {fmtDay(c.removedAt)}</Pill>;
  if (c.decision === 'accepted' && c.pendingUpdate) return <Pill tone="In Progress">v{c.pendingUpdate.version} waiting on client</Pill>;
  if (c.decision === 'accepted') return <Pill tone="Done">Accepted {fmtDay(c.decidedAt)}</Pill>;
  if (c.decision === 'withdrawn') return <Pill tone="Inactive">Withdrawn {fmtDay(c.decidedAt)}</Pill>;
  if (c.decision === 'rejected') return <Pill tone="Inactive">Rejected {fmtDay(c.decidedAt)}</Pill>;
  return <Pill tone="In Progress">Waiting on client</Pill>;
}

export default async function Decisions({ searchParams }: { searchParams: Promise<{ remove?: string }> }) {
  const q = await searchParams;
  const s = await getState();
  const live = s.companies.filter((c) => !c.removedAt);
  const by = (d: string) => live.filter((c) => c.decision === d).length;
  const removing = s.companies.find((c) => c.id === q.remove && !c.removedAt);
  return (
    <>
      <PageHeader title="Sharing and Decisions" subtitle={`${s.engagement.name} · companies shared with ${s.engagement.clientName}`} />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Accepted" value={by('accepted')} />
        <StatCard label="Waiting on client" value={by('waiting')} />
        <StatCard label="Rejected" value={by('rejected')} />
      </div>
      <Table head={['Company', 'Shared', 'Version', 'Decision', 'Reason', '']}>
        {s.companies.map((c) => (
          <tr key={c.id}>
            <td><PersonCell name={c.name} sub={c.segment} /></td>
            <td>{fmtDay(c.sharedAt)}</td>
            <td>v{c.version}</td>
            <td><DecisionCell c={c} /></td>
            <td className="max-w-[260px] text-muted">{c.removedReason ?? c.updateRejectedReason ?? c.rejectReason ?? '—'}</td>
            <td className="text-right">{!c.removedAt && <Link className={btnClass('link')} href={`${HERE}?remove=${c.id}`} scroll={false}>Remove</Link>}</td>
          </tr>
        ))}
      </Table>

      {removing && (
        <Modal title="Remove From Client View?" closeHref={HERE} width={440}>
          <form action={removeFromClientView} className="flex flex-col gap-4 pb-2">
            <input type="hidden" name="companyId" value={removing.id} /><input type="hidden" name="redirect" value={HERE} />
            <p className="text-sm text-muted">The client loses access to this company and all unsent outreach is blocked. History is kept for audit.</p>
            <label className="sr-only" htmlFor="remove-reason">Internal reason</label>
            <textarea id="remove-reason" name="reason" required rows={3} className={inputClass} placeholder="Internal reason…" />
            <Actions><Link href={HERE} className={btnClass('secondary')}>Cancel</Link><SubmitButton variant="danger">Remove Company</SubmitButton></Actions>
          </form>
        </Modal>
      )}
    </>
  );
}
