import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getState } from '@horizon/outreach/data';
import { companyById, contactById, fmtDay, fmtDayTime, personById, strategyForCompany } from '@horizon/outreach';
import { publishStrategy, reviseStrategy, setContactEmail, updateStrategyRow } from '@horizon/outreach/server-actions';
import { Actions, Banner, Card, Field, PageHeader, PersonCell, Pill, Table, btnClass, inputClass } from '@horizon/ui';
import { Modal } from '@horizon/ui/modal';
import { SubmitButton } from '@horizon/ui/client';

export default async function StrategyReview({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ edit?: string; contact?: string; published?: string }> }) {
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

  const pill = st.status === 'consultant_review' ? <Pill tone="Needs Action">Ready for review</Pill>
    : st.status === 'with_client' ? <Pill tone="In Progress">With client · v{st.version}</Pill>
    : st.status === 'changes_requested' ? <Pill tone="Needs Action">Changes requested</Pill>
    : st.status === 'accepted' ? <Pill tone="Done">Accepted {fmtDay(st.acceptedAt)}</Pill> : <Pill tone="Inactive">{st.status}</Pill>;

  return (
    <>
      <PageHeader back={{ href: '/queue?tab=strategy', label: 'Outreach Queue' }} title={`Strategy · ${c.name}`} subtitle={`Client accepted on ${fmtDay(c.decidedAt)}`} />
      <div className="flex items-center gap-3">{pill}<span className="text-xs text-muted">v{st.version} generated {fmtDayTime(st.generatedAt)}</span></div>

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
              const ct = st.rows.map((r) => contactById(s, r.contactId)!).find((x) => a.text.startsWith(x.name));
              return <li key={a.id}>· {a.text} {ct && editable && <Link className={btnClass('link', 'ml-1')} href={`${here}?contact=${ct.id}`}>Find Contact Details</Link>}</li>;
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
      <p className="text-xs text-muted">Each contact can come from a different approved sender, set in the client’s communication settings.</p>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="flex flex-col gap-1.5 p-5"><h3 className="text-sm font-semibold">Follow-Up and Stop Rules</h3><p className="text-[13px] text-muted">Review each reply before sending further replies to that person. Stop for opt-out or refusal. One follow-up allowed after 7 days without a reply; after 4, a 30-day break.</p></Card>
        <Card className="flex flex-col gap-1.5 p-5"><h3 className="text-sm font-semibold">Private to Consultants</h3><p className="text-[13px] text-muted">{st.privateNotes}</p></Card>
      </div>

      {editable && (
        <div className="sticky bottom-0 -mx-8 border-t border-line bg-page px-8 py-4">
          <form action={publishStrategy}>
            <input type="hidden" name="strategyId" value={st.id} /><input type="hidden" name="redirect" value={here} />
            <Actions start={open.length ? <span className="text-[13px] text-muted">{open.length} {open.length > 1 ? 'items need' : 'item needs'} attention. You can still publish.</span> : undefined}>
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
