'use client';
import { RouteError } from '@horizon/ui/client';

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return <RouteError title="We couldn’t load your outreach" reset={reset}>Nothing has been sent or changed. Try again, or come back in a few minutes.</RouteError>;
}
