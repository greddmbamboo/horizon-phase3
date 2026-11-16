import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getState } from '@horizon/outreach/data';
import { companyById, contactById, contactsFor, fmtDay, fmtDayTime, personById, strategyForCompany } from '@horizon/outreach';
import { overlapsOf } from '@horizon/outreach/actions';
import { addStrategyContact, finishRegenerate, publishStrategy, reviseStrategy, setContactEmail, setContactLocation, setOverlapDecision, startRegenerate, updateStrategyRow } from '@horizon/outreach/server-actions';
import { Actions, Banner, Card, Field, PageHeader, PersonCell, Pill, Table, btnClass, inputClass } from '@horizon/ui';
import { Modal } from '@horizon/ui/modal';
import { AutoRun, SubmitButton } from '@horizon/ui/client';

export default async function StrategyReview({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ edit?: string; contact?: string; published?: string; overlap?: string; location?: string; add?: string; q?: string }> }) {
  const { id } = await params;
  const q = await searchParams;
  const s = await getState();
  const st = s.strategies.find((x) => x.id === id);
  if (!st) notFound();
  const c = companyById(s, st.companyId)!;
  const here = `/queue/strategy/${st.id}`;
  const latest = strategyForCompany(s, c.id)?.id === st.id;
  const senders = s.people.filter((p) => p.side === 'client');
  const editRow = st.rows.find((r) => r.contactId === q.edit);
  const fixContact = q.contact ? contactById(s, q.contact) : undefined;
  const open = st.attention.filter((a) => !a.resolved);
  const editable = st.status === 'consultant_review';
  const regenerating = st.status === 'generating';
  const overlapContact = q.overlap ? contactById(s, q.overlap) : undefined;
  const overlapWith = overlapContact ? overlapsOf(s, overlapContact)[0] : undefined;
  const locContact = q.location ? contactById(s, q.location) : undefined;
  const search = (q.q ?? '').trim().toLowerCase();
  const people = contactsFor(s, c.id).filter((p) => !search || `${p.name} ${p.title}`.toLowerCase().includes(search));
  const editedOrders = st.rows.filter((r) => r.edited).map((r) => r.order).sort((a, b) => a - b);
  const ATTN_LINK = { email: ['contact', 'Find Contact Details'], overlap: ['overlap', 'Choose Overlap Approach'], location: ['location', 'Add Location Evidence'] } as const;

  const pill = st.status === 'consultant_review' ? <Pill tone="Needs Action">Ready for review</Pill>
    : st.status === 'with_client' ? <Pill tone="In Progress">With client · v{st.version}</Pill>
    : st.status === 'changes_requested' ? <Pill tone="Needs Action">Changes requested</Pill>
    : st.status === 'accepted' ? <Pill tone="Done">Accepted {fmtDay(st.acceptedAt)}</Pill>
    : st.status === 'generating' ? null : <Pill tone="Inactive">{st.status}</Pill>;

  return (
    <>
      <PageHeader back={{ href: '/queue?tab=strategy', label: 'Outreach Queue' }} title={`Strategy · ${c.name}`} subtitle={`Client accepted on ${fmtDay(c.decidedAt)}`} />
      <div className="flex items-center gap-3">{pill}<span className="text-xs text-muted">v{st.version} generated {fmtDayTime(st.generatedAt)}</span></div>

      {regenerating && (
        <Banner tone="info" title="Regenerating this strategy…">
          Using the latest People record and client settings.{editedOrders.length ? ` Your edits to contact${editedOrders.length > 1 ? 's' : ''} ${editedOrders.join(editedOrders.length > 2 ? ', ' : ' and ')} will be kept.` : ''} This usually takes under a minute.
          <AutoRun id={st.id} action={finishRegenerate} />
        </Banner>
      )}
      {st.status === 'with_client' && <Banner tone="success" title={`Published to ${s.engagement.clientName} · ${fmtDayTime(st.publishedAt)}`} actions={<Link className={btnClass('link')} href="/queue">Back to Queue</Link>}>Rachel Kim has been notified. You’ll see her decision here, and in the Outreach Queue if she asks for changes.</Banner>}
      {st.status === 'accepted' && <Banner tone="success" title={`Accepted by Rachel Kim · ${fmtDayTime(st.acceptedAt)}`}>First-contact emails were written automatically. Flagged ones are in the Outreach Queue.</Banner>}
      {st.status === 'changes_requested' && latest && (
        <Banner tone="warn" title={`Rachel Kim requested changes · ${fmtDayTime(st.feedbackAt)}`}>“{st.clientFeedback}”</Banner>
      )}
      {st.changeSummary && st.status === 'consultant_review' && <Banner tone="info" title={`v${st.version} · revised after client feedback`}>{st.changeSummary}</Banner>}

      <Card className="flex flex-col gap-2 p-5">
        <h2 className="text-[15px] font-semibold">Company Objective</h2>
        <div className="rounded-md border border-line px-3 py-2.5 text-sm">{st.objective}</div>
      </Card>

      {open.length > 0 && (
        <Card className="flex flex-col gap-2 bg-sunk p-5">
          <h2 className="text-[15px] font-semibold">Needs Your Attention</h2>
          <ul className="flex flex-col gap-1 text-[13px]">
            {open.map((a) => {
              const ct = a.contactId ? contactById(s, a.contactId) : st.rows.map((r) => contactById(s, r.contactId)!).find((x) => a.text.startsWith(x.name));
              const [param, label] = ATTN_LINK[a.kind ?? 'email'];
              return <li key={a.id}>· {a.text} {ct && editable && <Link className={btnClass('link', 'ml-1')} href={`${here}?${param}=${ct.id}`} scroll={false}>{label}</Link>}</li>;
            })}
          </ul>
        </Card>
      )}

      <div className="flex flex-col gap-1"><h2 className="text-[15px] font-semibold">Contacts, Order and Timing</h2><span className="text-xs text-muted">{st.rows.length} people available to contact</span></div>
      <Table head={['#', 'Person / role', 'Objective', 'Sender', 'When', 'Reason', '']}>
        {st.rows.sort((a, b) => a.order - b.order).map((r) => {
          const ct = contactById(s, r.contactId)!;
          const sender = personById(s, r.senderId);
          return (
            <tr key={r.contactId}>
              <td className="text-muted">{r.order}</td>
              <td><PersonCell name={ct.name} sub={ct.roleLabel} /></td>
              <td>{r.objective}</td>
              <td><PersonCell name={sender?.name ?? '—'} sub={sender?.title === 'Head of Corporate Development' ? 'Head of Corp. Dev.' : sender?.title} /></td>
              <td><PersonCell name={r.when} sub={r.whenNote} /></td>
              <td className="text-muted">{r.reason}</td>
              <td className="text-right">{editable && <Link className={btnClass('link')} href={`${here}?edit=${r.contactId}`}>Edit</Link>}</td>
            </tr>
          );
        })}
      </Table>
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-xs text-muted">Each contact can come from a different approved sender, set in the client’s communication settings.</p>
        {editable && <Link className={btnClass('link', 'ml-auto text-[13px]')} href={`${here}?add=1`} scroll={false}>+ Add Someone From People</Link>}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="flex flex-col gap-1.5 p-5"><h3 className="text-sm font-semibold">Follow-Up and Stop Rules</h3><p className="text-[13px] text-muted">Review each reply before sending further replies to that person. Stop for opt-out or refusal. One follow-up allowed after 7 days without a reply; after 4, a 30-day break.</p></Card>
        <Card className="flex flex-col gap-1.5 p-5"><h3 className="text-sm font-semibold">Private to Consultants</h3><p className="text-[13px] text-muted">{st.privateNotes}</p></Card>
      </div>

      {editable && (
        <div className="sticky bottom-0 -mx-8 border-t border-line bg-page px-8 py-4">
          <form action={publishStrategy}>
            <input type="hidden" name="strategyId" value={st.id} /><input type="hidden" name="redirect" value={here} />
            <Actions start={open.length ? <span className="text-[13px] text-muted">{open.length} {open.length > 1 ? 'items need' : 'item needs'} attention. You can still publish.</span> : undefined}>
              <SubmitButton variant="secondary" formAction={startRegenerate} pendingLabel="Starting…">Regenerate</SubmitButton>
              <SubmitButton pendingLabel="Publishing…">Publish for Client Review</SubmitButton>
            </Actions>
          </form>
        </div>
      )}
      {st.status === 'changes_requested' && latest && (
        <Card className="flex flex-col gap-3 p-5">
          <h2 className="text-[15px] font-semibold">Revise the Strategy</h2>
          <form action={reviseStrategy} className="flex flex-col gap-3">
            <input type="hidden" name="strategyId" value={st.id} /><input type="hidden" name="redirect" value="/queue?tab=strategy" />
            <Field label="What changed (shown to the client)"><textarea name="summary" required rows={2} className={inputClass} defaultValue="Marcus Reyes is now contacted first. Owen Talbot was removed for now." /></Field>
            <Actions><SubmitButton>Create v{st.version + 1}</SubmitButton></Actions>
          </form>
        </Card>
      )}

      {editRow && (
        <Modal title={`Edit Contact · ${contactById(s, editRow.contactId)!.name}`} closeHref={here} width={520}>
          <form action={updateStrategyRow} className="flex flex-col gap-4 pb-2">
            <input type="hidden" name="strategyId" value={st.id} /><input type="hidden" name="contactId" value={editRow.contactId} /><input type="hidden" name="redirect" value={here} />
            <Field label="Objective"><input name="objective" defaultValue={editRow.objective} className={inputClass} /></Field>
            <Field label="Sender"><select name="senderId" defaultValue={editRow.senderId} className={inputClass}>{senders.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.title}</option>)}</select></Field>
            <Field label="When"><input name="when" defaultValue={editRow.when} className={inputClass} /></Field>
            <Field label="Reason"><textarea name="reason" defaultValue={editRow.reason} rows={2} className={inputClass} /></Field>
            <Actions><Link className={btnClass('link')} href={here}>Cancel</Link><SubmitButton>Save Changes</SubmitButton></Actions>
          </form>
        </Modal>
      )}
      {overlapContact && overlapWith && editable && (
        <Modal title={`${overlapContact.name} Appears Twice`} closeHref={here} width={560}>
          <form action={setOverlapDecision} className="flex flex-col gap-4 pb-2">
            <input type="hidden" name="strategyId" value={st.id} /><input type="hidden" name="contactId" value={overlapContact.id} /><input type="hidden" name="redirect" value={here} />
            <p className="text-[13px] text-muted">{overlapContact.name.split(' ')[0]} is also a contact for {companyById(s, overlapWith.companyId)!.name} in this engagement. Choose how outreach should treat {overlapContact.name.split(' ')[0]}.</p>
            <fieldset className="flex flex-col gap-3">
              <legend className="sr-only">How to contact {overlapContact.name}</legend>
              {([
                ['this_only', `Contact for ${c.name} only`, `${companyById(s, overlapWith.companyId)!.name.split(' ')[0]}’s strategy will skip ${overlapContact.name.split(' ')[0]}.`],
                ['both', 'Contact for both, one at a time', 'The second company waits until the first conversation settles.'],
                ['neither', `Leave ${overlapContact.name.split(' ')[0]} out of both`, `Neither strategy contacts ${overlapContact.name.split(' ')[0]}.`],
              ] as const).map(([v, label, note]) => (
                <label key={v} className="flex cursor-pointer items-start gap-3 rounded-card border border-line px-3.5 py-3 has-[:checked]:border-2 has-[:checked]:border-accent">
                  <input type="radio" name="choice" value={v} defaultChecked={(overlapContact.overlap ?? 'this_only') === v} className="mt-1 accent-[rgb(var(--accent))]" />
                  <span className="flex flex-col gap-0.5"><span className="text-sm font-semibold">{label}</span><span className="text-[13px] text-muted">{note}</span></span>
                </label>
              ))}
            </fieldset>
            <Actions><Link className={btnClass('link')} href={here}>Cancel</Link><SubmitButton>Save Decision</SubmitButton></Actions>
          </form>
        </Modal>
      )}
      {q.add && editable && (
        <Modal title="Add Someone From People" closeHref={here} width={520}>
          <div className="flex flex-col gap-4 pb-2">
            <form action={here} className="flex flex-col gap-1.5" role="search">
              <input type="hidden" name="add" value="1" />
              <label htmlFor="people-search" className="text-[13px] font-medium">Search people</label>
              <input id="people-search" name="q" defaultValue={q.q} placeholder="Search the accepted People record" className={inputClass} autoFocus />
            </form>
            <div className="flex flex-col gap-2">
              {people.length === 0 && <p className="text-[13px] text-muted">No one in the People record matches “{q.q}”.</p>}
              {people.map((p) => {
                const inStrategy = st.rows.some((r) => r.contactId === p.id);
                return (
                  <div key={p.id} className="flex items-center gap-3 rounded-card border border-line px-3.5 py-2.5">
                    <div className="flex flex-1 flex-col gap-0.5"><span className="text-sm font-semibold">{p.name}</span><span className="text-[13px] text-muted">{p.title}</span></div>
                    {inStrategy ? <span className="text-xs font-medium text-muted">In strategy</span> : (
                      <form action={addStrategyContact}>
                        <input type="hidden" name="strategyId" value={st.id} /><input type="hidden" name="contactId" value={p.id} /><input type="hidden" name="redirect" value={here} />
                        <SubmitButton variant="link" pendingLabel="Adding…" aria-label={`Add ${p.name}`}>Add</SubmitButton>
                      </form>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-[13px] text-muted">Only people in the accepted People record for this company can be added.</p>
            <Actions><Link className={btnClass('link')} href={here}>Cancel</Link></Actions>
          </div>
        </Modal>
      )}
      {locContact && editable && (
        <Modal title={`Where Is ${locContact.name} Based?`} closeHref={here} width={520}>
          <form action={setContactLocation} className="flex flex-col gap-4 pb-2">
            <input type="hidden" name="contactId" value={locContact.id} /><input type="hidden" name="redirect" value={here} />
            <p className="text-[13px] text-muted">Outreach only goes to people in the US. Add evidence of where {locContact.name.split(' ')[0]} is based before {locContact.name.split(' ')[0]} can be contacted.</p>
            <Field label="Location"><input name="location" required defaultValue={locContact.location ?? 'Littleton, Colorado, US'} className={inputClass} /></Field>
            <Field label="Evidence">
              <select name="source" className={inputClass}>
                <option>{`LinkedIn profile · “Littleton, CO” · checked ${fmtDay(s.now)}`}</option>
                <option>Company website · team page</option>
                <option>Client provided</option>
              </select>
            </Field>
            <Field label="Link (optional)"><input name="url" type="url" placeholder="https://" className={inputClass} /></Field>
            <Actions><Link className={btnClass('link')} href={here}>Cancel</Link><SubmitButton>Save Location</SubmitButton></Actions>
          </form>
        </Modal>
      )}
      {fixContact && (
        <Modal title={`Find Contact Details · ${fixContact.name}`} closeHref={here} width={520}>
          <form action={setContactEmail} className="flex flex-col gap-4 pb-2">
            <input type="hidden" name="contactId" value={fixContact.id} /><input type="hidden" name="redirect" value={here} />
            <p className="text-sm text-muted">We don’t have a verified email address for {fixContact.name.split(' ')[0]} yet.</p>
            <Field label="Email address" hint="Suggested from the company domain pattern · checked today"><input name="email" type="email" required defaultValue={`${fixContact.name.split(' ')[0].toLowerCase()}@finnsfancyfences.com`} className={inputClass} /></Field>
            <Field label="Source"><select name="source" className={inputClass}><option>Company website · team page</option><option>LinkedIn</option><option>Client provided</option></select></Field>
            <Actions><Link className={btnClass('link')} href={here}>Cancel</Link><SubmitButton>Use This Address</SubmitButton></Actions>
          </form>
        </Modal>
      )}
    </>
  );
}
