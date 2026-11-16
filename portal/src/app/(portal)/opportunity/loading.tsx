import { LoadingNote, PageHeader, SkeletonStats, SkeletonTable } from '@horizon/ui';

export default function Loading() {
  return (
    <>
      <PageHeader title="Opportunity Overview" subtitle="Loading your review group…" />
      <LoadingNote label="Loading the companies shared with you" />
      <SkeletonStats n={4} />
      <SkeletonTable rows={6} />
    </>
  );
}
