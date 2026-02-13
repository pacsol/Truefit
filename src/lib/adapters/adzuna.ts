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

/** Adzuna-supported country slugs. */
const ADZUNA_COUNTRIES: Record<string, string> = {
  "united kingdom": "gb", "uk": "gb", "england": "gb", "scotland": "gb", "wales": "gb", "london": "gb",
  "united states": "us", "usa": "us",
  "canada": "ca",
  "australia": "au", "sydney": "au", "melbourne": "au",
  "germany": "de", "deutschland": "de", "berlin": "de", "munich": "de",
  "france": "fr", "paris": "fr",
  "india": "in", "mumbai": "in", "delhi": "in", "bangalore": "in",
  "italy": "it", "rome": "it", "milan": "it",
  "netherlands": "nl", "amsterdam": "nl",
  "new zealand": "nz", "auckland": "nz",
  "poland": "pl", "warsaw": "pl",
  "singapore": "sg",
  "south africa": "za", "cape town": "za", "johannesburg": "za",
  "brazil": "br", "são paulo": "br", "sao paulo": "br",
  "austria": "at", "vienna": "at",
};

/** Map a location string to the Adzuna country slug, or null if unsupported. */
function countrySlug(location: string): string | null {
  const lower = location.toLowerCase();
  for (const [keyword, slug] of Object.entries(ADZUNA_COUNTRIES)) {
    if (lower.includes(keyword)) return slug;
  }
  return null;
}

export class AdzunaAdapter implements JobSourceAdapter {
  readonly sourceId = "adzuna";
  readonly name = "Adzuna";

  private appId: string;
  private appKey: string;

  constructor(appId?: string, appKey?: string) {
    this.appId = (appId ?? process.env.ADZUNA_APP_ID ?? "").trim();
    this.appKey = (appKey ?? process.env.ADZUNA_APP_KEY ?? "").trim();
  }

  async fetchJobs(params: JobSearchParams): Promise<RawJob[]> {
    const { query, location, radiusKm, freshnessDays, page = 1, pageSize = 20 } = params;
    const country = countrySlug(location);

    if (!country) {
      throw new Error(`Adzuna does not cover "${location}". Supported regions: UK, US, Canada, Australia, Germany, France, India, Italy, Netherlands, NZ, Poland, Singapore, South Africa, Brazil, Austria.`);
    }

    if (!this.appId || !this.appKey) {
      throw new Error("Adzuna API credentials are not configured.");
    }

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
