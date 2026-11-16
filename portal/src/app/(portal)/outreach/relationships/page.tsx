import { getState } from '@horizon/outreach/data';
import { contactsFor, fmtDay, fmtDayTime, readinessFor } from '@horizon/outreach';
import { EmptyState, PageHeader, PersonCell, StatCard, Table, Tabs } from '@horizon/ui';

export default async function RelationshipSummary() {
  const s = await getState();
  const accepted = s.companies.filter((c) => c.decision === 'accepted');
  const sentContacts = new Set(s.messages.filter((m) => m.direction === 'out').map((m) => m.contactId));
  const replied = new Set(s.messages.filter((m) => m.direction === 'in').map((m) => m.contactId));
  const optOuts = Object.values(s.contactStatus).filter((x) => x === 'opted_out').length;
  const sent = s.messages.filter((m) => m.direction === 'out').length;
  const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)}%` : 'N/A');
  const positive = new Set(s.messages.filter((m) => m.analysis?.sentiment === 'Positive').map((m) => m.companyId));
  const negative = new Set(s.messages.filter((m) => m.analysis && m.analysis.sentiment !== 'Positive').map((m) => m.companyId));
  return (
    <>
      <PageHeader title="Outreach" subtitle={`${s.engagement.name} engagement · as of ${fmtDayTime(s.now)} · inbox last checked ${s.sending.lastChecked}`} />
      <Tabs items={[{ label: 'Companies', href: '/outreach' }, { label: 'Relationship Summary', href: '/outreach/relationships', active: true }]} />
      <h2 className="text-[15px] font-semibold">Email Performance · All Time</h2>
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Emails sent" value={sent} note={`To ${sentContacts.size} people`} />
        <StatCard label="Reply rate" value={pct(replied.size, sentContacts.size)} note={`${replied.size} of ${sentContacts.size} people · auto-replies excluded`} />
        <StatCard label="Opt-out rate" value={pct(optOuts, sentContacts.size)} note={`${optOuts} of ${sentContacts.size} people`} />
      </div>
      <h2 className="text-[15px] font-semibold">Relationships · As of Today</h2>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Ready for acquisition meeting" value={s.readiness.filter((r) => r.status === 'confirmed').length} note="Confirmed by Addler Pluviose" />
        <StatCard label="Positive" value={positive.size} note="companies" />
        <StatCard label="Mixed or negative" value={negative.size} note="companies" />
        <StatCard label="Not enough evidence" value={accepted.length - positive.size - negative.size} note="companies" />
      </div>
      {sent === 0 ? (
        <EmptyState title="No emails sent yet">Once your first emails go out, you’ll see opens, replies and how each relationship is going here.</EmptyState>
      ) : (
        <Table head={['Company', 'Emails sent', 'Replies', 'Sentiment', 'Meeting readiness']}>
          {accepted.map((c) => {
            const msgs = s.messages.filter((m) => m.companyId === c.id);
            const ins = msgs.filter((m) => m.direction === 'in');
            const conf = contactsFor(s, c.id).map((p) => ({ p, r: readinessFor(s, p.id) })).find((x) => x.r?.status === 'confirmed');
            return (
              <tr key={c.id}>
                <td className="font-semibold">{c.name}</td>
                <td>{msgs.filter((m) => m.direction === 'out').length}</td>
                <td>{ins.length}</td>
                <td><PersonCell name={ins.at(-1)?.analysis?.sentiment ?? 'Not enough evidence'} sub={ins.length ? `${ins.length} of ${new Set(msgs.map((m) => m.contactId)).size} contacted people assessed` : msgs.some((m) => m.direction === 'out') ? 'Waiting on replies' : 'No one contacted yet'} /></td>
                <td>{conf ? <PersonCell name="Confirmed ready" sub={`${conf.p.name} · confirmed ${fmtDay(conf.r!.at)} by Addler Pluviose`} /> : <span className="text-muted">—</span>}</td>
              </tr>
            );
          })}
        </Table>
      )}
    </>
  );
}
