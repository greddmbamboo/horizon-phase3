import Link from 'next/link';
import { resumeSending, setMailbox } from '@horizon/outreach/server-actions';
import type { HorizonState } from '@horizon/outreach';
import { btnClass } from '@horizon/ui';
import { SubmitButton } from '@horizon/ui/client';

export function SendingBar({ s }: { s: HorizonState }) {
  const waiting = s.emails.filter((e) => e.status === 'scheduled').length;
  const down = s.sending.mailbox === 'disconnected';
  const edge = down ? 'bg-status-failed' : s.sending.paused ? 'bg-carrot-400' : 'bg-accent';
  return (
    <div className="relative flex flex-wrap items-center gap-4 overflow-hidden rounded-card bg-highlight px-5 py-3.5">
      <span className={`absolute inset-y-0 left-0 w-[3px] ${edge}`} />
      <span className="text-[13px] font-semibold">{down ? 'Sending is stopped' : s.sending.paused ? 'Sending is paused' : 'Sending is on'}</span>
      <span className="text-xs text-muted">
        {down ? 'Outreach mailbox disconnected · replies not being checked'
          : s.sending.paused ? `${waiting} approved email${waiting === 1 ? '' : 's'} waiting · replies still checked`
          : `Outreach mailbox connected · inbox last checked ${s.sending.lastChecked} · 0 bounces · 0 complaints`}
      </span>
      <div className="ml-auto">
        {down ? (
          <form action={setMailbox}><input type="hidden" name="state" value="connected" /><SubmitButton>Reconnect Mailbox</SubmitButton></form>
        ) : s.sending.paused ? (
          <form action={resumeSending}><SubmitButton>Resume Sending</SubmitButton></form>
        ) : (
          <Link href="/messaging?dialog=pause" className={btnClass('secondary')}>Pause All Sending</Link>
        )}
      </div>
    </div>
  );
}
