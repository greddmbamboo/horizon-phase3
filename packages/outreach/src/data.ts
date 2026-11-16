import 'server-only';
import { getStore } from './store';
import type { HorizonState } from './types';

/** Read the shared record for a server component render. Always fresh (no caching). */
export async function getState(): Promise<HorizonState> {
  const { state } = await getStore().read();
  return state;
}
