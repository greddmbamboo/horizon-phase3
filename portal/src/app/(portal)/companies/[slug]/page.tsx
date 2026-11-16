import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getState } from '@horizon/outreach/data';
import { companyBySlug, contactsFor, fmtDay, nextStepFor, threadFor } from '@horizon/outreach';
import { acceptCompany, rejectCompany } from '@horizon/outreach/server-actions';
import { Actions, Banner, Card, Field, PageHeader, Pill, btnClass, inputClass } from '@horizon/ui';
import { Modal } from '@horizon/ui/modal';
import { SubmitButton } from '@horizon/ui/client';
import { DecisionPill } from '@/components/bits';

export default async function CompanyPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ accepted?: string; reject?: string }> }) {
  const { slug } = await params;
  const q = await searchParams;
  const s = await getState();
  const c = companyBySlug(s, slug);
  if (!c) notFound();
  const here = `/companies/${c.slug}`;
  const contacts = contactsFor(s, c.id).filter((x) => x.decisionMaker || /adviser/i.test(x.title));
  const step = c.decision === 'accepted' ? nextStepFor(s, c) : null;

  return (
    <>
      <PageHeader back={{ href: '/opportunity', label: 'Opportunity Overview' }} title={c.name}
        subtitle={`${c.segment} · ${c.readiness} · Version ${c.version} (shared ${fmtDay(c.sharedAt)})`} status={<DecisionPill c={c} />} />

      {c.decision === 'waiting' && (
        <Card className="flex flex-wrap items-center gap-4 p-5">
          <div className="flex min-w-[260px] flex-1 flex-col gap-1">
            <h2 className="text-[15px] font-semibold">Your Decision</h2>
            <p className="max-w-xl text-[13px] text-muted">Accept to move forward with this company. Your consultant will then plan how to reach its decision makers. Nothing is sent without your approval.</p>
          </div>
          <Actions>
            <Link href={`${here}?reject=1`} className={btnClass('secondary')}>Reject</Link>
            <form action={acceptCompany}>
              <input type="hidden" name="companyId" value={c.id} /><input type="hidden" name="redirect" value={`${here}?accepted=1`} />
              <SubmitButton pendingLabel="Accepting…">Accept Company</SubmitButton>
            </form>
          </Actions>
        </Card>
      )}

      {c.decision === 'accepted' && step && (
        <Card className="flex flex-wrap items-center gap-4 p-5">
          <div className="flex flex-1 flex-col gap-2">
            <h2 className="text-[15px] font-semibold">Outreach</h2>
            <div><Pill tone={step.tone}>{step.label}</Pill></div>
            <p className="max-w-xl text-[13px] text-muted">You review the plan and every email before anyone is contacted.</p>
          </div>
          <Link href={step.href} className={btnClass('primary')}>Open Outreach</Link>
        </Card>
      )}

      {c.decision === 'rejected' && (
        <Banner tone="muted" title={`You rejected this company · ${fmtDay(c.decidedAt)}`}
          actions={<form action={acceptCompany}><input type="hidden" name="companyId" value={c.id} /><input type="hidden" name="redirect" value={`${here}?accepted=1`} /><SubmitButton variant="link">Accept Instead</SubmitButton></form>}>
          Your reason: “{c.rejectReason}” Your consultant can see this. Nothing will be sent to anyone at this company.
        </Banner>
      )}

      <Card className="flex flex-col gap-3 p-5">
        <div className="flex items-center"><h2 className="text-[15px] font-semibold">Why We Recommend {c.name}</h2><span className="ml-auto text-xs underline">Sources (4)</span></div>
        <p className="text-sm leading-relaxed">{c.why}</p>
        <p className="text-xs text-muted">Includes AI-assisted analysis · reviewed by Addler Pluviose, {fmtDay(c.sharedAt)}</p>
      </Card>

      {c.financials.length > 0 && (
        <Card className="flex flex-col gap-4 p-5">
          <div className="flex items-center"><h2 className="text-[15px] font-semibold">Financial Snapshot</h2><span className="ml-auto text-xs underline">How these are estimated</span></div>
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {c.financials.map((f) => (<div key={f.label}><div className="text-xs text-muted">{f.label}</div><div className="text-2xl font-semibold">{f.value}</div><div className="text-xs text-muted">{f.note}</div></div>))}
          </div>
        </Card>
      )}

      {c.assessments.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          {c.assessments.map((a) => (<Card key={a.label} className="flex flex-col gap-1.5 p-5"><div className="text-xs text-muted">{a.label}</div><div className="text-lg font-semibold">{a.value}</div><div className="text-[13px] text-muted">{a.note}</div></Card>))}
        </div>
      )}

      {contacts.length > 0 && (
        <Card className="flex flex-col gap-3 p-5">
          <div className="flex items-center"><h2 className="text-[15px] font-semibold">Decision Makers</h2><Link href="/people" className="ml-auto text-xs underline">View all in People</Link></div>
          <div className="grid gap-3 md:grid-cols-2">
            {contacts.map((ct) => {
              const replied = threadFor(s, ct.id).some((m) => m.direction === 'in');
              return (
                <div key={ct.id} className="flex gap-3 rounded-md bg-sunk p-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-page text-xs font-semibold">{ct.name.split(' ').map((p) => p[0]).join('')}</span>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold">{ct.name}</span>
                    <span className="text-xs text-muted">{ct.roleLabel}</span>
                    <span className="text-xs text-muted">{replied ? ct.email : c.decision === 'accepted' ? `Contact details are shared once ${ct.name.split(' ')[0]} replies.` : ct.bio}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {q.accepted && c.decision === 'accepted' && (
        <Modal title="Company Accepted" closeHref={here} width={460}
          footer={<Actions><Link href={here} className={btnClass('secondary')}>Stay in Review</Link><Link href={`/outreach/${c.slug}/strategy`} className={btnClass('primary')}>Go to Outreach</Link></Actions>}>
          <div className="flex flex-col gap-3 text-sm text-muted">
            <p>{c.name} is accepted. Its decision makers are now visible in People.</p>
            <p>Next, your consultant prepares a communications strategy for your review. Nothing is sent automatically.</p>
          </div>
        </Modal>
      )}

      {q.reject && c.decision !== 'rejected' && (
        <Modal title="Reject This Company?" closeHref={here} width={480}>
          <form action={rejectCompany} className="flex flex-col gap-4 pb-2">
            <input type="hidden" name="companyId" value={c.id} /><input type="hidden" name="redirect" value={here} />
            <p className="text-sm text-muted">Your consultant sees your reason and won’t contact anyone at this company.</p>
            <Field label="Reason (required)"><textarea name="reason" required rows={3} className={inputClass} placeholder="Tell your consultant why…" /></Field>
            <Actions><Link href={here} className={btnClass('secondary')}>Cancel</Link><SubmitButton>Reject Company</SubmitButton></Actions>
          </form>
        </Modal>
      )}
    </>
  );
}
