import { redirect } from 'next/navigation';
import { getState } from '@horizon/outreach/data';
import { clientCompanies } from '@horizon/outreach';

/** Company Review opens the next company waiting on a decision (or the first company). */
export default async function CompanyReview() {
  const s = await getState();
  const next = clientCompanies(s).find((c) => c.decision === 'waiting') ?? clientCompanies(s)[0];
  redirect(`/companies/${next.slug}`);
}
