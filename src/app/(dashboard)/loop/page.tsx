"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import type { TerminationReason, LoopPhase } from "@/types";
import { fetchWithAuth } from "@/lib/api/fetchWithAuth";

interface HistoryEntry {
  iteration: number;
  resumeVersionId: string;
  atsScore: number;
  diff: string;
  rationale: string;
}

interface LoopSnapshot {
  loopId: string;
  phase: LoopPhase;
  iteration: number;
  currentResumeText: string;
  currentAtsScore: number;
  history: HistoryEntry[];
  terminationReason: TerminationReason | null;
}

export default function LoopPage() {
  const { user } = useAuth();

  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [jobSkills, setJobSkills] = useState("");
  const [maxIterations, setMaxIterations] = useState(5);
  const [targetScore, setTargetScore] = useState(85);

  const [loopId, setLoopId] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<LoopSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loopAction(action: string, extra: Record<string, unknown> = {}) {
    setError("");
    setLoading(true);
    try {
      const res = await fetchWithAuth("/api/loop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, loopId, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Action failed");
      if (data.loopId) setLoopId(data.loopId);
      if (data.snapshot) setSnapshot(data.snapshot);
      return data;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleStart(e: React.FormEvent) {
    e.preventDefault();
    await loopAction("start", {
      resumeText,
      jobDescription,
      jobSkills: jobSkills.split(",").map((s) => s.trim()).filter(Boolean),
      config: { maxIterations, targetScore },
    });
  }

  const phase = snapshot?.phase;
  const isRunnable = phase === "idle";
  const isPaused = phase === "awaiting_user";
  const isTerminated = phase === "terminated";

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight" style={{ color: "var(--color-primary)" }}>
          ATS Optimization Loop
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--color-text-muted)" }}>
          Iteratively improve your CV&apos;s ATS score using AI. Each iteration proposes changes, re-scores, and records a diff.
        </p>
      </div>

      {/* Setup form */}
      {!snapshot && (
        <form
          onSubmit={handleStart}
          className="rounded-xl border p-6 space-y-4"
          style={{
            background: "var(--color-surface)",
            borderColor: "var(--color-border)",
            boxShadow: "var(--shadow-sm)",
            borderRadius: "var(--radius-lg)",
          }}
        >
          <h3 className="text-lg font-semibold" style={{ color: "var(--color-primary)" }}>Start a New Loop</h3>
          <div>
            <label htmlFor="resumeInput" className="block text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>Resume Text</label>
            <textarea
              id="resumeInput"
              rows={6}
              required
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              placeholder="Paste your current CV text here\u2026"
              className="mt-1 block w-full border px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
              style={{ borderColor: "var(--color-border)", borderRadius: "var(--radius-md)", color: "var(--color-text-primary)" }}
            />
          </div>
          <div>
            <label htmlFor="jobDescLoop" className="block text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>Job Description</label>
            <textarea
              id="jobDescLoop"
              rows={3}
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the target job description\u2026"
              className="mt-1 block w-full border px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
              style={{ borderColor: "var(--color-border)", borderRadius: "var(--radius-md)", color: "var(--color-text-primary)" }}
            />
          </div>
          <div>
            <label htmlFor="jobSkillsLoop" className="block text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>Job Keywords (comma-separated)</label>
            <input
              id="jobSkillsLoop"
              type="text"
              value={jobSkills}
              onChange={(e) => setJobSkills(e.target.value)}
              placeholder="React, TypeScript, AWS"
              className="mt-1 block w-full border px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
              style={{ borderColor: "var(--color-border)", borderRadius: "var(--radius-md)", color: "var(--color-text-primary)" }}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="maxIter" className="block text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>Max Iterations</label>
              <input id="maxIter" type="number" min={1} max={10} value={maxIterations} onChange={(e) => setMaxIterations(Number(e.target.value))}
                className="mt-1 block w-full border px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
                style={{ borderColor: "var(--color-border)", borderRadius: "var(--radius-md)", color: "var(--color-text-primary)" }} />
            </div>
            <div>
              <label htmlFor="targetScoreInput" className="block text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>Target ATS Score</label>
              <input id="targetScoreInput" type="number" min={50} max={100} value={targetScore} onChange={(e) => setTargetScore(Number(e.target.value))}
                className="mt-1 block w-full border px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
                style={{ borderColor: "var(--color-border)", borderRadius: "var(--radius-md)", color: "var(--color-text-primary)" }} />
            </div>
          </div>
          <button type="submit" disabled={loading}
            className="rounded-lg px-6 py-2.5 text-sm font-semibold transition-opacity disabled:opacity-50"
            style={{ background: "var(--color-accent)", color: "var(--color-text-inverse)", borderRadius: "var(--radius-md)" }}>
            {loading ? "Starting\u2026" : "Start Loop"}
          </button>
          {error && <p className="text-sm font-medium" style={{ color: "var(--color-risk)" }}>{error}</p>}
        </form>
      )}

      {/* Loop controls */}
      {snapshot && (
        <>
          {/* Status bar */}
          <div
            className="flex items-center justify-between rounded-xl border p-4"
            style={{
              background: "var(--color-surface)",
              borderColor: "var(--color-border)",
              boxShadow: "var(--shadow-sm)",
              borderRadius: "var(--radius-lg)",
            }}
          >
            <div className="flex items-center gap-4">
              <PhaseIndicator phase={snapshot.phase} />
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--color-primary)" }}>
                  Iteration {snapshot.iteration} — Score: {snapshot.currentAtsScore}/100
                </p>
                {snapshot.terminationReason && (
                  <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                    Ended: {snapshot.terminationReason.replace(/_/g, " ")}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              {isRunnable && (
                <button onClick={() => loopAction("iterate")} disabled={loading}
                  className="rounded-lg px-4 py-1.5 text-sm font-medium transition-opacity disabled:opacity-50"
                  style={{ background: "var(--color-accent)", color: "var(--color-text-inverse)", borderRadius: "var(--radius-md)" }}>
                  {loading ? "Running\u2026" : "Run Iteration"}
                </button>
              )}
              {isRunnable && (
                <button onClick={() => loopAction("pause")} disabled={loading}
                  className="rounded-lg border px-4 py-1.5 text-sm font-medium transition-opacity disabled:opacity-50"
                  style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)", borderRadius: "var(--radius-md)" }}>
                  Pause
                </button>
              )}
              {isPaused && (
                <button onClick={() => loopAction("resume")} disabled={loading}
                  className="rounded-lg px-4 py-1.5 text-sm font-medium transition-opacity disabled:opacity-50"
                  style={{ background: "var(--color-success)", color: "var(--color-text-inverse)", borderRadius: "var(--radius-md)" }}>
                  Resume
                </button>
              )}
              {!isTerminated && (
                <button onClick={() => loopAction("terminate")} disabled={loading}
                  className="rounded-lg border px-4 py-1.5 text-sm font-medium transition-opacity disabled:opacity-50"
                  style={{ borderColor: "var(--color-risk)", color: "var(--color-risk)", borderRadius: "var(--radius-md)" }}>
                  Terminate
                </button>
              )}
              {isTerminated && (
                <button onClick={() => { setSnapshot(null); setLoopId(null); }}
                  className="rounded-lg px-4 py-1.5 text-sm font-medium"
                  style={{ background: "var(--color-accent)", color: "var(--color-text-inverse)", borderRadius: "var(--radius-md)" }}>
                  New Loop
                </button>
              )}
            </div>
          </div>

          {error && <p className="text-sm font-medium" style={{ color: "var(--color-risk)" }}>{error}</p>}

          {/* Score timeline */}
          {snapshot.history.length > 0 && (
            <div
              className="rounded-xl border p-6"
              style={{
                background: "var(--color-surface)",
                borderColor: "var(--color-border)",
                boxShadow: "var(--shadow-sm)",
                borderRadius: "var(--radius-lg)",
              }}
            >
              <h3 className="text-sm font-semibold" style={{ color: "var(--color-text-secondary)" }}>Score Progress</h3>
              <div className="mt-4 flex items-end gap-2" style={{ height: 120 }}>
                {snapshot.history.map((h) => {
                  const pct = Math.max(5, h.atsScore);
                  let color = "var(--color-risk)";
                  if (h.atsScore >= 70) color = "var(--color-success)";
                  else if (h.atsScore >= 40) color = "var(--color-warning)";
                  return (
                    <div key={h.iteration} className="flex flex-col items-center flex-1">
                      <span className="text-xs font-bold mb-1" style={{ color: "var(--color-primary)" }}>{h.atsScore}</span>
                      <div className="w-full rounded-t" style={{ height: `${pct}%`, background: color, borderRadius: "var(--radius-sm) var(--radius-sm) 0 0" }} />
                      <span className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>#{h.iteration}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Iteration history */}
          {snapshot.history.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold" style={{ color: "var(--color-primary)" }}>Iteration History</h3>
              {[...snapshot.history].reverse().map((h) => (
                <div
                  key={h.iteration}
                  className="rounded-xl border p-5"
                  style={{
                    background: "var(--color-surface)",
                    borderColor: "var(--color-border)",
                    boxShadow: "var(--shadow-sm)",
                    borderRadius: "var(--radius-lg)",
                  }}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold" style={{ color: "var(--color-primary)" }}>Iteration {h.iteration}</p>
                    <ScoreBadge score={h.atsScore} />
                  </div>
                  <p className="mt-2 text-sm" style={{ color: "var(--color-text-muted)" }}>{h.rationale}</p>
                  <pre
                    className="mt-3 rounded-lg p-3 text-xs whitespace-pre-wrap"
                    style={{
                      background: "var(--color-bg)",
                      color: "var(--color-text-secondary)",
                      fontFamily: "var(--font-mono)",
                      borderRadius: "var(--radius-md)",
                    }}
                  >
                    {h.diff}
                  </pre>
                </div>
              ))}
            </div>
          )}

          {/* Current CV text */}
          <details
            className="rounded-xl border"
            style={{
              background: "var(--color-surface)",
              borderColor: "var(--color-border)",
              boxShadow: "var(--shadow-sm)",
              borderRadius: "var(--radius-lg)",
            }}
          >
            <summary className="cursor-pointer p-5 text-sm font-semibold" style={{ color: "var(--color-text-secondary)" }}>
              Current CV Text (click to expand)
            </summary>
            <div className="border-t px-5 pb-5" style={{ borderColor: "var(--color-border)" }}>
              <pre
                className="mt-3 whitespace-pre-wrap text-sm leading-relaxed font-sans"
                style={{ color: "var(--color-text-secondary)" }}
              >
                {snapshot.currentResumeText}
              </pre>
              <button
                onClick={() => navigator.clipboard.writeText(snapshot.currentResumeText)}
                className="mt-3 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors"
                style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)", borderRadius: "var(--radius-sm)" }}
              >
                Copy to Clipboard
              </button>
            </div>
          </details>
        </>
      )}
    </div>
  );
}

function PhaseIndicator({ phase }: { phase: LoopPhase }) {
  const styles: Record<LoopPhase, { bg: string; text: string }> = {
    idle: { bg: "var(--color-secondary-light)", text: "var(--color-secondary)" },
    scoring: { bg: "var(--color-accent-light)", text: "var(--color-accent)" },
    proposing: { bg: "var(--color-secondary-light)", text: "var(--color-secondary)" },
    applying: { bg: "var(--color-secondary-light)", text: "var(--color-secondary)" },
    rescoring: { bg: "var(--color-accent-light)", text: "var(--color-accent)" },
    awaiting_user: { bg: "var(--color-accent-light)", text: "var(--color-warning)" },
    terminated: { bg: "var(--color-bg)", text: "var(--color-text-muted)" },
  };
  const s = styles[phase];
  return (
    <span
      className="rounded-full px-3 py-1 text-xs font-semibold"
      style={{ background: s.bg, color: s.text, borderRadius: "var(--radius-full)" }}
    >
      {phase.replace(/_/g, " ")}
    </span>
  );
}

function ScoreBadge({ score }: { score: number }) {
  let bg = "var(--color-risk)";
  if (score >= 70) bg = "var(--color-success)";
  else if (score >= 40) bg = "var(--color-warning)";
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-1 text-sm font-bold"
      style={{ background: bg, color: "var(--color-text-inverse)", borderRadius: "var(--radius-full)" }}
    >
      {score}
    </span>
  );
}
