import Link from 'next/link';
import { getState } from '@horizon/outreach/data';
import { clientReason, companyBySlug, contactById, fmtDay, fmtDayTime, personById, relationshipOf, strategyForCompany } from '@horizon/outreach';
import { acceptStrategy, requestStrategyChanges } from '@horizon/outreach/server-actions';
import { Actions, Banner, Button, Card, Field, PersonCell, Pill, Table, btnClass, inputClass } from '@horizon/ui';
import { SubmitButton } from '@horizon/ui/client';
import { Check } from 'lucide-react';

export default async function StrategyTab({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ changes?: string }> }) {
  const { slug } = await params;
  const q = await searchParams;
  const s = await getState();
  const c = companyBySlug(s, slug)!;
  const st = strategyForCompany(s, c.id);
  const here = `/outreach/${slug}/strategy`;
  const prev = st && st.version > 1 ? s.strategies.find((x) => x.companyId === c.id && x.version === st.version - 1) : undefined;

  if (!st || st.status === 'generating' || st.status === 'consultant_review') {
    const stepDone = !!st;
    return (
      <>
        {prev?.clientFeedback && (
          <Banner tone="info" title={`Changes sent to Addler Pluviose · ${fmtDayTime(prev.feedbackAt)}`}>
            “{prev.clientFeedback}” Your consultant is updating the plan. You’ll get a notification when the new version is ready.
          </Banner>
        )}
        <Card className="flex flex-col gap-4 p-5">
          <h2 className="text-[15px] font-semibold">Your consultant, Addler Pluviose, is reviewing your outreach plan</h2>
          <ol className="flex flex-col">
            <TimelineStep state={stepDone ? 'done' : 'current'} title="Draft plan" meta={stepDone ? `Done · ${fmtDayTime(st!.generatedAt)}` : 'In progress'} text="Hofund drafted a plan automatically when you accepted the company." />
            <TimelineStep state={stepDone ? 'current' : 'todo'} title="Consultant review" meta={stepDone ? 'In progress' : 'Not yet'} text="Your consultant is checking who to contact, when and why." />
            <TimelineStep state="todo" n={3} title="Ready for you" meta="Not yet" text="You review and accept it." last />
          </ol>
          <p className="text-[13px] text-muted">We’ll notify you when it’s ready to review. Nothing is sent until you accept the strategy and approve each email.</p>
        </Card>
        <Actions><Button disabled>Request Changes</Button><Button variant="primary" disabled>Accept Strategy</Button></Actions>
      </>
    );
  }

  if (st.status === 'failed') {
    return <Banner tone="fail" title="We couldn’t finish your outreach plan">Your consultant, Addler Pluviose, has been notified and is fixing it. Nothing has been sent.</Banner>;
  }

  const statusPill =
    st.status === 'with_client' ? <Pill tone={st.version > 1 ? 'Updated' : 'Needs Action'}>{st.version > 1 ? `Updated · v${st.version}` : 'Ready for your review'}</Pill>
    : st.status === 'changes_requested' ? <Pill tone="In Progress">Changes requested</Pill>
    : <Pill tone="Done">Accepted {fmtDay(st.acceptedAt)}</Pill>;

  return (
    <>
      {st.status === 'accepted' && (
        <Banner tone="success" title={`Strategy accepted · ${fmtDayTime(st.acceptedAt)}`}
          actions={<Link className={btnClass('link')} href={`/outreach/${slug}/review`}>Go to Review & Send</Link>}>
          Your consultant prepares the first emails. You review and approve every email before it’s sent.
        </Banner>
      )}
      {st.status === 'changes_requested' && (
        <Banner tone="info" title={`Changes sent to Addler Pluviose · ${fmtDayTime(st.feedbackAt)}`}>“{st.clientFeedback}” Your consultant is updating the plan.</Banner>
      )}
      {st.status === 'with_client' && st.changeSummary && (
        <Banner tone="info" title={`Updated after your feedback · v${st.version}`}>What changed: {st.changeSummary}</Banner>
      )}

      <Card className="flex flex-col gap-2 p-5">
        <div className="flex items-center gap-3"><h2 className="text-[15px] font-semibold">Objective</h2><span className="ml-auto">{statusPill}</span></div>
        <p className="text-xs text-muted">Published {fmtDay(st.publishedAt)}{st.version > 1 ? ` · v${st.version}` : ''}</p>
        <p className="text-sm">{st.objective}</p>
      </Card>

      <h2 className="text-[17px] font-semibold">Who to Contact, When and Why</h2>
      <Table head={['#', 'Person / role', 'Relationship', 'Objective', 'Sender', 'When', 'Reason']}>
        {st.rows.sort((a, b) => a.order - b.order).map((r) => {
          const ct = contactById(s, r.contactId)!;
          const sender = personById(s, r.senderId);
          return (
            <tr key={r.contactId}>
              <td className="text-muted">{r.order}</td>
              <td><PersonCell name={ct.name} sub={ct.roleLabel} /></td>
              <td>{relationshipOf(ct)}</td>
              <td>{r.objective}</td>
              <td><PersonCell name={sender?.name ?? '—'} sub={sender?.title === 'Head of Corporate Development' ? 'Head of Corp. Dev.' : sender?.title} /></td>
              <td><PersonCell name={r.when} sub={r.whenNote} /></td>
              <td className="text-muted">{clientReason(r)}</td>
            </tr>
          );
        })}
      </Table>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="flex flex-col gap-2 p-5">
          <h3 className="text-sm font-semibold">Follow-Up and Stop Rules</h3>
          <ul className="list-disc pl-5 text-[13px] text-muted">
            <li>Review each reply before sending anything else to that person.</li>
            <li>Stop immediately if anyone opts out or refuses.</li>
            <li>If no reply after 7 days, you can send one follow-up (up to 4, then a 30-day break).</li>
          </ul>
        </Card>
        <Card className="flex flex-col gap-2 p-5">
          <h3 className="text-sm font-semibold">What Happens After You Accept</h3>
          <p className="text-[13px] text-muted">Addler Pluviose, your consultant, writes first-contact emails for {st.rows.filter((r) => r.wave === 1).sort((a, b) => a.order - b.order).map((r) => `#${r.order}`).join(' and ')}. You review each one before it sends.</p>
        </Card>
      </div>

      {st.status === 'with_client' && (
        <div className="sticky bottom-0 -mx-8 border-t border-line bg-page px-8 py-4">
          {q.changes ? (
            <form action={requestStrategyChanges} className="flex flex-col gap-3">
              <input type="hidden" name="strategyId" value={st.id} /><input type="hidden" name="redirect" value={here} />
              <Field label="What should change? (required)"><textarea name="feedback" required rows={3} autoFocus className={inputClass} placeholder="e.g. Contact the adviser first, and leave operations out for now…" /></Field>
              <Actions><Link href={here} className={btnClass('secondary')}>Cancel</Link><SubmitButton>Send to Consultant</SubmitButton></Actions>
            </form>
          ) : (
            <Actions start={<span className="text-[13px] text-muted">Accepting lets your consultant write the first emails</span>}>
              <Link href={`${here}?changes=1`} className={btnClass('secondary')}>Request Changes</Link>
              <form action={acceptStrategy}><input type="hidden" name="strategyId" value={st.id} /><input type="hidden" name="redirect" value={here} /><SubmitButton pendingLabel="Accepting…">Accept Strategy</SubmitButton></form>
            </Actions>
          )}
        </div>
      )}
      {st.status === 'changes_requested' && (
        <Actions start={<span className="text-[13px] text-muted">Waiting on your consultant’s updated plan</span>}><Button disabled>Request Changes</Button><Button variant="primary" disabled>Accept Strategy</Button></Actions>
      )}
    </>
  );
}

function TimelineStep({ state, title, meta, text, n, last }: { state: 'done' | 'current' | 'todo'; title: string; meta: string; text: string; n?: number; last?: boolean }) {
  return (
    <li className={`relative flex gap-4 rounded-md px-3 py-3 ${state === 'current' ? 'bg-sunk' : ''}`}>
      <div className="flex flex-col items-center">
        <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${state === 'done' ? 'bg-accent text-accent-fg' : state === 'current' ? 'border-2 border-accent bg-page' : 'border border-line-strong text-muted'}`}>
          {state === 'done' ? <Check size={14} strokeWidth={3} /> : state === 'current' ? <span className="h-2.5 w-2.5 rounded-full bg-accent" /> : n}
        </span>
        {!last && <span className={`mt-1 w-0.5 flex-1 ${state === 'done' ? 'bg-accent' : 'bg-line'}`} />}
      </div>
      <div className="flex flex-col gap-0.5 pb-1">
        <div className="flex items-baseline gap-2"><span className="text-sm font-semibold">{title}</span><span className="text-xs text-muted">{meta}</span></div>
        <span className="text-[13px] text-muted">{text}</span>
      </div>
    </li>
  );
}
