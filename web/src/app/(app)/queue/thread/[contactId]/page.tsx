import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getState } from '@horizon/outreach/data';
import { companyById, contactById, fmtDay, fmtDayTime, personById, readinessFor, threadFor } from '@horizon/outreach';
import { addPrivateNote, confirmReadiness, markNotReady, undoReadiness } from '@horizon/outreach/server-actions';
import { Actions, AnalysisRow, Banner, Card, EmptyState, Field, PageHeader, Pill, btnClass, cn, inputClass } from '@horizon/ui';
import { Modal } from '@horizon/ui/modal';
import { SubmitButton } from '@horizon/ui/client';

export default async function Thread({ params, searchParams }: { params: Promise<{ contactId: string }>; searchParams: Promise<{ details?: string; dialog?: string; full?: string; activity?: string }> }) {
  const { contactId } = await params;
  const q = await searchParams;
  const s = await getState();
  const ct = contactById(s, contactId);
  if (!ct) notFound();
  const c = companyById(s, ct.companyId)!;
  const msgs = threadFor(s, ct.id);
  const r = readinessFor(s, ct.id);
  const here = `/queue/thread/${ct.id}`;
  const lastIn = [...msgs].reverse().find((m) => m.direction === 'in');
  const latestId = msgs[msgs.length - 1]?.id;
  const notes = (s.privateNotes ?? []).filter((n) => n.contactId === ct.id);
  const emailCount = msgs.filter((m) => m.direction !== 'outside').length;
  const sentCount = msgs.filter((m) => m.direction === 'out').length;
  const replyCount = msgs.filter((m) => m.direction === 'in').length;
  const subject = msgs.find((m) => m.direction === 'in')?.subject ?? (msgs[0] ? `Re: ${msgs[0].subject}` : '');
  // System activity for this company, kept out of the thread unless asked for.
  const activity = s.activity.filter((a) => a.side === 'system' && (a.text.includes(c.name) || a.text.includes(ct.name)));
  const expandAll = q.full === 'all';
  const qs = (extra: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ details: q.details, full: q.full, activity: q.activity, ...extra })) if (v) p.set(k, v);
    const str = p.toString();
    return str ? `${here}?${str}` : here;
  };

  const status = r?.status === 'confirmed' ? <Pill tone="Done">Ready to meet</Pill>
    : r?.status === 'needs_review' ? <Pill tone="Needs Action">Needs attention</Pill>
    : r?.status === 'not_ready' ? <Pill tone="Inactive">Not ready yet</Pill> : undefined;

  return (
    <>
      <PageHeader back={{ href: '/queue?tab=interest', label: 'Outreach Queue' }} title={`${ct.name} · ${c.name}`} subtitle="Full shared history · the client sees the same thread, without private notes" status={status} />

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-3">
          {msgs.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <h2 className="min-w-0 truncate text-[15px] font-semibold">{subject}</h2>
              <span className="text-xs text-muted">{emailCount} email{emailCount === 1 ? '' : 's'}</span>
              <Link className={btnClass('link', 'text-xs')} href={qs({ full: expandAll ? undefined : 'all' })} scroll={false}>{expandAll ? 'Collapse' : 'Expand All'}</Link>
              <Link className={btnClass('link', 'text-xs')} href={qs({ activity: q.activity ? undefined : '1' })} scroll={false}>{q.activity ? 'Hide' : 'Show'} System Activity ({activity.length})</Link>
            </div>
          )}
          {q.activity && activity.length > 0 && (
            <div className="flex flex-col gap-1 rounded-md bg-sunk px-4 py-3 text-xs text-muted">
              {[...activity].reverse().map((a) => <div key={a.id}>{fmtDayTime(a.at)} · {a.text}</div>)}
            </div>
          )}
          {msgs.length === 0 && <EmptyState title="No messages yet">Emails to and from {ct.name.split(' ')[0]} appear here once outreach starts.</EmptyState>}
          {msgs.map((m) => {
            const latest = m.id === latestId;
            const collapsed = !latest && !expandAll && q.full !== m.id && m.direction !== 'outside';
            const from = m.direction === 'in' ? `${ct.name} → ${personById(s, 'u_rachel')!.name}` : m.direction === 'outside' ? `Logged · ${m.channel}` : `${personById(s, m.fromId)?.name ?? 'Spacely Sprockets'} → ${ct.name}`;
            const evidence = m.analysis?.possibleInterest && m.id === lastIn?.id;
            return (
              <div key={m.id} className={cn('relative flex flex-col gap-3 overflow-hidden rounded-card p-5', latest ? 'bg-highlight' : 'border border-line bg-page')}>
                {latest && <span className="absolute inset-y-0 left-0 w-[3px] bg-accent" />}
                <div className="flex items-center gap-2 text-[13px] font-semibold text-muted">
                  {from} · {fmtDayTime(m.at)}
                  {evidence && <span className="ml-auto text-xs font-semibold text-ink">⚑ Marked as evidence</span>}
                </div>
                {collapsed ? (
                  <div className="text-sm text-muted">{m.body.split('\n').find((l) => l && !/^(Hello|Hi)\b/.test(l))?.slice(0, 80)}… <Link className={btnClass('link', 'ml-2')} href={qs({ full: m.id })}>Show Full Email</Link></div>
                ) : <p className="whitespace-pre-line text-[15px] leading-relaxed">{m.body}</p>}
                {m.analysis && (
                  <>
                    <AnalysisRow items={[m.analysis.sentiment, m.analysis.intent, ...(m.analysis.possibleInterest ? ['Possible acquisition interest'] : [])]} action={<Link className={btnClass('link')} href={qs({ details: q.details ? undefined : '1' })}>{q.details ? 'Hide Details' : 'Show Details'}</Link>} />
                    {q.details && (
                      <div className="grid gap-3 rounded-md bg-page p-4 text-[13px]">
                        {[['Summary', m.analysis.summary], ['Evidence', m.analysis.evidence], ['Suggested next step', m.analysis.nextStep]].map(([k, v]) => (
                          <div key={k}><div className="text-[11px] font-semibold uppercase tracking-wide text-muted">{k}</div><div>{v}</div></div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex flex-col gap-3 lg:sticky lg:top-6">
          <Card className="flex flex-col gap-3 p-5">
            <h2 className="text-[15px] font-semibold">Confirm Acquisition Readiness</h2>
            {r?.status === 'needs_review' && (
              <>
                <ol className="flex flex-col gap-3">
                  <li className="flex gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-line text-[11px] font-semibold">1</span>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[13px] font-semibold">Can this person decide?</span>
                      <span className="text-xs text-muted">{ct.decisionMaker ? `${ct.name} is listed as ${ct.title.toLowerCase()} and decision maker in the accepted People record.` : `${ct.name} is not listed as a decision maker in the accepted People record.`}</span>
                    </div>
                  </li>
                  <li className="flex gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-line text-[11px] font-semibold">2</span>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[13px] font-semibold">Is the interest explicit?</span>
                      <span className="text-xs text-muted">{lastIn?.analysis?.evidence ?? 'No reply yet.'}{lastIn ? ` (${fmtDay(lastIn.at)})` : ''}</span>
                    </div>
                  </li>
                </ol>
                <p className="text-xs text-muted">The client is notified only when you confirm.</p>
                <form action={confirmReadiness}>
                  <input type="hidden" name="contactId" value={ct.id} /><input type="hidden" name="redirect" value={here} />
                  <Actions><Link className={btnClass('link')} href={`${here}?dialog=notready`}>Not Ready Yet</Link><SubmitButton pendingLabel="Confirming…">Confirm Ready</SubmitButton></Actions>
                </form>
              </>
            )}
            {r?.status === 'confirmed' && (
              <>
                <Banner tone="success" title={`Confirmed · ${fmtDayTime(r.at)}`}>Rachel Kim has been told {ct.name.split(' ')[0]} is ready to meet.</Banner>
                <form action={undoReadiness}><input type="hidden" name="contactId" value={ct.id} /><input type="hidden" name="redirect" value={here} /><Actions><SubmitButton variant="link">Undo</SubmitButton></Actions></form>
              </>
            )}
            {r?.status === 'not_ready' && (
              <>
                <p className="text-[13px] text-muted">Marked not ready yet · {fmtDayTime(r.at)}{r.reason ? ` · “${r.reason}”` : ''}</p>
                <form action={undoReadiness}><input type="hidden" name="contactId" value={ct.id} /><input type="hidden" name="redirect" value={here} /><Actions><SubmitButton variant="link">Undo</SubmitButton></Actions></form>
              </>
            )}
            {(!r || r.status === 'not_assessed') && <p className="text-[13px] text-muted">Nothing to decide yet. This appears when a reply suggests interest.</p>}
            <div className="flex flex-col gap-1.5 border-t border-line pt-3">
              <span className="text-[13px] font-medium">{ct.name} · {ct.title}</span>
              <span className="text-xs text-muted">{lastIn?.analysis ? `Sentiment: ${lastIn.analysis.sentiment} · ` : ''}{sentCount} email{sentCount === 1 ? '' : 's'} sent · {replyCount} repl{replyCount === 1 ? 'y' : 'ies'}</span>
              <Link className={btnClass('link', 'w-fit text-[13px]')} href={`${here}?dialog=note`} scroll={false}>Add Private Note</Link>
            </div>
          </Card>
          {notes.length > 0 && <Card className="flex flex-col gap-2 p-5">
            <div className="flex items-center gap-2"><h3 className="text-sm font-semibold">Private Notes</h3><span className="text-xs text-muted">Consultants only</span></div>
            {notes.map((n) => (
              <div key={n.id} className="rounded-md bg-sunk px-3 py-2.5 text-[13px]">
                <p>{n.text}</p>
                <p className="mt-1 text-xs text-muted">{personById(s, n.by)?.name ?? 'Consultant'} · {fmtDayTime(n.at)}</p>
              </div>
            ))}
          </Card>}
        </div>
      </div>

      {q.dialog === 'note' && (
        <Modal title={`Private Note · ${ct.name}`} closeHref={here} width={520}>
          <form action={addPrivateNote} className="flex flex-col gap-4 pb-2">
            <input type="hidden" name="contactId" value={ct.id} /><input type="hidden" name="redirect" value={here} />
            <Field label="Note"><textarea name="text" required rows={3} autoFocus className={inputClass} placeholder="What should the next consultant know?" /></Field>
            <p className="text-[13px] text-muted">Only Hofund consultants can see private notes. They’re never shown to the client.</p>
            <Actions><Link className={btnClass('link')} href={here}>Cancel</Link><SubmitButton>Save Note</SubmitButton></Actions>
          </form>
        </Modal>
      )}
      {q.dialog === 'notready' && (
        <Modal title="Not Ready Yet" subtitle={ct.name} closeHref={here} width={480}>
          <form action={markNotReady} className="flex flex-col gap-4 pb-2">
            <input type="hidden" name="contactId" value={ct.id} /><input type="hidden" name="redirect" value={here} />
            <Field label="Reason" hint="Private to consultants."><textarea name="reason" required rows={3} className={inputClass} defaultValue="Friendly, but only asking for information. No sign he’s open to selling yet." /></Field>
            <Actions><Link className={btnClass('link')} href={here}>Cancel</Link><SubmitButton>Save</SubmitButton></Actions>
          </form>
        </Modal>
      )}
    </>
  );
}
