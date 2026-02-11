/**
 * ATS Simulator (MVP — heuristic-based, NOT a real ATS)
 *
 * Input:  plain-text CV (single-column, no tables/graphics)
 * Output: { score, keywordCoverage, sectionIntegrity, risks[] }
 */

export interface AtsResult {
  score: number; // 0–100
  keywordCoverage: number; // 0–1
  sectionIntegrity: number; // 0–1
  risks: string[];
}

// Sections an ATS expects to find
const EXPECTED_SECTIONS = [
  "summary",
  "experience",
  "education",
  "skills",
];

const SECTION_ALIASES: Record<string, string[]> = {
  summary: ["summary", "profile", "objective", "about me", "about"],
  experience: [
    "experience",
    "work experience",
    "employment",
    "work history",
    "professional experience",
  ],
  education: ["education", "academic", "qualifications"],
  skills: ["skills", "technical skills", "core competencies", "competencies", "technologies"],
};

/**
 * Run a simulated ATS check against a plain-text CV,
 * optionally comparing to a job description's keywords.
 */
export function simulateAts(
  cvText: string,
  jobKeywords: string[] = []
): AtsResult {
  const risks: string[] = [];
  const lower = cvText.toLowerCase();
  const lines = cvText.split("\n").map((l) => l.trim());

  // ── 1. Section integrity (0–1) ──────────────────────────────────────────────
  let foundSections = 0;
  for (const section of EXPECTED_SECTIONS) {
    const aliases = SECTION_ALIASES[section] ?? [section];
    const found = aliases.some((a) => lower.includes(a));
    if (found) foundSections++;
    else risks.push(`Missing section: ${section}`);
  }
  const sectionIntegrity = foundSections / EXPECTED_SECTIONS.length;

  // ── 2. Keyword coverage (0–1) ───────────────────────────────────────────────
  let keywordCoverage = 1; // default when no job keywords provided
  if (jobKeywords.length > 0) {
    const matched = jobKeywords.filter((k) => lower.includes(k.toLowerCase()));
    keywordCoverage = matched.length / jobKeywords.length;
    const missing = jobKeywords.filter(
      (k) => !lower.includes(k.toLowerCase())
    );
    if (missing.length > 0) {
      risks.push(`Missing keywords: ${missing.slice(0, 5).join(", ")}`);
    }
  }

  // ── 3. Formatting checks ────────────────────────────────────────────────────

  // Check for tables (tab-heavy lines suggest table layout)
  const tabHeavyLines = lines.filter(
    (l) => (l.match(/\t/g) || []).length >= 3
  );
  if (tabHeavyLines.length > 3) {
    risks.push("Possible table formatting detected — may confuse ATS parsers");
  }

  // Check for very short CV
  const wordCount = cvText.split(/\s+/).length;
  if (wordCount < 100) {
    risks.push("CV appears very short (under 100 words)");
  }

  // Check for excessive special characters / graphics markers
  const specialCharRatio =
    (cvText.replace(/[\w\s.,;:!?'\-()@/&]/g, "").length) / cvText.length;
  if (specialCharRatio > 0.05) {
    risks.push(
      "High special character density — may indicate graphics or non-standard formatting"
    );
  }

  // Check for contact info
  const hasEmail = /[\w.-]+@[\w.-]+\.\w+/.test(cvText);
  if (!hasEmail) {
    risks.push("No email address detected");
  }

  // Check chronological clarity (years present)
  const yearMatches = cvText.match(/\b(19|20)\d{2}\b/g);
  if (!yearMatches || yearMatches.length < 2) {
    risks.push("Few or no dates found — chronology may be unclear");
  }

  // Check for multi-column indicators (many short lines)
  const shortLines = lines.filter(
    (l) => l.length > 0 && l.length < 20
  );
  if (shortLines.length > lines.length * 0.4 && lines.length > 10) {
    risks.push(
      "Many very short lines — possible multi-column layout that ATS may misread"
    );
  }

  // ── 4. Readability (basic) ──────────────────────────────────────────────────
  const avgLineLength =
    lines.filter((l) => l.length > 0).reduce((sum, l) => sum + l.length, 0) /
    Math.max(lines.filter((l) => l.length > 0).length, 1);
  let readabilityPenalty = 0;
  if (avgLineLength > 200) {
    risks.push("Very long lines — consider using shorter paragraphs");
    readabilityPenalty = 5;
  }

  // ── 5. Composite score ──────────────────────────────────────────────────────
  const sectionScore = sectionIntegrity * 35;
  const keywordScore = keywordCoverage * 35;
  const formattingScore = Math.max(0, 20 - risks.length * 3);
  const readabilityScore = Math.max(0, 10 - readabilityPenalty);

  const score = Math.round(
    Math.min(100, Math.max(0, sectionScore + keywordScore + formattingScore + readabilityScore))
  );

  return {
    score,
    keywordCoverage: Math.round(keywordCoverage * 100) / 100,
    sectionIntegrity: Math.round(sectionIntegrity * 100) / 100,
    risks,
  };
}
