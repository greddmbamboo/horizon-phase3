import Link from 'next/link';
import { getState, simulate } from '@horizon/outreach/data';
import { batchesFor, clientVersionCount, companyBySlug, contactById, fmtDayTime, openBatch, type HorizonState } from '@horizon/outreach';
import { approveBatch, editEmail, markReviewed, requestEmailRewrite } from '@horizon/outreach/server-actions';
import { Actions, Banner, EmptyState, Field, PersonCell, Pill, Table, btnClass, inputClass } from '@horizon/ui';
import { Modal } from '@horizon/ui/modal';
import { AutoReviewed, SubmitButton } from '@horizon/ui/client';
import { EmailCard, EmailMeta } from '@/components/EmailCard';

function Progress({ done, total }: { done: number; total: number }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs text-muted">
      <span className="flex gap-1">{Array.from({ length: total }).map((_, i) => <span key={i} className={`h-1.5 w-7 rounded-full ${i < done ? 'bg-accent' : 'bg-line'}`} />)}</span>
      {done} of {total} reviewed
    </span>
  );
}

export default async function ReviewTab({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ email?: string; mode?: string; sent?: string; simulate?: string }> }) {
  const { slug } = await params;
  const q = await searchParams;
  await simulate(q);
  const s = await getState();
  const c = companyBySlug(s, slug)!;
  const here = `/outreach/${slug}/review`;
  const ob = openBatch(s, c.id);
  const emails = ob ? s.emails.filter((e) => e.batchId === ob.id) : [];
  const reviewed = emails.filter((e) => e.reviewed).length;
  const sentBatches = batchesFor(s, c.id).filter((b) => b.status === 'sent');
  const preparing = batchesFor(s, c.id).find((b) => b.status === 'preparing');
  const lastSent = sentBatches[0];
  const lastEmails = lastSent ? s.emails.filter((e) => e.batchId === lastSent.id) : [];
  const bounced = lastEmails.filter((e) => e.status === 'failed' && e.failReason?.includes('rejected the email'));
  const delivered = lastEmails.filter((e) => e.status === 'sent');
  const firstName = (id: string) => contactById(s, id)!.name.split(' ')[0];

  return (
    <>
      {bounced.length > 0 && (
        <Banner tone="fail" title={`${bounced.length} of ${lastEmails.length} emails couldn’t be sent`}>
          {bounced.map((e) => e.failReason).join(' ')}{' '}
          {delivered.length > 0 && `${delivered.map((e) => `${firstName(e.contactId)}’s`).join(' and ')} email${delivered.length > 1 ? 's were' : ' was'} sent. `}
          Your consultant will look for another address and send it back to you to review.
        </Banner>
      )}
      {q.sent && lastSent && bounced.length === 0 && (
        <Banner tone="success" title={`${s.emails.filter((e) => e.batchId === lastSent.id).length} Emails Sent`}
          actions={<Link className={btnClass('link')} href={`/outreach/${slug}/conversations`}>Go to Conversations ›</Link>}>
          {fmtDayTime(lastSent.sentAt)} · approved and sent by Rachel Kim. Replies will appear in Conversations. You’ll get a notification when someone responds.
        </Banner>
      )}

      {ob ? (
        <>
          <Banner tone="info" title={reviewed === emails.length ? 'All Emails Reviewed · Ready to Send' : 'Review Each Email, Then Send Them Together'} actions={<Progress done={reviewed} total={emails.length} />}>
            Approving sends only these exact versions. An email counts as reviewed after it’s been open for 2 seconds.
          </Banner>
          <div className="overflow-hidden rounded-card border border-line">
            <div className="flex items-center gap-3 bg-sunk px-4 py-3">
              <span className="text-sm font-semibold">Batch {ob.number} · {ob.label}</span><span className="text-xs text-muted">{emails.length} emails</span>
              {reviewed < emails.length && <Link href={`${here}?email=${(emails.find((e) => !e.reviewed) ?? emails[0]).id}`} className={btnClass('secondary', 'ml-auto')}>Start Review</Link>}
            </div>
            <table className="w-full text-[13px]">
              <thead className="text-left text-xs text-muted"><tr className="border-t border-line"><th className="px-4 py-2.5 font-semibold">To</th><th className="px-4 font-semibold">Subject</th><th className="px-4 font-semibold">Status</th><th /></tr></thead>
              <tbody>
                {emails.map((e) => {
                  const ct = contactById(s, e.contactId)!;
                  return (
                    <tr key={e.id} className="border-t border-line">
                      <td className="px-4 py-3"><PersonCell name={ct.name} sub={ct.title.split(' · ')[0]} /></td>
                      <td className="px-4">{e.subject}</td>
                      <td className="px-4">{e.reviewed ? <Pill tone="Done">Reviewed</Pill> : <Pill tone="Needs Action">Not reviewed</Pill>}</td>
                      <td className="px-4 text-right"><Link className={btnClass('link')} href={`${here}?email=${e.id}`}>{e.reviewed ? 'View' : 'Review'}</Link></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="sticky bottom-0 -mx-8 border-t border-line bg-page px-8 py-4">
            <form action={approveBatch}>
              <input type="hidden" name="batchId" value={ob.id} /><input type="hidden" name="redirect" value={`${here}?sent=1`} />
              <Actions start={<Progress done={reviewed} total={emails.length} />}>
                {reviewed < emails.length && <span className="text-[13px] text-muted">Review every email to send the batch</span>}
                <SubmitButton disabled={reviewed < emails.length} pendingLabel="Sending…">Approve & Send {emails.length} Emails</SubmitButton>
              </Actions>
            </form>
          </div>
        </>
      ) : preparing ? (
        <EmptyState title="Your first emails are being prepared">Your consultant is checking them before they reach you. You’ll get a notification when they’re ready to review.</EmptyState>
      ) : (
        <EmptyState title="Nothing waiting for review">New emails for {c.name} will appear here when they’re ready. You’ll get a notification.</EmptyState>
      )}

      {sentBatches.length > 0 && (
        <>
          <div className="flex items-baseline gap-3"><h2 className="text-[17px] font-semibold">Sent History</h2><span className="text-xs text-muted">{sentBatches.length} batch · {sentBatches.reduce((n, b) => n + s.emails.filter((e) => e.batchId === b.id).length, 0)} emails</span></div>
          {sentBatches.map((b) => (
            <div key={b.id} className="overflow-hidden rounded-card border border-line">
              <div className="flex items-center gap-3 bg-sunk px-4 py-3"><span className="text-sm font-semibold">Batch {b.number} · {b.label}</span><span className="text-xs text-muted">Sent {fmtDayTime(b.sentAt)} by Rachel Kim</span></div>
              <Table head={['To', 'Subject', 'Sent', 'Status', '']} className="rounded-none border-0 border-t">
                {s.emails.filter((e) => e.batchId === b.id).map((e) => {
                  const ct = contactById(s, e.contactId)!;
                  return (
                    <tr key={e.id}>
                      <td><PersonCell name={ct.name} sub={ct.title.split(' · ')[0]} /></td><td>{e.subject}</td><td>{fmtDayTime(e.sentAt)}</td>
                      <td>{e.status === 'sent' ? <Pill tone="Done">Sent</Pill> : e.status === 'scheduled' ? <Pill tone="In Progress">Scheduled</Pill> : <Pill tone="Failed">Not sent</Pill>}</td>
                      <td className="text-right"><Link className={btnClass('link')} href={`${here}?email=${e.id}`}>View</Link></td>
                    </tr>
                  );
                })}
              </Table>
            </div>
          ))}
        </>
      )}

      {q.email && <ReviewModal s={s} emailId={q.email} mode={q.mode} here={here} />}
    </>
  );
}

function ReviewModal({ s, emailId, mode, here }: { s: HorizonState; emailId: string; mode?: string; here: string }) {
  const e = s.emails.find((x) => x.id === emailId);
  if (!e) return null;
  const list = s.emails.filter((x) => x.batchId === e.batchId);
  const i = list.findIndex((x) => x.id === e.id);
  const batch = s.batches.find((b) => b.id === e.batchId)!;
  const live = batch.status === 'reviewing';
  const prev = list[i - 1], next = list[i + 1];
  const reviewed = list.filter((x) => x.reviewed).length;
  const self = `${here}?email=${e.id}`;

  const footer = !live ? (
    <Actions><Link href={here} className={btnClass('secondary')}>Close</Link></Actions>
  ) : mode === 'edit' ? null : (
    <Actions start={<div className="flex items-center gap-3">{prev ? <Link className={btnClass('secondary')} href={`${here}?email=${prev.id}`}>← Previous</Link> : <span className={btnClass('secondary', 'pointer-events-none text-disabled-fg')}>← Previous</span>}<Progress done={reviewed} total={list.length} /></div>}>
      <Link className={btnClass('link')} href={`${self}&mode=edit`}>Edit</Link>
      {mode !== 'rewrite' && <Link className={btnClass('link')} href={`${self}&mode=rewrite`}>Request a Rewrite</Link>}
      {next ? <Link className={btnClass('primary')} href={`${here}?email=${next.id}`}>Next →</Link> : <Link className={btnClass('primary')} href={here}>Done</Link>}
    </Actions>
  );

  return (
    <Modal title={live ? `Review Email ${i + 1} of ${list.length}${clientVersionCount(e) > 1 ? ` · v${clientVersionCount(e)}` : ''}` : 'Sent Email'} closeHref={here} footer={footer} width={860}>
      {live && <AutoReviewed emailId={e.id} reviewed={e.reviewed} action={markReviewed} />}
      {clientVersionCount(e) > 1 && live && mode !== 'edit' && (
        <Banner tone="info" title="Updated version" className="mb-4">{e.versions.at(-1)!.note}. Review it again before sending.</Banner>
      )}
      {mode === 'edit' ? (
        <form action={editEmail} className="flex flex-col gap-4">
          <input type="hidden" name="emailId" value={e.id} /><input type="hidden" name="redirect" value={self} />
          <EmailMeta s={s} e={e} />
          <textarea name="body" defaultValue={e.body} rows={12} className={`${inputClass} border-2 border-accent leading-relaxed`} autoFocus />
          <Actions start={<span className="text-[13px] text-muted">Editing · this email will need your review again after you save</span>}>
            <Link className={btnClass('link')} href={self}>Cancel</Link><SubmitButton>Save Changes</SubmitButton>
          </Actions>
        </form>
      ) : (
        <EmailCard s={s} e={e} />
      )}
      {mode === 'rewrite' && live && (
        <form action={requestEmailRewrite} className="mt-4 flex flex-col gap-3 rounded-card bg-sunk p-5">
          <input type="hidden" name="emailId" value={e.id} /><input type="hidden" name="redirect" value={self} />
          <Field label="What should change?"><textarea name="feedback" required rows={3} autoFocus className={inputClass} placeholder="e.g. Shorter, and mention that we’re based in Denver too." /></Field>
          <Actions><Link className={btnClass('link')} href={self}>Cancel</Link><SubmitButton pendingLabel="Rewriting…">Rewrite</SubmitButton></Actions>
        </form>
      )}
    </Modal>
  );
}

