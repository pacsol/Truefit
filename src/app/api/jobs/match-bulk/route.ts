import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, isAuthError } from "@/lib/api/withAuth";
import { matchLocal, toMatchInput, type MatchResult } from "@/lib/matching/matchEngine";

/**
 * Bulk-score a list of jobs against a profile using the fast local matcher.
 * Body: { profile, jobs[] }
 * Returns: { matches: { job, match }[] } sorted by score desc.
 */
export async function POST(req: NextRequest) {
  const auth = await verifyAuth(req);
  if (isAuthError(auth)) return auth;

  try {
    const body = await req.json();
    const { profile, jobs } = body;

    if (!profile || !Array.isArray(jobs)) {
      return NextResponse.json(
        { error: "profile and jobs[] are required" },
        { status: 400 }
      );
    }

    const matches: { job: typeof jobs[number]; match: MatchResult }[] = jobs
      .map((job: typeof jobs[number]) => ({
        job,
        match: matchLocal(toMatchInput(profile, job)),
      }))
      .sort(
        (a: { match: MatchResult }, b: { match: MatchResult }) =>
          b.match.score - a.match.score
      );

    return NextResponse.json({ matches });
  } catch (err: unknown) {
    console.error("Bulk match error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Bulk match failed" },
      { status: 500 }
    );
  }
}
