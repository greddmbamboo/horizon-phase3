import { notFound } from 'next/navigation';
import { getState } from '@horizon/outreach/data';
import { companyBySlug, fmtDay, openBatch } from '@horizon/outreach';
import { PageHeader } from '@horizon/ui';
import { OutreachTabs } from '@/components/OutreachTabs';

export default async function CompanyOutreachLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = await getState();
  const c = companyBySlug(s, slug);
  if (!c || c.decision !== 'accepted') notFound();
  const ob = openBatch(s, c.id);
  const reviewCount = ob ? s.emails.filter((e) => e.batchId === ob.id && !e.reviewed).length : 0;
  const lastIn = new Map<string, string>();
  for (const m of s.messages.filter((x) => x.companyId === c.id && x.direction !== 'outside').sort((a, b) => a.at.localeCompare(b.at))) lastIn.set(m.contactId, m.direction);
  const newReplies = [...lastIn.values()].filter((d) => d === 'in').length;
  return (
    <>
      <PageHeader back={{ href: '/outreach', label: 'Outreach' }} title={c.name} subtitle={`Accepted ${fmtDay(c.decidedAt)}`} />
      <OutreachTabs slug={c.slug} reviewCount={reviewCount} newReplies={newReplies} />
      {children}
    </>
  );
}
