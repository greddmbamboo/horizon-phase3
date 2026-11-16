import { redirect } from 'next/navigation';
import { getState } from '@horizon/outreach/data';

/** Company Review opens the next company waiting on a decision (or the first company). */
export default async function CompanyReview() {
  const s = await getState();
  const next = s.companies.find((c) => c.decision === 'waiting') ?? s.companies[0];
  redirect(`/companies/${next.slug}`);
}
