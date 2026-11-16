import Link from 'next/link';
import { getState } from '@horizon/outreach/data';
import { fmtDay } from '@horizon/outreach';
import { addWritingExample, suggestSettingChange } from '@horizon/outreach/server-actions';
import { Actions, Card, Field, PageHeader, Pill, PersonCell, Table, btnClass, inputClass } from '@horizon/ui';
import { Modal } from '@horizon/ui/modal';
import { SubmitButton } from '@horizon/ui/client';

const SECTIONS = [
  { key: 'tone', title: 'Tone and style' },
  { key: 'preferred', title: 'Preferred language' },
  { key: 'avoid', title: 'Language to avoid' },
  { key: 'proposing', title: 'What you’re proposing' },
] as const;

export default async function Settings({ searchParams }: { searchParams: Promise<{ suggest?: string; example?: string; saved?: string }> }) {
  const q = await searchParams;
  const s = await getState();
  const st = s.settings;
  const senders = s.people.filter((p) => p.side === 'client');
  const sec = SECTIONS.find((x) => x.key === q.suggest) ?? (q.suggest === 'senders' ? { key: 'senders', title: 'Senders and signature' } : undefined);
  return (
    <>
      <PageHeader title="Communication Settings" subtitle="Used for every email Hofund writes for you. Set during onboarding; come back anytime." status={<Pill tone="Done">Confirmed {fmtDay(st.confirmedAt)}</Pill>} />
      {q.saved && <div className="rounded-card bg-highlight px-5 py-3 text-[13px]">Sent to your consultant. Suggestions are reviewed before they’re used.</div>}
      {SECTIONS.map((x) => (
        <Card key={x.key} className="flex flex-col gap-2 p-5">
          <div className="flex items-center"><h2 className="text-[15px] font-semibold">{x.title}</h2><Link href={`/settings?suggest=${x.key}`} className={btnClass('link', 'ml-auto')}>Suggest a Change</Link></div>
          <p className="text-[13px] text-muted">{st[x.key]}</p>
        </Card>
      ))}
      <Card className="flex flex-col gap-3 p-5">
        <div className="flex items-center"><h2 className="text-[15px] font-semibold">Senders and Signature</h2><Link href="/settings?suggest=senders" className={btnClass('link', 'ml-auto')}>Suggest a Change</Link></div>
        <p className="text-[13px] text-muted">Your consultant chooses which approved sender writes to each contact.</p>
        <Table head={['Sender', 'Sends from', '']}>
          {senders.map((p, i) => <tr key={p.id}><td><PersonCell name={p.name} sub={p.title} /></td><td className="text-muted">{p.email}</td><td className="text-xs text-muted">{i === 0 ? 'Default' : ''}</td></tr>)}
        </Table>
        <div className="rounded-md bg-sunk px-3 py-2.5 text-sm"><div className="text-xs font-semibold text-muted">Signature · same on every email · not editable here</div><p className="whitespace-pre-line">Best,{'\n'}Rachel Kim{'\n'}Head of Corporate Development, Spacely Sprockets</p></div>
        <p className="text-xs text-muted">Replies go to email@{s.engagement.mailboxDomain}. This mailbox is managed by Hofund and can’t be changed here.</p>
      </Card>
      <Card className="flex flex-col gap-3 p-5">
        <h2 className="text-[15px] font-semibold">Writing Examples (Optional)</h2>
        <p className="text-[13px] text-muted">{st.examples.length} examples added · used for style only, never copied into emails</p>
        <ul className="flex flex-col gap-1 text-[13px]">{st.examples.map((e) => <li key={e.id}>· {e.label}</li>)}</ul>
        <Actions><Link href="/settings?example=paste" className={btnClass('secondary')}>Paste an Example</Link><Link href="/settings?example=upload" className={btnClass('secondary')}>Upload File</Link></Actions>
      </Card>

      {sec && (
        <Modal title={`Suggest a Change · ${sec.title}`} closeHref="/settings" width={520}>
          <form action={suggestSettingChange} className="flex flex-col gap-4 pb-2">
            <input type="hidden" name="section" value={sec.title} /><input type="hidden" name="redirect" value="/settings?saved=1" />
            {sec.key !== 'senders' && <Field label="Current"><div className="rounded-md bg-sunk px-3 py-2.5 text-sm">{st[sec.key as 'tone']}</div></Field>}
            <Field label="What should change?"><textarea name="text" required rows={3} autoFocus className={inputClass} /></Field>
            <p className="text-[13px] text-muted">Your consultant reviews suggestions before they’re used in any email.</p>
            <Actions><Link href="/settings" className={btnClass('link')}>Cancel</Link><SubmitButton>Send Suggestion</SubmitButton></Actions>
          </form>
        </Modal>
      )}
      {q.example && (
        <Modal title={q.example === 'upload' ? 'Upload a Writing Example' : 'Add a Writing Example'} closeHref="/settings" width={560}>
          <form action={addWritingExample} className="flex flex-col gap-4 pb-2">
            <input type="hidden" name="redirect" value="/settings" />
            {q.example === 'upload'
              ? <Field label="File" hint="TXT, PDF or DOCX · up to 10 MB. (Prototype: paste the text below.)"><input type="file" className={inputClass} accept=".txt,.pdf,.docx" /></Field>
              : null}
            <Field label="Paste an email you’ve written"><textarea name="text" required rows={6} className={inputClass} /></Field>
            <Field label="Label (optional)"><input name="label" className={inputClass} placeholder="e.g. Note to a partner after a site visit" /></Field>
            <p className="text-[13px] text-muted">Used for style only. Examples are never copied into emails.</p>
            <Actions><Link href="/settings" className={btnClass('link')}>Cancel</Link><SubmitButton>Add Example</SubmitButton></Actions>
          </form>
        </Modal>
      )}
    </>
  );
}
