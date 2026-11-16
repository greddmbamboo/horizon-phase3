import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getState } from '@horizon/outreach/data';
import { companyById, contactById, fmtDayTime, personById, unresolvedFlags, writingChecks } from '@horizon/outreach';
import { editFlaggedEmail, resolveFlag, rewriteWholeEmail, sendEmailToClient, undoEmailVersion } from '@horizon/outreach/server-actions';
import { Actions, Banner, Card, CheckDot, Field, IssueBadge, PageHeader, Pill, btnClass, checkboxClass, inputClass } from '@horizon/ui';
import { EmailEditor } from '@/components/EmailEditor';
import { Modal } from '@horizon/ui/modal';
import { SubmitButton } from '@horizon/ui/client';

type Q = { dialog?: 'not_issue' | 'without_fact' | 'source' | 'rewrite' | 'reason'; flag?: string; mode?: string };

const RES_LABEL: Record<string, string> = {
  rewritten: 'Rewritten with AI', not_issue: 'Flag overridden', without_fact: 'Sending without a sourced fact', source_added: 'Source added', edited: 'Edited directly',
};

/** One line under a fixed issue, saying what changed (Figma 06a and 06c). */
function resolvedDetail(f: { type: string; resolution?: string; resolutionNote?: string }) {
  if (f.resolution === 'without_fact' || f.resolution === 'not_issue') return `Reason recorded: ${f.resolutionNote ?? ''}`;
  if (f.resolution === 'source_added') return 'A verified fact is now in the email.';
  if (f.type === 'unsupported_claim') return 'The opening no longer claims a past conversation or a wish to sell.';
  return 'Fixed.';
}

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
  const editing = q.mode === 'edit' && !cleared;
  const lastVersion = e.versions.at(-1)!;
  const canUndo = !cleared && e.versions.length > 1 && lastVersion.by === 'u_addler';
  const fixedCount = e.flags.length - open.length;
  // Figma 06: the subtitle says where the rest of the batch stands.
  const others = s.emails.filter((x) => x.batchId === e.batchId && x.id !== e.id);
  const otherNotes = others.map((x) => {
    const who = contactById(s, x.contactId)!.name.split(' ')[0];
    return x.status === 'flagged' ? `${who}’s email is also flagged` : `${who}’s email passed and is already with the client`;
  });
  const subtitle = [c.name, e.kind === 'first' ? 'first-contact email' : 'email', ...otherNotes].join(' · ');
  const passed = writingChecks(e).filter((w) => w.ok && !w.label.startsWith('Sent without'));

  // Highlight the flagged span in the body, if it's still there.
  const span = open.find((f) => f.span && e.body.includes(f.span))?.span;
  const [before, after] = span ? e.body.split(span) : [e.body, ''];

  return (
    <>
      <PageHeader
        back={{ href: '/queue?tab=flagged', label: 'Outreach Queue' }}
        title={`Flagged Email · ${ct.name}`}
        subtitle={subtitle}
        status={cleared ? <Pill tone="Done">Sent to client</Pill> : open.length ? <Pill tone="Needs Action">Needs attention</Pill> : <Pill tone="In Progress">Ready to send</Pill>}
      />
      {cleared && <Banner tone="success" title="Sent to the client for review">This email is now in Rachel Kim’s review batch. Nothing is sent to {ct.name.split(' ')[0]} until she approves it.</Banner>}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="flex flex-col gap-4 p-6">
          {!cleared && !editing && (
            <Actions>
              <Link className={btnClass('link')} href={`${here}?dialog=rewrite`} scroll={false}>Rewrite the Whole Email</Link>
              <Link className={btnClass('secondary')} href={`${here}?mode=edit`} scroll={false}>Edit</Link>
            </Actions>
          )}
          <dl className="grid grid-cols-[80px_1fr] gap-y-1.5 text-[13px]">
            <dt className="text-muted">From</dt><dd>{sender.name} · {sender.email}</dd>
            <dt className="text-muted">To</dt><dd>{ct.name} · {ct.email ?? 'no email yet'}</dd>
            <dt className="text-muted">Subject</dt><dd className="font-semibold">{e.subject}</dd>
            <dt className="text-muted">Objective</dt><dd>{e.objective}</dd>
          </dl>
          {editing ? (
            <div className="border-t border-line pt-4">
              <EmailEditor emailId={e.id} body={e.body} here={here} action={editFlaggedEmail}
                claims={open.filter((f) => f.span).map((f) => ({ title: f.title, span: f.span! }))} />
            </div>
          ) : (
          <div className="whitespace-pre-line border-t border-line pt-4 text-sm leading-relaxed">
            {before}
            {span && <mark className="rounded-sm bg-status-failed/10 text-ink underline decoration-status-failed decoration-wavy underline-offset-4">{span}</mark>}
            {after}
            {'\n\n'}{sender.name}{'\n'}{sender.title}, {s.engagement.clientName}
          </div>
          )}
          {e.factSource && (
            <div className="rounded-md bg-sunk px-3 py-2.5 text-xs text-muted">
              <span className="font-semibold text-ink">Source · </span>“{e.factSource.quote}” — {e.factSource.source}, {e.factSource.date}
            </div>
          )}
          {!editing && <p className="text-xs text-muted">The signature and footer are added automatically and can’t be edited here.</p>}
        </Card>

        <div className="flex flex-col gap-3 lg:sticky lg:top-6">
          <div className="flex items-center gap-2"><h2 className="text-[15px] font-semibold">Fix Before Sending</h2><span className="ml-auto text-[13px] text-muted">{fixedCount} of {e.flags.length} fixed</span></div>
          {e.flags.map((f, idx) => (
            <Card key={f.id} className="flex flex-col gap-2.5 p-4">
              <div className="flex items-start gap-2">
                {f.resolved ? <CheckDot ok /> : <IssueBadge n={idx + 1} />}
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-[13px] font-semibold">{f.resolved ? RES_LABEL[f.resolution ?? ''] : f.title}</span>
                  <span className="text-xs text-muted">{f.resolved ? resolvedDetail(f) : f.why}</span>
                </div>
                {f.resolved && canUndo && (f.resolution === 'rewritten' || f.resolution === 'edited') && (
                  <form action={undoEmailVersion}><input type="hidden" name="emailId" value={e.id} /><input type="hidden" name="redirect" value={here} /><SubmitButton variant="link" className="text-xs" pendingLabel="Undoing…">Undo</SubmitButton></form>
                )}
                {f.resolved && (f.resolution === 'without_fact' || f.resolution === 'not_issue') && (
                  <Link className={btnClass('link', 'shrink-0 text-xs')} href={`${here}?dialog=reason&flag=${f.id}`} scroll={false}>View Reason</Link>
                )}
              </div>
              {!f.resolved && !cleared && (
                f.type === 'unsupported_claim' ? (
                  <form action={resolveFlag}>
                    <Hidden emailId={e.id} flagId={f.id} redirect={here} />
                    <input type="hidden" name="resolution" value="rewritten" />
                    <Actions><Link className={btnClass('link')} href={`${here}?dialog=not_issue&flag=${f.id}`}>Override Flag</Link><SubmitButton pendingLabel="Rewriting…">Rewrite With AI</SubmitButton></Actions>
                  </form>
                ) : (
                  <Actions><Link className={btnClass('link')} href={`${here}?dialog=without_fact&flag=${f.id}`}>Send Without</Link><Link className={btnClass('secondary')} href={`${here}?dialog=source&flag=${f.id}`}>Add a Source</Link></Actions>
                )
              )}
            </Card>
          ))}
          <Card className="flex flex-col gap-1.5 p-4">
            <span className="text-[13px] font-semibold">Passed</span>
            {passed.map((w) => <span key={w.label} className="flex items-center gap-1.5 text-[13px]"><CheckDot ok />{w.label}</span>)}
          </Card>
        </div>
      </div>

      {!cleared && (
        <div className="sticky bottom-0 -mx-8 border-t border-line bg-page px-8 py-4">
          <form action={sendEmailToClient}>
            <input type="hidden" name="emailId" value={e.id} /><input type="hidden" name="redirect" value="/queue?tab=flagged&sent=1" />
            <Actions start={<span className="text-[13px] text-muted">{open.length ? `${open.length} issue${open.length > 1 ? 's' : ''} left.` : 'All issues fixed.'} The email is checked again before it goes to the client.</span>}>
              <Link className={btnClass('link')} href="/queue?tab=flagged&saved=1">Save Draft</Link>
              <SubmitButton disabled={open.length > 0}>Send to Client for Review</SubmitButton>
            </Actions>
          </form>
        </div>
      )}

      {q.dialog === 'rewrite' && !cleared && (
        <Modal title="Rewrite the Whole Email" closeHref={here} width={520}>
          <form action={rewriteWholeEmail} className="flex flex-col gap-4 pb-2">
            <input type="hidden" name="emailId" value={e.id} /><input type="hidden" name="redirect" value={here} />
            <p className="text-[13px] text-muted">A new version replaces the current one. You can undo it. Writing checks run again on the new version.</p>
            <Field label="Anything to change? (optional)"><textarea name="instructions" rows={2} className={inputClass} placeholder="Keep it under 80 words and ask for a 15-minute call." autoFocus /></Field>
            <label className="flex items-center gap-2.5 text-sm"><input type="checkbox" name="keepFact" defaultChecked className={checkboxClass} />Keep the sourced fact</label>
            <label className="flex items-center gap-2.5 text-sm"><input type="checkbox" name="keepSubject" defaultChecked className={checkboxClass} />Keep the subject line</label>
            <Actions><Link className={btnClass('link')} href={here}>Cancel</Link><SubmitButton pendingLabel="Rewriting…">Rewrite Email</SubmitButton></Actions>
          </form>
        </Modal>
      )}
      {flag && q.dialog === 'not_issue' && (
        <Modal title="Override Flag" subtitle={flag.title} closeHref={here} width={480}>
          <form action={resolveFlag} className="flex flex-col gap-4 pb-2">
            <Hidden emailId={e.id} flagId={flag.id} redirect={here} /><input type="hidden" name="resolution" value="not_issue" />
            <Field label="Why is this fine to send?" hint="Saved with the email so the team can see the reasoning."><textarea name="note" required rows={3} className={inputClass} /></Field>
            <Actions><Link className={btnClass('link')} href={here}>Cancel</Link><SubmitButton>Override Flag</SubmitButton></Actions>
          </form>
        </Modal>
      )}
      {flag && q.dialog === 'without_fact' && (
        <Modal title="Continue Without a Verified Fact?" closeHref={here} width={480}>
          <form action={resolveFlag} className="flex flex-col gap-4 pb-2">
            <Hidden emailId={e.id} flagId={flag.id} redirect={here} /><input type="hidden" name="resolution" value="without_fact" />
            <p className="text-[13px] text-muted">We couldn’t find a public fact about {ct.name} from the last 12 months that passes our checks. You can still send this email, but your reason is recorded with this version. It doesn’t allow made-up claims or skip any other check.</p>
            <Field label="Reason (required)"><textarea name="note" required rows={3} className={inputClass} placeholder={`${ct.name.split(' ')[0]} has no public profile; the introduction route is the reason for writing.`} autoFocus /></Field>
            <p className="text-xs text-muted">Recorded as: Addler Pluviose · {fmtDayTime(s.now)}</p>
            <Actions><Link className={btnClass('secondary')} href={here}>Cancel</Link><SubmitButton>Continue Without a Fact</SubmitButton></Actions>
          </form>
        </Modal>
      )}
      {flag && q.dialog === 'reason' && flag.resolved && (
        <Modal title={RES_LABEL[flag.resolution ?? '']} subtitle={flag.title} closeHref={here} width={480}>
          <div className="flex flex-col gap-3 pb-2">
            <p className="text-sm">“{flag.resolutionNote}”</p>
            <p className="text-xs text-muted">Recorded as: Addler Pluviose · {fmtDayTime(flag.resolvedAt)}</p>
            <Actions><Link className={btnClass('secondary')} href={here}>Close</Link></Actions>
          </div>
        </Modal>
      )}
      {flag && q.dialog === 'source' && (
        <Modal title="Add a Source" subtitle="A verified fact the email can mention" closeHref={here} width={520}>
          <form action={resolveFlag} className="flex flex-col gap-4 pb-2">
            <Hidden emailId={e.id} flagId={flag.id} redirect={here} /><input type="hidden" name="resolution" value="source_added" />
            <Field label="Quote or fact"><textarea name="quote" required rows={2} className={inputClass} defaultValue="…helping family-owned contractors plan for succession" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Source"><input name="source" required className={inputClass} defaultValue="CFCA newsletter" /></Field>
              <Field label="Date published"><input name="date" required className={inputClass} defaultValue="Sept 2026" /></Field>
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
