"use client";

import { useState, useEffect } from "react";
import { useProfile } from "@/components/useProfile";
import { signOut } from "@/lib/firebase/auth";
import { useRouter } from "next/navigation";
import {
  updateDocument,
  createDocument,
  queryDocuments,
  deleteDocument,
  collections,
  where,
} from "@/lib/firebase/firestore";
import type { Seniority, JobSearch } from "@/types";
import { fetchWithAuth } from "@/lib/api/fetchWithAuth";

const SENIORITY_OPTIONS: Seniority[] = [
  "junior",
  "mid",
  "senior",
  "lead",
  "executive",
];

export default function SettingsPage() {
  const { profile, loading, user } = useProfile();
  const router = useRouter();

  const [skills, setSkills] = useState("");
  const [seniority, setSeniority] = useState<Seniority>("mid");
  const [location, setLocation] = useState("");
  const [geoRadiusKm, setGeoRadiusKm] = useState(50);
  const [constraints, setConstraints] = useState("");
  const [saving, setSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState("");

  const [savedSearches, setSavedSearches] = useState<(JobSearch & { id: string })[]>([]);
  const [newSearchQuery, setNewSearchQuery] = useState("");
  const [newSearchLocation, setNewSearchLocation] = useState("");
  const [newSearchRadius, setNewSearchRadius] = useState(50);
  const [newSearchFreshness, setNewSearchFreshness] = useState(14);
  const [savingSearch, setSavingSearch] = useState(false);

  const [digestEnabled, setDigestEnabled] = useState(true);
  const [digestTopN, setDigestTopN] = useState(10);
  const [digestRunning, setDigestRunning] = useState(false);
  const [digestMsg, setDigestMsg] = useState("");

  useEffect(() => {
    if (profile) {
      setSkills(profile.skills.join(", "));
      setSeniority(profile.seniority);
      setLocation(profile.location);
      setGeoRadiusKm(profile.geoRadiusKm);
      setConstraints(profile.constraints.join(", "));
    }
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    queryDocuments<JobSearch>(
      collections.jobSearches,
      where("userId", "==", user.uid)
    ).then(setSavedSearches).catch(() => {});
  }, [user]);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setProfileMsg("");
    try {
      await updateDocument(collections.profiles, user.uid, {
        skills: skills.split(",").map((s) => s.trim()).filter(Boolean),
        seniority,
        location,
        geoRadiusKm,
        constraints: constraints.split(",").map((s) => s.trim()).filter(Boolean),
      });
      setProfileMsg("Profile saved.");
    } catch {
      setProfileMsg("Failed to save profile.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSavingSearch(true);
    try {
      const id = crypto.randomUUID();
      await createDocument(collections.jobSearches, id, {
        userId: user.uid,
        query: newSearchQuery,
        location: newSearchLocation || location,
        radiusKm: newSearchRadius,
        freshnessDays: newSearchFreshness,
      });
      setSavedSearches((prev) => [
        ...prev,
        {
          id,
          userId: user.uid,
          query: newSearchQuery,
          location: newSearchLocation || location,
          radiusKm: newSearchRadius,
          freshnessDays: newSearchFreshness,
        } as unknown as JobSearch & { id: string },
      ]);
      setNewSearchQuery("");
      setNewSearchLocation("");
    } catch {
      // silent
    } finally {
      setSavingSearch(false);
    }
  }

  async function handleDeleteSearch(id: string) {
    try {
      await deleteDocument(collections.jobSearches, id);
      setSavedSearches((prev) => prev.filter((s) => s.id !== id));
    } catch {
      // silent — keep the item in the list so user can retry
    }
  }

  async function handleRunDigest() {
    if (!user || !profile || savedSearches.length === 0) return;
    setDigestRunning(true);
    setDigestMsg("");
    try {
      const res = await fetchWithAuth("/api/digest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          email: user.email,
          displayName: user.displayName,
          profile,
          searches: savedSearches,
          topN: digestTopN,
          sendEmail: digestEnabled,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Digest failed");
      setDigestMsg(
        `Digest complete: ${data.matches?.length ?? 0} matches found${data.emailSent ? ", email sent" : ""}.`
      );
    } catch (err: unknown) {
      setDigestMsg(err instanceof Error ? err.message : "Digest failed");
    } finally {
      setDigestRunning(false);
    }
  }

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div
          className="h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"
          style={{ borderColor: "var(--color-accent)", borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  const cardStyle = {
    background: "var(--color-surface)",
    borderColor: "var(--color-border)",
    boxShadow: "var(--shadow-sm)",
    borderRadius: "var(--radius-lg)",
  };

  const inputStyle = {
    borderColor: "var(--color-border)",
    borderRadius: "var(--radius-md)",
    color: "var(--color-text-primary)",
  };

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      {/* Profile */}
      <section>
        <h2 className="text-2xl font-bold tracking-tight" style={{ color: "var(--color-primary)" }}>Profile</h2>
        <form onSubmit={handleSaveProfile} className="mt-4 space-y-4 rounded-xl border p-6" style={cardStyle}>
          <div>
            <label htmlFor="skills" className="block text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>Skills (comma-separated)</label>
            <input id="skills" type="text" value={skills} onChange={(e) => setSkills(e.target.value)}
              className="mt-1 block w-full border px-3 py-2.5 text-sm focus:outline-none focus:ring-2" style={inputStyle} />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label htmlFor="seniority" className="block text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>Seniority</label>
              <select id="seniority" value={seniority} onChange={(e) => setSeniority(e.target.value as Seniority)}
                className="mt-1 block w-full border px-3 py-2.5 text-sm focus:outline-none focus:ring-2" style={inputStyle}>
                {SENIORITY_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="settingsLocation" className="block text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>Location</label>
              <input id="settingsLocation" type="text" value={location} onChange={(e) => setLocation(e.target.value)}
                className="mt-1 block w-full border px-3 py-2.5 text-sm focus:outline-none focus:ring-2" style={inputStyle} />
            </div>
            <div>
              <label htmlFor="settingsRadius" className="block text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>Radius (km)</label>
              <input id="settingsRadius" type="number" min={1} max={500} value={geoRadiusKm} onChange={(e) => setGeoRadiusKm(Number(e.target.value))}
                className="mt-1 block w-full border px-3 py-2.5 text-sm focus:outline-none focus:ring-2" style={inputStyle} />
            </div>
          </div>
          <div>
            <label htmlFor="settingsConstraints" className="block text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>Constraints (comma-separated, optional)</label>
            <input id="settingsConstraints" type="text" value={constraints} onChange={(e) => setConstraints(e.target.value)}
              className="mt-1 block w-full border px-3 py-2.5 text-sm focus:outline-none focus:ring-2" style={inputStyle} />
          </div>
          <div className="flex items-center gap-4">
            <button type="submit" disabled={saving}
              className="rounded-lg px-6 py-2.5 text-sm font-semibold transition-opacity disabled:opacity-50"
              style={{ background: "var(--color-accent)", color: "var(--color-text-inverse)", borderRadius: "var(--radius-md)" }}>
              {saving ? "Saving\u2026" : "Save Profile"}
            </button>
            {profileMsg && <p className="text-sm font-medium" style={{ color: "var(--color-success)" }}>{profileMsg}</p>}
          </div>
        </form>
      </section>

      {/* Saved Searches */}
      <section>
        <h2 className="text-2xl font-bold tracking-tight" style={{ color: "var(--color-primary)" }}>Saved Searches</h2>
        {savedSearches.length > 0 && (
          <div className="mt-4 space-y-2">
            {savedSearches.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg border px-4 py-3"
                style={{ background: "var(--color-surface)", borderColor: "var(--color-border)", borderRadius: "var(--radius-md)" }}>
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--color-primary)" }}>{s.query}</p>
                  <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                    {s.location} &middot; {s.radiusKm}km &middot; last {s.freshnessDays}d
                  </p>
                </div>
                <button onClick={() => handleDeleteSearch(s.id)} className="text-sm font-medium" style={{ color: "var(--color-risk)" }}>
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
        <form onSubmit={handleAddSearch} className="mt-4 rounded-xl border p-6" style={cardStyle}>
          <h3 className="text-sm font-semibold" style={{ color: "var(--color-text-secondary)" }}>Add New Search</h3>
          <div className="mt-3 grid gap-4 md:grid-cols-4">
            <div className="md:col-span-2">
              <input type="text" required placeholder="Keywords (e.g. React, Python)" value={newSearchQuery} onChange={(e) => setNewSearchQuery(e.target.value)}
                className="block w-full border px-3 py-2.5 text-sm focus:outline-none focus:ring-2" style={inputStyle} />
            </div>
            <div>
              <input type="text" placeholder={location || "Location"} value={newSearchLocation} onChange={(e) => setNewSearchLocation(e.target.value)}
                className="block w-full border px-3 py-2.5 text-sm focus:outline-none focus:ring-2" style={inputStyle} />
            </div>
            <div className="flex gap-2">
              <input type="number" min={1} max={500} title="Radius (km)" value={newSearchRadius} onChange={(e) => setNewSearchRadius(Number(e.target.value))}
                className="block w-20 border px-2 py-2.5 text-sm focus:outline-none focus:ring-2" style={inputStyle} />
              <input type="number" min={1} max={90} title="Freshness (days)" value={newSearchFreshness} onChange={(e) => setNewSearchFreshness(Number(e.target.value))}
                className="block w-16 border px-2 py-2.5 text-sm focus:outline-none focus:ring-2" style={inputStyle} />
            </div>
          </div>
          <button type="submit" disabled={savingSearch}
            className="mt-3 rounded-lg px-5 py-2.5 text-sm font-semibold transition-opacity disabled:opacity-50"
            style={{ background: "var(--color-accent)", color: "var(--color-text-inverse)", borderRadius: "var(--radius-md)" }}>
            {savingSearch ? "Saving\u2026" : "Add Search"}
          </button>
        </form>
      </section>

      {/* Daily Digest */}
      <section>
        <h2 className="text-2xl font-bold tracking-tight" style={{ color: "var(--color-primary)" }}>Daily Digest</h2>
        <div className="mt-4 rounded-xl border p-6 space-y-4" style={cardStyle}>
          <label className="flex items-center gap-3">
            <input type="checkbox" checked={digestEnabled} onChange={(e) => setDigestEnabled(e.target.checked)}
              className="h-4 w-4 rounded" style={{ accentColor: "var(--color-accent)" }} />
            <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>Send daily digest email</span>
          </label>
          <div className="flex items-center gap-4">
            <label htmlFor="digestTopN" className="text-sm" style={{ color: "var(--color-text-secondary)" }}>Top matches per digest:</label>
            <input id="digestTopN" type="number" min={1} max={50} value={digestTopN} onChange={(e) => setDigestTopN(Number(e.target.value))}
              className="w-20 border px-2 py-1.5 text-sm focus:outline-none focus:ring-2" style={inputStyle} />
          </div>
          <div className="flex items-center gap-4">
            <button onClick={handleRunDigest} disabled={digestRunning || savedSearches.length === 0}
              className="rounded-lg px-5 py-2.5 text-sm font-semibold transition-opacity disabled:opacity-50"
              style={{ background: "var(--color-accent)", color: "var(--color-text-inverse)", borderRadius: "var(--radius-md)" }}>
              {digestRunning ? "Running\u2026" : "Run Digest Now"}
            </button>
            {savedSearches.length === 0 && (
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Add at least one saved search first.</p>
            )}
          </div>
          {digestMsg && <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>{digestMsg}</p>}
        </div>
      </section>

      {/* Account */}
      <section>
        <h2 className="text-2xl font-bold tracking-tight" style={{ color: "var(--color-primary)" }}>Account</h2>
        <div className="mt-4 rounded-xl border p-6" style={cardStyle}>
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            Signed in as <strong style={{ color: "var(--color-primary)" }}>{user?.email}</strong>
          </p>
          <button onClick={handleSignOut}
            className="mt-4 rounded-lg border px-5 py-2.5 text-sm font-semibold transition-colors"
            style={{ borderColor: "var(--color-risk)", color: "var(--color-risk)", borderRadius: "var(--radius-md)" }}>
            Sign Out
          </button>
        </div>
      </section>
    </div>
  );
}
