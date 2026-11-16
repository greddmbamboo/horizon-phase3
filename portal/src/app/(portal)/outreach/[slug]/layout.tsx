import { notFound } from 'next/navigation';
import { getState } from '@horizon/outreach/data';
import { companyBySlug, fmtDay, openBatch } from '@horizon/outreach';
import { Banner, PageHeader } from '@horizon/ui';
import { OutreachTabs } from '@/components/OutreachTabs';

export default async function CompanyOutreachLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = await getState();
  const c = companyBySlug(s, slug);
  if (!c || c.removedAt || (c.decision !== 'accepted' && c.decision !== 'withdrawn')) notFound();
  const readOnly = c.decision === 'withdrawn';
  const ob = openBatch(s, c.id);
  const reviewCount = ob ? s.emails.filter((e) => e.batchId === ob.id && !e.reviewed).length : 0;
  const lastIn = new Map<string, string>();
  for (const m of s.messages.filter((x) => x.companyId === c.id && x.direction !== 'outside').sort((a, b) => a.at.localeCompare(b.at))) lastIn.set(m.contactId, m.direction);
  const newReplies = [...lastIn.values()].filter((d) => d === 'in').length;
  return (
    <>
      <PageHeader back={{ href: '/outreach', label: 'Outreach' }} title={c.name} subtitle={readOnly ? `Acceptance withdrawn ${fmtDay(c.decidedAt)} · read-only` : `Accepted ${fmtDay(c.decidedAt)}`} />
      <OutreachTabs slug={c.slug} reviewCount={reviewCount} newReplies={newReplies} />
      {readOnly && <Banner tone="muted" title="Read-only">You withdrew acceptance, so outreach to {c.name} has stopped. Past emails and replies stay visible here.</Banner>}
      {readOnly ? <fieldset disabled className="contents">{children}</fieldset> : children}
    </>
  );
}
