import { Pill } from '@horizon/ui';
import { fmtDay, type Company } from '@horizon/outreach';

export function DecisionPill({ c }: { c: Company }) {
  if (c.decision === 'accepted') return <Pill tone={c.version > 1 ? 'Updated' : 'Done'}>{c.version > 1 ? 'Updated' : `Accepted ${fmtDay(c.decidedAt)}`}</Pill>;
  if (c.decision === 'rejected') return <Pill tone="Inactive">Rejected {fmtDay(c.decidedAt)}</Pill>;
  return <Pill tone="Needs Action">Waiting on you</Pill>;
}
