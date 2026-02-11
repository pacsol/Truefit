import type { JobSourceAdapter, RawJob, JobSearchParams } from "./jobSource";

const ADZUNA_BASE = "https://api.adzuna.com/v1/api/jobs";

interface AdzunaResult {
  id: string;
  title: string;
  company: { display_name: string };
  location: { display_name: string; area: string[] };
  latitude?: number;
  longitude?: number;
  created: string;
  redirect_url: string;
  description: string;
  salary_min?: number;
  salary_max?: number;
}

interface AdzunaResponse {
  results: AdzunaResult[];
  count: number;
}

/** Map a two-letter country code to the Adzuna country slug. */
function countrySlug(location: string): string {
  const lower = location.toLowerCase();
  if (lower.includes("uk") || lower.includes("united kingdom")) return "gb";
  if (lower.includes("us") || lower.includes("united states")) return "us";
  if (lower.includes("canada")) return "ca";
  if (lower.includes("australia")) return "au";
  if (lower.includes("germany") || lower.includes("deutschland")) return "de";
  if (lower.includes("france")) return "fr";
  if (lower.includes("india")) return "in";
  // Default to GB
  return "gb";
}

export class AdzunaAdapter implements JobSourceAdapter {
  readonly sourceId = "adzuna";
  readonly name = "Adzuna";

  private appId: string;
  private appKey: string;

  constructor(appId?: string, appKey?: string) {
    this.appId = appId ?? process.env.ADZUNA_APP_ID ?? "";
    this.appKey = appKey ?? process.env.ADZUNA_APP_KEY ?? "";
  }

  async fetchJobs(params: JobSearchParams): Promise<RawJob[]> {
    const { query, location, radiusKm, freshnessDays, page = 1, pageSize = 20 } = params;
    const country = countrySlug(location);

    const url = new URL(`${ADZUNA_BASE}/${country}/search/${page}`);
    url.searchParams.set("app_id", this.appId);
    url.searchParams.set("app_key", this.appKey);
    url.searchParams.set("what", query);
    url.searchParams.set("where", location);
    url.searchParams.set("distance", String(radiusKm));
    url.searchParams.set("max_days_old", String(freshnessDays));
    url.searchParams.set("results_per_page", String(pageSize));
    url.searchParams.set("sort_by", "date");
    url.searchParams.set("content-type", "application/json");

    const res = await fetch(url.toString());
    if (!res.ok) {
      throw new Error(`Adzuna API error: ${res.status} ${res.statusText}`);
    }

    const data: AdzunaResponse = await res.json();

    return data.results.map((r): RawJob => ({
      externalId: `adzuna_${r.id}`,
      title: r.title,
      company: r.company?.display_name ?? "Unknown",
      location: r.location?.display_name ?? location,
      lat: r.latitude ?? null,
      lng: r.longitude ?? null,
      postedAt: new Date(r.created),
      url: r.redirect_url,
      description: r.description,
      salary:
        r.salary_min && r.salary_max
          ? `${r.salary_min}–${r.salary_max}`
          : undefined,
    }));
  }
}
