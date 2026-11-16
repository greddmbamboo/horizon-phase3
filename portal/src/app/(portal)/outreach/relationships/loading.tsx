import { LoadingNote, PageHeader, Skeleton, SkeletonStats, SkeletonTable } from '@horizon/ui';

export default function Loading() {
  return (
    <>
      <PageHeader title="Outreach" subtitle={<Skeleton className="h-3.5 w-[360px]" />} />
      <LoadingNote label="Loading the relationship summary" />
      <SkeletonStats n={3} />
      <SkeletonStats n={4} />
      <SkeletonTable rows={4} />
    </>
  );
}
