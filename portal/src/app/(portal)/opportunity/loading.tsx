import { LoadingNote, PageHeader, Skeleton, SkeletonStats, SkeletonTable } from '@horizon/ui';

export default function Loading() {
  return (
    <>
      <PageHeader title="Opportunity Overview" subtitle={<Skeleton className="h-3.5 w-[360px]" />} />
      <LoadingNote label="Loading the companies shared with you" />
      <SkeletonStats n={4} />
      <SkeletonTable rows={6} />
    </>
  );
}
