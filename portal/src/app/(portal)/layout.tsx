import { getState } from '@horizon/outreach/data';
import { LiveRefresh } from '@horizon/ui/client';
import { Sidebar } from '@/components/Sidebar';
import { Demo } from '@/components/Demo';

export const dynamic = 'force-dynamic';

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const s = await getState();
  const unread = s.notifications.filter((n) => n.side === 'client' && !n.read).length;
  return (
    <div className="flex min-h-screen">
      <Sidebar clientName={s.engagement.clientName} engagement={s.engagement.name} unread={unread} />
      <main className="min-w-0 flex-1 px-8 pb-24 pt-6">
        <div className="mx-auto flex max-w-[1080px] flex-col gap-5">{children}</div>
      </main>
      <LiveRefresh />
      <Demo state={s} otherAppUrl={process.env.NEXT_PUBLIC_OTHER_APP_URL || (process.env.PORTAL_BASE_PATH ? '/' : 'http://localhost:3000')} otherAppLabel="Open the operator app" />
    </div>
  );
}
