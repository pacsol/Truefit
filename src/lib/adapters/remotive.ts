import type { JobSourceAdapter, RawJob, JobSearchParams } from "./jobSource";

const REMOTIVE_BASE = "https://remotive.com/api/remote-jobs";

interface RemotiveJob {
  id: number;
  title: string;
  company_name: string;
  candidate_required_location: string;
  publication_date: string;
  url: string;
  description: string;
  salary: string;
  tags: string[];
}

interface RemotiveResponse {
  "job-count": number;
  jobs: RemotiveJob[];
}

export class RemotiveAdapter implements JobSourceAdapter {
  readonly sourceId = "remotive";
  readonly name = "Remotive";

  async fetchJobs(params: JobSearchParams): Promise<RawJob[]> {
    const { query, freshnessDays, pageSize = 20 } = params;

    const url = new URL(REMOTIVE_BASE);
    if (query) url.searchParams.set("search", query);
    url.searchParams.set("limit", String(pageSize));

    const res = await fetch(url.toString());
    if (!res.ok) {
      throw new Error(`Remotive API error: ${res.status} ${res.statusText}`);
    }

    const data: RemotiveResponse = await res.json();

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - freshnessDays);

    return data.jobs
      .map((j): RawJob => ({
        externalId: `remotive_${j.id}`,
        title: j.title,
        company: j.company_name,
        location: j.candidate_required_location || "Remote",
        lat: null,
        lng: null,
        postedAt: new Date(j.publication_date),
        url: j.url,
        description: stripHtml(j.description),
        salary: j.salary || undefined,
      }))
      .filter((j) => j.postedAt >= cutoff);
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
