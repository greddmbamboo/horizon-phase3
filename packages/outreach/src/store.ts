/**
 * Persistence for the shared HorizonState document. Server-only.
 *
 * Two adapters, picked by env:
 *  - HORIZON_STORE=supabase  → one row in `horizon_prototype_state` (see
 *    supabase/migrations/0002_prototype_state.sql). Both deployed apps point at the
 *    same Supabase project, so a client action shows up in the operator app.
 *  - HORIZON_STORE=redis (or KV_REST_API_URL present) → one Upstash Redis key. Easiest
 *    on Vercel: add Upstash Redis from the Marketplace and connect it to both projects.
 *  - default ("file")        → a JSON file shared by both apps on one machine
 *    (HORIZON_DATA_FILE, default <repo>/.data/state.json). Good for local dev.
 *
 * Writes use optimistic concurrency (a version counter) so two people acting at once
 * can't silently overwrite each other; the loser retries against the fresh state.
 */
import 'server-only';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Redis } from '@upstash/redis';
import { seedState } from './seed';
import type { HorizonState } from './types';

export interface StateStore {
  read(): Promise<{ state: HorizonState; version: number }>;
  /** Apply `fn` to a fresh copy and save it. Retries on version conflicts. */
  mutate<T>(fn: (draft: HorizonState) => T): Promise<T>;
  reset(): Promise<void>;
}

const ROW_ID = process.env.HORIZON_STATE_ID || 'default';

/* ------------------------------------------------------------------ File adapter */

function dataFile() {
  if (process.env.HORIZON_DATA_FILE) return process.env.HORIZON_DATA_FILE;
  // On Vercel only /tmp is writable (and not shared between the two apps — connect Redis for that).
  if (process.env.VERCEL) return '/tmp/horizon-state.json';
  // Apps run with cwd = web/ or portal/; the shared file sits at the repo root.
  return path.resolve(process.cwd(), '..', '.data', 'state.json');
}

class FileStore implements StateStore {
  private chain: Promise<unknown> = Promise.resolve();
  private seeding: Promise<void> | null = null;

  async read() {
    try {
      const raw = JSON.parse(await fs.readFile(dataFile(), 'utf8'));
      return { state: raw.state as HorizonState, version: raw.version as number };
    } catch {
      // First run: seed once. Several renders can arrive together, so share one seeding promise.
      this.seeding ??= this.write(seedState(), 1).finally(() => { this.seeding = null; });
      await this.seeding;
      const raw = JSON.parse(await fs.readFile(dataFile(), 'utf8'));
      return { state: raw.state as HorizonState, version: raw.version as number };
    }
  }

  private async write(state: HorizonState, version: number) {
    const file = dataFile();
    await fs.mkdir(path.dirname(file), { recursive: true });
    const tmp = `${file}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`;
    await fs.writeFile(tmp, JSON.stringify({ version, state }, null, 1));
    await fs.rename(tmp, file);
  }

  mutate<T>(fn: (draft: HorizonState) => T): Promise<T> {
    const run = async () => {
      const { state, version } = await this.read();
      const draft = structuredClone(state);
      const out = fn(draft);
      await this.write(draft, version + 1);
      return out;
    };
    const p = this.chain.then(run, run);
    this.chain = p.catch(() => undefined);
    return p;
  }

  async reset() {
    await this.write(seedState(), Date.now());
  }
}

/* ------------------------------------------------------------------ Supabase adapter */

class SupabaseStore implements StateStore {
  private db: SupabaseClient;
  constructor() {
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('HORIZON_STORE=supabase needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    this.db = createClient(url, key, { auth: { persistSession: false } });
  }

  async read(): Promise<{ state: HorizonState; version: number }> {
    const { data, error } = await this.db.from('horizon_prototype_state').select('doc, version').eq('id', ROW_ID).maybeSingle();
    if (error) throw error;
    if (data) return { state: data.doc as HorizonState, version: data.version as number };
    const state = seedState();
    const ins = await this.db.from('horizon_prototype_state').insert({ id: ROW_ID, doc: state, version: 1 });
    if (ins.error && ins.error.code !== '23505') throw ins.error;
    return this.read();
  }

  async mutate<T>(fn: (draft: HorizonState) => T): Promise<T> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const { state, version } = await this.read();
      const draft = structuredClone(state);
      const out = fn(draft);
      const { data, error } = await this.db
        .from('horizon_prototype_state')
        .update({ doc: draft, version: version + 1, updated_at: new Date().toISOString() })
        .eq('id', ROW_ID)
        .eq('version', version)
        .select('id');
      if (error) throw error;
      if (data && data.length) return out;
    }
    throw new Error('Could not save: too many people changed this at once. Try again.');
  }

  async reset() {
    const { error } = await this.db.from('horizon_prototype_state').upsert({ id: ROW_ID, doc: seedState(), version: Date.now() % 1e9 });
    if (error) throw error;
  }
}


/* ------------------------------------------------------------------ Redis adapter (Upstash) */

/** Compare-and-set: only write if the stored version still matches. */
const CAS = `local cur = redis.call('HGET', KEYS[1], 'version')
if (cur == false and ARGV[1] == '0') or cur == ARGV[1] then
  redis.call('HSET', KEYS[1], 'version', ARGV[2], 'doc', ARGV[3])
  return 1
end
return 0`;

class RedisStore implements StateStore {
  private db: Redis;
  private key = `horizon:state:${ROW_ID}`;
  constructor() {
    const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) throw new Error('HORIZON_STORE=redis needs KV_REST_API_URL and KV_REST_API_TOKEN');
    this.db = new Redis({ url, token, automaticDeserialization: false });
  }

  async read(): Promise<{ state: HorizonState; version: number }> {
    for (let attempt = 0; attempt < 3; attempt++) {
      // With automaticDeserialization off, the client returns HMGET (and HGETALL) as a
      // plain array, not an object. Accept either shape so the read can never miss the doc.
      const got = (await this.db.hmget(this.key, 'version', 'doc')) as unknown;
      const row = Array.isArray(got)
        ? { version: got[0] as string | null, doc: got[1] as string | null }
        : (got as { version?: string | null; doc?: string | null } | null);
      if (row && row.doc) return { state: JSON.parse(row.doc) as HorizonState, version: Number(row.version) };
      await this.db.eval(CAS, [this.key], ['0', '1', JSON.stringify(seedState())]);
    }
    throw new Error('Could not load the shared demo data. Try again.');
  }

  async mutate<T>(fn: (draft: HorizonState) => T): Promise<T> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const { state, version } = await this.read();
      const draft = structuredClone(state);
      const out = fn(draft);
      const ok = await this.db.eval(CAS, [this.key], [String(version), String(version + 1), JSON.stringify(draft)]);
      if (Number(ok) === 1) return out;
    }
    throw new Error('Could not save: too many people changed this at once. Try again.');
  }

  async reset() {
    await this.db.hset(this.key, { version: String(Date.now()), doc: JSON.stringify(seedState()) });
  }
}

let store: StateStore | null = null;
export function getStore(): StateStore {
  if (!store) {
    const kind = process.env.HORIZON_STORE
      || ((process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL) ? 'redis' : 'file');
    store = kind === 'supabase' ? new SupabaseStore() : kind === 'redis' ? new RedisStore() : new FileStore();
  }
  return store;
}
