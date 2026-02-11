"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense, useMemo } from "react";
import type { Recommendation } from "@/types";

interface NormalizedJob {
  externalId: string;
  title: string;
  company: string;
  location: string;
  postedAt: { seconds: number };
  url: string;
  description: string;
  skills: string[];
}

interface MatchResult {
  score: number;
  reasonsFit: string[];
  gaps: string[];
  recommendation: Recommendation;
}

function JobDetailContent() {
  const searchParams = useSearchParams();
  const jobId = searchParams.get("id");

  const data = useMemo(() => {
    if (!jobId) return null;
    try {
      const raw = sessionStorage.getItem(`job_${jobId}`);
      if (!raw) return null;
      return JSON.parse(raw) as { job: NormalizedJob; match: MatchResult };
    } catch {
      return null;
    }
  }, [jobId]);

  if (!data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <p style={{ color: "var(--color-text-muted)" }}>No job data found. Try searching again.</p>
          <Link href="/jobs" className="mt-4 inline-block text-sm font-medium" style={{ color: "var(--color-accent)" }}>
            Back to Jobs
          </Link>
        </div>
      </div>
    );
  }

  const { job, match } = data;
  const postedDate = new Date(job.postedAt.seconds * 1000);

  const recStyles: Record<Recommendation, { bg: string; text: string }> = {
    APPLY: { bg: "var(--color-success)", text: "var(--color-text-inverse)" },
    MAYBE: { bg: "var(--color-warning)", text: "var(--color-text-inverse)" },
    SKIP: { bg: "var(--color-risk)", text: "var(--color-text-inverse)" },
  };

  const recStyle = recStyles[match.recommendation];

  return (
    <div className="space-y-6">
      <Link href="/jobs" className="inline-flex items-center gap-1 text-sm font-medium" style={{ color: "var(--color-accent)" }}>
        &larr; Back to search results
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          <div
            className="rounded-xl border p-6"
            style={{
              background: "var(--color-surface)",
              borderColor: "var(--color-border)",
              boxShadow: "var(--shadow-sm)",
              borderRadius: "var(--radius-lg)",
            }}
          >
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--color-primary)" }}>
              {job.title}
            </h1>
            <p className="mt-2" style={{ color: "var(--color-text-secondary)" }}>
              {job.company} &middot; {job.location}
            </p>
            <p className="mt-1 text-sm" style={{ color: "var(--color-text-muted)" }}>
              Posted {postedDate.toLocaleDateString()}
            </p>

            {job.skills.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {job.skills.map((s) => (
                  <span
                    key={s}
                    className="rounded-full px-3 py-1 text-sm font-medium"
                    style={{
                      background: "var(--color-secondary-light)",
                      color: "var(--color-secondary)",
                      borderRadius: "var(--radius-full)",
                    }}
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-6">
              <h2 className="text-lg font-semibold" style={{ color: "var(--color-primary)" }}>Description</h2>
              <div
                className="mt-2 text-sm leading-relaxed whitespace-pre-line"
                style={{ color: "var(--color-text-secondary)" }}
              >
                {job.description}
              </div>
            </div>

            <div className="mt-6">
              <a
                href={job.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block rounded-lg px-6 py-2.5 text-sm font-semibold"
                style={{
                  background: "var(--color-accent)",
                  color: "var(--color-text-inverse)",
                  borderRadius: "var(--radius-md)",
                }}
              >
                Apply Externally
              </a>
            </div>
          </div>
        </div>

        {/* Match sidebar */}
        <div className="space-y-6">
          {/* Score card */}
          <div
            className="rounded-xl border p-6 text-center"
            style={{
              background: "var(--color-surface)",
              borderColor: "var(--color-border)",
              boxShadow: "var(--shadow-sm)",
              borderRadius: "var(--radius-lg)",
            }}
          >
            <p className="text-sm font-medium" style={{ color: "var(--color-text-muted)" }}>Match Score</p>
            <p className="mt-2 text-5xl font-bold" style={{ color: "var(--color-primary)" }}>
              {match.score}
            </p>
            <p className="mt-1 text-sm" style={{ color: "var(--color-text-muted)" }}>out of 100</p>
            <div className="mt-3">
              <span
                className="inline-block rounded-full px-4 py-1 text-sm font-semibold"
                style={{
                  background: recStyle.bg,
                  color: recStyle.text,
                  borderRadius: "var(--radius-full)",
                }}
              >
                {match.recommendation}
              </span>
            </div>
          </div>

          {/* Fit reasons */}
          {match.reasonsFit.length > 0 && (
            <div
              className="rounded-xl border p-6"
              style={{
                background: "var(--color-surface)",
                borderColor: "var(--color-border)",
                boxShadow: "var(--shadow-sm)",
                borderRadius: "var(--radius-lg)",
              }}
            >
              <h3 className="text-sm font-semibold" style={{ color: "var(--color-success)" }}>Why You Fit</h3>
              <ul className="mt-3 space-y-2">
                {match.reasonsFit.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                    <span
                      className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ background: "var(--color-success)" }}
                    />
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Gaps */}
          {match.gaps.length > 0 && (
            <div
              className="rounded-xl border p-6"
              style={{
                background: "var(--color-surface)",
                borderColor: "var(--color-border)",
                boxShadow: "var(--shadow-sm)",
                borderRadius: "var(--radius-lg)",
              }}
            >
              <h3 className="text-sm font-semibold" style={{ color: "var(--color-risk)" }}>Gaps / Risks</h3>
              <ul className="mt-3 space-y-2">
                {match.gaps.map((g, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                    <span
                      className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ background: "var(--color-risk)" }}
                    />
                    {g}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function JobDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <div
            className="h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"
            style={{ borderColor: "var(--color-accent)", borderTopColor: "transparent" }}
          />
        </div>
      }
    >
      <JobDetailContent />
    </Suspense>
  );
}
