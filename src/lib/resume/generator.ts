import { generateText } from "@/lib/ai/gemini";

export interface GenerateResumeInput {
  parsedSections: { heading: string; content: string }[];
  rawText: string;
  skills: string[];
  jobTitle: string;
  jobCompany: string;
  jobDescription: string;
  jobSkills: string[];
}

/**
 * Generate a job-specific, ATS-optimized CV using Gemini.
 *
 * Rules:
 * - Truthful: only use facts from the original CV
 * - ATS-safe: single-column, no tables/graphics, standard headings
 * - Emphasize skills/experience that match the target job
 */
export async function generateJobSpecificCV(
  input: GenerateResumeInput
): Promise<string> {
  const prompt = `You are an expert resume writer. Rewrite the candidate's CV to be optimized for the following job. Follow these rules STRICTLY:

1. TRUTHFUL: Only use facts, dates, job titles, companies, and achievements from the original CV. Do NOT invent experience.
2. ATS-SAFE FORMAT:
   - Single column, plain text
   - No tables, graphics, icons, or columns
   - Use standard section headings: Summary, Experience, Education, Skills, Certifications (if applicable)
   - Use reverse chronological order for experience and education
3. OPTIMIZATION:
   - Write a targeted Summary (2-3 sentences) highlighting fit for this specific job
   - Reorder and emphasize bullet points that align with the job requirements
   - Naturally incorporate keywords from the job description where truthful
   - Quantify achievements where the original CV provides numbers
   - Remove irrelevant details that don't support this application

TARGET JOB:
- Title: ${input.jobTitle}
- Company: ${input.jobCompany}
- Key skills: ${input.jobSkills.join(", ") || "not specified"}
- Description (first 800 chars): ${input.jobDescription.slice(0, 800)}

ORIGINAL CV SECTIONS:
${input.parsedSections.map((s) => `### ${s.heading}\n${s.content}`).join("\n\n")}

DETECTED SKILLS IN ORIGINAL CV: ${input.skills.join(", ")}

Output the rewritten CV as plain text. Do not include any commentary, just the CV content.`;

  return generateText(prompt);
}
