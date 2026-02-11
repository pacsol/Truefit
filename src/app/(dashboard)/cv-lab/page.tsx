"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { fetchWithAuth } from "@/lib/api/fetchWithAuth";

interface ParsedSection {
  heading: string;
  content: string;
}

interface AtsResult {
  score: number;
  keywordCoverage: number;
  sectionIntegrity: number;
  risks: string[];
}

type Tab = "upload" | "parsed" | "generate" | "ats";

export default function CvLabPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("upload");

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [filename, setFilename] = useState("");
  const [rawText, setRawText] = useState("");
  const [sections, setSections] = useState<ParsedSection[]>([]);
  const [skills, setSkills] = useState<string[]>([]);

  // Generate state
  const [jobTitle, setJobTitle] = useState("");
  const [jobCompany, setJobCompany] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [jobSkills, setJobSkills] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatedCV, setGeneratedCV] = useState("");
  const [genError, setGenError] = useState("");

  // ATS state
  const [scoring, setScoring] = useState(false);
  const [atsResult, setAtsResult] = useState<AtsResult | null>(null);
  const [atsError, setAtsError] = useState("");
  const [atsTarget, setAtsTarget] = useState<"original" | "generated">("original");

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError("");
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("resume", file);
      const res = await fetchWithAuth("/api/resume/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setFilename(data.filename);
      setRawText(data.rawText);
      setSections(data.sections);
      setSkills(data.skills);
      setTab("parsed");
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!rawText) return;
    setGenError("");
    setGenerating(true);
    try {
      const res = await fetchWithAuth("/api/resume/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parsedSections: sections,
          rawText,
          skills,
          jobTitle,
          jobCompany,
          jobDescription,
          jobSkills: jobSkills.split(",").map((s) => s.trim()).filter(Boolean),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      setGeneratedCV(data.content);
      setTab("ats");
    } catch (err: unknown) {
      setGenError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  async function handleAtsScore() {
    const text = atsTarget === "generated" && generatedCV ? generatedCV : rawText;
    if (!text) return;
    setAtsError("");
    setScoring(true);
    try {
      const keywords = jobSkills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const res = await fetchWithAuth("/api/ats/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cvText: text, jobKeywords: keywords }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Scoring failed");
      setAtsResult(data);
    } catch (err: unknown) {
      setAtsError(err instanceof Error ? err.message : "Scoring failed");
    } finally {
      setScoring(false);
    }
  }

  const tabs: { key: Tab; label: string; enabled: boolean }[] = [
    { key: "upload", label: "Upload", enabled: true },
    { key: "parsed", label: "Parsed CV", enabled: !!rawText },
    { key: "generate", label: "Generate", enabled: !!rawText },
    { key: "ats", label: "ATS Score", enabled: !!rawText },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight" style={{ color: "var(--color-primary)" }}>
          CV Lab
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--color-text-muted)" }}>
          Upload, analyze, and optimize your resume.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b" style={{ borderColor: "var(--color-border)" }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            disabled={!t.enabled}
            onClick={() => setTab(t.key)}
            className="px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors"
            style={{
              borderColor: tab === t.key ? "var(--color-accent)" : "transparent",
              color: tab === t.key
                ? "var(--color-accent)"
                : t.enabled
                  ? "var(--color-text-muted)"
                  : "var(--color-border-strong)",
              cursor: t.enabled ? "pointer" : "not-allowed",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div>
        {/* Upload Tab */}
        {tab === "upload" && (
          <div
            className="rounded-xl border p-8"
            style={{
              background: "var(--color-surface)",
              borderColor: "var(--color-border)",
              boxShadow: "var(--shadow-sm)",
              borderRadius: "var(--radius-lg)",
            }}
          >
            <h3 className="text-lg font-semibold" style={{ color: "var(--color-primary)" }}>Upload Resume</h3>
            <p className="mt-1 text-sm" style={{ color: "var(--color-text-muted)" }}>
              Supported formats: PDF, DOCX, TXT (max 5 MB)
            </p>
            <div className="mt-6">
              <label
                className="flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed p-12 transition-colors"
                style={{ borderColor: "var(--color-border-strong)", borderRadius: "var(--radius-lg)" }}
              >
                <svg className="h-10 w-10" style={{ color: "var(--color-text-muted)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 16V4m0 0l-4 4m4-4l4 4M4 20h16" />
                </svg>
                <span className="mt-3 text-sm" style={{ color: "var(--color-text-muted)" }}>
                  {uploading ? "Uploading\u2026" : filename ? `Uploaded: ${filename}` : "Click to upload or drag and drop"}
                </span>
                <input
                  type="file"
                  accept=".pdf,.docx,.txt"
                  onChange={handleUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
            </div>
            {uploadError && <p className="mt-4 text-sm font-medium" style={{ color: "var(--color-risk)" }}>{uploadError}</p>}
            {filename && (
              <div
                className="mt-4 rounded-lg p-3"
                style={{ background: "var(--color-accent-light)", borderRadius: "var(--radius-md)" }}
              >
                <p className="text-sm" style={{ color: "var(--color-accent)" }}>
                  Parsed <strong>{filename}</strong> — {sections.length} sections, {skills.length} skills detected.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Parsed Tab */}
        {tab === "parsed" && rawText && (
          <div className="space-y-6">
            <div
              className="rounded-xl border p-6"
              style={{
                background: "var(--color-surface)",
                borderColor: "var(--color-border)",
                boxShadow: "var(--shadow-sm)",
                borderRadius: "var(--radius-lg)",
              }}
            >
              <h3 className="text-sm font-semibold" style={{ color: "var(--color-text-secondary)" }}>Detected Skills</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {skills.length > 0 ? skills.map((s) => (
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
                )) : (
                  <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>No known skills detected</p>
                )}
              </div>
            </div>

            {sections.map((s, i) => (
              <div
                key={i}
                className="rounded-xl border p-6"
                style={{
                  background: "var(--color-surface)",
                  borderColor: "var(--color-border)",
                  boxShadow: "var(--shadow-sm)",
                  borderRadius: "var(--radius-lg)",
                }}
              >
                <h3 className="text-sm font-semibold" style={{ color: "var(--color-text-secondary)" }}>{s.heading}</h3>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
                  {s.content}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Generate Tab */}
        {tab === "generate" && rawText && (
          <div className="space-y-6">
            <form
              onSubmit={handleGenerate}
              className="rounded-xl border p-6 space-y-4"
              style={{
                background: "var(--color-surface)",
                borderColor: "var(--color-border)",
                boxShadow: "var(--shadow-sm)",
                borderRadius: "var(--radius-lg)",
              }}
            >
              <h3 className="text-lg font-semibold" style={{ color: "var(--color-primary)" }}>Generate Job-Specific CV</h3>
              <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                Enter the target job details. Gemini will rewrite your CV to emphasize relevant experience.
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="jobTitle" className="block text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>Job Title</label>
                  <input
                    id="jobTitle"
                    type="text"
                    required
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="Senior Frontend Engineer"
                    className="mt-1 block w-full border px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
                    style={{ borderColor: "var(--color-border)", borderRadius: "var(--radius-md)", color: "var(--color-text-primary)" }}
                  />
                </div>
                <div>
                  <label htmlFor="jobCompany" className="block text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>Company</label>
                  <input
                    id="jobCompany"
                    type="text"
                    value={jobCompany}
                    onChange={(e) => setJobCompany(e.target.value)}
                    placeholder="Acme Corp"
                    className="mt-1 block w-full border px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
                    style={{ borderColor: "var(--color-border)", borderRadius: "var(--radius-md)", color: "var(--color-text-primary)" }}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="jobSkillsInput" className="block text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>
                  Required Skills (comma-separated)
                </label>
                <input
                  id="jobSkillsInput"
                  type="text"
                  value={jobSkills}
                  onChange={(e) => setJobSkills(e.target.value)}
                  placeholder="React, TypeScript, Node.js, AWS"
                  className="mt-1 block w-full border px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
                  style={{ borderColor: "var(--color-border)", borderRadius: "var(--radius-md)", color: "var(--color-text-primary)" }}
                />
              </div>
              <div>
                <label htmlFor="jobDesc" className="block text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>Job Description</label>
                <textarea
                  id="jobDesc"
                  rows={4}
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste the job description here\u2026"
                  className="mt-1 block w-full border px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
                  style={{ borderColor: "var(--color-border)", borderRadius: "var(--radius-md)", color: "var(--color-text-primary)" }}
                />
              </div>
              <div className="flex items-center gap-4">
                <button
                  type="submit"
                  disabled={generating}
                  className="rounded-lg px-6 py-2.5 text-sm font-semibold transition-opacity disabled:opacity-50"
                  style={{ background: "var(--color-accent)", color: "var(--color-text-inverse)", borderRadius: "var(--radius-md)" }}
                >
                  {generating ? "Generating\u2026" : "Generate CV"}
                </button>
                {genError && <p className="text-sm font-medium" style={{ color: "var(--color-risk)" }}>{genError}</p>}
              </div>
            </form>

            {generatedCV && (
              <div
                className="rounded-xl border p-6"
                style={{
                  background: "var(--color-surface)",
                  borderColor: "var(--color-border)",
                  boxShadow: "var(--shadow-sm)",
                  borderRadius: "var(--radius-lg)",
                }}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold" style={{ color: "var(--color-primary)" }}>Generated CV</h3>
                  <button
                    onClick={() => navigator.clipboard.writeText(generatedCV)}
                    className="rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors"
                    style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)", borderRadius: "var(--radius-sm)" }}
                  >
                    Copy to Clipboard
                  </button>
                </div>
                <pre
                  className="mt-4 whitespace-pre-wrap text-sm leading-relaxed font-sans"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {generatedCV}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* ATS Tab */}
        {tab === "ats" && rawText && (
          <div className="space-y-6">
            <div
              className="rounded-xl border p-6"
              style={{
                background: "var(--color-surface)",
                borderColor: "var(--color-border)",
                boxShadow: "var(--shadow-sm)",
                borderRadius: "var(--radius-lg)",
              }}
            >
              <h3 className="text-lg font-semibold" style={{ color: "var(--color-primary)" }}>ATS Score Simulator</h3>
              <p className="mt-1 text-sm" style={{ color: "var(--color-text-muted)" }}>
                Simulated ATS check — not a real ATS, but models common parsing rules.
              </p>

              <div className="mt-4 flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                  <input type="radio" name="atsTarget" checked={atsTarget === "original"} onChange={() => setAtsTarget("original")}
                    style={{ accentColor: "var(--color-accent)" }} />
                  Original CV
                </label>
                {generatedCV && (
                  <label className="flex items-center gap-2 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                    <input type="radio" name="atsTarget" checked={atsTarget === "generated"} onChange={() => setAtsTarget("generated")}
                      style={{ accentColor: "var(--color-accent)" }} />
                    Generated CV
                  </label>
                )}
              </div>

              <div className="mt-4 flex items-center gap-4">
                <button
                  onClick={handleAtsScore}
                  disabled={scoring}
                  className="rounded-lg px-6 py-2.5 text-sm font-semibold transition-opacity disabled:opacity-50"
                  style={{ background: "var(--color-accent)", color: "var(--color-text-inverse)", borderRadius: "var(--radius-md)" }}
                >
                  {scoring ? "Scoring\u2026" : "Run ATS Check"}
                </button>
                {atsError && <p className="text-sm font-medium" style={{ color: "var(--color-risk)" }}>{atsError}</p>}
              </div>
            </div>

            {atsResult && (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <ScoreCard label="ATS Score" value={atsResult.score} suffix="/100" />
                  <ScoreCard label="Keyword Coverage" value={Math.round(atsResult.keywordCoverage * 100)} suffix="%" />
                  <ScoreCard label="Section Integrity" value={Math.round(atsResult.sectionIntegrity * 100)} suffix="%" />
                </div>

                {atsResult.risks.length > 0 && (
                  <div
                    className="rounded-xl border p-6"
                    style={{
                      background: "var(--color-surface)",
                      borderColor: "var(--color-border)",
                      boxShadow: "var(--shadow-sm)",
                      borderRadius: "var(--radius-lg)",
                    }}
                  >
                    <h3 className="text-sm font-semibold" style={{ color: "var(--color-risk)" }}>Risks & Warnings</h3>
                    <ul className="mt-3 space-y-2">
                      {atsResult.risks.map((r, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "var(--color-risk)" }} />
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {atsResult.risks.length === 0 && (
                  <div
                    className="rounded-xl border p-6"
                    style={{
                      background: "var(--color-accent-light)",
                      borderColor: "var(--color-accent-mid)",
                      borderRadius: "var(--radius-lg)",
                    }}
                  >
                    <p className="text-sm font-medium" style={{ color: "var(--color-accent)" }}>
                      No risks detected. Your CV looks ATS-friendly.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ScoreCard({ label, value, suffix }: { label: string; value: number; suffix: string }) {
  let color = "var(--color-risk)";
  if (value >= 70) color = "var(--color-success)";
  else if (value >= 40) color = "var(--color-warning)";

  return (
    <div
      className="rounded-xl border p-6 text-center"
      style={{
        background: "var(--color-surface)",
        borderColor: "var(--color-border)",
        boxShadow: "var(--shadow-sm)",
        borderRadius: "var(--radius-lg)",
      }}
    >
      <p className="text-sm font-medium" style={{ color: "var(--color-text-muted)" }}>{label}</p>
      <p className="mt-2 text-4xl font-bold" style={{ color }}>
        {value}
        <span className="text-lg font-normal" style={{ color: "var(--color-text-muted)" }}>{suffix}</span>
      </p>
    </div>
  );
}
