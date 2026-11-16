'use client';
import { RouteError } from '@horizon/ui/client';

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return <RouteError title="We couldn’t load this review group" reset={reset}>Something went wrong on our side. Your decisions are saved. Try again, or come back in a few minutes.</RouteError>;
}
