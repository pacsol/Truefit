import { NextRequest, NextResponse } from "next/server";
import {
  createLoop,
  runIteration,
  pauseLoop,
  resumeLoop,
  terminateLoop,
  type LoopSnapshot,
} from "@/lib/loop/loopController";

/**
 * In-memory loop store for the MVP.
 * In production this would be Firestore loop_state documents.
 */
const loops = new Map<string, { snapshot: LoopSnapshot; jobDescription: string; jobSkills: string[] }>();

/** POST /api/loop — dispatch loop actions */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    switch (action) {
      case "start": {
        const { userId, jobId, resumeText, jobDescription, jobSkills, config } = body;
        if (!userId || !resumeText) {
          return NextResponse.json({ error: "userId and resumeText required" }, { status: 400 });
        }
        const loopId = crypto.randomUUID();
        const snapshot = createLoop({
          loopId,
          userId,
          jobId: jobId ?? "",
          resumeText,
          jobDescription: jobDescription ?? "",
          jobSkills: jobSkills ?? [],
          config,
        });
        loops.set(loopId, { snapshot, jobDescription: jobDescription ?? "", jobSkills: jobSkills ?? [] });
        return NextResponse.json({ loopId, snapshot });
      }

      case "iterate": {
        const { loopId } = body;
        const entry = loops.get(loopId);
        if (!entry) {
          return NextResponse.json({ error: "Loop not found" }, { status: 404 });
        }
        if (entry.snapshot.phase === "terminated") {
          return NextResponse.json({ error: "Loop already terminated", snapshot: entry.snapshot }, { status: 400 });
        }
        if (entry.snapshot.phase === "awaiting_user") {
          return NextResponse.json({ error: "Loop is paused — resume first", snapshot: entry.snapshot }, { status: 400 });
        }

        const { snapshot: updated, result } = await runIteration(
          entry.snapshot,
          entry.jobDescription,
          entry.jobSkills
        );
        entry.snapshot = updated;
        return NextResponse.json({ snapshot: updated, result });
      }

      case "pause": {
        const { loopId } = body;
        const entry = loops.get(loopId);
        if (!entry) return NextResponse.json({ error: "Loop not found" }, { status: 404 });
        entry.snapshot = pauseLoop(entry.snapshot);
        return NextResponse.json({ snapshot: entry.snapshot });
      }

      case "resume": {
        const { loopId } = body;
        const entry = loops.get(loopId);
        if (!entry) return NextResponse.json({ error: "Loop not found" }, { status: 404 });
        entry.snapshot = resumeLoop(entry.snapshot);
        return NextResponse.json({ snapshot: entry.snapshot });
      }

      case "terminate": {
        const { loopId } = body;
        const entry = loops.get(loopId);
        if (!entry) return NextResponse.json({ error: "Loop not found" }, { status: 404 });
        entry.snapshot = terminateLoop(entry.snapshot);
        return NextResponse.json({ snapshot: entry.snapshot });
      }

      case "get": {
        const { loopId } = body;
        const entry = loops.get(loopId);
        if (!entry) return NextResponse.json({ error: "Loop not found" }, { status: 404 });
        return NextResponse.json({ snapshot: entry.snapshot });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err: unknown) {
    console.error("Loop API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Loop operation failed" },
      { status: 500 }
    );
  }
}
