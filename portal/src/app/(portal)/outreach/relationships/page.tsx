import Link from 'next/link';
import { getState, simulate } from '@horizon/outreach/data';
import { clientCompanies, contactsFor, fmtDay, fmtDayTime, readinessFor, type HorizonState } from '@horizon/outreach';
import { DEFAULT_SUMMARY_PREFS } from '@horizon/outreach/actions';
import { saveSummaryPrefs } from '@horizon/outreach/server-actions';
import { Actions, EmptyState, Field, PageHeader, PersonCell, StatCard, Table, Tabs, btnClass, checkboxClass, inputClass } from '@horizon/ui';
import { Panel } from '@horizon/ui/modal';
import { SubmitButton } from '@horizon/ui/client';
import { ChevronDown, SlidersHorizontal } from 'lucide-react';

const HERE = '/outreach/relationships';

export default async function RelationshipSummary({ searchParams }: { searchParams: Promise<{ customize?: string; simulate?: string; company?: string; range?: string }> }) {
  const q = await searchParams;
  await simulate(q);
  const s = await getState();
  const prefs = s.summaryPrefs ?? DEFAULT_SUMMARY_PREFS;
  const allAccepted = clientCompanies(s).filter((c) => c.decision === 'accepted');
  // Figma 15 filter bar: one company or all, and the "first sent" range (overrides the saved default).
  const picked = allAccepted.find((c) => c.slug === q.company);
  const accepted = picked ? [picked] : allAccepted;
  const range = q.range === 'all_time' || q.range === 'this_month' ? q.range : prefs.range;
  const acceptedIds = new Set(accepted.map((c) => c.id));
  // Date range: "this month" counts only emails first sent in the demo's current month.
  const month = s.now.slice(0, 7);
  const inRange = (at: string) => range === 'all_time' || at.slice(0, 7) === month;
  const msgs = s.messages.filter((m) => acceptedIds.has(m.companyId) && inRange(m.at));
  const out = msgs.filter((m) => m.direction === 'out');
  const sentContacts = new Set(out.map((m) => m.contactId));
  const replied = new Set(msgs.filter((m) => m.direction === 'in').map((m) => m.contactId));
  const optOuts = [...sentContacts].filter((id) => s.contactStatus[id] === 'opted_out').length;
  const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)}%` : 'N/A');
  const positive = new Set(msgs.filter((m) => m.analysis?.sentiment === 'Positive').map((m) => m.companyId));
  const negative = new Set(msgs.filter((m) => m.analysis && m.analysis.sentiment !== 'Positive').map((m) => m.companyId));
  const show = prefs.show;
  const perf = [
    show.sent && <StatCard key="sent" label="Emails sent" value={out.length} note={`To ${sentContacts.size} people`} />,
    show.replyRate && <StatCard key="rr" label="Reply rate" value={pct(replied.size, sentContacts.size)} note={`${replied.size} of ${sentContacts.size} people · auto-replies excluded`} />,
    show.optOut && <StatCard key="oo" label="Opt-out rate" value={pct(optOuts, sentContacts.size)} note={`${optOuts} of ${sentContacts.size} people`} />,
  ].filter(Boolean);
  const rel = [
    show.ready && <StatCard key="ready" label="Ready for acquisition meeting" value={s.readiness.filter((r) => r.status === 'confirmed' && acceptedIds.has(contactsCompany(s, r.contactId))).length} note="Confirmed by Addler Pluviose" />,
    ...(show.sentiment ? [
      <StatCard key="pos" label="Positive" value={positive.size} note="companies" />,
      <StatCard key="neg" label="Mixed or negative" value={negative.size} note="companies" />,
      <StatCard key="ne" label="Not enough evidence" value={accepted.length - positive.size - negative.size} note="companies" />,
    ] : []),
  ].filter(Boolean);
  const head = ['Company', 'Emails sent', 'Replies', ...(show.sentiment ? ['Sentiment'] : []), ...(show.readinessColumn ? ['Meeting readiness'] : [])];

  return (
    <>
      <PageHeader back={{ href: '/outreach', label: 'Outreach' }} title="Relationship Summary" subtitle={`As of ${fmtLong(s.now)} · inbox last checked ${s.sending.lastChecked}`} />
      <Tabs items={[{ label: 'Companies', href: '/outreach' }, { label: 'Relationship Summary', href: HERE, active: true }]} />
      <div className="flex flex-wrap items-center gap-2">
        <FilterMenu label="Company" value={picked?.name ?? 'All'} options={[{ label: 'All', href: link({ ...q, company: undefined }) }, ...allAccepted.map((c) => ({ label: c.name, href: link({ ...q, company: c.slug }) }))]} />
        <FilterMenu label="First sent" value={range === 'all_time' ? 'All time' : monthLabel(s.now)} options={[{ label: monthLabel(s.now), href: link({ ...q, range: 'this_month' }) }, { label: 'All time', href: link({ ...q, range: 'all_time' }) }]} />
        <Link className={btnClass('link', 'ml-auto inline-flex items-center gap-1.5')} href={link({ ...q, customize: '1' })} scroll={false}><SlidersHorizontal size={14} />Customize</Link>
      </div>
      {perf.length > 0 && (<><h2 className="text-[15px] font-semibold">Email Performance</h2><div className="grid gap-4 md:grid-cols-3">{perf}</div></>)}
      {rel.length > 0 && (<><h2 className="text-[15px] font-semibold">Relationships · As of Today</h2><div className="grid grid-cols-2 gap-4 md:grid-cols-4">{rel}</div></>)}
      {out.length === 0 ? (
        <EmptyState title="No emails sent yet">Once your first emails go out, you’ll see opens, replies and how each relationship is going here.</EmptyState>
      ) : (
        <Table head={head}>
          {prefs.groupBy === 'review_group' && <tr className="bg-sunk"><td colSpan={head.length} className="text-xs font-semibold text-muted">Review Group 1 · {accepted.length} companies</td></tr>}
          {accepted.map((c) => {
            const cm = msgs.filter((m) => m.companyId === c.id);
            const ins = cm.filter((m) => m.direction === 'in');
            const conf = contactsFor(s, c.id).map((p) => ({ p, r: readinessFor(s, p.id) })).find((x) => x.r?.status === 'confirmed');
            return (
              <tr key={c.id}>
                <td className="font-semibold">{c.name}</td>
                <td>{cm.filter((m) => m.direction === 'out').length}</td>
                <td>{ins.length}</td>
                {show.sentiment && <td><PersonCell name={ins.at(-1)?.analysis?.sentiment ?? 'Not enough evidence'} sub={ins.length ? `${ins.length} of ${new Set(cm.map((m) => m.contactId)).size} contacted people assessed` : cm.some((m) => m.direction === 'out') ? 'Waiting on replies' : 'No one contacted yet'} /></td>}
                {show.readinessColumn && <td>{conf ? <PersonCell name="Confirmed ready" sub={`${conf.p.name} · confirmed ${fmtDay(conf.r!.at)} by Addler Pluviose`} /> : <span className="text-muted">—</span>}</td>}
              </tr>
            );
          })}
        </Table>
      )}

      {q.customize && (
        <Panel title="Customize Summary" closeHref={link({ ...q, customize: undefined })}>
          <form action={saveSummaryPrefs} className="flex flex-col gap-[18px]">
            <input type="hidden" name="redirect" value={HERE} />
            <fieldset className="flex flex-col gap-3">
              <legend className="mb-3 text-[13px] font-semibold text-muted">Show these numbers</legend>
              {([['sent', 'Emails sent'], ['replyRate', 'Reply rate'], ['optOut', 'Opt-out rate'], ['ready', 'Ready for acquisition meeting'], ['sentiment', 'Sentiment breakdown'], ['readinessColumn', 'Meeting readiness column']] as const).map(([k, label]) => (
                <label key={k} className="flex items-center gap-2.5 text-sm"><input type="checkbox" name={k} defaultChecked={show[k]} className={checkboxClass} />{label}</label>
              ))}
            </fieldset>
            <Field label="Group companies by">
              <select name="groupBy" defaultValue={prefs.groupBy} className={inputClass}><option value="review_group">Review group</option><option value="none">None</option></select>
            </Field>
            <Field label="Default date range">
              <select name="range" defaultValue={prefs.range} className={inputClass}><option value="this_month">Emails first sent this month</option><option value="all_time">All time</option></select>
            </Field>
            <Actions>
              <SubmitButton variant="link" name="reset" value="1" formNoValidate>Reset to Default</SubmitButton>
              <SubmitButton>Apply</SubmitButton>
            </Actions>
          </form>
        </Panel>
      )}
    </>
  );
}

function link(q: Record<string, string | undefined>) {
  const p = new URLSearchParams();
  for (const k of ['company', 'range', 'customize'] as const) if (q[k]) p.set(k, q[k]!);
  const str = p.toString();
  return str ? `${HERE}?${str}` : HERE;
}

const TZ = 'America/Denver';
function fmtLong(iso: string) {
  const d = new Date(iso);
  return `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: TZ })}, ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ })}`;
}
function monthLabel(iso: string) {
  const d = new Date(iso);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  return `1–${last} ${d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: TZ })}`;
}

/** A small dropdown made of links, so it works without client-side code. */
function FilterMenu({ label, value, options }: { label: string; value: string; options: { label: string; href: string }[] }) {
  return (
    <details className="relative">
      <summary className="hz-focus flex cursor-pointer list-none items-center gap-1.5 rounded-md border border-line bg-page px-3 py-1.5 text-[13px]">
        <span className="text-muted">{label}</span> <span className="font-medium">{value}</span> <ChevronDown size={14} className="text-muted" />
      </summary>
      <div className="absolute left-0 z-20 mt-1 flex min-w-[200px] flex-col rounded-md border border-line bg-page py-1 shadow-modal">
        {options.map((o) => <Link key={o.href} href={o.href} className="px-3 py-1.5 text-[13px] hover:bg-sunk">{o.label}</Link>)}
      </div>
    </details>
  );
}

function contactsCompany(s: HorizonState, contactId: string) {
  return s.contacts.find((c) => c.id === contactId)?.companyId ?? '';
}
