import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, isAuthError } from "@/lib/api/withAuth";
import { runDigestForUser } from "@/lib/digest/digestPipeline";
import type { Profile, JobSearch } from "@/types";

/**
 * POST /api/digest
 *
 * Runs the digest pipeline for the authenticated user.
 * Body: { email, displayName, profile, searches, topN?, sendEmail? }
 */
export async function POST(req: NextRequest) {
  const auth = await verifyAuth(req);
  if (isAuthError(auth)) return auth;

  try {
    const body = await req.json();
    const {
      email,
      displayName,
      profile,
      searches,
      topN,
      sendEmail: sendEmailFlag,
    } = body;

    if (!profile || !searches) {
      return NextResponse.json(
        { error: "profile and searches are required" },
        { status: 400 }
      );
    }

    const result = await runDigestForUser({
      userId: auth.uid,
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
