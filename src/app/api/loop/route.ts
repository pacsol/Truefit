import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, isAuthError } from "@/lib/api/withAuth";
import { adminDb } from "@/lib/firebase/admin";
import {
  createLoop,
  runIteration,
  pauseLoop,
  resumeLoop,
  terminateLoop,
  type LoopSnapshot,
} from "@/lib/loop/loopController";

const loopsCollection = adminDb.collection("loop_state");

async function getLoopEntry(loopId: string, userId: string) {
  const doc = await loopsCollection.doc(loopId).get();
  if (!doc.exists) return null;
  const data = doc.data()!;
  if (data.userId !== userId) return null;
  return data as { snapshot: LoopSnapshot; jobDescription: string; jobSkills: string[] };
}

async function saveLoopEntry(loopId: string, entry: { snapshot: LoopSnapshot; jobDescription: string; jobSkills: string[] }) {
  await loopsCollection.doc(loopId).set(entry, { merge: true });
}

/** POST /api/loop — dispatch loop actions */
export async function POST(req: NextRequest) {
  const auth = await verifyAuth(req);
  if (isAuthError(auth)) return auth;

  try {
    const body = await req.json();
    const { action } = body;

    switch (action) {
      case "start": {
        const { jobId, resumeText, jobDescription, jobSkills, config } = body;
        if (!resumeText) {
          return NextResponse.json({ error: "resumeText required" }, { status: 400 });
        }
        const loopId = crypto.randomUUID();
        const snapshot = createLoop({
          loopId,
          userId: auth.uid,
          jobId: jobId ?? "",
          resumeText,
          jobDescription: jobDescription ?? "",
          jobSkills: jobSkills ?? [],
          config,
        });
        const entry = { snapshot, jobDescription: jobDescription ?? "", jobSkills: jobSkills ?? [] };
        await saveLoopEntry(loopId, entry);
        return NextResponse.json({ loopId, snapshot });
      }

      case "iterate": {
        const { loopId } = body;
        const entry = await getLoopEntry(loopId, auth.uid);
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
        await saveLoopEntry(loopId, { ...entry, snapshot: updated });
        return NextResponse.json({ snapshot: updated, result });
      }

      case "pause": {
        const { loopId } = body;
        const entry = await getLoopEntry(loopId, auth.uid);
        if (!entry) return NextResponse.json({ error: "Loop not found" }, { status: 404 });
        entry.snapshot = pauseLoop(entry.snapshot);
        await saveLoopEntry(loopId, entry);
        return NextResponse.json({ snapshot: entry.snapshot });
      }

      case "resume": {
        const { loopId } = body;
        const entry = await getLoopEntry(loopId, auth.uid);
        if (!entry) return NextResponse.json({ error: "Loop not found" }, { status: 404 });
        entry.snapshot = resumeLoop(entry.snapshot);
        await saveLoopEntry(loopId, entry);
        return NextResponse.json({ snapshot: entry.snapshot });
      }

      case "terminate": {
        const { loopId } = body;
        const entry = await getLoopEntry(loopId, auth.uid);
        if (!entry) return NextResponse.json({ error: "Loop not found" }, { status: 404 });
        entry.snapshot = terminateLoop(entry.snapshot);
        await saveLoopEntry(loopId, entry);
        return NextResponse.json({ snapshot: entry.snapshot });
      }

      case "get": {
        const { loopId } = body;
        const entry = await getLoopEntry(loopId, auth.uid);
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
