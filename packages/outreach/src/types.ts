/**
 * Domain model for Horizon Phase 3 (Outreach).
 *
 * One `HorizonState` document holds everything both apps read. The prototype
 * persists it as a single JSON document (see store.ts). The normalized tables a
 * production build should use are in supabase/migrations/0001_outreach_schema.sql;
 * the field names here match those columns so the swap is mechanical.
 */

export type ISODate = string;

export type AppSide = 'client' | 'operator';

export interface Person {
  id: string;
  name: string;
  title: string;
  email: string;
  side: AppSide;
}

export interface Engagement {
  id: string;
  name: string;
  clientName: string;
  clientShortName: string;
  footerAddress: string;
  mailboxDomain: string;
}

export type CompanyDecision = 'waiting' | 'accepted' | 'rejected';

export interface Company {
  id: string;
  slug: string;
  name: string;
  avatar: string;
  readiness: string;
  segment: string;
  sharedAt: ISODate;
  version: number;
  decision: CompanyDecision;
  decidedAt?: ISODate;
  rejectReason?: string;
  why: string;
  financials: { label: string; value: string; note: string }[];
  assessments: { label: string; value: string; note: string }[];
}

export interface Contact {
  id: string;
  companyId: string;
  name: string;
  title: string;
  roleLabel: string;
  email?: string;
  location?: string;
  decisionMaker: boolean;
  bio: string;
}

export type StrategyStatus =
  | 'generating'
  | 'consultant_review'
  | 'with_client'
  | 'changes_requested'
  | 'accepted'
  | 'failed';

export interface StrategyRow {
  contactId: string;
  order: number;
  objective: string;
  senderId: string;
  when: string;
  whenNote: string;
  reason: string;
  /** First-contact emails are written for rows in wave 1 when the strategy is accepted. */
  wave: 1 | 2;
}

export interface Strategy {
  id: string;
  companyId: string;
  version: number;
  status: StrategyStatus;
  objective: string;
  rows: StrategyRow[];
  generatedAt: ISODate;
  publishedAt?: ISODate;
  acceptedAt?: ISODate;
  clientFeedback?: string;
  feedbackAt?: ISODate;
  changeSummary?: string;
  privateNotes: string;
  attention: { id: string; text: string; resolved: boolean }[];
}

export type FlagType = 'unsupported_claim' | 'no_fact';
export type FlagResolution = 'rewritten' | 'not_issue' | 'without_fact' | 'source_added' | 'edited';

export interface EmailFlag {
  id: string;
  type: FlagType;
  title: string;
  why: string;
  /** Exact text in the body this flag points at, if any. */
  span?: string;
  resolved: boolean;
  resolution?: FlagResolution;
  resolutionNote?: string;
  resolvedAt?: ISODate;
  resolvedBy?: string;
}

export type EmailStatus =
  | 'flagged' // held for the consultant
  | 'with_client' // waiting for client review
  | 'scheduled' // approved, waiting for sending hours / paused sending
  | 'sent'
  | 'failed';

export interface EmailVersion {
  version: number;
  body: string;
  note: string;
  at: ISODate;
  by: string;
}

export interface Email {
  id: string;
  companyId: string;
  contactId: string;
  batchId: string;
  kind: 'first' | 'followup';
  subject: string;
  objective: string;
  body: string;
  senderId: string;
  factSource?: { quote: string; source: string; date: string; url?: string };
  status: EmailStatus;
  reviewed: boolean;
  flags: EmailFlag[];
  versions: EmailVersion[];
  sentAt?: ISODate;
  failReason?: string;
}

export interface Batch {
  id: string;
  companyId: string;
  number: number;
  label: string;
  status: 'preparing' | 'reviewing' | 'sent';
  sentAt?: ISODate;
  approvedBy?: string;
}

export interface Analysis {
  sentiment: 'Positive' | 'Mixed' | 'Negative' | 'Not enough evidence';
  summary: string;
  intent: string;
  evidence: string;
  nextStep: string;
  possibleInterest: boolean;
  optOut: boolean;
}

export interface Message {
  id: string;
  companyId: string;
  contactId: string;
  direction: 'out' | 'in' | 'outside';
  subject: string;
  body: string;
  at: ISODate;
  fromId?: string;
  emailId?: string;
  analysis?: Analysis;
  channel?: string;
}

export type ReadinessStatus = 'not_assessed' | 'needs_review' | 'confirmed' | 'not_ready';

export interface Readiness {
  contactId: string;
  status: ReadinessStatus;
  at?: ISODate;
  by?: string;
  reason?: string;
}

export interface ReplyDraft {
  id: string;
  contactId: string;
  inReplyTo: string;
  subject: string;
  body: string;
  status: 'draft' | 'rewriting' | 'sent';
  versions: EmailVersion[];
}

export type ContactOutreach = 'not_contacted' | 'contacted' | 'replied' | 'on_break' | 'opted_out' | 'declined';

export interface Notification {
  id: string;
  side: AppSide;
  title: string;
  detail: string;
  href: string;
  at: ISODate;
  read: boolean;
}

export interface Settings {
  confirmedAt: ISODate;
  tone: string;
  preferred: string;
  avoid: string;
  proposing: string;
  examples: { id: string; label: string; text: string }[];
  suggestions: { id: string; section: string; text: string; at: ISODate }[];
}

export interface Sending {
  paused: boolean;
  pausedBy?: string;
  pausedAt?: ISODate;
  pauseReason?: string;
  mailbox: 'connected' | 'disconnected';
  lastChecked: string;
  sendingHours: string;
}

export interface Activity {
  id: string;
  at: ISODate;
  text: string;
  side: AppSide | 'system';
}

export interface HorizonState {
  schemaVersion: number;
  /** The demo's "now". Advanced by demo controls so time-based steps can be shown. */
  now: ISODate;
  engagement: Engagement;
  people: Person[];
  companies: Company[];
  contacts: Contact[];
  strategies: Strategy[];
  batches: Batch[];
  emails: Email[];
  messages: Message[];
  readiness: Readiness[];
  replyDrafts: ReplyDraft[];
  contactStatus: Record<string, ContactOutreach>;
  notifications: Notification[];
  settings: Settings;
  sending: Sending;
  activity: Activity[];
}
