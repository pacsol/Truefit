import { NextRequest, NextResponse } from "next/server";
import { parseResume } from "@/lib/resume/parser";

/**
 * POST /api/resume/upload
 * Accepts multipart form with a file field "resume".
 * Parses the file and returns extracted text, sections, and skills.
 *
 * In production this would also upload to Firebase Storage and persist
 * metadata to Firestore. For MVP we parse in-memory and return the result
 * so the client can persist via the client SDK.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("resume") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided. Send a 'resume' field." },
        { status: 400 }
      );
    }

    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ];

    if (!allowedTypes.includes(file.type) && !file.name.endsWith(".pdf") && !file.name.endsWith(".docx")) {
      return NextResponse.json(
        { error: "Unsupported file type. Upload a PDF, DOCX, or TXT file." },
        { status: 400 }
      );
    }

    // 5 MB limit
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large. Maximum 5 MB." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type || (file.name.endsWith(".pdf") ? "application/pdf" : "docx");
    const parsed = await parseResume(buffer, mimeType);

    return NextResponse.json({
      filename: file.name,
      mimeType: file.type,
      size: file.size,
      rawText: parsed.rawText,
      sections: parsed.sections,
      skills: parsed.skills,
    });
  } catch (err: unknown) {
    console.error("Resume upload error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 500 }
    );
  }
}
