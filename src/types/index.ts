import { Timestamp } from "firebase/firestore";

// ── Shared fields ──────────────────────────────────────────────────────────────

export interface BaseDocument {
  createdAt: Timestamp;
  updatedAt: Timestamp;
  version: number;
}

export interface OwnedDocument extends BaseDocument {
  userId: string;
}

// ── Users ──────────────────────────────────────────────────────────────────────

export interface User extends BaseDocument {
  email: string;
  displayName: string;
}

// ── Profiles ───────────────────────────────────────────────────────────────────

export interface Profile extends OwnedDocument {
  skills: string[];
  seniority: Seniority;
  location: string;
  geoRadiusKm: number;
  constraints: string[]; // e.g. visa, remote-only
}

export type Seniority = "junior" | "mid" | "senior" | "lead" | "executive";

// ── Job Searches ───────────────────────────────────────────────────────────────

export interface JobSearch extends OwnedDocument {
  query: string;
  location: string;
  radiusKm: number;
  freshnessDays: number; // default 14
}

// ── Job Sources ────────────────────────────────────────────────────────────────

export interface JobSource extends BaseDocument {
  sourceId: string;
  adapter: string; // "jsearch" | "remotive" | …
  lastFetchedAt: Timestamp | null;
}

// ── Job Posts ──────────────────────────────────────────────────────────────────

export interface JobPost extends BaseDocument {
  sourceId: string;
  externalId: string;
  title: string;
  company: string;
  location: string;
  lat: number | null;
  lng: number | null;
  postedAt: Timestamp;
  url: string;
  description: string;
  skills: string[];
  seniority: Seniority | null;
  active: boolean;
}

// ── Job Matches ────────────────────────────────────────────────────────────────

export type Recommendation = "APPLY" | "MAYBE" | "SKIP";

export interface JobMatch extends OwnedDocument {
  jobPostId: string;
  score: number; // 0–100
  reasonsFit: string[];
  gaps: string[];
  recommendation: Recommendation;
}

// ── Resumes (Original) ────────────────────────────────────────────────────────

export interface ResumeOriginal extends OwnedDocument {
  storagePath: string;
  filename: string;
  mimeType: string;
}

// ── Resumes (Parsed) ──────────────────────────────────────────────────────────

export interface ResumeParsed extends OwnedDocument {
  originalId: string;
  sections: ResumeSection[];
  rawText: string;
  skills: string[];
}

export interface ResumeSection {
  heading: string;
  content: string;
}

// ── Resume Versions ────────────────────────────────────────────────────────────

export interface ResumeVersion extends OwnedDocument {
  parsedId: string;
  jobPostId: string;
  content: string;
  atsScore: number | null;
  version: number;
}

// ── ATS Scores ─────────────────────────────────────────────────────────────────

export interface AtsScore extends BaseDocument {
  resumeVersionId: string;
  score: number;
  keywordCoverage: number; // 0–1
  sectionIntegrity: number; // 0–1
  risks: string[];
}

// ── Feedback ───────────────────────────────────────────────────────────────────

export interface Feedback extends OwnedDocument {
  loopId?: string;
  versionId?: string;
  type: string;
  content: string;
}

// ── Loop State ─────────────────────────────────────────────────────────────────

export type LoopPhase =
  | "idle"
  | "scoring"
  | "proposing"
  | "applying"
  | "rescoring"
  | "awaiting_user"
  | "terminated";

export type TerminationReason =
  | "target_reached"
  | "max_iterations"
  | "no_improvement"
  | "user_stop";

export interface LoopHistoryEntry {
  iteration: number;
  resumeVersionId: string;
  atsScore: number;
  diff: string;
  rationale: string;
  timestamp: Timestamp;
}

export interface LoopState extends OwnedDocument {
  jobId: string;
  resumeVersionId: string;
  phase: LoopPhase;
  iteration: number;
  history: LoopHistoryEntry[];
  terminationReason: TerminationReason | null;
}

// ── Digest Runs ────────────────────────────────────────────────────────────────

export interface DigestRun extends OwnedDocument {
  date: string; // YYYY-MM-DD
  jobMatchIds: string[];
  sentAt: Timestamp | null;
}
