import { JSearchAdapter } from "@/lib/adapters/jsearch";
import { RemotiveAdapter } from "@/lib/adapters/remotive";
import { fetchAndNormalize } from "@/lib/adapters/normalize";
import { matchLocal, toMatchInput, type MatchResult } from "@/lib/matching/matchEngine";
import { sendEmail, buildDigestHtml } from "@/lib/email/sendgrid";
import type { Profile, JobSearch } from "@/types";

const adapters = [new JSearchAdapter(), new RemotiveAdapter()];

export interface DigestMatch {
  title: string;
  company: string;
  location: string;
  url: string;
  score: number;
  recommendation: string;
  skills: string[];
}

export interface DigestResult {
  userId: string;
  date: string; // YYYY-MM-DD
  matches: DigestMatch[];
  emailSent: boolean;
}

/**
 * Run the digest pipeline for a single user:
 * 1. Fetch new jobs for each of their saved searches
 * 2. Dedupe across searches
 * 3. Score against profile
 * 4. Rank and take top N
 * 5. (Optionally) send email
 */
export async function runDigestForUser(params: {
  userId: string;
  email: string;
  displayName: string;
  profile: Profile;
  searches: JobSearch[];
  topN?: number;
  sendEmailDigest?: boolean;
}): Promise<DigestResult> {
  const {
    userId,
    email,
    displayName,
    profile,
    searches,
    topN = 10,
    sendEmailDigest = true,
  } = params;

  const today = new Date().toISOString().slice(0, 10);

  // 1. Fetch jobs from all saved searches in parallel
  const allJobsNested = await Promise.all(
    searches.map((s) =>
      fetchAndNormalize(adapters, {
        query: s.query,
        location: s.location,
        radiusKm: s.radiusKm,
        freshnessDays: s.freshnessDays,
      })
    )
  );

  // 2. Flatten + dedupe by externalId
  const seen = new Set<string>();
  const allJobs = allJobsNested.flat().filter((j) => {
    if (seen.has(j.externalId)) return false;
    seen.add(j.externalId);
    return true;
  });

  // 3. Score each job
  const scored: { job: typeof allJobs[number]; match: MatchResult }[] = allJobs
    .map((job) => ({
      job,
      match: matchLocal(
        toMatchInput(profile, {
          title: job.title,
          company: job.company,
          location: job.location,
          description: job.description,
          skills: job.skills,
          seniority: job.seniority,
        })
      ),
    }))
    .sort((a, b) => b.match.score - a.match.score);

  // 4. Take top N
  const topMatches = scored.slice(0, topN);

  const digestMatches: DigestMatch[] = topMatches.map(({ job, match }) => ({
    title: job.title,
    company: job.company,
    location: job.location,
    url: job.url,
    score: match.score,
    recommendation: match.recommendation,
    skills: job.skills,
  }));

  // 5. Send email
  let emailSent = false;
  if (sendEmailDigest && digestMatches.length > 0) {
    try {
      const html = buildDigestHtml(displayName || email, digestMatches);
      await sendEmail({
        to: email,
        subject: `Truefit: ${digestMatches.length} new matches for ${today}`,
        html,
      });
      emailSent = true;
    } catch (err) {
      console.error(`[Digest] Email send failed for ${email}:`, err);
    }
  }

  return {
    userId,
    date: today,
    matches: digestMatches,
    emailSent,
  };
}
