import Link from 'next/link';
import { getState } from '@horizon/outreach/data';
import { companyById, fmtDayTime, readinessFor } from '@horizon/outreach';
import { pauseSending, setMailbox } from '@horizon/outreach/server-actions';
import { Actions, EmptyState, Field, PageHeader, PersonCell, Pill, Table, btnClass, inputClass } from '@horizon/ui';
import { Modal } from '@horizon/ui/modal';
import { SubmitButton } from '@horizon/ui/client';
import { SendingBar } from '@/components/SendingBar';

const STATUS: Record<string, { label: string; tone: 'Needs Action' | 'In Progress' | 'Done' | 'Inactive' | 'Failed' }> = {
  contacted: { label: 'Waiting on reply', tone: 'In Progress' }, replied: { label: 'Replied', tone: 'Needs Action' },
  on_break: { label: 'On a break', tone: 'Inactive' }, opted_out: { label: 'Opted out', tone: 'Failed' }, declined: { label: 'Declined', tone: 'Inactive' },
};

export default async function Messaging({ searchParams }: { searchParams: Promise<{ dialog?: string }> }) {
  const q = await searchParams;
  const s = await getState();
  const people = s.contacts.filter((ct) => s.messages.some((m) => m.contactId === ct.id));
  return (
    <>
      <PageHeader title="Messaging" subtitle={`${s.engagement.name} · every outreach conversation`} right={<Link className={btnClass('link')} href="/messaging?dialog=mailbox">Mailbox Settings</Link>} />
      <SendingBar s={s} />
      {people.length ? (
        <Table head={['Person', 'Company', 'Messages', 'Last activity', 'Status', '']}>
          {people.map((ct) => {
            const msgs = s.messages.filter((m) => m.contactId === ct.id);
            const last = msgs[msgs.length - 1];
            const r = readinessFor(s, ct.id);
            const st = r?.status === 'confirmed' ? { label: 'Ready to meet', tone: 'Done' as const } : r?.status === 'needs_review' ? { label: 'Needs attention', tone: 'Needs Action' as const } : STATUS[s.contactStatus[ct.id] ?? 'contacted'] ?? STATUS.contacted;
            return (
              <tr key={ct.id}>
                <td><PersonCell name={ct.name} sub={ct.title.split(' · ')[0]} /></td>
                <td>{companyById(s, ct.companyId)!.name}</td>
                <td>{msgs.length}</td>
                <td>{fmtDayTime(last.at)}</td>
                <td><Pill tone={st.tone}>{st.label}</Pill></td>
                <td className="text-right"><Link className={btnClass('link')} href={`/queue/thread/${ct.id}`}>Open</Link></td>
              </tr>
            );
          })}
        </Table>
      ) : <EmptyState title="No conversations yet">Threads appear here once the client approves the first emails.</EmptyState>}

      {q.dialog === 'pause' && (
        <Modal title="Pause All Sending" subtitle="Approved emails wait until you resume. Replies are still checked." closeHref="/messaging" width={480}>
          <form action={pauseSending} className="flex flex-col gap-4 pb-2">
            <input type="hidden" name="redirect" value="/messaging" />
            <Field label="Reason" hint="Shown to the team and the client."><textarea name="reason" required rows={2} className={inputClass} defaultValue="Holding sends while the client confirms the sender list." /></Field>
            <Actions><Link className={btnClass('link')} href="/messaging">Cancel</Link><SubmitButton variant="danger">Pause Sending</SubmitButton></Actions>
          </form>
        </Modal>
      )}
      {q.dialog === 'mailbox' && (
        <Modal title="Outreach Mailbox" subtitle={`outreach@${s.engagement.mailboxDomain}`} closeHref="/messaging" width={480}>
          <form action={setMailbox} className="flex flex-col gap-4 pb-2">
            <input type="hidden" name="redirect" value="/messaging" />
            <input type="hidden" name="state" value={s.sending.mailbox === 'connected' ? 'disconnected' : 'connected'} />
            <p className="text-sm text-muted">{s.sending.mailbox === 'connected' ? `Connected · inbox last checked ${s.sending.lastChecked}. Disconnecting stops all sending and reply checks.` : 'Disconnected. Nothing is sent and replies aren’t checked until you reconnect.'}</p>
            <Actions><Link className={btnClass('link')} href="/messaging">Cancel</Link><SubmitButton variant={s.sending.mailbox === 'connected' ? 'danger' : 'primary'}>{s.sending.mailbox === 'connected' ? 'Disconnect Mailbox' : 'Reconnect Mailbox'}</SubmitButton></Actions>
          </form>
        </Modal>
      )}
    </>
  );
}
