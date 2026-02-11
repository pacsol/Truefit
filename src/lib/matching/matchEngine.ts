import { generateJSON } from "@/lib/ai/gemini";
import type { Profile, Recommendation } from "@/types";

export interface MatchInput {
  profile: {
    skills: string[];
    seniority: string;
    location: string;
    geoRadiusKm: number;
    constraints: string[];
  };
  job: {
    title: string;
    company: string;
    location: string;
    description: string;
    skills: string[];
    seniority: string | null;
  };
}

export interface MatchResult {
  score: number; // 0–100
  reasonsFit: string[];
  gaps: string[];
  recommendation: Recommendation;
}

/**
 * Deterministic score based on skill overlap, seniority, and location.
 * Used as a baseline; Gemini enriches with rationale.
 */
function computeBaseScore(input: MatchInput): number {
  const { profile, job } = input;

  // Skill overlap (0–50 points)
  const profileSkills = new Set(profile.skills.map((s) => s.toLowerCase()));
  const jobSkills = job.skills.map((s) => s.toLowerCase());
  const matchedSkills = jobSkills.filter((s) => profileSkills.has(s));
  const skillScore =
    jobSkills.length > 0
      ? (matchedSkills.length / jobSkills.length) * 50
      : 25; // no skill data → neutral

  // Seniority match (0–25 points)
  const SENIORITY_RANK: Record<string, number> = {
    junior: 1,
    mid: 2,
    senior: 3,
    lead: 4,
    executive: 5,
  };
  const profileRank = SENIORITY_RANK[profile.seniority] ?? 2;
  const jobRank = job.seniority ? (SENIORITY_RANK[job.seniority] ?? 2) : profileRank;
  const seniorityDiff = Math.abs(profileRank - jobRank);
  const seniorityScore = Math.max(0, 25 - seniorityDiff * 10);

  // Location relevance (0–25 points)
  const profileLoc = profile.location.toLowerCase();
  const jobLoc = job.location.toLowerCase();
  let locationScore = 15; // default: partial
  if (
    jobLoc.includes("remote") ||
    profile.constraints.some((c) => c.toLowerCase().includes("remote"))
  ) {
    locationScore = 25;
  } else if (
    jobLoc.includes(profileLoc) ||
    profileLoc.includes(jobLoc)
  ) {
    locationScore = 25;
  }

  return Math.round(skillScore + seniorityScore + locationScore);
}

function scoreToRecommendation(score: number): Recommendation {
  if (score >= 70) return "APPLY";
  if (score >= 40) return "MAYBE";
  return "SKIP";
}

/**
 * Quick local-only match — no AI call. Use for bulk scoring.
 */
export function matchLocal(input: MatchInput): MatchResult {
  const score = computeBaseScore(input);

  const profileSkills = new Set(input.profile.skills.map((s) => s.toLowerCase()));
  const jobSkills = input.job.skills.map((s) => s.toLowerCase());
  const matched = jobSkills.filter((s) => profileSkills.has(s));
  const missing = jobSkills.filter((s) => !profileSkills.has(s));

  const reasonsFit: string[] = [];
  if (matched.length > 0)
    reasonsFit.push(`Matching skills: ${matched.join(", ")}`);
  if (input.job.location.toLowerCase().includes("remote"))
    reasonsFit.push("Remote position available");

  const gaps: string[] = [];
  if (missing.length > 0)
    gaps.push(`Missing skills: ${missing.join(", ")}`);

  return {
    score,
    reasonsFit: reasonsFit.slice(0, 5),
    gaps: gaps.slice(0, 5),
    recommendation: scoreToRecommendation(score),
  };
}

/**
 * AI-enriched match — uses Gemini for detailed rationale.
 * Falls back to local scoring if the AI call fails.
 */
export async function matchWithAI(input: MatchInput): Promise<MatchResult> {
  const baseScore = computeBaseScore(input);

  try {
    const prompt = `You are a job-matching assistant. Score how well this candidate fits this job.

CANDIDATE:
- Skills: ${input.profile.skills.join(", ")}
- Seniority: ${input.profile.seniority}
- Location: ${input.profile.location} (radius: ${input.profile.geoRadiusKm}km)
- Constraints: ${input.profile.constraints.join(", ") || "none"}

JOB:
- Title: ${input.job.title}
- Company: ${input.job.company}
- Location: ${input.job.location}
- Required skills: ${input.job.skills.join(", ") || "not specified"}
- Seniority: ${input.job.seniority || "not specified"}
- Description (first 500 chars): ${input.job.description.slice(0, 500)}

Base score (from deterministic formula): ${baseScore}/100

Return a JSON object with:
- "score": number 0-100 (adjust the base score if warranted, but stay within ±15)
- "reasonsFit": string[] (top 5 reasons this candidate fits)
- "gaps": string[] (top 5 gaps or risks)
- "recommendation": "APPLY" | "MAYBE" | "SKIP"`;

    const result = await generateJSON<MatchResult>(prompt);

    // Clamp score
    result.score = Math.max(0, Math.min(100, Math.round(result.score)));
    result.reasonsFit = (result.reasonsFit || []).slice(0, 5);
    result.gaps = (result.gaps || []).slice(0, 5);
    if (!["APPLY", "MAYBE", "SKIP"].includes(result.recommendation)) {
      result.recommendation = scoreToRecommendation(result.score);
    }

    return result;
  } catch (err) {
    console.error("AI match failed, using local score:", err);
    return matchLocal(input);
  }
}

/** Convert a Profile + a job-like object into a MatchInput. */
export function toMatchInput(
  profile: Pick<Profile, "skills" | "seniority" | "location" | "geoRadiusKm" | "constraints">,
  job: {
    title: string;
    company: string;
    location: string;
    description: string;
    skills: string[];
    seniority?: string | null;
  }
): MatchInput {
  return {
    profile: {
      skills: profile.skills,
      seniority: profile.seniority,
      location: profile.location,
      geoRadiusKm: profile.geoRadiusKm,
      constraints: profile.constraints,
    },
    job: {
      title: job.title,
      company: job.company,
      location: job.location,
      description: job.description,
      skills: job.skills,
      seniority: job.seniority ?? null,
    },
  };
}
