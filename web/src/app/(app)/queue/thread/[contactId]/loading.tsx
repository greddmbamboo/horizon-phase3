import { LoadingNote, SkeletonTable } from '@horizon/ui';

export default function Loading() {
  return <><LoadingNote label="Loading" /><SkeletonTable rows={3} /></>;
}
