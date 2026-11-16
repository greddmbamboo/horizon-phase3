import { LoadingNote, PageHeader, SkeletonStats, SkeletonTable } from '@horizon/ui';

export default function Loading() {
  return (
    <>
      <PageHeader title="Outreach" subtitle="Loading your accepted companies…" />
      <LoadingNote label="Loading your outreach" />
      <SkeletonStats n={4} />
      <SkeletonTable rows={5} />
    </>
  );
}
