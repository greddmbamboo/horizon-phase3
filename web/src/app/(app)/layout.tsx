import { getState } from '@horizon/outreach/data';
import { flaggedEmails } from '@horizon/outreach';
import { LiveRefresh } from '@horizon/ui/client';
import { Sidebar } from '@/components/Sidebar';
import { Demo } from '@/components/Demo';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const s = await getState();
  const queueCount = s.strategies.filter((x) => x.status === 'consultant_review').length + flaggedEmails(s).length + s.readiness.filter((r) => r.status === 'needs_review').length;
  return (
    <div className="flex min-h-screen">
      <Sidebar queueCount={queueCount} />
      <main className="min-w-0 flex-1 px-8 pb-24 pt-6">
        <div className="mx-auto flex max-w-[1080px] flex-col gap-5">{children}</div>
      </main>
      <LiveRefresh />
      <Demo state={s} otherAppUrl={process.env.VERCEL ? '/portal' : (process.env.NEXT_PUBLIC_OTHER_APP_URL || 'http://localhost:3001/portal')} otherAppLabel="Open the client portal" />
    </div>
  );
}
