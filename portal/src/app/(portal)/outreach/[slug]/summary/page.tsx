import { getState } from '@horizon/outreach/data';
import { companyBySlug, contactsFor, fmtDay, readinessFor, strategyForCompany, threadFor } from '@horizon/outreach';
import { Card, PersonCell, Pill, SectionTitle, Table, type Tone } from '@horizon/ui';

export default async function Summary({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = await getState();
  const c = companyBySlug(s, slug)!;
  const st = strategyForCompany(s, c.id);
  const rows = contactsFor(s, c.id).map((ct) => {
    const t = threadFor(s, ct.id).filter((m) => m.direction !== 'outside');
    const last = t.at(-1);
    const r = readinessFor(s, ct.id);
    const cs = s.contactStatus[ct.id];
    let tone: Tone = 'Inactive', label = 'Not contacted', next = st?.rows.find((x) => x.contactId === ct.id)?.when ?? '—';
    if (cs === 'opted_out') { label = 'Opted out'; next = 'No more outreach'; }
    else if (cs === 'declined') { label = 'Declined'; next = 'One thank-you reply, then stop'; }
    else if (r?.status === 'confirmed') { tone = 'Done'; label = 'Confirmed ready to meet'; next = 'Send a short overview, then set up a call'; }
    else if (last?.direction === 'in') { tone = 'Needs Action'; label = 'Reply needed'; next = 'Reply in Conversations'; }
    else if (last) { tone = 'In Progress'; label = 'Waiting on reply'; next = 'Follow-up due 7 days after sending'; }
    return { ct, tone, label, last: last ? `${fmtDay(last.at)} · ${last.direction === 'in' ? 'replied' : 'sent'}` : '—', next };
  });
  return (
    <Card className="flex flex-col gap-4 p-5">
      <SectionTitle right={st ? `Strategy v${st.version} · ${st.status === 'accepted' ? `accepted ${fmtDay(st.acceptedAt)}` : st.status.replace('_', ' ')}` : undefined}>Where Things Stand</SectionTitle>
      <Table head={['Person', 'Status', 'Last contact', 'Next step']}>
        {rows.map((r) => (
          <tr key={r.ct.id}><td><PersonCell name={r.ct.name} sub={r.ct.title} /></td><td><Pill tone={r.tone}>{r.label}</Pill></td><td className="text-muted">{r.last}</td><td className="text-muted">{r.next}</td></tr>
        ))}
      </Table>
    </Card>
  );
}
