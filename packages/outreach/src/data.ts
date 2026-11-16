import 'server-only';
import { getStore } from './store';
import type { HorizonState } from './types';

/** Read the shared record for a server component render. Always fresh (no caching). */
export async function getState(): Promise<HorizonState> {
  const { state } = await getStore().read();
  return state;
}

/**
 * Prototype only: lets a reviewer see a screen's loading and error states.
 * Add ?simulate=slow (3-second wait) or ?simulate=error to a page's address.
 */
export async function simulate(q: { simulate?: string } | undefined) {
  if (q?.simulate === 'slow') await new Promise((r) => setTimeout(r, 3000));
  if (q?.simulate === 'error') throw new Error('Simulated load failure (prototype ?simulate=error)');
}
