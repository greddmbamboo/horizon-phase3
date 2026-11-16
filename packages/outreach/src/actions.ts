/**
 * Every state change in the product, as plain functions on a HorizonState draft.
 * Both apps call these through server actions (see each app's src/lib/actions.ts),
 * so the client portal and operator app always change the same shared record.
 *
 * In production, each function maps to one API route / RPC with its own auth check
 * (client-side actions require a client user on the engagement; operator-side actions
 * require a Hofund consultant). The prototype skips auth and records who acted.
 */
import type { Analysis, Contact, Email, HorizonState, Notification, Strategy, StrategyRow } from './types';
import { contactById, companyById, strategyForCompany, uid } from './select';

const HOUR = 3600_000;

function advance(s: HorizonState, ms: number) {
  s.now = new Date(new Date(s.now).getTime() + ms).toISOString();
}

function log(s: HorizonState, side: 'client' | 'operator' | 'system', text: string) {
  s.activity.unshift({ id: uid('act'), at: s.now, side, text });
}

function notify(s: HorizonState, n: Omit<Notification, 'id' | 'at' | 'read'>) {
  s.notifications.unshift({ ...n, id: uid('n'), at: s.now, read: false });
}

/** Outreach can only change for a company the client has accepted and can still see. */
function active(s: HorizonState, companyId?: string) {
  const c = companyId ? companyById(s, companyId) : undefined;
  return !!c && c.decision === 'accepted' && !c.removedAt;
}

function slugOf(s: HorizonState, companyId: string) {
  return companyById(s, companyId)!.slug;
}

/* ------------------------------------------------------------------ Company decisions */

export function acceptCompany(s: HorizonState, companyId: string) {
  const c = companyById(s, companyId);
  if (!c || c.decision === 'accepted') return;
  advance(s, HOUR);
  c.decision = 'accepted';
  c.decidedAt = s.now;
  c.rejectReason = undefined;
  log(s, 'client', `Rachel Kim accepted ${c.name}`);
  // Accepting starts the work automatically: the system drafts a strategy for the consultant.
  generateStrategy(s, companyId);
}

export function rejectCompany(s: HorizonState, companyId: string, reason: string) {
  const c = companyById(s, companyId);
  if (!c) return;
  advance(s, HOUR);
  c.decision = 'rejected';
  c.decidedAt = s.now;
  c.rejectReason = reason || 'No reason given';
  log(s, 'client', `Rachel Kim rejected ${c.name}`);
}

/** The consultant rechecks the live strategy before outreach continues (new version, back to consultant review). */
function recheckStrategy(s: HorizonState, companyId: string, why: string) {
  const st = strategyForCompany(s, companyId);
  if (!st) { generateStrategy(s, companyId); return; }
  if (st.status !== 'accepted') return;
  const next = structuredClone(st);
  next.id = uid('st');
  next.version = st.version + 1;
  next.status = 'consultant_review';
  next.changeSummary = why;
  next.generatedAt = s.now;
  next.publishedAt = undefined;
  next.acceptedAt = undefined;
  s.strategies.push(next);
  const c = companyById(s, companyId)!;
  notify(s, { side: 'operator', title: `Recheck strategy · ${c.name}`, detail: why, href: `/queue/strategy/${next.id}` });
}

/** C-02a: the client accepts a newer shared version of a company they already accepted. */
export function acceptUpdate(s: HorizonState, companyId: string) {
  const c = companyById(s, companyId);
  if (!c?.pendingUpdate || c.decision !== 'accepted') return;
  advance(s, HOUR);
  c.version = c.pendingUpdate.version;
  c.sharedAt = c.pendingUpdate.sharedAt;
  c.pendingUpdate = undefined;
  c.updateRejectedReason = undefined;
  c.decidedAt = s.now;
  // Unsent emails pause until the consultant rechecks the strategy. Sent emails aren't affected.
  for (const e of s.emails.filter((x) => x.companyId === companyId && (x.status === 'with_client' || x.status === 'flagged'))) e.status = 'flagged';
  for (const b of s.batches.filter((x) => x.companyId === companyId && x.status === 'reviewing')) b.status = 'preparing';
  log(s, 'client', `Rachel Kim accepted version ${c.version} of ${c.name}`);
  recheckStrategy(s, companyId, `The client accepted version ${c.version} of the company. Recheck the strategy before outreach continues.`);
}

export function rejectUpdate(s: HorizonState, companyId: string, reason: string) {
  const c = companyById(s, companyId);
  if (!c?.pendingUpdate) return;
  advance(s, HOUR);
  const v = c.pendingUpdate.version;
  c.pendingUpdate = undefined;
  c.updateRejectedReason = reason || 'No reason given';
  notify(s, { side: 'operator', title: `Update rejected · ${c.name}`, detail: `Version ${v}: “${c.updateRejectedReason}”`, href: '/decisions' });
  log(s, 'client', `Rachel Kim rejected version ${v} of ${c.name}`);
}

/** Future outreach stops; past emails and replies stay visible, read-only. */
export function withdrawAcceptance(s: HorizonState, companyId: string) {
  const c = companyById(s, companyId);
  if (!c || c.decision !== 'accepted') return;
  advance(s, HOUR);
  c.decision = 'withdrawn';
  c.decidedAt = s.now;
  for (const e of s.emails.filter((x) => x.companyId === companyId && x.status !== 'sent')) e.status = 'failed', e.failReason = 'Acceptance withdrawn';
  for (const b of s.batches.filter((x) => x.companyId === companyId && x.status !== 'sent')) b.status = 'preparing';
  s.replyDrafts = s.replyDrafts.filter((d) => d.status === 'sent' || contactById(s, d.contactId)?.companyId !== companyId);
  notify(s, { side: 'operator', title: `Acceptance withdrawn · ${c.name}`, detail: 'Future outreach to this company has stopped.', href: '/decisions' });
  log(s, 'client', `Rachel Kim withdrew acceptance of ${c.name}`);
}

/** The newest shared version is in force. Outreach doesn't restart on its own: the consultant rechecks first. */
export function acceptAgain(s: HorizonState, companyId: string) {
  const c = companyById(s, companyId);
  if (!c || c.decision !== 'withdrawn') return;
  advance(s, HOUR);
  c.decision = 'accepted';
  c.decidedAt = s.now;
  if (c.pendingUpdate) { c.version = c.pendingUpdate.version; c.sharedAt = c.pendingUpdate.sharedAt; c.pendingUpdate = undefined; }
  log(s, 'client', `Rachel Kim accepted ${c.name} again`);
  recheckStrategy(s, companyId, 'The client accepted this company again. Recheck the strategy before outreach restarts.');
}

/** Operator app: the client loses access and all unsent outreach is blocked. History is kept for audit. */
export function removeFromClientView(s: HorizonState, companyId: string, reason: string) {
  const c = companyById(s, companyId);
  if (!c || c.removedAt) return;
  c.removedAt = s.now;
  c.removedReason = reason;
  for (const e of s.emails.filter((x) => x.companyId === companyId && x.status !== 'sent')) e.status = 'failed', e.failReason = 'Removed from client view';
  for (const b of s.batches.filter((x) => x.companyId === companyId && x.status !== 'sent')) b.status = 'preparing';
  log(s, 'operator', `Addler Pluviose removed ${c.name} from the client’s view`);
}

/* ------------------------------------------------------------------ Strategy */

/** People a new strategy includes automatically: not manual-only, and not left out by an overlap decision. */
function strategyContacts(s: HorizonState, companyId: string) {
  return s.contacts.filter((x) => x.companyId === companyId && !x.manualOnly && x.overlap !== 'neither' && !skippedForOverlap(s, x));
}

/** "Contact for the other company only": this company's strategy skips them. */
function skippedForOverlap(s: HorizonState, ct: Contact) {
  return overlapsOf(s, ct).some((o) => o.overlap === 'this_only');
}

/** The same person listed as a contact for another accepted company in this engagement. */
export function overlapsOf(s: HorizonState, ct: Contact) {
  if (!ct.email) return [];
  return s.contacts.filter((o) => o.id !== ct.id && o.email === ct.email && o.companyId !== ct.companyId && companyById(s, o.companyId)?.decision === 'accepted');
}

function attentionFor(s: HorizonState, ct: Contact): Strategy['attention'] {
  const out: Strategy['attention'] = [];
  if (!ct.email) out.push({ id: uid('att'), kind: 'email', contactId: ct.id, text: `${ct.name} has no email address yet.`, resolved: false });
  const other = overlapsOf(s, ct)[0];
  if (other && !ct.overlap) out.push({ id: uid('att'), kind: 'overlap', contactId: ct.id, text: `${ct.name} also appears under ${companyById(s, other.companyId)!.name} in this engagement.`, resolved: false });
  if (!ct.location) out.push({ id: uid('att'), kind: 'location', contactId: ct.id, text: `${ct.name}’s location is unknown. Outreach only goes to people in the US.`, resolved: false });
  return out;
}

function rowFor(ct: Contact, i: number): StrategyRow {
  const owner = ct.decisionMaker;
  const adviser = /adviser/i.test(ct.title);
  return {
    contactId: ct.id,
    order: i + 1,
    objective: owner ? 'Open an acquisition conversation' : adviser ? 'Ask for the right introduction route' : /finance/i.test(ct.title) ? 'Understand financial priorities' : 'Explore operating fit',
    senderId: /operations/i.test(ct.title) ? 'u_dana' : 'u_rachel',
    when: owner ? 'First' : adviser ? 'Same time as #1' : /finance/i.test(ct.title) ? 'After #1 replies positively' : 'With #3',
    whenNote: owner || adviser ? 'Week of 9 Nov' : 'Earliest 16 Nov',
    reason: owner ? 'Owner authority confirmed.' : adviser ? 'Influencer; second path in.' : /finance/i.test(ct.title) ? 'Wait for the owner.' : 'Same trigger as finance.',
    wave: owner || adviser ? 1 : 2,
  };
}

export function generateStrategy(s: HorizonState, companyId: string) {
  const contacts = strategyContacts(s, companyId);
  const prev = strategyForCompany(s, companyId);
  const rows: StrategyRow[] = contacts.map(rowFor);
  const version = (prev?.version ?? 0) + 1;
  s.strategies.push({
    id: uid('st'),
    companyId,
    version,
    status: 'consultant_review',
    objective: 'Explore the owner’s priorities and openness to an acquisition conversation.',
    rows,
    generatedAt: s.now,
    privateNotes: 'Internal evidence: owner authority supported; adviser is an influencer. Personality profile details are never shown to the client.',
    attention: contacts.flatMap((ct) => attentionFor(s, ct)),
  });
  const c = companyById(s, companyId)!;
  notify(s, { side: 'operator', title: `Strategy ready to review · ${c.name}`, detail: `v${version} drafted automatically`, href: `/queue?tab=strategy` });
  log(s, 'system', `Strategy v${version} drafted for ${c.name}`);
}

export function updateStrategyRow(s: HorizonState, strategyId: string, contactId: string, patch: Partial<StrategyRow>) {
  const st = s.strategies.find((x) => x.id === strategyId);
  const row = st?.rows.find((r) => r.contactId === contactId);
  if (!row) return;
  Object.assign(row, patch, { edited: true });
}

/** O-03d: add someone from the accepted People record to a strategy in consultant review. */
export function addStrategyContact(s: HorizonState, strategyId: string, contactId: string) {
  const st = s.strategies.find((x) => x.id === strategyId);
  const ct = contactById(s, contactId);
  if (!st || !ct || st.status !== 'consultant_review' || ct.companyId !== st.companyId || st.rows.some((r) => r.contactId === contactId)) return;
  const order = Math.max(0, ...st.rows.map((r) => r.order)) + 1;
  st.rows.push({
    contactId, order, objective: 'Explore operating fit', senderId: 'u_rachel', when: 'After #1 replies positively', whenNote: 'Earliest 16 Nov',
    reason: 'Added by consultant from People.', wave: 2, edited: true,
  });
  st.attention.push(...attentionFor(s, ct));
}

/** O-03b: decide how outreach treats someone listed under two companies. */
export function setOverlapDecision(s: HorizonState, strategyId: string, contactId: string, choice: 'this_only' | 'both' | 'neither') {
  const st = s.strategies.find((x) => x.id === strategyId);
  const ct = contactById(s, contactId);
  if (!st || !ct) return;
  ct.overlap = choice;
  const others = overlapsOf(s, ct);
  if (choice === 'neither') {
    st.rows = st.rows.filter((r) => r.contactId !== contactId).map((r, i) => ({ ...r, order: i + 1 }));
    for (const o of others) o.overlap = 'neither';
  }
  if (choice === 'both') {
    const row = st.rows.find((r) => r.contactId === contactId);
    for (const o of others) o.overlap = 'both';
    if (row) for (const o of others) {
      // The second company waits until this conversation settles.
      const otherSt = strategyForCompany(s, o.companyId);
      const otherRow = otherSt?.rows.find((r) => r.contactId === o.id);
      if (otherRow) otherRow.whenNote = `Waits for the ${companyById(s, st.companyId)!.name} conversation to settle`;
    }
  }
  if (choice === 'this_only') for (const o of others) {
    o.overlap = 'neither';
    const otherSt = strategyForCompany(s, o.companyId);
    if (otherSt && otherSt.status !== 'accepted') otherSt.rows = otherSt.rows.filter((r) => r.contactId !== o.id);
  }
  for (const a of st.attention) if (a.kind === 'overlap' && a.contactId === contactId) a.resolved = true;
  log(s, 'operator', `Addler Pluviose chose how to contact ${ct.name} (${choice.replace('_', ' ')})`);
}

/** O-03e: record where someone is based, with evidence. */
export function setContactLocation(s: HorizonState, contactId: string, location: string, source: string, url?: string) {
  const ct = contactById(s, contactId);
  if (!ct || !location) return;
  ct.location = location;
  ct.locationEvidence = { source, url };
  for (const st of s.strategies) for (const a of st.attention) if (a.kind === 'location' && a.contactId === contactId) a.resolved = true;
}

/** O-03g: regenerate a draft strategy from the latest People record. Edited rows are kept. Finishes in finishRegenerate. */
export function startRegenerate(s: HorizonState, strategyId: string) {
  const st = s.strategies.find((x) => x.id === strategyId);
  if (!st || st.status !== 'consultant_review') return;
  st.status = 'generating';
}

export function finishRegenerate(s: HorizonState, strategyId: string) {
  const st = s.strategies.find((x) => x.id === strategyId);
  if (!st || st.status !== 'generating') return;
  const kept = st.rows.filter((r) => r.edited);
  const fresh = strategyContacts(s, st.companyId).map(rowFor);
  const extra = kept.filter((k) => !fresh.some((f) => f.contactId === k.contactId));
  st.rows = [...fresh.map((f) => kept.find((k) => k.contactId === f.contactId) ?? f), ...extra].map((r, i) => ({ ...r, order: i + 1 }));
  st.attention = st.rows.flatMap((r) => attentionFor(s, contactById(s, r.contactId)!));
  st.generatedAt = s.now;
  st.status = 'consultant_review';
  log(s, 'system', `Strategy v${st.version} regenerated for ${companyById(s, st.companyId)!.name}`);
}

export function setContactEmail(s: HorizonState, contactId: string, email: string) {
  const ct = contactById(s, contactId);
  if (!ct) return;
  ct.email = email;
  for (const st of s.strategies) for (const a of st.attention) if (a.contactId ? a.contactId === ct.id && a.kind === 'email' : a.text.startsWith(ct.name)) a.resolved = true;
}

export function publishStrategy(s: HorizonState, strategyId: string) {
  const st = s.strategies.find((x) => x.id === strategyId);
  if (!st) return;
  advance(s, 6 * HOUR);
  st.status = 'with_client';
  st.publishedAt = s.now;
  const c = companyById(s, st.companyId)!;
  notify(s, { side: 'client', title: `Outreach plan ready · ${c.name}`, detail: `Your consultant published strategy v${st.version} for your review.`, href: `/outreach/${c.slug}/strategy` });
  log(s, 'operator', `Addler Pluviose published strategy v${st.version} for ${c.name}`);
}

export function requestStrategyChanges(s: HorizonState, strategyId: string, feedback: string) {
  const st = s.strategies.find((x) => x.id === strategyId);
  if (!st || !active(s, st.companyId)) return;
  advance(s, HOUR);
  st.status = 'changes_requested';
  st.clientFeedback = feedback;
  st.feedbackAt = s.now;
  const c = companyById(s, st.companyId)!;
  notify(s, { side: 'operator', title: `Changes requested · ${c.name}`, detail: `“${feedback}”`, href: `/queue/strategy/${st.id}` });
  log(s, 'client', `Rachel Kim requested changes to ${c.name}’s strategy`);
}

/** Consultant revises after client feedback: a new version goes back to consultant review. */
export function reviseStrategy(s: HorizonState, strategyId: string, changeSummary: string) {
  const st = s.strategies.find((x) => x.id === strategyId);
  if (!st) return;
  advance(s, HOUR);
  const next = structuredClone(st);
  next.id = uid('st');
  next.version = st.version + 1;
  next.status = 'consultant_review';
  next.changeSummary = changeSummary;
  next.generatedAt = s.now;
  next.publishedAt = undefined;
  // The old version keeps status 'changes_requested' as history; the newest version is the live one.
  s.strategies.push(next);
}

export function acceptStrategy(s: HorizonState, strategyId: string) {
  const st = s.strategies.find((x) => x.id === strategyId);
  if (!st || !active(s, st.companyId)) return;
  advance(s, 2 * HOUR);
  st.status = 'accepted';
  st.acceptedAt = s.now;
  const c = companyById(s, st.companyId)!;
  log(s, 'client', `Rachel Kim accepted the strategy for ${c.name}`);
  writeFirstEmails(s, st.companyId);
}

/* ------------------------------------------------------------------ Emails */

function firstEmailFor(s: HorizonState, contactId: string, sender: string): Pick<Email, 'subject' | 'body' | 'objective' | 'factSource' | 'flags'> {
  const ct = contactById(s, contactId)!;
  const senderName = s.people.find((p) => p.id === sender)?.name ?? 'Rachel Kim';
  const first = ct.name.split(' ')[0];
  if (ct.decisionMaker) {
    return {
      subject: 'An introduction from Spacely Sprockets',
      objective: 'Open an acquisition conversation',
      body: `Hello ${first},\n\nI enjoyed your comments in Fence Post Magazine (May 2026) about thinking through what comes next for Finn’s Fancy Fences. I’m reaching out on behalf of Spacely Sprockets, which is growing its commercial fencing business across the Front Range.\n\nWould you be open to a 20-minute call next week to hear how you’re thinking about the future of the business?\n\nBest,\n${senderName}\nSpacely Sprockets`,
      factSource: { quote: 'thinking about what comes next', source: 'Fence Post Magazine', date: 'May 2026' },
      flags: [],
    };
  }
  // The adviser email deliberately trips two writing checks so the consultant flow is exercised.
  const bad = 'As we discussed, I know you and Finn are ready to sell, and that the timing is right to find a buyer for Finn’s Fancy Fences.';
  return {
    subject: 'An introduction from Spacely Sprockets',
    objective: 'Ask for the right introduction route',
    body: `Hello ${first},\n\n${bad} I’m reaching out on behalf of Spacely Sprockets, which has been growing its commercial fencing business across the Front Range, to discuss a possible acquisition. Could we set up a call with you and Finn next week to talk through next steps?`,
    flags: [
      { id: uid('fl'), type: 'unsupported_claim', title: 'Claims a conversation that never happened', why: `${first} has never spoken with Spacely Sprockets, and he hasn’t said Finn wants to sell. In the strategy he’s an introduction route only.`, span: bad, resolved: false },
      { id: uid('fl'), type: 'no_fact', title: 'No sourced detail', why: `The email doesn’t mention a verified fact about ${first} or his firm. Add one, or record why it’s fine to send without.`, resolved: false },
    ],
  };
}

export function writeFirstEmails(s: HorizonState, companyId: string) {
  const st = strategyForCompany(s, companyId);
  if (!st) return;
  advance(s, 24 * HOUR);
  const n = s.batches.filter((b) => b.companyId === companyId).length + 1;
  const batch = { id: uid('b'), companyId, number: n, label: 'First contact', status: 'preparing' as const };
  s.batches.push(batch);
  for (const row of st.rows.filter((r) => r.wave === 1)) {
    const e = firstEmailFor(s, row.contactId, row.senderId);
    const flagged = e.flags.length > 0;
    s.emails.push({
      id: uid('em'), companyId, contactId: row.contactId, batchId: batch.id, kind: 'first', senderId: row.senderId,
      ...e, status: flagged ? 'flagged' : 'with_client', reviewed: false,
      versions: [{ version: 1, body: e.body, note: 'Written from the strategy and your communication settings', at: s.now, by: 'system' }],
    });
  }
  const c = companyById(s, companyId)!;
  const flaggedCount = s.emails.filter((e) => e.batchId === batch.id && e.status === 'flagged').length;
  if (flaggedCount) notify(s, { side: 'operator', title: `${flaggedCount} flagged email · ${c.name}`, detail: 'Held for your review before the client sees it', href: '/queue?tab=flagged' });
  maybeOpenBatch(s, batch.id);
  log(s, 'system', `First emails written for ${c.name}${flaggedCount ? ` · ${flaggedCount} flagged` : ''}`);
}

/** A batch reaches the client only once every email in it has cleared consultant review. */
function maybeOpenBatch(s: HorizonState, batchId: string) {
  const b = s.batches.find((x) => x.id === batchId)!;
  const emails = s.emails.filter((e) => e.batchId === batchId);
  if (b.status === 'preparing' && emails.every((e) => e.status === 'with_client')) {
    b.status = 'reviewing';
    const c = companyById(s, b.companyId)!;
    notify(s, { side: 'client', title: `${emails.length} emails ready to review · ${c.name}`, detail: 'Nothing is sent until you approve them.', href: `/outreach/${c.slug}/review` });
  }
}

export function resolveFlag(s: HorizonState, emailId: string, flagId: string, resolution: 'rewritten' | 'not_issue' | 'without_fact' | 'source_added', note?: string, source?: { quote: string; source: string; date: string; url?: string }) {
  const e = s.emails.find((x) => x.id === emailId);
  const f = e?.flags.find((x) => x.id === flagId);
  if (!e || !f) return;
  advance(s, 0.25 * HOUR);
  f.resolved = true;
  f.resolution = resolution;
  f.resolutionNote = note;
  f.resolvedAt = s.now;
  f.resolvedBy = 'u_addler';
  if (resolution === 'rewritten' && f.span) {
    const ct = contactById(s, e.contactId)!;
    e.body = `Hello ${ct.name.split(' ')[0]},\n\nI’m reaching out on behalf of Spacely Sprockets, which is growing its commercial fencing business across the Front Range. We’d welcome the chance to learn whether Finn might be open to a conversation about the future of Finn’s Fancy Fences. Could we set up a short call next week to talk about the right way to introduce ourselves?`;
    e.versions.push({ version: e.versions.length + 1, body: e.body, note: 'Rewritten with AI to remove an unsupported claim', at: s.now, by: 'u_addler' });
  }
  if (resolution === 'source_added' && source) e.factSource = source;
}

export function editEmailBody(s: HorizonState, emailId: string, body: string, by: string) {
  const e = s.emails.find((x) => x.id === emailId);
  if (!e || !active(s, e.companyId)) return;
  e.body = body;
  e.reviewed = false;
  e.versions.push({ version: e.versions.length + 1, body, note: 'Edited', at: s.now, by });
}

/** O-05c: the consultant edits a held email directly. A claim the edit removed counts as fixed. */
export function editFlaggedEmail(s: HorizonState, emailId: string, body: string) {
  const e = s.emails.find((x) => x.id === emailId);
  if (!e || e.status !== 'flagged' || !body.trim() || body === e.body) return;
  advance(s, 0.1 * HOUR);
  e.body = body;
  e.versions.push({ version: e.versions.length + 1, body, note: 'Edited by your consultant', at: s.now, by: 'u_addler' });
  for (const f of e.flags) if (!f.resolved && f.span && !body.includes(f.span)) {
    Object.assign(f, { resolved: true, resolution: 'edited', resolvedAt: s.now, resolvedBy: 'u_addler' });
  }
}

/** O-05d: rewrite the whole email with AI. A new version replaces the current one; it can be undone. */
export function rewriteWholeEmail(s: HorizonState, emailId: string, instructions: string, keepFact: boolean, keepSubject: boolean) {
  const e = s.emails.find((x) => x.id === emailId);
  if (!e || e.status !== 'flagged') return;
  advance(s, 0.1 * HOUR);
  const ct = contactById(s, e.contactId)!;
  const sender = s.people.find((p) => p.id === e.senderId)?.name ?? 'Rachel Kim';
  const fact = keepFact && e.factSource ? `I saw that ${e.factSource.quote.replace(/\.$/, '')} (${e.factSource.source}). ` : '';
  // Prototype stand-in for the model call: a short, claim-free rewrite.
  e.body = `Hello ${ct.name.split(' ')[0]},\n\n${fact}I’m reaching out on behalf of Spacely Sprockets, which is growing its commercial fencing business across the Front Range. We’d value your view on the right way to introduce ourselves to Finn.\n\nWould you have 15 minutes for a call next week?\n\nBest,\n${sender}`;
  if (!keepFact) e.factSource = undefined;
  if (!keepSubject) e.subject = 'Introducing Spacely Sprockets';
  e.versions.push({ version: e.versions.length + 1, body: e.body, note: `Rewritten with AI${instructions ? `: “${instructions}”` : ''}`, at: s.now, by: 'u_addler' });
  for (const f of e.flags) {
    if (!f.resolved && f.type === 'unsupported_claim') Object.assign(f, { resolved: true, resolution: 'rewritten', resolvedAt: s.now, resolvedBy: 'u_addler' });
    if (f.type === 'no_fact' && f.resolution === 'source_added' && !e.factSource) Object.assign(f, { resolved: false, resolution: undefined, resolvedAt: undefined });
  }
}

/** Undo the latest version of a held email: restores the previous text and reopens what that version fixed. */
export function undoEmailVersion(s: HorizonState, emailId: string) {
  const e = s.emails.find((x) => x.id === emailId);
  if (!e || e.status !== 'flagged' || e.versions.length < 2) return;
  const last = e.versions.pop()!;
  e.body = e.versions.at(-1)!.body;
  for (const f of e.flags) if (f.resolved && (f.resolution === 'rewritten' || f.resolution === 'edited') && f.resolvedAt && f.resolvedAt >= last.at && f.span && e.body.includes(f.span)) {
    Object.assign(f, { resolved: false, resolution: undefined, resolvedAt: undefined, resolvedBy: undefined });
  }
}

export function sendEmailToClient(s: HorizonState, emailId: string) {
  const e = s.emails.find((x) => x.id === emailId);
  if (!e || e.flags.some((f) => !f.resolved)) return;
  advance(s, 0.25 * HOUR);
  e.status = 'with_client';
  log(s, 'operator', `Addler Pluviose cleared a flagged email to ${contactById(s, e.contactId)!.name}`);
  maybeOpenBatch(s, e.batchId);
}

export function markReviewed(s: HorizonState, emailId: string) {
  const e = s.emails.find((x) => x.id === emailId);
  if (e && !e.reviewed) e.reviewed = true;
}

export function requestEmailRewrite(s: HorizonState, emailId: string, feedback: string) {
  const e = s.emails.find((x) => x.id === emailId);
  if (!e || !active(s, e.companyId)) return;
  const ct = contactById(s, e.contactId)!;
  const senderName = s.people.find((p) => p.id === e.senderId)?.name ?? 'Rachel Kim';
  e.body = `Hello ${ct.name.split(' ')[0]},\n\n${ct.decisionMaker ? 'I enjoyed your comments in Fence Post Magazine (May 2026) about what comes next for Finn’s Fancy Fences. ' : ''}I’m writing for Spacely Sprockets, a Denver company growing its commercial fencing work across the Front Range.\n\nWould you be open to a 20-minute call next week?\n\nBest,\n${senderName}\nSpacely Sprockets`;
  e.reviewed = false;
  e.versions.push({ version: e.versions.length + 1, body: e.body, note: `Rewritten from feedback: “${feedback}”`, at: s.now, by: 'u_rachel' });
}

export function approveBatch(s: HorizonState, batchId: string) {
  const b = s.batches.find((x) => x.id === batchId);
  if (!b) return;
  const emails = s.emails.filter((e) => e.batchId === batchId);
  if (!emails.every((e) => e.reviewed)) return;
  const company = companyById(s, b.companyId);
  if (company?.decision !== 'accepted' || company.removedAt) return;
  advance(s, 12 * HOUR);
  b.status = 'sent';
  b.sentAt = s.now;
  b.approvedBy = 'u_rachel';
  for (const e of emails) {
    if (s.sending.paused || s.sending.mailbox === 'disconnected') { e.status = 'scheduled'; continue; }
    const ct = contactById(s, e.contactId)!;
    if (ct.email && s.sending.bouncing?.includes(ct.email)) {
      // C-10a: the address rejected the email. The consultant finds another address.
      e.status = 'failed';
      e.failReason = `${ct.name}’s address rejected the email (it no longer exists).`;
      s.sending.bouncing = s.sending.bouncing.filter((x) => x !== ct.email);
      notify(s, { side: 'operator', title: `Email bounced · ${ct.name}`, detail: 'The address no longer exists. Find another address and send it back to the client.', href: '/queue?tab=flagged' });
      continue;
    }
    e.status = 'sent';
    e.sentAt = s.now;
    s.messages.push({ id: uid('m'), companyId: e.companyId, contactId: e.contactId, direction: 'out', subject: e.subject, body: e.body, at: s.now, fromId: e.senderId, emailId: e.id });
    s.contactStatus[e.contactId] = 'contacted';
  }
  log(s, 'client', `Rachel Kim approved and sent ${emails.length} emails to ${companyById(s, b.companyId)!.name}`);
}

/* ------------------------------------------------------------------ Replies */

const REPLIES: Record<'positive' | 'decline' | 'optout', { body: string; analysis: Analysis }> = {
  positive: {
    body: 'Hi Rachel,\n\nThanks for reaching out. As the owner, I’m open to a conversation about a possible acquisition. We’ve been fielding a few inquiries this year, and I want to make sure any partner understands how we run our crews and what matters to our long-time customers in Littleton and Englewood.\n\nBefore we set up a call, could you send more detail about your approach? In particular, how you’ve handled teams and existing contracts after past acquisitions, and roughly what timeline you have in mind. I’d also want to loop in Marcus Reyes, our adviser, once we have something concrete to look at.\n\nBest,\nFinn Calloway',
    analysis: { sentiment: 'Positive', summary: 'Open to talking, wants more detail about your approach', intent: 'Asked for more information', evidence: '“As the owner, I’m open to a conversation about a possible acquisition.”', nextStep: 'Reply with a short outline of your approach and a rough timeline.', possibleInterest: true, optOut: false },
  },
  decline: {
    body: 'Thanks for reaching out, but I’m not interested in selling right now.\n\nBest,\nFinn Calloway',
    analysis: { sentiment: 'Negative', summary: 'Not interested in selling right now', intent: 'Declined', evidence: '“I’m not interested in selling right now.”', nextStep: 'Send one short thank-you, then stop.', possibleInterest: false, optOut: false },
  },
  optout: {
    body: 'Please take me off your list. I don’t want to receive these emails.\n\nFinn',
    analysis: { sentiment: 'Negative', summary: 'Asked not to be contacted again', intent: 'Opted out', evidence: '“Please take me off your list.”', nextStep: 'Stop all outreach to this person.', possibleInterest: false, optOut: true },
  },
};

export function simulateReply(s: HorizonState, contactId: string, kind: 'positive' | 'decline' | 'optout') {
  const ct = contactById(s, contactId);
  if (!ct) return;
  advance(s, 24 * HOUR);
  const r = REPLIES[kind];
  const body = r.body.replace(/Finn Calloway$|Finn$/, ct.name).replace('Hi Rachel', 'Hi Rachel');
  s.messages.push({ id: uid('m'), companyId: ct.companyId, contactId, direction: 'in', subject: 'Re: An introduction from Spacely Sprockets', body, at: s.now, analysis: r.analysis });
  s.contactStatus[contactId] = kind === 'optout' ? 'opted_out' : kind === 'decline' ? 'declined' : 'replied';
  const c = companyById(s, ct.companyId)!;
  if (r.analysis.possibleInterest) {
    s.readiness = s.readiness.filter((x) => x.contactId !== contactId);
    s.readiness.push({ contactId, status: 'needs_review', at: s.now });
    notify(s, { side: 'operator', title: `Possible acquisition interest · ${ct.name}`, detail: c.name, href: '/queue?tab=interest' });
  }
  notify(s, { side: 'client', title: `New reply from ${ct.name}`, detail: c.name, href: `/outreach/${c.slug}/conversations?contact=${contactId}` });
  log(s, 'system', `${ct.name} replied (${r.analysis.sentiment.toLowerCase()})`);
}

export function confirmReadiness(s: HorizonState, contactId: string) {
  const ct = contactById(s, contactId)!;
  advance(s, 1.5 * HOUR);
  s.readiness = s.readiness.filter((x) => x.contactId !== contactId);
  s.readiness.push({ contactId, status: 'confirmed', at: s.now, by: 'u_addler' });
  const c = companyById(s, ct.companyId)!;
  notify(s, { side: 'client', title: `${ct.name} is ready to meet`, detail: 'Your consultant confirmed it from his reply.', href: `/outreach/${c.slug}/conversations?contact=${contactId}` });
  log(s, 'operator', `Addler Pluviose confirmed ${ct.name} ready to meet`);
}

export function markNotReady(s: HorizonState, contactId: string, reason: string) {
  s.readiness = s.readiness.filter((x) => x.contactId !== contactId);
  s.readiness.push({ contactId, status: 'not_ready', at: s.now, by: 'u_addler', reason });
}

export function undoReadiness(s: HorizonState, contactId: string) {
  s.readiness = s.readiness.filter((x) => x.contactId !== contactId);
  s.readiness.push({ contactId, status: 'needs_review', at: s.now });
}

export function startReply(s: HorizonState, contactId: string) {
  if (!active(s, contactById(s, contactId)?.companyId)) return undefined;
  const existing = s.replyDrafts.find((d) => d.contactId === contactId && d.status !== 'sent');
  if (existing) return existing.id;
  const last = [...s.messages].reverse().find((m) => m.contactId === contactId && m.direction === 'in');
  const ct = contactById(s, contactId)!;
  const body = `Hi ${ct.name.split(' ')[0]},\n\nThanks for the quick reply, and for being open to a conversation.\n\nI’ll put together a short overview of how we’ve handled crews and existing contracts in past acquisitions, and the rough timeline we have in mind, and send it this week. Marcus is very welcome to join once you’ve had a chance to look it over.\n\nBest,\nRachel Kim\nSpacely Sprockets`;
  const id = uid('rd');
  s.replyDrafts.push({ id, contactId, inReplyTo: last?.id ?? '', subject: 'Re: An introduction from Spacely Sprockets', body, status: 'draft', versions: [{ version: 1, body, note: 'Drafted from the conversation, the strategy and your settings', at: s.now, by: 'system' }] });
  return id;
}

export function updateReplyDraft(s: HorizonState, draftId: string, body: string, note: string, by: string) {
  const d = s.replyDrafts.find((x) => x.id === draftId);
  if (!d) return;
  d.body = body;
  d.versions.push({ version: d.versions.length + 1, body, note, at: s.now, by });
}

export function rewriteReplyDraft(s: HorizonState, draftId: string, feedback: string) {
  const d = s.replyDrafts.find((x) => x.id === draftId);
  if (!d) return;
  const ct = contactById(s, d.contactId)!;
  const body = `Hi ${ct.name.split(' ')[0]},\n\nThanks for being open to a conversation. I’ll send a one-page overview of how we’ve kept crews and contracts intact after past acquisitions, plus a rough timeline, by Friday. Marcus is welcome to review it too.\n\nBest,\nRachel Kim\nSpacely Sprockets`;
  updateReplyDraft(s, draftId, body, `Rewritten with feedback: “${feedback}”`, 'u_rachel');
}

export function sendReply(s: HorizonState, draftId: string) {
  const d = s.replyDrafts.find((x) => x.id === draftId);
  if (!d) return;
  advance(s, 3 * HOUR);
  const ct = contactById(s, d.contactId)!;
  if (s.sending.mailbox === 'disconnected') return;
  const rc = companyById(s, ct.companyId);
  if (rc?.decision !== 'accepted' || rc.removedAt) return;
  d.status = 'sent';
  s.messages.push({ id: uid('m'), companyId: ct.companyId, contactId: d.contactId, direction: 'out', subject: d.subject, body: d.body, at: s.now, fromId: 'u_rachel' });
  log(s, 'client', `Rachel Kim replied to ${ct.name}`);
}

export function logOutsideContact(s: HorizonState, companyId: string, contactIds: string[], channel: string, summary: string) {
  if (!active(s, companyId)) return;
  advance(s, 0.5 * HOUR);
  for (const contactId of contactIds) s.messages.push({ id: uid('m'), companyId, contactId, direction: 'outside', subject: channel, body: summary, at: s.now, channel, fromId: 'u_rachel' });
}

/* ------------------------------------------------------------------ Consultant notes & insights */

/** O-10d: private to Hofund consultants. Never rendered in the client portal. */
export function addPrivateNote(s: HorizonState, contactId: string, text: string) {
  if (!text.trim() || !contactById(s, contactId)) return;
  (s.privateNotes ??= []).unshift({ id: uid('pn'), contactId, text: text.trim(), at: s.now, by: 'u_addler' });
}

/** C-15a: insights the consultant shares with the client on a company's Summary tab. */
export function shareInsights(s: HorizonState, companyId: string, items: { title: string; body: string }[]) {
  const c = companyById(s, companyId);
  if (!c || !items.length) return;
  s.insights = (s.insights ?? []).filter((i) => i.companyId !== companyId);
  for (const it of items) s.insights.push({ id: uid('in'), companyId, ...it, at: s.now, by: 'u_addler' });
  notify(s, { side: 'client', title: `New insights from your consultant · ${c.name}`, detail: 'See the Summary tab.', href: `/outreach/${c.slug}/summary` });
}

export const DEFAULT_SUMMARY_PREFS: NonNullable<HorizonState['summaryPrefs']> = {
  show: { sent: true, replyRate: true, optOut: true, ready: true, sentiment: true, readinessColumn: true },
  groupBy: 'review_group',
  range: 'this_month',
};

export function setSummaryPrefs(s: HorizonState, prefs: HorizonState['summaryPrefs']) {
  s.summaryPrefs = prefs;
}

/* ------------------------------------------------------------------ Settings & sending */

export function suggestSettingChange(s: HorizonState, section: string, text: string) {
  s.settings.suggestions.unshift({ id: uid('sg'), section, text, at: s.now });
  notify(s, { side: 'operator', title: 'Settings change suggested', detail: `${section}: “${text}”`, href: '/messaging' });
}

export function addWritingExample(s: HorizonState, label: string, text: string) {
  s.settings.examples.push({ id: uid('ex'), label: label || 'Writing example', text });
}

export function pauseSending(s: HorizonState, reason: string) {
  s.sending.paused = true;
  s.sending.pausedAt = s.now;
  s.sending.pausedBy = 'u_addler';
  s.sending.pauseReason = reason;
}

export function resumeSending(s: HorizonState) {
  s.sending.paused = false;
  for (const e of s.emails.filter((x) => x.status === 'scheduled')) {
    e.status = 'sent';
    e.sentAt = s.now;
    s.messages.push({ id: uid('m'), companyId: e.companyId, contactId: e.contactId, direction: 'out', subject: e.subject, body: e.body, at: s.now, fromId: e.senderId, emailId: e.id });
    s.contactStatus[e.contactId] = 'contacted';
  }
}

export function setMailbox(s: HorizonState, state: 'connected' | 'disconnected') {
  s.sending.mailbox = state;
  if (state === 'connected') resumeSending(s);
}

export function markNotificationsRead(s: HorizonState, side: 'client' | 'operator') {
  for (const n of s.notifications) if (n.side === side) n.read = true;
}

/** Prototype only: the next send to this contact bounces. */
export function setBouncing(s: HorizonState, contactId: string, on: boolean) {
  const email = contactById(s, contactId)?.email;
  if (!email) return;
  const list = (s.sending.bouncing ?? []).filter((x) => x !== email);
  s.sending.bouncing = on ? [...list, email] : list;
}

export function skipAhead(s: HorizonState, hours: number) {
  advance(s, hours * HOUR);
}
