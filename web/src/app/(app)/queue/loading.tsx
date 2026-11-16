import { LoadingNote, PageHeader, SkeletonTable } from '@horizon/ui';

export default function Loading() {
  return (
    <>
      <PageHeader back={{ href: '/messaging', label: 'Messaging' }} title="Outreach Queue" subtitle="Messages and replies that need your action" />
      <LoadingNote label="Loading the queue" />
      <SkeletonTable rows={4} />
    </>
  );
}
