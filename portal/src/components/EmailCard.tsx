import { contactById, personById, writingChecks, type Email, type HorizonState } from '@horizon/outreach';
import { CheckDot } from '@horizon/ui';
import { Link2 } from 'lucide-react';

export function EmailMeta({ s, e }: { s: HorizonState; e: Email }) {
  const ct = contactById(s, e.contactId)!;
  const from = personById(s, e.senderId);
  return (
    <div className="flex flex-col gap-1">
      <h3 className="text-[17px] font-semibold">{e.subject}</h3>
      <p className="text-[13px] text-muted">To: {ct.name} · {ct.title}<br />From: {from?.name} &lt;{from?.email}&gt;</p>
      <p className="text-[13px] text-muted">Objective: {e.objective.toLowerCase()}</p>
    </div>
  );
}

export function EmailCard({ s, e }: { s: HorizonState; e: Email }) {
  const checks = writingChecks(e);
  return (
    <div className="flex flex-col gap-4 rounded-card border border-line p-6">
      <EmailMeta s={s} e={e} />
      <p className="whitespace-pre-line text-[15px] leading-relaxed">{e.body}</p>
      {e.factSource && (
        <p className="flex items-center gap-2 text-[13px] text-muted"><Link2 size={14} /> Fact used: “{e.factSource.quote}” · {e.factSource.source} · {e.factSource.date} <span className="underline">View source</span></p>
      )}
      <div className="flex flex-wrap items-center gap-4 rounded-md bg-sunk px-3 py-2 text-[13px]">
        <span className="font-semibold text-muted">Writing checks</span>
        {checks.map((c) => <span key={c.label} className="inline-flex items-center gap-1.5"><CheckDot ok={c.ok} />{c.label}</span>)}
      </div>
      <div className="rounded-md bg-sunk px-3 py-2.5 text-xs text-muted"><div className="font-semibold">Footer added automatically · not editable</div>{s.engagement.footerAddress}</div>
    </div>
  );
}
