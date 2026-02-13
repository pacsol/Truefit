import type { JobSourceAdapter, RawJob, JobSearchParams } from "./jobSource";

const JSEARCH_BASE = "https://jsearch.p.rapidapi.com/search";

interface JSearchJob {
  job_id: string;
  employer_name: string;
  employer_logo: string | null;
  job_title: string;
  job_description: string;
  job_employment_type: string;
  job_apply_link: string;
  job_is_remote: boolean;
  job_posted_at_timestamp: number;
  job_posted_at_datetime_utc: string;
  job_city: string;
  job_state: string;
  job_country: string;
  job_latitude: number | null;
  job_longitude: number | null;
  job_min_salary: number | null;
  job_max_salary: number | null;
  job_salary_currency: string | null;
  job_salary_period: string | null;
}

interface JSearchResponse {
  status: string;
  data: JSearchJob[];
}

/** Map freshnessDays to JSearch date_posted filter. */
function datePostedFilter(days: number): string {
  if (days <= 1) return "today";
  if (days <= 3) return "3days";
  if (days <= 7) return "week";
  if (days <= 30) return "month";
  return "all";
}

export class JSearchAdapter implements JobSourceAdapter {
  readonly sourceId = "jsearch";
  readonly name = "JSearch";

  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = (apiKey ?? process.env.RAPIDAPI_KEY ?? "").trim();
  }

  async fetchJobs(params: JobSearchParams): Promise<RawJob[]> {
    const { query, location, radiusKm, freshnessDays, page = 1, pageSize = 20 } = params;

    if (!this.apiKey) {
      throw new Error("JSearch API key (RAPIDAPI_KEY) is not configured.");
    }

    // JSearch expects a combined query like "Quantity Surveyor in Dubai"
    const searchQuery = location ? `${query} in ${location}` : query;

    const url = new URL(JSEARCH_BASE);
    url.searchParams.set("query", searchQuery);
    url.searchParams.set("page", String(page));
    url.searchParams.set("num_pages", "1");
    url.searchParams.set("date_posted", datePostedFilter(freshnessDays));
    if (radiusKm) url.searchParams.set("radius", String(radiusKm));

    const res = await fetch(url.toString(), {
      headers: {
        "X-RapidAPI-Key": this.apiKey,
        "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
      },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`JSearch API error: ${res.status} ${res.statusText}${body ? ` — ${body.slice(0, 200)}` : ""}`);
    }

    const data: JSearchResponse = await res.json();

    if (data.status !== "OK" || !Array.isArray(data.data)) {
      throw new Error(`JSearch returned unexpected status: ${data.status}`);
    }

    return data.data.slice(0, pageSize).map((j): RawJob => ({
      externalId: `jsearch_${j.job_id}`,
      title: j.job_title,
      company: j.employer_name ?? "Unknown",
      location: [j.job_city, j.job_state, j.job_country].filter(Boolean).join(", ") || location,
      lat: j.job_latitude ?? null,
      lng: j.job_longitude ?? null,
      postedAt: new Date(j.job_posted_at_datetime_utc ?? j.job_posted_at_timestamp * 1000),
      url: j.job_apply_link,
      description: j.job_description,
      salary: formatSalary(j),
    }));
  }
}

function formatSalary(j: JSearchJob): string | undefined {
  if (!j.job_min_salary && !j.job_max_salary) return undefined;
  const currency = j.job_salary_currency ?? "";
  const period = j.job_salary_period ? `/${j.job_salary_period.toLowerCase()}` : "";
  if (j.job_min_salary && j.job_max_salary) {
    return `${currency}${j.job_min_salary}–${j.job_max_salary}${period}`;
  }
  return `${currency}${j.job_min_salary ?? j.job_max_salary}${period}`;
}
