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
export async function acceptUpdate(f: FormData) { await run((s) => A.acceptUpdate(s, str(f, 'companyId'))); go(f); }
export async function rejectUpdate(f: FormData) { await run((s) => A.rejectUpdate(s, str(f, 'companyId'), str(f, 'reason'))); go(f); }
export async function withdrawAcceptance(f: FormData) { await run((s) => A.withdrawAcceptance(s, str(f, 'companyId'))); go(f); }
export async function acceptAgain(f: FormData) { await run((s) => A.acceptAgain(s, str(f, 'companyId'))); go(f); }
export async function saveSummaryPrefs(f: FormData) {
  const reset = str(f, 'reset') === '1';
  await run((s) => A.setSummaryPrefs(s, reset ? undefined : {
    show: {
      sent: f.has('sent'), replyRate: f.has('replyRate'), optOut: f.has('optOut'),
      ready: f.has('ready'), sentiment: f.has('sentiment'), readinessColumn: f.has('readinessColumn'),
    },
    groupBy: str(f, 'groupBy') === 'none' ? 'none' : 'review_group',
    range: str(f, 'range') === 'this_month' ? 'this_month' : 'all_time',
  }));
  go(f);
}
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
export async function addStrategyContact(f: FormData) { await run((s) => A.addStrategyContact(s, str(f, 'strategyId'), str(f, 'contactId'))); go(f); }
export async function setOverlapDecision(f: FormData) {
  const choice = str(f, 'choice');
  if (choice !== 'this_only' && choice !== 'both' && choice !== 'neither') return;
  await run((s) => A.setOverlapDecision(s, str(f, 'strategyId'), str(f, 'contactId'), choice));
  go(f);
}
export async function setContactLocation(f: FormData) { await run((s) => A.setContactLocation(s, str(f, 'contactId'), str(f, 'location'), str(f, 'source'), str(f, 'url') || undefined)); go(f); }
export async function startRegenerate(f: FormData) { await run((s) => A.startRegenerate(s, str(f, 'strategyId'))); go(f); }
export async function finishRegenerate(strategyId: string) { await run((s) => A.finishRegenerate(s, strategyId)); }
export async function removeFromClientView(f: FormData) { await run((s) => A.removeFromClientView(s, str(f, 'companyId'), str(f, 'reason'))); go(f); }
export async function editFlaggedEmail(f: FormData) { await run((s) => A.editFlaggedEmail(s, str(f, 'emailId'), String(f.get('body') ?? ''))); go(f); }
export async function rewriteWholeEmail(f: FormData) { await run((s) => A.rewriteWholeEmail(s, str(f, 'emailId'), str(f, 'instructions'), f.has('keepFact'), f.has('keepSubject'))); go(f); }
export async function undoEmailVersion(f: FormData) { await run((s) => A.undoEmailVersion(s, str(f, 'emailId'))); go(f); }
export async function addPrivateNote(f: FormData) { await run((s) => A.addPrivateNote(s, str(f, 'contactId'), str(f, 'text'))); go(f); }
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
export async function setBouncing(f: FormData) { await run((s) => A.setBouncing(s, str(f, 'contactId'), str(f, 'on') === '1')); go(f); }
export async function shareDemoInsights(f: FormData) {
  // Prototype only: stands in for the consultant sharing insights (that operator screen isn't designed yet).
  await run((s) => A.shareInsights(s, str(f, 'companyId'), [
    { title: 'Finn is thinking about succession, not a quick sale', body: 'He mentioned his long-time customers and crews twice. Leading with how you keep teams and contracts intact is likely to land.' },
    { title: 'Marcus is the route to a decision', body: 'Finn plans to loop in Marcus once there’s something concrete. A short written overview Marcus can review would help.' },
    { title: 'Timing: early next year', body: 'Finn says inquiries picked up this year. A first call before the holidays keeps you ahead of other buyers.' },
  ]));
  go(f);
}
export async function skipAhead(f: FormData) { await run((s) => A.skipAhead(s, Number(str(f, 'hours')) || 24)); go(f); }
export async function resetDemo(f: FormData) { await getStore().reset(); revalidatePath('/', 'layout'); go(f); }
