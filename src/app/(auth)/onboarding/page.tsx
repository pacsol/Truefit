"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { createDocument, collections } from "@/lib/firebase/firestore";
import type { Seniority } from "@/types";

const SENIORITY_OPTIONS: Seniority[] = [
  "junior",
  "mid",
  "senior",
  "lead",
  "executive",
];

export default function OnboardingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [skills, setSkills] = useState("");
  const [seniority, setSeniority] = useState<Seniority>("mid");
  const [location, setLocation] = useState("");
  const [geoRadiusKm, setGeoRadiusKm] = useState(50);
  const [constraints, setConstraints] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: "var(--color-bg)" }}>
        <div
          className="h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"
          style={{ borderColor: "var(--color-accent)", borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (!user) {
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      await createDocument(collections.profiles, user!.uid, {
        userId: user!.uid,
        skills: skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        seniority,
        location,
        geoRadiusKm,
        constraints: constraints
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      });
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4"
      style={{ background: "var(--color-bg)" }}
    >
      <div
        className="w-full max-w-lg space-y-8 p-8"
        style={{
          background: "var(--color-surface)",
          boxShadow: "var(--shadow-lg)",
          borderRadius: "var(--radius-xl)",
        }}
      >
        <div className="text-center">
          <div
            className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full"
            style={{ background: "var(--color-accent-light)", color: "var(--color-accent)" }}
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ color: "var(--color-primary)" }}
          >
            Set Up Your Profile
          </h1>
          <p className="mt-2 text-sm" style={{ color: "var(--color-text-muted)" }}>
            Tell us about yourself so we can find the best jobs for you.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="skills" className="block text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>
              Skills (comma-separated)
            </label>
            <input
              id="skills"
              type="text"
              required
              placeholder="React, TypeScript, Node.js, AWS"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              className="mt-1 block w-full border px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
              style={{
                borderColor: "var(--color-border)",
                borderRadius: "var(--radius-md)",
                color: "var(--color-text-primary)",
              }}
            />
          </div>

          <div>
            <label htmlFor="seniority" className="block text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>
              Seniority Level
            </label>
            <select
              id="seniority"
              value={seniority}
              onChange={(e) => setSeniority(e.target.value as Seniority)}
              className="mt-1 block w-full border px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
              style={{
                borderColor: "var(--color-border)",
                borderRadius: "var(--radius-md)",
                color: "var(--color-text-primary)",
              }}
            >
              {SENIORITY_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="location" className="block text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>
              Location
            </label>
            <input
              id="location"
              type="text"
              required
              placeholder="London, UK"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="mt-1 block w-full border px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
              style={{
                borderColor: "var(--color-border)",
                borderRadius: "var(--radius-md)",
                color: "var(--color-text-primary)",
              }}
            />
          </div>

          <div>
            <label htmlFor="radius" className="block text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>
              Search Radius (km)
            </label>
            <input
              id="radius"
              type="number"
              min={1}
              max={500}
              value={geoRadiusKm}
              onChange={(e) => setGeoRadiusKm(Number(e.target.value))}
              className="mt-1 block w-full border px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
              style={{
                borderColor: "var(--color-border)",
                borderRadius: "var(--radius-md)",
                color: "var(--color-text-primary)",
              }}
            />
          </div>

          <div>
            <label htmlFor="constraints" className="block text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>
              Constraints (comma-separated, optional)
            </label>
            <input
              id="constraints"
              type="text"
              placeholder="remote-only, visa-sponsorship"
              value={constraints}
              onChange={(e) => setConstraints(e.target.value)}
              className="mt-1 block w-full border px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
              style={{
                borderColor: "var(--color-border)",
                borderRadius: "var(--radius-md)",
                color: "var(--color-text-primary)",
              }}
            />
          </div>

          {error && (
            <p className="text-sm font-medium" style={{ color: "var(--color-risk)" }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 text-sm font-semibold transition-opacity disabled:opacity-50"
            style={{
              background: "var(--color-accent)",
              color: "var(--color-text-inverse)",
              borderRadius: "var(--radius-md)",
            }}
          >
            {saving ? "Saving\u2026" : "Save & Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}
