import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, isAuthError } from "@/lib/api/withAuth";
import { matchWithAI, matchLocal, toMatchInput } from "@/lib/matching/matchEngine";

export async function POST(req: NextRequest) {
  const auth = await verifyAuth(req);
  if (isAuthError(auth)) return auth;

  try {
    const body = await req.json();
    const { profile, job, useAI = false } = body;

    if (!profile || !job) {
      return NextResponse.json(
        { error: "profile and job are required" },
        { status: 400 }
      );
    }

    const input = toMatchInput(profile, job);
    const result = useAI ? await matchWithAI(input) : matchLocal(input);

    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error("Match error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Match failed" },
      { status: 500 }
    );
  }
}
