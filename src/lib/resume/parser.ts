import mammoth from "mammoth";

// Lazy-load pdf-parse to avoid its test-file import at build time
async function loadPdfParse(): Promise<(buf: Buffer) => Promise<{ text: string }>> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("pdf-parse");
}

export interface ParsedResume {
  rawText: string;
  sections: { heading: string; content: string }[];
  skills: string[];
}

// Common resume section headings
const SECTION_PATTERNS = [
  /^(summary|profile|objective|about\s*me)/i,
  /^(experience|work\s*experience|employment|work\s*history|professional\s*experience)/i,
  /^(education|academic|qualifications)/i,
  /^(skills|technical\s*skills|core\s*competencies|competencies|technologies)/i,
  /^(projects|personal\s*projects|key\s*projects)/i,
  /^(certifications?|certificates?|licenses?)/i,
  /^(awards?|honors?|achievements?)/i,
  /^(publications?|papers?)/i,
  /^(volunteer|volunteering|community)/i,
  /^(languages?)/i,
  /^(interests?|hobbies?)/i,
  /^(references?)/i,
];

function isSectionHeading(line: string): string | null {
  const trimmed = line.trim().replace(/[:\-–—]/g, "").trim();
  if (trimmed.length === 0 || trimmed.length > 60) return null;
  for (const pattern of SECTION_PATTERNS) {
    if (pattern.test(trimmed)) return trimmed;
  }
  // Heuristic: short ALL CAPS line
  if (
    trimmed.length <= 40 &&
    trimmed === trimmed.toUpperCase() &&
    /[A-Z]{3,}/.test(trimmed)
  ) {
    return trimmed;
  }
  return null;
}

function extractSections(text: string): { heading: string; content: string }[] {
  const lines = text.split("\n");
  const sections: { heading: string; content: string }[] = [];
  let currentHeading = "Header";
  let currentContent: string[] = [];

  for (const line of lines) {
    const heading = isSectionHeading(line);
    if (heading) {
      if (currentContent.length > 0) {
        sections.push({
          heading: currentHeading,
          content: currentContent.join("\n").trim(),
        });
      }
      currentHeading = heading;
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }
  if (currentContent.length > 0) {
    sections.push({
      heading: currentHeading,
      content: currentContent.join("\n").trim(),
    });
  }

  return sections.filter((s) => s.content.length > 0);
}

const KNOWN_SKILLS = [
  "javascript", "typescript", "react", "next.js", "nextjs", "node.js",
  "nodejs", "python", "java", "c#", "c++", "go", "rust", "ruby",
  "php", "swift", "kotlin", "sql", "nosql", "mongodb", "postgresql",
  "mysql", "firebase", "aws", "azure", "gcp", "docker", "kubernetes",
  "terraform", "ci/cd", "git", "graphql", "rest", "api",
  "html", "css", "tailwind", "sass", "vue", "angular", "svelte",
  "django", "flask", "spring", "express", ".net", "laravel",
  "redis", "elasticsearch", "kafka", "rabbitmq",
  "machine learning", "deep learning", "nlp", "computer vision",
  "agile", "scrum", "devops", "linux", "figma", "jira",
];

function extractSkills(text: string): string[] {
  const lower = text.toLowerCase();
  return KNOWN_SKILLS.filter((s) => lower.includes(s));
}

export async function parsePdf(buffer: Buffer): Promise<ParsedResume> {
  const pdf = await loadPdfParse();
  const data = await pdf(buffer);
  const rawText = data.text;
  return {
    rawText,
    sections: extractSections(rawText),
    skills: extractSkills(rawText),
  };
}

export async function parseDocx(buffer: Buffer): Promise<ParsedResume> {
  const result = await mammoth.extractRawText({ buffer });
  const rawText = result.value;
  return {
    rawText,
    sections: extractSections(rawText),
    skills: extractSkills(rawText),
  };
}

export async function parseResume(
  buffer: Buffer,
  mimeType: string
): Promise<ParsedResume> {
  if (
    mimeType === "application/pdf" ||
    mimeType === "pdf"
  ) {
    return parsePdf(buffer);
  }
  if (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "docx"
  ) {
    return parseDocx(buffer);
  }
  // Fallback: treat as plain text
  const rawText = buffer.toString("utf-8");
  return {
    rawText,
    sections: extractSections(rawText),
    skills: extractSkills(rawText),
  };
}
