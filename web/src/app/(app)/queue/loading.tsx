import { LoadingNote, PageHeader, Skeleton, SkeletonTable } from '@horizon/ui';

export default function Loading() {
  return (
    <>
      <PageHeader back={{ href: '/messaging', label: 'Messaging' }} title="Outreach Queue" subtitle={<Skeleton className="h-3.5 w-[360px]" />} />
      <LoadingNote label="Loading the queue" />
      <SkeletonTable rows={4} />
    </>
  );
}
