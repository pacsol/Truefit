"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useProfile } from "@/components/useProfile";
import Link from "next/link";

export default function DashboardPage() {
  const { profile, loading, user } = useProfile();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user && !profile) {
      router.replace("/onboarding");
    }
  }, [loading, user, profile, router]);

  if (loading || !profile) {
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
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight" style={{ color: "var(--color-primary)" }}>
          Dashboard
        </h1>
        <p className="mt-2 text-sm" style={{ color: "var(--color-text-muted)" }}>
          Welcome back, {profile.skills.length > 0
            ? `${profile.seniority} developer`
            : "job seeker"}. Your daily job matches will appear here.
        </p>
      </div>

      {/* Profile summary card */}
      <div
        className="rounded-xl border p-5"
        style={{
          background: "var(--color-accent-light)",
          borderColor: "var(--color-accent-mid)",
          borderRadius: "var(--radius-lg)",
        }}
      >
        <div className="flex items-start gap-4">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
            style={{ background: "var(--color-accent)", color: "var(--color-text-inverse)" }}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--color-primary)" }}>
              {profile.seniority.charAt(0).toUpperCase() + profile.seniority.slice(1)} &middot; {profile.location} &middot; {profile.geoRadiusKm}km radius
            </p>
            <p className="mt-1 text-sm" style={{ color: "var(--color-text-secondary)" }}>
              <span className="font-medium">Skills:</span> {profile.skills.join(", ") || "None set"}
            </p>
          </div>
        </div>
      </div>

      {/* Quick-action cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <DashboardCard
          title="Job Matches"
          description="Search and view AI-scored job matches"
          href="/jobs"
          icon={
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          }
        />
        <DashboardCard
          title="CV Lab"
          description="Upload, analyze, and optimize your resume"
          href="/cv-lab"
          icon={
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
        />
        <DashboardCard
          title="Settings"
          description="Manage profile, searches, and digest"
          href="/settings"
          icon={
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
        />
      </div>
    </div>
  );
}

function DashboardCard({
  title,
  description,
  href,
  icon,
}: {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group block rounded-xl border p-6 transition-all"
      style={{
        background: "var(--color-surface)",
        borderColor: "var(--color-border)",
        boxShadow: "var(--shadow-sm)",
        borderRadius: "var(--radius-lg)",
      }}
    >
      <div
        className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg"
        style={{ background: "var(--color-secondary-light)", color: "var(--color-secondary)" }}
      >
        {icon}
      </div>
      <h3 className="text-lg font-semibold" style={{ color: "var(--color-primary)" }}>
        {title}
      </h3>
      <p className="mt-1 text-sm" style={{ color: "var(--color-text-muted)" }}>
        {description}
      </p>
    </Link>
  );
}
