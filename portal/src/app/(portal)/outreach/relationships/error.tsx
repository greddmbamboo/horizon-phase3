'use client';
import { RouteError } from '@horizon/ui/client';

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return <RouteError title="We couldn’t load this summary" reset={reset}>Try again, or change the filters above.</RouteError>;
}
