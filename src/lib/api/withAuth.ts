import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase/admin";

/**
 * Verifies the Firebase ID token from the Authorization header.
 * Returns the decoded token's uid, or a 401 response if invalid.
 */
export async function verifyAuth(
  req: NextRequest
): Promise<{ uid: string } | NextResponse> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Missing or invalid Authorization header" },
      { status: 401 }
    );
  }

  const idToken = authHeader.slice(7);
  try {
    const decoded = await getAdminAuth().verifyIdToken(idToken);
    return { uid: decoded.uid };
  } catch {
    return NextResponse.json(
      { error: "Invalid or expired token" },
      { status: 401 }
    );
  }
}

/** Type guard: true if verifyAuth returned an error response */
export function isAuthError(
  result: { uid: string } | NextResponse
): result is NextResponse {
  return result instanceof NextResponse;
}
