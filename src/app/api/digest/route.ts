import { NextRequest, NextResponse } from "next/server";
import { runDigestForUser } from "@/lib/digest/digestPipeline";
import type { Profile, JobSearch } from "@/types";

/**
 * POST /api/digest
 *
 * Runs the digest pipeline for a single user.
 * In production this would be a Cloud Function triggered by Cloud Scheduler
 * that iterates over all users. For MVP it accepts user data in the body.
 *
 * Body: { userId, email, displayName, profile, searches, topN?, sendEmail? }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userId,
      email,
      displayName,
      profile,
      searches,
      topN,
      sendEmail: sendEmailFlag,
    } = body;

    if (!userId || !profile || !searches) {
      return NextResponse.json(
        { error: "userId, profile, and searches are required" },
        { status: 400 }
      );
    }

    const result = await runDigestForUser({
      userId,
      email: email ?? "",
      displayName: displayName ?? "",
      profile: profile as Profile,
      searches: searches as JobSearch[],
      topN: topN ?? 10,
      sendEmailDigest: sendEmailFlag ?? false,
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error("Digest error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Digest failed" },
      { status: 500 }
    );
  }
}
