import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getState } from '@horizon/outreach/data';
import { companyById, contactById, fmtDay, fmtDayTime, personById, unresolvedFlags, writingChecks } from '@horizon/outreach';
import { resolveFlag, sendEmailToClient } from '@horizon/outreach/server-actions';
import { Actions, Banner, Card, CheckDot, Field, IssueBadge, PageHeader, Pill, btnClass, inputClass } from '@horizon/ui';
import { Modal } from '@horizon/ui/modal';
import { SubmitButton } from '@horizon/ui/client';

type Q = { dialog?: 'not_issue' | 'without_fact' | 'source'; flag?: string };

const RES_LABEL: Record<string, string> = {
  rewritten: 'Rewritten with AI', not_issue: 'Marked not an issue', without_fact: 'Sending without a fact', source_added: 'Source added', edited: 'Edited',
};

export default async function FlaggedEmail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Q> }) {
  const { id } = await params;
  const q = await searchParams;
  const s = await getState();
  const e = s.emails.find((x) => x.id === id);
  if (!e) notFound();
  const ct = contactById(s, e.contactId)!;
  const c = companyById(s, e.companyId)!;
  const sender = personById(s, e.senderId)!;
  const here = `/queue/email/${e.id}`;
  const open = unresolvedFlags(e);
  const flag = e.flags.find((f) => f.id === q.flag);
  const cleared = e.status !== 'flagged';

  // Highlight the flagged span in the body, if it's still there.
  const span = open.find((f) => f.span && e.body.includes(f.span))?.span;
  const [before, after] = span ? e.body.split(span) : [e.body, ''];

  return (
    <>
      <PageHeader
        back={{ href: '/queue?tab=flagged', label: 'Outreach Queue' }}
        title={`Email to ${ct.name}`}
        subtitle={`${ct.title.split(' · ')[0]} · ${c.name} · held ${fmtDay(e.versions[0].at)}`}
        status={cleared ? <Pill tone="Done">Sent to client</Pill> : open.length ? <Pill tone="Needs Action">Needs attention</Pill> : <Pill tone="In Progress">Ready to send</Pill>}
      />
      {cleared && <Banner tone="success" title="Sent to the client for review">This email is now in Rachel Kim’s review batch. Nothing is sent to {ct.name.split(' ')[0]} until she approves it.</Banner>}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="flex flex-col gap-4 p-6">
          <dl className="grid grid-cols-[80px_1fr] gap-y-1.5 text-[13px]">
            <dt className="text-muted">From</dt><dd>{sender.name} · {sender.email}</dd>
            <dt className="text-muted">To</dt><dd>{ct.name} · {ct.email ?? 'no email yet'}</dd>
            <dt className="text-muted">Subject</dt><dd className="font-semibold">{e.subject}</dd>
            <dt className="text-muted">Objective</dt><dd>{e.objective}</dd>
          </dl>
          <div className="whitespace-pre-line border-t border-line pt-4 text-sm leading-relaxed">
            {before}
            {span && <mark className="rounded-sm bg-status-failed/10 text-ink underline decoration-status-failed decoration-wavy underline-offset-4">{span}</mark>}
            {after}
            {'\n\n'}{sender.name}{'\n'}{sender.title}, {s.engagement.clientName}
          </div>
          {e.factSource && (
            <div className="rounded-md bg-sunk px-3 py-2.5 text-xs text-muted">
              <span className="font-semibold text-ink">Source · </span>“{e.factSource.quote}” — {e.factSource.source}, {e.factSource.date}
            </div>
          )}
          <div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-line pt-3 text-xs">
            {writingChecks(e).map((w) => <span key={w.label} className="flex items-center gap-1.5"><CheckDot ok={w.ok} />{w.label}</span>)}
          </div>
        </Card>

        <div className="flex flex-col gap-3 lg:sticky lg:top-6">
          <div className="flex items-center gap-2"><h2 className="text-[15px] font-semibold">Fix Before Sending</h2>{open.length > 0 && <IssueBadge n={open.length} />}</div>
          {e.flags.map((f) => (
            <Card key={f.id} className="flex flex-col gap-2.5 p-4">
              <div className="flex items-start gap-2">
                <CheckDot ok={f.resolved} />
                <div className="flex flex-col gap-1">
                  <span className="text-[13px] font-semibold">{f.title}</span>
                  {!f.resolved && <span className="text-xs text-muted">{f.why}</span>}
                  {f.resolved && <span className="text-xs text-muted">{RES_LABEL[f.resolution ?? '']} · {fmtDayTime(f.resolvedAt)}{f.resolutionNote ? ` · “${f.resolutionNote}”` : ''}</span>}
                </div>
              </div>
              {!f.resolved && !cleared && (
                f.type === 'unsupported_claim' ? (
                  <form action={resolveFlag}>
                    <Hidden emailId={e.id} flagId={f.id} redirect={here} />
                    <input type="hidden" name="resolution" value="rewritten" />
                    <Actions><Link className={btnClass('link')} href={`${here}?dialog=not_issue&flag=${f.id}`}>Not an Issue</Link><SubmitButton pendingLabel="Rewriting…">Rewrite With AI</SubmitButton></Actions>
                  </form>
                ) : (
                  <Actions><Link className={btnClass('link')} href={`${here}?dialog=without_fact&flag=${f.id}`}>Send Without One</Link><Link className={btnClass('secondary')} href={`${here}?dialog=source&flag=${f.id}`}>Add a Source</Link></Actions>
                )
              )}
            </Card>
          ))}
        </div>
      </div>

      {!cleared && (
        <div className="sticky bottom-0 -mx-8 border-t border-line bg-page px-8 py-4">
          <form action={sendEmailToClient}>
            <input type="hidden" name="emailId" value={e.id} /><input type="hidden" name="redirect" value="/queue?tab=flagged&sent=1" />
            <Actions start={<span className="text-[13px] text-muted">{open.length ? `Fix ${open.length} issue${open.length > 1 ? 's' : ''} to send this to the client.` : 'All issues fixed.'}</span>}>
              <SubmitButton disabled={open.length > 0}>Send to Client for Review</SubmitButton>
            </Actions>
          </form>
        </div>
      )}

      {flag && q.dialog === 'not_issue' && (
        <Modal title="Not an Issue" subtitle={flag.title} closeHref={here} width={480}>
          <form action={resolveFlag} className="flex flex-col gap-4 pb-2">
            <Hidden emailId={e.id} flagId={flag.id} redirect={here} /><input type="hidden" name="resolution" value="not_issue" />
            <Field label="Why is this fine to send?" hint="Saved with the email so the team can see the reasoning."><textarea name="note" required rows={3} className={inputClass} /></Field>
            <Actions><Link className={btnClass('link')} href={here}>Cancel</Link><SubmitButton>Mark Not an Issue</SubmitButton></Actions>
          </form>
        </Modal>
      )}
      {flag && q.dialog === 'without_fact' && (
        <Modal title="Send Without a Fact" subtitle={flag.title} closeHref={here} width={480}>
          <form action={resolveFlag} className="flex flex-col gap-4 pb-2">
            <Hidden emailId={e.id} flagId={flag.id} redirect={here} /><input type="hidden" name="resolution" value="without_fact" />
            <Field label="Reason"><select name="note" className={inputClass}><option>He’s an introduction route, not the decision maker</option><option>No verified public detail available</option><option>Client asked for a short, plain first email</option></select></Field>
            <Actions><Link className={btnClass('link')} href={here}>Cancel</Link><SubmitButton>Record Reason</SubmitButton></Actions>
          </form>
        </Modal>
      )}
      {flag && q.dialog === 'source' && (
        <Modal title="Add a Source" subtitle="A verified fact the email can mention" closeHref={here} width={520}>
          <form action={resolveFlag} className="flex flex-col gap-4 pb-2">
            <Hidden emailId={e.id} flagId={flag.id} redirect={here} /><input type="hidden" name="resolution" value="source_added" />
            <Field label="Quote or fact"><textarea name="quote" required rows={2} className={inputClass} defaultValue="Reyes & Hart has advised Colorado trade businesses on ownership transitions since 2009." /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Source"><input name="source" required className={inputClass} defaultValue="reyeshart.com · About" /></Field>
              <Field label="Date checked"><input name="date" required className={inputClass} defaultValue={fmtDay(s.now)} /></Field>
            </div>
            <Field label="Link (optional)"><input name="url" type="url" className={inputClass} placeholder="https://" /></Field>
            <Actions><Link className={btnClass('link')} href={here}>Cancel</Link><SubmitButton>Add Source</SubmitButton></Actions>
          </form>
        </Modal>
      )}
    </>
  );
}

function Hidden({ emailId, flagId, redirect }: { emailId: string; flagId: string; redirect: string }) {
  return <><input type="hidden" name="emailId" value={emailId} /><input type="hidden" name="flagId" value={flagId} /><input type="hidden" name="redirect" value={redirect} /></>;
}
