import { Timestamp } from "firebase/firestore";
import type { RawJob, JobSearchParams, JobSourceAdapter } from "./jobSource";
import type { JobPost } from "@/types";

/**
 * Fetch from multiple adapters, dedupe by externalId, filter by freshness,
 * and return normalized JobPost-shaped objects (without Firestore metadata).
 */
export async function fetchAndNormalize(
  adapters: JobSourceAdapter[],
  params: JobSearchParams
): Promise<Omit<JobPost, "createdAt" | "updatedAt" | "version">[]> {
  // Fetch from all sources in parallel
  const results = await Promise.allSettled(
    adapters.map((a) => a.fetchJobs(params))
  );

  const allRaw: (RawJob & { sourceId: string })[] = [];
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.status === "fulfilled") {
      for (const job of r.value) {
        allRaw.push({ ...job, sourceId: adapters[i].sourceId });
      }
    } else {
      console.error(
        `Adapter ${adapters[i].name} failed:`,
        r.reason
      );
    }
  }

  // Dedupe by externalId (first occurrence wins)
  const seen = new Set<string>();
  const deduped = allRaw.filter((j) => {
    if (seen.has(j.externalId)) return false;
    seen.add(j.externalId);
    return true;
  });

  // Freshness filter
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - params.freshnessDays);

  return deduped
    .filter((j) => j.postedAt >= cutoff)
    .map((j) => ({
      sourceId: j.sourceId,
      externalId: j.externalId,
      title: j.title,
      company: j.company,
      location: j.location,
      lat: j.lat ?? null,
      lng: j.lng ?? null,
      postedAt: Timestamp.fromDate(j.postedAt),
      url: j.url,
      description: j.description,
      skills: extractSkills(j.description),
      seniority: null,
      active: true,
    }));
}

/** Basic keyword extraction for skills — will be improved later. */
function extractSkills(description: string): string[] {
  const KNOWN_SKILLS = [
    "javascript", "typescript", "react", "next.js", "nextjs", "node.js",
    "nodejs", "python", "java", "c#", "c++", "go", "rust", "ruby",
    "php", "swift", "kotlin", "sql", "nosql", "mongodb", "postgresql",
    "mysql", "firebase", "aws", "azure", "gcp", "docker", "kubernetes",
    "terraform", "ci/cd", "git", "graphql", "rest", "api",
    "html", "css", "tailwind", "sass", "vue", "angular", "svelte",
    "django", "flask", "spring", "express", ".net", "laravel",
    "redis", "elasticsearch", "kafka", "rabbitmq",
    "machine learning", "deep learning", "nlp", "computer vision",
    "agile", "scrum", "devops", "linux",
  ];

  const lower = description.toLowerCase();
  return KNOWN_SKILLS.filter((s) => lower.includes(s));
}
