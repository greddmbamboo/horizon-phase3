import Link from 'next/link';
import { getState } from '@horizon/outreach/data';
import { companyBySlug, contactLine, contactsFor, fmtDayTime, personById, readinessFor, threadFor, wordCount, type Contact, type HorizonState, type Message } from '@horizon/outreach';
import { logOutsideContact, rewriteReply, sendReply, startReply } from '@horizon/outreach/server-actions';
import { Actions, AnalysisRow, Banner, CheckDot, EmptyState, Field, Pill, btnClass, cn, inputClass } from '@horizon/ui';
import { Modal } from '@horizon/ui/modal';
import { SubmitButton } from '@horizon/ui/client';

type Q = { contact?: string; reply?: string; history?: string; rw?: string; details?: string; full?: string; log?: string; sent?: string };

export default async function Conversations({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Q> }) {
  const { slug } = await params;
  const q = await searchParams;
  const s = await getState();
  const c = companyBySlug(s, slug)!;
  const people = contactsFor(s, c.id);
  const withMsgs = people.filter((p) => threadFor(s, p.id).length);
  const sel = people.find((p) => p.id === q.contact) ?? withMsgs.find((p) => threadFor(s, p.id).at(-1)?.direction === 'in') ?? withMsgs[0] ?? people[0];
  const base = `/outreach/${slug}/conversations`;
  const here = `${base}?contact=${sel?.id ?? ''}`;

  if (!sel) return <EmptyState title="No people yet">People appear here once the strategy names them.</EmptyState>;

  const thread = threadFor(s, sel.id);
  const lastReal = [...thread].reverse().find((m) => m.direction !== 'outside');
  const status = s.contactStatus[sel.id];
  const ready = readinessFor(s, sel.id);
  const first = sel.name.split(' ')[0];
  const needsReply = lastReal?.direction === 'in' && status !== 'opted_out';
  const draft = s.replyDrafts.find((d) => d.contactId === sel.id && d.status !== 'sent');
  const lastOutIdx = thread.length - 1;

  return (
    <div className="grid gap-6 md:grid-cols-[260px_1fr]">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-semibold text-muted">People</span>
          {people.map((p) => (
            <Link key={p.id} href={`${base}?contact=${p.id}`} className={cn('hz-focus flex flex-col gap-0.5 rounded-card border px-3 py-2.5', p.id === sel.id ? 'border-accent bg-sunk' : 'border-line hover:bg-sunk')}>
              <span className="text-sm font-semibold">{p.name}</span>
              <span className="text-xs font-medium text-muted">{p.title}</span>
              <span className="text-xs text-muted">{contactLine(s, p)}</span>
            </Link>
          ))}
        </div>
        <Link href={`${here}&log=1`} className={btnClass('link', 'w-fit text-[13px]')}>+ Log Outside Contact</Link>
      </div>

      <div className="flex min-w-0 flex-col gap-3">
        {q.sent && <Banner tone="success" title="Reply Sent">{fmtDayTime(lastReal?.at)} · approved and sent by Rachel Kim. {first}’s next reply will appear in this thread. You’ll get a notification when he responds.</Banner>}
        {status === 'opted_out' && <Banner tone="muted" title={`${first} opted out · ${fmtDayTime(lastReal?.at)}`}>{first} asked not to be emailed again. Outreach to him has stopped for good, including follow-ups. This thread stays here, read-only.</Banner>}
        {status === 'declined' && <Banner tone="muted" title={`${first} declined · ${fmtDayTime(lastReal?.at)}`}>No more emails will go to {first} unless your consultant publishes a revised strategy. You can still send one short thank-you reply.</Banner>}

        {thread.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {ready?.status === 'confirmed' && <Pill tone="Done">Confirmed ready to meet</Pill>}
            {status === 'opted_out' ? <Pill tone="Inactive">Opted out</Pill> : status === 'declined' ? <Pill tone="Inactive">Declined</Pill>
              : needsReply ? <Pill tone="Needs Action">Reply needed</Pill> : lastReal ? <Pill tone="In Progress">Waiting on {first}</Pill> : null}
          </div>
        )}

        {thread.length === 0 && (
          <div className="flex flex-col items-center gap-1 rounded-card bg-sunk px-6 py-8 text-center">
            <span className="text-[15px] font-semibold">No emails yet</span>
            <span className="text-[13px] text-muted">{first} hasn’t been contacted. The strategy says when.</span>
          </div>
        )}

        {thread.map((m, i) => <MessageCard key={m.id} s={s} m={m} latest={i === lastOutIdx} details={!!q.details && i === lastOutIdx} here={here} expanded={q.full === m.id} />)}

        {needsReply && (
          <form action={startReply} className="flex justify-end">
            <input type="hidden" name="contactId" value={sel.id} /><input type="hidden" name="redirect" value={`${here}&reply=1`} />
            <SubmitButton pendingLabel="Drafting…">Reply</SubmitButton>
          </form>
        )}
      </div>

      {q.reply && draft && <ReplyModal s={s} contact={sel} draftId={draft.id} here={here} history={!!q.history} rewrite={!!q.rw} />}
      {q.log && <LogModal s={s} companyId={c.id} people={people} selected={sel.id} here={here} />}
    </div>
  );
}

function MessageCard({ s, m, latest, details, here, expanded }: { s: HorizonState; m: Message; latest: boolean; details: boolean; here: string; expanded: boolean }) {
  const ct = s.contacts.find((x) => x.id === m.contactId)!;
  const who = m.direction === 'in' ? `${ct.name} → You` : m.direction === 'outside' ? `Logged · ${m.channel}` : `You → ${ct.name}`;
  const collapsed = !latest && !expanded && m.direction !== 'outside';
  return (
    <div className={cn('relative flex flex-col gap-3 overflow-hidden rounded-card p-5', latest ? 'bg-highlight' : 'border border-line bg-page')}>
      {latest && <span className="absolute inset-y-0 left-0 w-[3px] bg-accent" />}
      <div className="text-[13px] font-semibold text-muted">{who} · {fmtDayTime(m.at)}{m.direction === 'out' ? ' · Sent' : ''}</div>
      {m.direction === 'out' && <div className="text-[15px] font-semibold">{m.subject}</div>}
      {collapsed ? (
        <div className="text-sm text-muted">{m.body.split('\n').find((l) => l && !/^(Hello|Hi)\b/.test(l))?.slice(0, 70) ?? m.body.slice(0, 70)}… <Link className={btnClass('link', 'ml-2')} href={`${here}&full=${m.id}`}>Show Full Email</Link></div>
      ) : (
        <p className="whitespace-pre-line text-[15px] leading-relaxed">{m.body}</p>
      )}
      {expanded && <Link className={btnClass('link', 'w-fit')} href={here}>Show Less</Link>}
      {m.analysis && (
        <>
          <AnalysisRow items={[m.analysis.sentiment, m.analysis.summary]} action={<Link className={btnClass('link')} href={details ? here : `${here}&details=1`}>{details ? 'Hide Details' : 'Show Details'}</Link>} />
          {details && (
            <div className="grid gap-3 rounded-md bg-page p-4 text-[13px]">
              {[['Summary', m.analysis.summary], ['Intent', m.analysis.intent], ['Evidence', m.analysis.evidence], ['Suggested next step', m.analysis.nextStep]].map(([k, v]) => (
                <div key={k}><div className="text-[11px] font-semibold uppercase tracking-wide text-muted">{k}</div><div>{v}</div></div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ReplyModal({ s, contact, draftId, here, history, rewrite }: { s: HorizonState; contact: Contact; draftId: string; here: string; history: boolean; rewrite: boolean }) {
  const d = s.replyDrafts.find((x) => x.id === draftId)!;
  const last = [...s.messages].reverse().find((m) => m.contactId === contact.id && m.direction === 'in');
  const self = `${here}&reply=1`;
  const words = wordCount(d.body);
  const formId = 'reply-form';
  return (
    <Modal title={`Reply to ${contact.name}`} subtitle={d.subject} closeHref={here} width={900}
      footer={
        <Actions start={<Link className={btnClass('link', 'text-[13px] text-ink no-underline')} href={`${self}&history=1`}>Version History ({d.versions.length})</Link>}>
          {!rewrite && <Link className={btnClass('link')} href={`${self}&rw=1`}>Request a Rewrite</Link>}
          <Link className={btnClass('secondary')} href={here}>Cancel</Link>
          <SubmitButton form={formId} pendingLabel="Sending…" disabled={s.sending.mailbox === 'disconnected'}>Approve & Send Reply</SubmitButton>
        </Actions>
      }>
      <div className="flex flex-col gap-4">
        {s.sending.mailbox === 'disconnected' && <Banner tone="fail" title="Your reply can’t be sent right now">The outreach mailbox is disconnected. Your draft is saved. Your consultant has been notified.</Banner>}
        {last && (
          <div className="relative overflow-hidden rounded-card bg-highlight px-5 py-3.5">
            <span className="absolute inset-y-0 left-0 w-[3px] bg-accent" />
            <div className="text-[13px] font-semibold text-muted">Replying to · {fmtDayTime(last.at)}</div>
            <div className="text-[13px] text-muted">“{last.body.split('\n').filter(Boolean).slice(1, 2).join(' ').slice(0, 140)}…”</div>
          </div>
        )}
        <div className="flex items-center"><span className="text-[13px] text-muted">Written from this conversation, the strategy and your communication settings</span><span className="ml-auto"><Pill tone="Inactive">Draft · not sent</Pill></span></div>
        <form id={formId} action={sendReply} className="flex flex-col gap-3 rounded-card border border-line p-5">
          <input type="hidden" name="draftId" value={d.id} /><input type="hidden" name="redirect" value={`${here}&sent=1`} />
          <div className="text-[17px] font-semibold">{d.subject}</div>
          <p className="text-[13px] text-muted">To: {contact.name} &lt;{contact.email}&gt;<br />From: Rachel Kim &lt;{personById(s, 'u_rachel')?.email}&gt;</p>
          <textarea name="body" defaultValue={d.body} rows={10} className="hz-focus w-full resize-y rounded-md border border-transparent bg-page p-0 text-[15px] leading-relaxed hover:border-line focus:border-accent focus:p-2 focus:outline-none" aria-label="Reply text (editable)" />
          <div className="flex flex-wrap items-center gap-4 rounded-md bg-sunk px-3 py-2 text-[13px]">
            <span className="font-semibold text-muted">Writing checks</span>
            <span className="inline-flex items-center gap-1.5"><CheckDot ok={words <= 149} />{words} / 149 words</span>
            <span className="inline-flex items-center gap-1.5"><CheckDot ok />One clear ask</span>
            <span className="inline-flex items-center gap-1.5"><CheckDot ok />Plain, human voice</span>
          </div>
          <div className="rounded-md bg-sunk px-3 py-2.5 text-xs text-muted"><div className="font-semibold">Footer added automatically · not editable</div>{s.engagement.footerAddress}</div>
        </form>
        {rewrite && (
          <form action={rewriteReply} className="flex flex-col gap-3 rounded-card border border-line p-5">
            <input type="hidden" name="draftId" value={d.id} /><input type="hidden" name="redirect" value={self} />
            <div className="text-[15px] font-semibold">Rewrite With Feedback</div>
            <Field label="What should change?"><textarea name="feedback" required rows={3} autoFocus className={inputClass} placeholder="e.g. Shorter, and suggest two times next week…" /></Field>
            <Actions><Link className={btnClass('link')} href={self}>Cancel</Link><SubmitButton pendingLabel="Rewriting…">Rewrite</SubmitButton></Actions>
          </form>
        )}
        {history && (
          <div className="flex flex-col gap-2 rounded-card border border-line p-4">
            <div className="flex items-center"><span className="text-[15px] font-semibold">Version History</span><Link className={btnClass('link', 'ml-auto text-xs')} href={self}>Hide</Link></div>
            {[...d.versions].reverse().map((v, i) => (
              <div key={v.version} className={cn('flex items-center gap-3 rounded-md border border-line px-3 py-2.5', i === 0 && 'bg-highlight')}>
                <div className="flex flex-1 flex-col"><span className="text-sm font-semibold">v{v.version}{i === 0 ? ' · current' : ''}</span><span className="text-xs text-muted">{v.note} · {fmtDayTime(v.at)}</span></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}

function LogModal({ s, companyId, people, selected, here }: { s: HorizonState; companyId: string; people: Contact[]; selected: string; here: string }) {
  return (
    <Modal title="Log Outside Contact" subtitle="Record an email, call or meeting that happened outside Hofund." closeHref={here} width={560}>
      <form action={logOutsideContact} className="flex flex-col gap-4 pb-2">
        <input type="hidden" name="companyId" value={companyId} /><input type="hidden" name="redirect" value={here} />
        <fieldset className="flex flex-col gap-2"><legend className="mb-1 text-[13px] font-medium">People involved</legend>
          {people.map((p) => <label key={p.id} className="flex items-center gap-2 text-sm"><input type="checkbox" name="contactIds" value={p.id} defaultChecked={p.id === selected} className="accent-[rgb(var(--accent))]" />{p.name} <span className="text-xs text-muted">{p.title}</span></label>)}
        </fieldset>
        <Field label="Channel"><select name="channel" className={inputClass} defaultValue="Phone call"><option>Phone call</option><option>Meeting</option><option>Email (outside Hofund)</option><option>Event</option></select></Field>
        <Field label="What happened"><textarea name="summary" required rows={4} className={inputClass} placeholder="Paste the email, a transcript or notes…" /></Field>
        <Actions><Link className={btnClass('secondary')} href={here}>Cancel</Link><SubmitButton>Log Contact</SubmitButton></Actions>
      </form>
    </Modal>
  );
}
