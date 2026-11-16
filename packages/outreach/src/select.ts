/** Read helpers shared by both apps. Pure functions over HorizonState. */
import type { Company, Contact, Email, HorizonState, Message, Readiness, Strategy } from './types';

let counter = 0;
export function uid(prefix: string) {
  counter = (counter + 1) % 1e6;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export const companyById = (s: HorizonState, id: string) => s.companies.find((c) => c.id === id);
export const companyBySlug = (s: HorizonState, slug: string) => s.companies.find((c) => c.slug === slug);
export const contactById = (s: HorizonState, id: string) => s.contacts.find((c) => c.id === id);
export const personById = (s: HorizonState, id?: string) => s.people.find((p) => p.id === id);
export const contactsFor = (s: HorizonState, companyId: string) => s.contacts.filter((c) => c.companyId === companyId);

/** The live (newest) strategy for a company. */
export function strategyForCompany(s: HorizonState, companyId: string): Strategy | undefined {
  return s.strategies.filter((x) => x.companyId === companyId).sort((a, b) => b.version - a.version)[0];
}

export const emailsFor = (s: HorizonState, companyId: string) => s.emails.filter((e) => e.companyId === companyId);
export const batchesFor = (s: HorizonState, companyId: string) => s.batches.filter((b) => b.companyId === companyId).sort((a, b) => b.number - a.number);
export const openBatch = (s: HorizonState, companyId: string) => s.batches.find((b) => b.companyId === companyId && b.status === 'reviewing');

export function threadFor(s: HorizonState, contactId: string): Message[] {
  return s.messages.filter((m) => m.contactId === contactId).sort((a, b) => a.at.localeCompare(b.at));
}

export function readinessFor(s: HorizonState, contactId: string): Readiness | undefined {
  return s.readiness.find((r) => r.contactId === contactId);
}

export const flaggedEmails = (s: HorizonState) => s.emails.filter((e) => e.status === 'flagged');

export function unresolvedFlags(e: Email) {
  return e.flags.filter((f) => !f.resolved);
}

export function wordCount(text: string) {
  return text.split(/\s+/).filter(Boolean).length;
}

/** Writing checks shown under every email. Failing checks come first. */
export function writingChecks(e: Email) {
  const words = wordCount(e.body);
  const fails: { label: string; ok: boolean }[] = [];
  const passes: { label: string; ok: boolean }[] = [];
  for (const f of e.flags) {
    if (!f.resolved) fails.push({ label: f.type === 'no_fact' ? 'No sourced detail' : 'Unsupported familiarity', ok: false });
    else passes.push({ label: f.type === 'no_fact' ? (f.resolution === 'source_added' ? 'Specific fact, sourced' : 'Sent without a fact · reason recorded') : 'No unsupported claims', ok: true });
  }
  if (e.factSource && !passes.some((p) => p.label.startsWith('Specific fact'))) passes.push({ label: 'Specific fact, sourced', ok: true });
  passes.unshift({ label: `${words} / 149 words`, ok: words <= 149 });
  passes.push({ label: 'One clear ask', ok: true });
  return [...fails, ...passes];
}

/** What the client sees as the "next step" for a company on the Outreach list. */
export type NextStep = { label: string; tone: 'Needs Action' | 'In Progress' | 'Done' | 'Inactive'; href: string };

export function nextStepFor(s: HorizonState, c: Company): NextStep {
  const st = strategyForCompany(s, c.id);
  const base = `/outreach/${c.slug}`;
  if (c.id === 'co_summit') return { label: 'Paused', tone: 'Inactive', href: base };
  if (!st) {
    if (s.messages.some((m) => m.companyId === c.id)) return { label: 'Outreach active', tone: 'Done', href: `${base}/conversations` };
    return { label: 'Strategy being prepared', tone: 'In Progress', href: `${base}/strategy` };
  }
  if (st.status === 'consultant_review' || st.status === 'generating') return { label: 'Strategy being prepared', tone: 'In Progress', href: `${base}/strategy` };
  if (st.status === 'changes_requested') return { label: 'Changes requested', tone: 'In Progress', href: `${base}/strategy` };
  if (st.status === 'with_client') return { label: 'Review strategy', tone: 'Needs Action', href: `${base}/strategy` };
  const ob = openBatch(s, c.id);
  if (ob) {
    const n = s.emails.filter((e) => e.batchId === ob.id).length;
    return { label: `Review & send (${n})`, tone: 'Needs Action', href: `${base}/review` };
  }
  const replies = s.messages.filter((m) => m.companyId === c.id && m.direction === 'in');
  const lastByContact = new Map<string, Message>();
  for (const m of s.messages.filter((x) => x.companyId === c.id && x.direction !== 'outside')) lastByContact.set(m.contactId, m);
  if ([...lastByContact.values()].some((m) => m.direction === 'in' && !m.analysis?.optOut)) return { label: 'Reply needed', tone: 'Needs Action', href: `${base}/conversations` };
  if (s.emails.some((e) => e.companyId === c.id && e.status === 'flagged')) return { label: 'Emails being written', tone: 'In Progress', href: `${base}/review` };
  if (replies.length || s.messages.some((m) => m.companyId === c.id)) return { label: 'Outreach active', tone: 'Done', href: `${base}/conversations` };
  return { label: 'Emails being written', tone: 'In Progress', href: `${base}/review` };
}

export function contactLine(s: HorizonState, ct: Contact): string {
  const thread = threadFor(s, ct.id).filter((m) => m.direction !== 'outside');
  const st = s.contactStatus[ct.id];
  if (st === 'opted_out') return `Opted out · ${fmtDay(thread.at(-1)?.at)}`;
  if (st === 'declined') return `Declined · ${fmtDay(thread.at(-1)?.at)}`;
  const last = thread.at(-1);
  if (!last) return 'Not contacted · waiting on owner';
  if (last.direction === 'in') return `New reply · ${fmtDay(last.at)}`;
  const anyIn = thread.some((m) => m.direction === 'in');
  return anyIn ? `You replied · ${fmtDay(last.at)}` : `Sent ${fmtDay(last.at)} · no reply yet`;
}

/* ------------------------------------------------------------------ Formatting */

const TZ = 'America/Denver';
export function fmtDay(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: TZ });
}
export function fmtDayTime(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  const day = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: TZ });
  const t = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ });
  return `${day}, ${t}`;
}
