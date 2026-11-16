'use client';
import { RouteError } from '@horizon/ui/client';

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return <RouteError title="We couldn’t load the queue" reset={reset}>Sending isn’t affected. Try again, or check back in a few minutes.</RouteError>;
}
