import { getState } from '@horizon/outreach/data';
import { companyById, threadFor } from '@horizon/outreach';
import { Banner, PageHeader, PersonCell, Table } from '@horizon/ui';

export default async function People() {
  const s = await getState();
  const contacts = s.contacts.filter((ct) => companyById(s, ct.companyId)?.decision === 'accepted' && !companyById(s, ct.companyId)?.removedAt);
  return (
    <>
      <PageHeader title="People" subtitle="Decision makers and contacts at your accepted companies" />
      <Banner tone="info" title="Name and title only for now">Until someone replies, you see each person’s name and title. Their email address appears after they respond.</Banner>
      <Table head={['Person', 'Company', 'Email']}>
        {contacts.map((ct) => {
          const replied = threadFor(s, ct.id).some((m) => m.direction === 'in');
          return <tr key={ct.id}><td><PersonCell name={ct.name} sub={ct.title} /></td><td>{companyById(s, ct.companyId)?.name}</td><td className="text-muted">{replied ? ct.email : 'Shared after they reply'}</td></tr>;
        })}
      </Table>
    </>
  );
}
