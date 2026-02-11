// ── Adapter interface ───────────────────────────────────────────────────────

/** Raw job as returned by an adapter before normalization. */
export interface RawJob {
  externalId: string;
  title: string;
  company: string;
  location: string;
  lat?: number | null;
  lng?: number | null;
  postedAt: Date;
  url: string;
  description: string;
  salary?: string;
}

export interface JobSearchParams {
  query: string;
  location: string;
  radiusKm: number;
  freshnessDays: number;
  page?: number;
  pageSize?: number;
}

export interface JobSourceAdapter {
  readonly sourceId: string;
  readonly name: string;
  fetchJobs(params: JobSearchParams): Promise<RawJob[]>;
}
