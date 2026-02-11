import { NextRequest, NextResponse } from "next/server";
import { generateJobSpecificCV } from "@/lib/resume/generator";

/**
 * POST /api/resume/generate
 * Body: { parsedSections, rawText, skills, jobTitle, jobCompany, jobDescription, jobSkills }
 * Returns: { content: string } — the generated CV text.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      parsedSections,
      rawText,
      skills,
      jobTitle,
      jobCompany,
      jobDescription,
      jobSkills,
    } = body;

    if (!parsedSections || !rawText || !jobTitle) {
      return NextResponse.json(
        { error: "parsedSections, rawText, and jobTitle are required" },
        { status: 400 }
      );
    }

    const content = await generateJobSpecificCV({
      parsedSections,
      rawText,
      skills: skills ?? [],
      jobTitle,
      jobCompany: jobCompany ?? "",
      jobDescription: jobDescription ?? "",
      jobSkills: jobSkills ?? [],
    });

    return NextResponse.json({ content });
  } catch (err: unknown) {
    console.error("Resume generate error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Generation failed" },
      { status: 500 }
    );
  }
}
