"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useProfile } from "@/components/useProfile";
import {
  queryDocuments,
  collections,
  where,
} from "@/lib/firebase/firestore";
import type { JobSearch, Recommendation } from "@/types";
import { fetchWithAuth } from "@/lib/api/fetchWithAuth";

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

interface ScoredJob {
  job: NormalizedJob;
  match: MatchResult;
}

export default function JobsPage() {
  const { profile, loading: profileLoading, user } = useProfile();
  const [savedSearches, setSavedSearches] = useState<(JobSearch & { id: string })[]>([]);
  const [scoredJobs, setScoredJobs] = useState<ScoredJob[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");

  // Quick-search state
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [radiusKm, setRadiusKm] = useState(50);

  // Load saved searches
  useEffect(() => {
    if (!user) return;
    queryDocuments<JobSearch>(
      collections.jobSearches,
      where("userId", "==", user.uid)
    ).then(setSavedSearches).catch(() => {});
  }, [user]);

  // Pre-fill from profile
  useEffect(() => {
    if (profile) {
      setLocation(profile.location);
      setRadiusKm(profile.geoRadiusKm);
      setQuery(profile.skills.slice(0, 3).join(", "));
    }
  }, [profile]);

  async function searchAndScore(params: {
    query: string;
    location: string;
    radiusKm: number;
    freshnessDays: number;
  }) {
    setError("");
    setSearching(true);
    setScoredJobs([]);
    try {
      const searchRes = await fetchWithAuth("/api/jobs/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      const searchData = await searchRes.json();
      if (!searchRes.ok) throw new Error(searchData.error || "Search failed");

      if (!searchData.jobs?.length) {
        setScoredJobs([]);
        return;
      }

      if (profile) {
        const matchRes = await fetchWithAuth("/api/jobs/match-bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profile, jobs: searchData.jobs }),
        });
        const matchData = await matchRes.json();
        if (matchRes.ok && matchData.matches) {
          setScoredJobs(matchData.matches);
          return;
        }
      }

      setScoredJobs(
        searchData.jobs.map((job: NormalizedJob) => ({
          job,
          match: { score: 0, reasonsFit: [], gaps: [], recommendation: "MAYBE" as const },
        }))
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setSearching(false);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    searchAndScore({ query, location, radiusKm, freshnessDays: 14 });
  }

  function runSavedSearch(search: JobSearch) {
    setQuery(search.query);
    setLocation(search.location);
    setRadiusKm(search.radiusKm);
    searchAndScore({
      query: search.query,
      location: search.location,
      radiusKm: search.radiusKm,
      freshnessDays: search.freshnessDays,
    });
  }

  if (profileLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div
          className="h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"
          style={{ borderColor: "var(--color-accent)", borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight" style={{ color: "var(--color-primary)" }}>
          Job Search
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--color-text-muted)" }}>
          Find and score jobs against your profile
        </p>
      </div>

      {/* Saved searches */}
      {savedSearches.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>Saved:</span>
          {savedSearches.map((s) => (
            <button
              key={s.id}
              onClick={() => runSavedSearch(s)}
              className="rounded-full border px-3 py-1 text-sm font-medium transition-colors"
              style={{
                borderColor: "var(--color-accent-mid)",
                background: "var(--color-accent-light)",
                color: "var(--color-accent)",
                borderRadius: "var(--radius-full)",
              }}
            >
              {s.query} — {s.location}
            </button>
          ))}
        </div>
      )}

      {/* Search form */}
      <form
        onSubmit={handleSearch}
        className="rounded-xl border p-6"
        style={{
          background: "var(--color-surface)",
          borderColor: "var(--color-border)",
          boxShadow: "var(--shadow-sm)",
          borderRadius: "var(--radius-lg)",
        }}
      >
        <div className="grid gap-4 md:grid-cols-4">
          <div className="md:col-span-2">
            <label htmlFor="query" className="block text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>
              Keywords / Skills
            </label>
            <input
              id="query"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="React, TypeScript, Node.js"
              className="mt-1 block w-full border px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
              style={{
                borderColor: "var(--color-border)",
                borderRadius: "var(--radius-md)",
                color: "var(--color-text-primary)",
              }}
            />
          </div>
          <div>
            <label htmlFor="searchLocation" className="block text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>
              Location
            </label>
            <input
              id="searchLocation"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="London, UK"
              className="mt-1 block w-full border px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
              style={{
                borderColor: "var(--color-border)",
                borderRadius: "var(--radius-md)",
                color: "var(--color-text-primary)",
              }}
            />
          </div>
          <div>
            <label htmlFor="searchRadius" className="block text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>
              Radius (km)
            </label>
            <input
              id="searchRadius"
              type="number"
              min={1}
              max={500}
              value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value))}
              className="mt-1 block w-full border px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
              style={{
                borderColor: "var(--color-border)",
                borderRadius: "var(--radius-md)",
                color: "var(--color-text-primary)",
              }}
            />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-4">
          <button
            type="submit"
            disabled={searching}
            className="rounded-lg px-6 py-2.5 text-sm font-semibold transition-opacity disabled:opacity-50"
            style={{
              background: "var(--color-accent)",
              color: "var(--color-text-inverse)",
              borderRadius: "var(--radius-md)",
            }}
          >
            {searching ? "Searching\u2026" : "Search Jobs"}
          </button>
          {error && <p className="text-sm font-medium" style={{ color: "var(--color-risk)" }}>{error}</p>}
        </div>
      </form>

      {/* Results */}
      <div>
        {scoredJobs.length > 0 && (
          <p className="mb-4 text-sm" style={{ color: "var(--color-text-muted)" }}>
            {scoredJobs.length} jobs found, ranked by match score
          </p>
        )}
        <div className="space-y-4">
          {scoredJobs.map(({ job, match }) => (
            <JobCard key={job.externalId} job={job} match={match} />
          ))}
        </div>
        {!searching && scoredJobs.length === 0 && (
          <div className="py-16 text-center">
            <svg className="mx-auto h-12 w-12" style={{ color: "var(--color-border-strong)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <p className="mt-4 text-sm" style={{ color: "var(--color-text-muted)" }}>
              Search for jobs to see scored results here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

const REC_STYLES: Record<Recommendation, { bg: string; text: string }> = {
  APPLY: { bg: "var(--color-success)", text: "var(--color-text-inverse)" },
  MAYBE: { bg: "var(--color-warning)", text: "var(--color-text-inverse)" },
  SKIP: { bg: "var(--color-risk)", text: "var(--color-text-inverse)" },
};

function ScoreBadge({ score }: { score: number }) {
  let bg = "var(--color-risk)";
  if (score >= 70) bg = "var(--color-success)";
  else if (score >= 40) bg = "var(--color-warning)";

  return (
    <span
      className="inline-flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold"
      style={{ background: bg, color: "var(--color-text-inverse)", borderRadius: "var(--radius-full)" }}
    >
      {score}
    </span>
  );
}

function JobCard({ job, match }: { job: NormalizedJob; match: MatchResult }) {
  const postedDate = new Date(job.postedAt.seconds * 1000);
  const daysAgo = Math.floor(
    (Date.now() - postedDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  const detailHref = `/jobs/detail?id=${encodeURIComponent(job.externalId)}`;

  const recStyle = REC_STYLES[match.recommendation];

  return (
    <div
      className="rounded-xl border p-6 transition-all"
      style={{
        background: "var(--color-surface)",
        borderColor: "var(--color-border)",
        boxShadow: "var(--shadow-sm)",
        borderRadius: "var(--radius-lg)",
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <ScoreBadge score={match.score} />
            <span
              className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
              style={{
                background: recStyle.bg,
                color: recStyle.text,
                borderRadius: "var(--radius-full)",
              }}
            >
              {match.recommendation}
            </span>
          </div>
          <h3 className="mt-3 text-lg font-semibold" style={{ color: "var(--color-primary)" }}>
            {job.title}
          </h3>
          <p className="mt-1 text-sm" style={{ color: "var(--color-text-muted)" }}>
            {job.company} &middot; {job.location}
          </p>
        </div>
        <span
          className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium"
          style={{
            background: "var(--color-secondary-light)",
            color: "var(--color-secondary)",
            borderRadius: "var(--radius-full)",
          }}
        >
          {daysAgo === 0 ? "Today" : `${daysAgo}d ago`}
        </span>
      </div>

      {job.skills.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {job.skills.slice(0, 8).map((s) => (
            <span
              key={s}
              className="rounded-full px-2 py-0.5 text-xs font-medium"
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

      {match.reasonsFit.length > 0 && (
        <p className="mt-3 text-xs font-medium" style={{ color: "var(--color-success)" }}>
          Fit: {match.reasonsFit.slice(0, 2).join(" | ")}
        </p>
      )}

      <p className="mt-2 text-sm line-clamp-2" style={{ color: "var(--color-text-muted)" }}>
        {job.description}
      </p>

      <div className="mt-4 flex gap-3">
        <Link
          href={detailHref}
          onClick={() => {
            try { sessionStorage.setItem(`job_${job.externalId}`, JSON.stringify({ job, match })); } catch {}
          }}
          className="rounded-lg px-4 py-2 text-sm font-medium transition-opacity"
          style={{
            background: "var(--color-accent)",
            color: "var(--color-text-inverse)",
            borderRadius: "var(--radius-md)",
          }}
        >
          View Details
        </Link>
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
          style={{
            borderColor: "var(--color-border)",
            color: "var(--color-text-secondary)",
            borderRadius: "var(--radius-md)",
          }}
        >
          Apply Externally
        </a>
      </div>
    </div>
  );
}
