import Link from 'next/link';
import { getState, simulate } from '@horizon/outreach/data';
import { clientCompanies, fmtDay } from '@horizon/outreach';
import { Card, PageHeader, StatCard, Table, btnClass } from '@horizon/ui';
import { DecisionPill } from '@/components/bits';

export default async function Opportunity({ searchParams }: { searchParams: Promise<{ simulate?: string }> }) {
  await simulate(await searchParams);
  const s = await getState();
  const cs = clientCompanies(s);
  const count = (d: string) => cs.filter((c) => c.decision === d).length;
  return (
    <>
      <PageHeader title="Opportunity Overview" subtitle={`${s.engagement.name} · Review group 1 · ${cs.length} companies shared with you`} />
      <Card className="flex flex-col gap-4 p-5">
        <div className="flex items-center gap-3"><h2 className="text-[15px] font-semibold">Review Group 1</h2><span className="text-xs text-muted">Shared {fmtDay(cs[0]?.sharedAt)} by Addler Pluviose</span></div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label="Companies shared" value={cs.length} />
          <StatCard label="Accepted" value={count('accepted')} />
          <StatCard label="Rejected" value={count('rejected')} />
          <StatCard label="Waiting on you" value={count('waiting')} />
        </div>
      </Card>
      <div className="flex items-center gap-3"><h2 className="text-[17px] font-semibold">Your Recommended Companies</h2>
        <span className="ml-auto text-xs text-muted">{count('accepted')} accepted companies</span>
        <Link href="/outreach" className={btnClass('link', 'text-[13px]')}>Go to Outreach ›</Link></div>
      <Table head={['Company', 'Avatar', 'Readiness', 'Your decision', '']}>
        {cs.map((c) => (
          <tr key={c.id}>
            <td className="font-semibold">{c.name}</td>
            <td className="text-muted">{c.avatar}</td>
            <td className="text-muted">{c.readiness}</td>
            <td><DecisionPill c={c} /></td>
            <td className="text-right"><Link className={btnClass('link')} href={`/companies/${c.slug}`}>{c.decision === 'waiting' ? 'Review' : 'View'}</Link></td>
          </tr>
        ))}
      </Table>
    </>
  );
}
