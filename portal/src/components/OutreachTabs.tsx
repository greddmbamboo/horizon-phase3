'use client';
import { usePathname } from 'next/navigation';
import { Tabs } from '@horizon/ui';

export function OutreachTabs({ slug, reviewCount, newReplies }: { slug: string; reviewCount: number; newReplies: number }) {
  const path = usePathname();
  const base = `/outreach/${slug}`;
  const t = (label: string, seg: string, count?: number) => ({ label, href: `${base}/${seg}`, active: path.startsWith(`${base}/${seg}`), count });
  return <Tabs items={[t('Strategy', 'strategy'), t('Review & Send', 'review', reviewCount), t(newReplies ? `Conversations (${newReplies} New)` : 'Conversations', 'conversations'), t('Summary', 'summary')]} />;
}
