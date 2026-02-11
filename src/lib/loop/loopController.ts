import { generateText } from "@/lib/ai/gemini";
import { simulateAts, type AtsResult } from "@/lib/ats/atsSimulator";
import type {
  LoopPhase,
  TerminationReason,
  LoopHistoryEntry,
} from "@/types";

// ── Types (runtime, not Firestore-bound) ───────────────────────────────────

export interface LoopConfig {
  maxIterations: number;
  targetScore: number;
  minImprovement: number; // stop if score improves less than this
}

const DEFAULT_CONFIG: LoopConfig = {
  maxIterations: 5,
  targetScore: 85,
  minImprovement: 2,
};

export interface LoopSnapshot {
  loopId: string;
  userId: string;
  jobId: string;
  phase: LoopPhase;
  iteration: number;
  currentResumeText: string;
  currentAtsScore: number;
  history: LoopHistoryEntry[];
  terminationReason: TerminationReason | null;
  config: LoopConfig;
}

export interface IterationResult {
  newResumeText: string;
  previousScore: number;
  newScore: number;
  diff: string;
  rationale: string;
  shouldContinue: boolean;
  terminationReason: TerminationReason | null;
}

// ── Core loop functions ────────────────────────────────────────────────────

/** Create the initial loop snapshot (phase=idle, iteration=0). */
export function createLoop(params: {
  loopId: string;
  userId: string;
  jobId: string;
  resumeText: string;
  jobDescription: string;
  jobSkills: string[];
  config?: Partial<LoopConfig>;
}): LoopSnapshot {
  const atsResult = simulateAts(params.resumeText, params.jobSkills);
  return {
    loopId: params.loopId,
    userId: params.userId,
    jobId: params.jobId,
    phase: "idle",
    iteration: 0,
    currentResumeText: params.resumeText,
    currentAtsScore: atsResult.score,
    history: [],
    terminationReason: null,
    config: { ...DEFAULT_CONFIG, ...params.config },
  };
}

/** Run a single iteration of the Ralph-style loop. */
export async function runIteration(
  snapshot: LoopSnapshot,
  jobDescription: string,
  jobSkills: string[]
): Promise<{ snapshot: LoopSnapshot; result: IterationResult }> {
  const nextIteration = snapshot.iteration + 1;

  // 1. Score current resume
  const beforeAts = simulateAts(snapshot.currentResumeText, jobSkills);
  const previousScore = beforeAts.score;

  // 2. Ask Gemini to propose improvements
  const proposalPrompt = buildProposalPrompt(
    snapshot.currentResumeText,
    beforeAts,
    jobDescription,
    jobSkills,
    nextIteration
  );
  const improvedText = await generateText(proposalPrompt);

  // 5. Re-score the improved version
  const afterAts = simulateAts(improvedText, jobSkills);
  const newScore = afterAts.score;
  const improvement = newScore - previousScore;

  // 6. Build diff summary
  const diff = buildDiff(previousScore, newScore, beforeAts, afterAts);
  const rationale = `Iteration ${nextIteration}: score ${previousScore} → ${newScore} (${improvement >= 0 ? "+" : ""}${improvement})`;

  // 7. Determine whether to continue
  let shouldContinue = true;
  let terminationReason: TerminationReason | null = null;

  if (newScore >= snapshot.config.targetScore) {
    shouldContinue = false;
    terminationReason = "target_reached";
  } else if (nextIteration >= snapshot.config.maxIterations) {
    shouldContinue = false;
    terminationReason = "max_iterations";
  } else if (improvement < snapshot.config.minImprovement && nextIteration > 1) {
    shouldContinue = false;
    terminationReason = "no_improvement";
  }

  // 8. Build history entry
  const historyEntry: LoopHistoryEntry = {
    iteration: nextIteration,
    resumeVersionId: `${snapshot.loopId}_v${nextIteration}`,
    atsScore: newScore,
    diff,
    rationale,
    timestamp: new Date().toISOString() as unknown as LoopHistoryEntry["timestamp"],
  };

  // 9. Update snapshot
  const updatedSnapshot: LoopSnapshot = {
    ...snapshot,
    phase: shouldContinue ? "idle" : "terminated",
    iteration: nextIteration,
    currentResumeText: improvedText,
    currentAtsScore: newScore,
    history: [...snapshot.history, historyEntry],
    terminationReason,
  };

  return {
    snapshot: updatedSnapshot,
    result: {
      newResumeText: improvedText,
      previousScore,
      newScore,
      diff,
      rationale,
      shouldContinue,
      terminationReason,
    },
  };
}

/** Pause a running loop. */
export function pauseLoop(snapshot: LoopSnapshot): LoopSnapshot {
  return { ...snapshot, phase: "awaiting_user" };
}

/** Resume a paused loop. */
export function resumeLoop(snapshot: LoopSnapshot): LoopSnapshot {
  if (snapshot.phase !== "awaiting_user") return snapshot;
  return { ...snapshot, phase: "idle" };
}

/** Terminate a loop manually. */
export function terminateLoop(snapshot: LoopSnapshot): LoopSnapshot {
  return {
    ...snapshot,
    phase: "terminated",
    terminationReason: "user_stop",
  };
}

// ── Prompt builder ─────────────────────────────────────────────────────────

function buildProposalPrompt(
  currentCV: string,
  atsResult: AtsResult,
  jobDescription: string,
  jobSkills: string[],
  iteration: number
): string {
  return `You are an expert ATS resume optimizer. This is iteration ${iteration} of an improvement loop.

CURRENT CV:
${currentCV}

CURRENT ATS ANALYSIS:
- Score: ${atsResult.score}/100
- Keyword coverage: ${Math.round(atsResult.keywordCoverage * 100)}%
- Section integrity: ${Math.round(atsResult.sectionIntegrity * 100)}%
- Risks: ${atsResult.risks.join("; ") || "none"}

TARGET JOB KEYWORDS: ${jobSkills.join(", ")}
JOB DESCRIPTION (first 600 chars): ${jobDescription.slice(0, 600)}

RULES:
1. TRUTHFUL: Do NOT invent experience, companies, dates, or achievements. Only rephrase/restructure what exists.
2. ATS-SAFE: Single column, no tables/graphics, standard section headings (Summary, Experience, Education, Skills).
3. Address the specific risks listed above.
4. Improve keyword coverage by naturally incorporating missing job keywords where truthful.
5. Ensure all expected sections are present.
6. Keep reverse chronological order.

Output ONLY the improved CV text, no commentary.`;
}

function buildDiff(
  prevScore: number,
  newScore: number,
  prevAts: AtsResult,
  newAts: AtsResult
): string {
  const lines: string[] = [];
  lines.push(`Score: ${prevScore} → ${newScore}`);
  lines.push(
    `Keywords: ${Math.round(prevAts.keywordCoverage * 100)}% → ${Math.round(newAts.keywordCoverage * 100)}%`
  );
  lines.push(
    `Sections: ${Math.round(prevAts.sectionIntegrity * 100)}% → ${Math.round(newAts.sectionIntegrity * 100)}%`
  );

  const resolvedRisks = prevAts.risks.filter((r) => !newAts.risks.includes(r));
  if (resolvedRisks.length > 0) {
    lines.push(`Resolved: ${resolvedRisks.join("; ")}`);
  }
  const newRisks = newAts.risks.filter((r) => !prevAts.risks.includes(r));
  if (newRisks.length > 0) {
    lines.push(`New risks: ${newRisks.join("; ")}`);
  }

  return lines.join("\n");
}
