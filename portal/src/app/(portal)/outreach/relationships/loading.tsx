import { LoadingNote, PageHeader, SkeletonStats, SkeletonTable } from '@horizon/ui';

export default function Loading() {
  return (
    <>
      <PageHeader title="Outreach" subtitle="Loading the relationship summary…" />
      <LoadingNote label="Loading the relationship summary" />
      <SkeletonStats n={3} />
      <SkeletonStats n={4} />
      <SkeletonTable rows={4} />
    </>
  );
}
