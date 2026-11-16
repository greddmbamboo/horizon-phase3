import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getState } from '@horizon/outreach/data';
import { companyById, contactById, fmtDayTime, personById, readinessFor, threadFor } from '@horizon/outreach';
import { addPrivateNote, confirmReadiness, markNotReady, undoReadiness } from '@horizon/outreach/server-actions';
import { Actions, AnalysisRow, Banner, Card, EmptyState, Field, PageHeader, Pill, btnClass, cn, inputClass } from '@horizon/ui';
import { Modal } from '@horizon/ui/modal';
import { SubmitButton } from '@horizon/ui/client';

export default async function Thread({ params, searchParams }: { params: Promise<{ contactId: string }>; searchParams: Promise<{ details?: string; dialog?: string; full?: string }> }) {
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

  const status = r?.status === 'confirmed' ? <Pill tone="Done">Ready to meet</Pill>
    : r?.status === 'needs_review' ? <Pill tone="Needs Action">Needs attention</Pill>
    : r?.status === 'not_ready' ? <Pill tone="Inactive">Not currently ready</Pill> : undefined;

  return (
    <>
      <PageHeader back={{ href: '/queue?tab=interest', label: 'Outreach Queue' }} title={ct.name} subtitle={`${ct.title} · ${c.name}`} status={status} />

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-3">
          {msgs.length === 0 && <EmptyState title="No messages yet">Emails to and from {ct.name.split(' ')[0]} appear here once outreach starts.</EmptyState>}
          {msgs.map((m) => {
            const latest = m.id === latestId;
            const collapsed = !latest && q.full !== m.id && m.direction !== 'outside';
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
                  <div className="text-sm text-muted">{m.body.split('\n').find((l) => l && !/^(Hello|Hi)\b/.test(l))?.slice(0, 80)}… <Link className={btnClass('link', 'ml-2')} href={`${here}?full=${m.id}`}>Show Full Email</Link></div>
                ) : <p className="whitespace-pre-line text-[15px] leading-relaxed">{m.body}</p>}
                {m.analysis && (
                  <>
                    <AnalysisRow items={[m.analysis.sentiment, m.analysis.intent]} action={<Link className={btnClass('link')} href={q.details ? here : `${here}?details=1`}>{q.details ? 'Hide Details' : 'Show Details'}</Link>} />
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
            <h2 className="text-[15px] font-semibold">Ready to Meet?</h2>
            {r?.status === 'needs_review' && (
              <>
                <p className="text-[13px] text-muted">The analysis thinks {ct.name.split(' ')[0]} may be open to an acquisition conversation. Confirm it before the client is told.</p>
                {lastIn?.analysis && <div className="rounded-md bg-sunk px-3 py-2.5 text-[13px]">{lastIn.analysis.evidence}</div>}
                <form action={confirmReadiness}>
                  <input type="hidden" name="contactId" value={ct.id} /><input type="hidden" name="redirect" value={here} />
                  <Actions><Link className={btnClass('link')} href={`${here}?dialog=notready`}>Not Currently Ready</Link><SubmitButton pendingLabel="Confirming…">Confirm Ready</SubmitButton></Actions>
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
                <p className="text-[13px] text-muted">Marked not currently ready · {fmtDayTime(r.at)}{r.reason ? ` · “${r.reason}”` : ''}</p>
                <form action={undoReadiness}><input type="hidden" name="contactId" value={ct.id} /><input type="hidden" name="redirect" value={here} /><Actions><SubmitButton variant="link">Undo</SubmitButton></Actions></form>
              </>
            )}
            {(!r || r.status === 'not_assessed') && <p className="text-[13px] text-muted">Nothing to decide yet. This appears when a reply suggests interest.</p>}
          </Card>
          <Card className="flex flex-col gap-1.5 p-5">
            <h3 className="text-sm font-semibold">About {ct.name.split(' ')[0]}</h3>
            <p className="text-[13px] text-muted">{ct.bio}</p>
            <p className="text-xs text-muted">{ct.email ?? 'No email on file'}{ct.location ? ` · ${ct.location}` : ''}</p>
          </Card>
          <Card className="flex flex-col gap-2 p-5">
            <div className="flex items-center gap-2"><h3 className="text-sm font-semibold">Private Notes</h3><span className="text-xs text-muted">Consultants only</span></div>
            {notes.length === 0 && <p className="text-[13px] text-muted">No notes yet.</p>}
            {notes.map((n) => (
              <div key={n.id} className="rounded-md bg-sunk px-3 py-2.5 text-[13px]">
                <p>{n.text}</p>
                <p className="mt-1 text-xs text-muted">{personById(s, n.by)?.name ?? 'Consultant'} · {fmtDayTime(n.at)}</p>
              </div>
            ))}
            <Link className={btnClass('link', 'w-fit text-[13px]')} href={`${here}?dialog=note`} scroll={false}>Add Private Note</Link>
          </Card>
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
        <Modal title="Not Currently Ready" subtitle={ct.name} closeHref={here} width={480}>
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
