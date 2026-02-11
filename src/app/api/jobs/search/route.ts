import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, isAuthError } from "@/lib/api/withAuth";
import { AdzunaAdapter } from "@/lib/adapters/adzuna";
import { RemotiveAdapter } from "@/lib/adapters/remotive";
import { fetchAndNormalize } from "@/lib/adapters/normalize";
import type { JobSearchParams } from "@/lib/adapters/jobSource";

const adapters = [new AdzunaAdapter(), new RemotiveAdapter()];

export async function POST(req: NextRequest) {
  const auth = await verifyAuth(req);
  if (isAuthError(auth)) return auth;

  try {
    const body = await req.json();

    const params: JobSearchParams = {
      query: body.query ?? "",
      location: body.location ?? "",
      radiusKm: body.radiusKm ?? 50,
      freshnessDays: body.freshnessDays ?? 14,
      page: body.page ?? 1,
      pageSize: body.pageSize ?? 20,
    };

    const jobs = await fetchAndNormalize(adapters, params);

    return NextResponse.json({ jobs, count: jobs.length });
  } catch (err: unknown) {
    console.error("Job search error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Search failed" },
      { status: 500 }
    );
  }
}
