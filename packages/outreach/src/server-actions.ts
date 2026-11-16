'use server';
/**
 * Server actions used by both apps. Each one changes the shared record through the
 * store, then revalidates so the next render (in either app) shows the change.
 * In production: add an auth check at the top of each (client vs operator role).
 */
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import * as A from './actions';
import { getStore } from './store';

const str = (f: FormData, k: string) => String(f.get(k) ?? '').trim();

async function run(fn: Parameters<ReturnType<typeof getStore>['mutate']>[0]) {
  await getStore().mutate(fn);
  revalidatePath('/', 'layout');
}

function go(f: FormData) {
  const to = str(f, 'redirect');
  if (to) redirect(to);
}

/* Client portal */
export async function acceptCompany(f: FormData) { await run((s) => A.acceptCompany(s, str(f, 'companyId'))); go(f); }
export async function rejectCompany(f: FormData) { await run((s) => A.rejectCompany(s, str(f, 'companyId'), str(f, 'reason'))); go(f); }
export async function acceptStrategy(f: FormData) { await run((s) => A.acceptStrategy(s, str(f, 'strategyId'))); go(f); }
export async function requestStrategyChanges(f: FormData) { await run((s) => A.requestStrategyChanges(s, str(f, 'strategyId'), str(f, 'feedback'))); go(f); }
export async function markReviewed(emailId: string) { await run((s) => A.markReviewed(s, emailId)); }
export async function editEmail(f: FormData) { await run((s) => A.editEmailBody(s, str(f, 'emailId'), str(f, 'body'), str(f, 'by') || 'u_rachel')); go(f); }
export async function requestEmailRewrite(f: FormData) { await run((s) => A.requestEmailRewrite(s, str(f, 'emailId'), str(f, 'feedback'))); go(f); }
export async function approveBatch(f: FormData) { await run((s) => A.approveBatch(s, str(f, 'batchId'))); go(f); }
export async function startReply(f: FormData) { await run((s) => { A.startReply(s, str(f, 'contactId')); }); go(f); }
export async function updateReply(f: FormData) { await run((s) => A.updateReplyDraft(s, str(f, 'draftId'), str(f, 'body'), 'Edited', 'u_rachel')); go(f); }
export async function rewriteReply(f: FormData) { await run((s) => A.rewriteReplyDraft(s, str(f, 'draftId'), str(f, 'feedback'))); go(f); }
export async function sendReply(f: FormData) {
  await run((s) => {
    const body = str(f, 'body');
    const d = s.replyDrafts.find((x) => x.id === str(f, 'draftId'));
    if (d && body && body !== d.body) A.updateReplyDraft(s, d.id, body, 'Edited before sending', 'u_rachel');
    A.sendReply(s, str(f, 'draftId'));
  });
  go(f);
}
export async function logOutsideContact(f: FormData) { await run((s) => A.logOutsideContact(s, str(f, 'companyId'), f.getAll('contactIds').map(String), str(f, 'channel'), str(f, 'summary'))); go(f); }
export async function suggestSettingChange(f: FormData) { await run((s) => A.suggestSettingChange(s, str(f, 'section'), str(f, 'text'))); go(f); }
export async function addWritingExample(f: FormData) { await run((s) => A.addWritingExample(s, str(f, 'label'), str(f, 'text'))); go(f); }

/* Operator app */
export async function publishStrategy(f: FormData) { await run((s) => A.publishStrategy(s, str(f, 'strategyId'))); go(f); }
export async function reviseStrategy(f: FormData) { await run((s) => A.reviseStrategy(s, str(f, 'strategyId'), str(f, 'summary'))); go(f); }
export async function updateStrategyRow(f: FormData) {
  await run((s) => A.updateStrategyRow(s, str(f, 'strategyId'), str(f, 'contactId'), {
    objective: str(f, 'objective'), senderId: str(f, 'senderId'), when: str(f, 'when'), reason: str(f, 'reason'),
  }));
  go(f);
}
export async function setContactEmail(f: FormData) { await run((s) => A.setContactEmail(s, str(f, 'contactId'), str(f, 'email'))); go(f); }
export async function resolveFlag(f: FormData) {
  const quote = str(f, 'quote');
  await run((s) => A.resolveFlag(s, str(f, 'emailId'), str(f, 'flagId'), str(f, 'resolution') as never, str(f, 'note'),
    quote ? { quote, source: str(f, 'source'), date: str(f, 'date'), url: str(f, 'url') || undefined } : undefined));
  go(f);
}
export async function sendEmailToClient(f: FormData) { await run((s) => A.sendEmailToClient(s, str(f, 'emailId'))); go(f); }
export async function confirmReadiness(f: FormData) { await run((s) => A.confirmReadiness(s, str(f, 'contactId'))); go(f); }
export async function markNotReady(f: FormData) { await run((s) => A.markNotReady(s, str(f, 'contactId'), str(f, 'reason'))); go(f); }
export async function undoReadiness(f: FormData) { await run((s) => A.undoReadiness(s, str(f, 'contactId'))); go(f); }
export async function pauseSending(f: FormData) { await run((s) => A.pauseSending(s, str(f, 'reason'))); go(f); }
export async function resumeSending(f: FormData) { await run((s) => A.resumeSending(s)); go(f); }
export async function setMailbox(f: FormData) { await run((s) => A.setMailbox(s, str(f, 'state') as 'connected' | 'disconnected')); go(f); }
export async function markNotificationsRead(f: FormData) { await run((s) => A.markNotificationsRead(s, str(f, 'side') as 'client' | 'operator')); go(f); }

/* Demo controls (prototype only) */
export async function simulateReply(f: FormData) { await run((s) => A.simulateReply(s, str(f, 'contactId'), str(f, 'kind') as never)); go(f); }
export async function skipAhead(f: FormData) { await run((s) => A.skipAhead(s, Number(str(f, 'hours')) || 24)); go(f); }
export async function resetDemo(f: FormData) { await getStore().reset(); revalidatePath('/', 'layout'); go(f); }
