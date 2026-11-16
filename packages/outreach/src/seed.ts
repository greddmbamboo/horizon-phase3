import type { HorizonState } from './types';

/**
 * Starting data: the moment before Rachel accepts Finn's Fancy Fences.
 * Other companies are in realistic in-between states so lists aren't empty.
 */
export function seedState(): HorizonState {
  return {
    schemaVersion: 1,
    now: '2026-11-03T09:00:00.000Z',
    engagement: {
      id: 'eng_fencing',
      name: 'Fencing Acquisitions',
      clientName: 'Spacely Sprockets',
      clientShortName: 'Spacely',
      footerAddress: 'Spacely Sprockets · 2150 Sprocket Way, Denver, CO 80216 · Commercial outreach · Unsubscribe',
      mailboxDomain: 'spacelysprockets.mailhl.com',
    },
    people: [
      { id: 'u_rachel', name: 'Rachel Kim', title: 'Head of Corporate Development', email: 'rachel.kim@spacelysprockets.mailhl.com', side: 'client' },
      { id: 'u_dana', name: 'Dana Ortiz', title: 'COO', email: 'dana.ortiz@spacelysprockets.mailhl.com', side: 'client' },
      { id: 'u_addler', name: 'Addler Pluviose', title: 'Consultant, Hofund', email: 'addler@hofundinc.com', side: 'operator' },
    ],
    companies: [
      {
        id: 'co_finn', slug: 'finns-fancy-fences', name: 'Finn’s Fancy Fences', avatar: 'Commercial · Front Range',
        readiness: 'Ready now', segment: 'Commercial fencing', sharedAt: '2026-11-02T15:00:00.000Z', version: 1, decision: 'waiting',
        why: 'A 28-year-old commercial installer with steady municipal and HOA contracts across Littleton and Englewood. The founder is in his early sixties, has no named successor, and told a trade publication in May 2026 that he is “thinking about what comes next.” Strong fit with your goal of adding Front Range commercial capacity.',
        financials: [
          { label: 'Revenue', value: '$8.2M', note: 'Estimate · crews × regional benchmark' },
          { label: 'EBITDA', value: '$1.3M', note: 'Estimate · 16% industry margin' },
          { label: 'Estimated value', value: '$9.1M', note: '7× EBITDA (top of your range)' },
          { label: 'Employees', value: '54', note: 'LinkedIn · Oct 2026' },
        ],
        assessments: [
          { label: 'Buyer Fit', value: 'Good fit', note: 'Matches your service mix and region. No deal-breakers found.' },
          { label: 'Readiness', value: 'Ready now · 0–5 months', note: 'Founder publicly discussing succession; no successor named.' },
          { label: 'Acquisition Merit Score', value: '82 / 100', note: 'Strong contract base and margins; weighted 60/40 for quality and urgency.' },
        ],
      },
      { id: 'co_ridge', slug: 'ridgeline-fence-gate', name: 'Ridgeline Fence & Gate', avatar: 'Commercial · Front Range', readiness: 'Ready now', segment: 'Commercial fencing', sharedAt: '2026-11-02T15:00:00.000Z', version: 1, decision: 'accepted', decidedAt: '2026-11-02T16:00:00.000Z', why: 'Gate automation specialist with strong municipal relationships.', financials: [], assessments: [] },
      { id: 'co_copper', slug: 'copper-creek-fencing', name: 'Copper Creek Fencing', avatar: 'Commercial · Front Range', readiness: 'Ready now', segment: 'Commercial fencing', sharedAt: '2026-11-02T15:00:00.000Z', version: 1, decision: 'accepted', decidedAt: '2026-11-02T16:10:00.000Z', why: 'Regional installer with a long backlog of HOA work.', financials: [], assessments: [] },
      { id: 'co_prairie', slug: 'prairie-post-rail', name: 'Prairie Post & Rail', avatar: 'Ranch & agricultural', readiness: 'Ready now', segment: 'Ranch fencing', sharedAt: '2026-11-02T15:00:00.000Z', version: 1, decision: 'accepted', decidedAt: '2026-11-03T08:00:00.000Z', why: 'Agricultural fencing with a loyal ranch customer base.', financials: [], assessments: [] },
      { id: 'co_summit', slug: 'summit-perimeter', name: 'Summit Perimeter Co.', avatar: 'Security & perimeter', readiness: 'Ready now', segment: 'Security fencing', sharedAt: '2026-11-02T15:00:00.000Z', version: 2, decision: 'accepted', decidedAt: '2026-11-04T10:00:00.000Z', why: 'Security perimeter installer serving data centers.', financials: [], assessments: [] },
      { id: 'co_lakeside', slug: 'lakeside-fence-works', name: 'Lakeside Fence Works', avatar: 'Residential & light commercial', readiness: 'On the Horizon', segment: 'Residential fencing', sharedAt: '2026-11-02T15:00:00.000Z', version: 1, decision: 'rejected', decidedAt: '2026-11-03T08:30:00.000Z', rejectReason: 'Too far outside our service area.', why: 'Residential-heavy installer north of Fort Collins.', financials: [], assessments: [] },
      { id: 'co_granite', slug: 'granite-ridge-gates', name: 'Granite Ridge Gates', avatar: 'Security & perimeter', readiness: 'Ready now', segment: 'Gates & access', sharedAt: '2026-11-02T15:00:00.000Z', version: 1, decision: 'waiting', why: 'Access control and gate installer with service contracts.', financials: [], assessments: [] },
    ],
    contacts: [
      { id: 'ct_finn', companyId: 'co_finn', name: 'Finn Calloway', title: 'Owner', roleLabel: 'Owner · decision maker', email: 'finn@finnsfancyfences.com', location: 'Littleton, CO, US', decisionMaker: true, bio: 'Founded the company in 1998. Primary contact for any acquisition conversation.' },
      { id: 'ct_marcus', companyId: 'co_finn', name: 'Marcus Reyes', title: 'External adviser · Reyes & Hart', roleLabel: 'External adviser', email: 'marcus@reyeshartadvisory.com', location: 'Denver, CO, US', decisionMaker: false, bio: 'Long-time CPA to the business. Influences the owner, not a decision maker.' },
      { id: 'ct_priya', companyId: 'co_finn', name: 'Priya Nair', title: 'Finance lead', roleLabel: 'Finance lead', email: 'priya@finnsfancyfences.com', decisionMaker: false, bio: 'Runs finance and payroll.' },
      { id: 'ct_owen', companyId: 'co_finn', name: 'Owen Talbot', title: 'Operations lead', roleLabel: 'Operations lead', decisionMaker: false, bio: 'Runs crews and scheduling.' },
      { id: 'ct_dprice', companyId: 'co_copper', name: 'Dana Price', title: 'Office manager', roleLabel: 'Office manager', email: 'dana@coppercreekfencing.com', location: 'Golden, CO, US', decisionMaker: false, bio: '' },
    ],
    strategies: [
      { id: 'st_prairie_1', companyId: 'co_prairie', version: 1, status: 'consultant_review', objective: 'Understand the owners’ plans for the ranch business.', rows: [], generatedAt: '2026-11-03T08:20:00.000Z', privateNotes: '', attention: [{ id: 'a1', text: '1 person’s location unknown. US recipients only.', resolved: false }] },
    ],
    batches: [
      { id: 'b_copper_1', companyId: 'co_copper', number: 1, label: 'First contact', status: 'sent', sentAt: '2026-11-03T08:00:00.000Z', approvedBy: 'u_rachel' },
    ],
    emails: [],
    messages: [
      { id: 'm_cp1', companyId: 'co_copper', contactId: 'ct_dprice', direction: 'out', subject: 'An introduction from Spacely Sprockets', body: 'Hello Dana,\n\nI’m reaching out on behalf of Spacely Sprockets…', at: '2026-11-03T08:00:00.000Z', fromId: 'u_rachel' },
    ],
    readiness: [],
    replyDrafts: [],
    contactStatus: { ct_dprice: 'contacted' },
    notifications: [],
    settings: {
      confirmedAt: '2026-10-28T12:00:00.000Z',
      tone: 'Direct, thoughtful and concise. No pressure, no invented familiarity, no unsupported claims.',
      preferred: '“partnership”, “explore”, “on your timeline”',
      avoid: '“deal”, “buyout”, “exit”, “As we discussed”',
      proposing: 'Exploring a commercial fencing acquisition where interests align.',
      examples: [
        { id: 'ex1', label: 'Note to a partner after a site visit', text: 'Hi Tom, thanks for walking the Littleton site with us last week…' },
        { id: 'ex2', label: 'Intro to a supplier', text: 'Hi Maria, I lead corporate development at Spacely…' },
      ],
      suggestions: [],
    },
    sending: { paused: false, mailbox: 'connected', lastChecked: '10:30', sendingHours: '8:00–18:00 ET' },
    activity: [],
  };
}
