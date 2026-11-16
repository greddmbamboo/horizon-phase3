import { DemoPanel, SubmitButton } from '@horizon/ui/client';
import { resetDemo, setBouncing, shareDemoInsights, simulateReply, skipAhead } from '@horizon/outreach/server-actions';
import { fmtDayTime, type HorizonState } from '@horizon/outreach';

/** Prototype-only controls, shown in both apps. */
export function Demo({ state, otherAppUrl, otherAppLabel }: { state: HorizonState; otherAppUrl?: string; otherAppLabel: string }) {
  const finnContacted = state.messages.some((m) => m.contactId === 'ct_finn' && m.direction === 'out');
  const finnReplied = state.messages.some((m) => m.contactId === 'ct_finn' && m.direction === 'in');
  const marcusEmail = state.contacts.find((c) => c.id === 'ct_marcus')?.email;
  const bouncing = !!marcusEmail && !!state.sending.bouncing?.includes(marcusEmail);
  const marcusSent = state.emails.some((e) => e.contactId === 'ct_marcus' && (e.status === 'sent' || e.status === 'failed'));
  const insightsShared = (state.insights ?? []).some((i) => i.companyId === 'co_finn');
  return (
    <DemoPanel otherApp={otherAppUrl ? { href: otherAppUrl, label: otherAppLabel } : undefined}>
      <div className="text-xs text-muted">Demo time: <span className="font-medium text-ink">{fmtDayTime(state.now)}</span></div>
      <div className="text-xs font-semibold">Finn Calloway replies…</div>
      {(['positive', 'decline', 'optout'] as const).map((k) => (
        <form key={k} action={simulateReply}>
          <input type="hidden" name="contactId" value="ct_finn" />
          <input type="hidden" name="kind" value={k} />
          <SubmitButton variant="secondary" className="w-full" disabled={!finnContacted || finnReplied}>
            {k === 'positive' ? 'Interested · wants more detail' : k === 'decline' ? 'Not interested' : 'Asks to be removed'}
          </SubmitButton>
        </form>
      ))}
      {!finnContacted && <p className="text-xs text-muted">Available after the first emails are sent.</p>}
      <div className="text-xs font-semibold">Sending</div>
      <form action={setBouncing}>
        <input type="hidden" name="contactId" value="ct_marcus" /><input type="hidden" name="on" value={bouncing ? '0' : '1'} />
        <SubmitButton variant="secondary" className="w-full" disabled={marcusSent}>{bouncing ? 'Marcus’s address will bounce · undo' : 'Make Marcus’s address bounce'}</SubmitButton>
      </form>
      <div className="text-xs font-semibold">Consultant</div>
      <form action={shareDemoInsights}>
        <input type="hidden" name="companyId" value="co_finn" />
        <SubmitButton variant="secondary" className="w-full" disabled={!finnReplied || insightsShared}>Share insights about Finn</SubmitButton>
      </form>
      <form action={skipAhead}><input type="hidden" name="hours" value="24" /><SubmitButton variant="secondary" className="w-full">Skip ahead one day</SubmitButton></form>
      <form action={resetDemo}><input type="hidden" name="redirect" value="/" /><SubmitButton variant="danger" className="w-full">Reset demo data (both apps)</SubmitButton></form>
    </DemoPanel>
  );
}
