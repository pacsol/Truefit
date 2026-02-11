import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, isAuthError } from "@/lib/api/withAuth";
import { simulateAts } from "@/lib/ats/atsSimulator";

/**
 * POST /api/ats/score
 * Body: { cvText: string, jobKeywords?: string[] }
 * Returns ATS simulation result.
 */
export async function POST(req: NextRequest) {
  const auth = await verifyAuth(req);
  if (isAuthError(auth)) return auth;

  try {
    const body = await req.json();
    const { cvText, jobKeywords } = body;

    if (!cvText || typeof cvText !== "string") {
      return NextResponse.json(
        { error: "cvText is required" },
        { status: 400 }
      );
    }

    const result = simulateAts(cvText, jobKeywords ?? []);
    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error("ATS score error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "ATS scoring failed" },
      { status: 500 }
    );
  }
}
