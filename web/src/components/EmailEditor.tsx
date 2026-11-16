'use client';
/**
 * O-05c: edit a held email directly. Writing checks re-run as you type (word count, the
 * flagged claim still being there, one clear ask). The server re-checks on save.
 */
import Link from 'next/link';
import { useState } from 'react';
import { Actions, CheckDot, btnClass, inputClass } from '@horizon/ui';
import { SubmitButton } from '@horizon/ui/client';

export function EmailEditor({ emailId, body, claims, here, action }: {
  emailId: string; body: string; claims: { title: string; span: string }[]; here: string; action: (f: FormData) => Promise<void>;
}) {
  const [text, setText] = useState(body);
  const words = text.split(/\s+/).filter(Boolean).length;
  const asks = (text.match(/\?/g) ?? []).length;
  const checks = [
    ...claims.map((c) => ({ label: text.includes(c.span) ? c.title : 'No unsupported claims', ok: !text.includes(c.span) })),
    { label: `${words} / 149 words`, ok: words <= 149 },
    { label: 'One clear ask', ok: asks === 1 },
  ];
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="emailId" value={emailId} /><input type="hidden" name="redirect" value={here} />
      <label htmlFor="email-body" className="sr-only">Email body</label>
      <textarea id="email-body" name="body" value={text} onChange={(e) => setText(e.target.value)} rows={12} autoFocus
        className={`${inputClass} border-2 border-accent text-sm leading-relaxed`} />
      <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs" aria-live="polite">
        <span className="font-semibold text-muted">Editing · checks re-run as you type</span>
        {checks.map((w) => <span key={w.label} className="flex items-center gap-1.5"><CheckDot ok={w.ok} />{w.label}</span>)}
      </div>
      <p className="text-xs text-muted">The signature and footer are added automatically.</p>
      <Actions><Link className={btnClass('link')} href={here}>Cancel</Link><SubmitButton disabled={!text.trim() || text === body} pendingLabel="Saving…">Save Draft</SubmitButton></Actions>
    </form>
  );
}
