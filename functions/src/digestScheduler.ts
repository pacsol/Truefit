/**
 * Cloud Function: Digest Scheduler
 *
 * This file is the entry point for the Firebase Cloud Function that
 * Cloud Scheduler calls once per day. It:
 *
 * 1. Reads all users with saved searches from Firestore
 * 2. For each user, calls the digest pipeline
 * 3. Persists digest_runs for idempotency
 *
 * Deploy with: firebase deploy --only functions
 *
 * For the MVP, the /api/digest Next.js route serves the same purpose
 * and can be called manually or via cron. This file exists as the
 * production Cloud Function scaffold.
 */

// import * as functions from "firebase-functions";
// import { adminDb } from "../../src/lib/firebase/admin";
// import { runDigestForUser } from "../../src/lib/digest/digestPipeline";

// export const dailyDigest = functions.pubsub
//   .schedule("every day 08:00")
//   .timeZone("UTC")
//   .onRun(async () => {
//     const usersSnap = await adminDb.collection("profiles").get();
//
//     for (const doc of usersSnap.docs) {
//       const profile = doc.data();
//       const userId = profile.userId;
//
//       // Check idempotency
//       const today = new Date().toISOString().slice(0, 10);
//       const existing = await adminDb
//         .collection("digest_runs")
//         .where("userId", "==", userId)
//         .where("date", "==", today)
//         .limit(1)
//         .get();
//
//       if (!existing.empty) continue; // already processed today
//
//       // Fetch user's saved searches
//       const searchesSnap = await adminDb
//         .collection("job_searches")
//         .where("userId", "==", userId)
//         .get();
//       const searches = searchesSnap.docs.map((d) => d.data());
//
//       // Fetch user auth record for email
//       // const userRecord = await adminAuth.getUser(userId);
//
//       // Run digest
//       // const result = await runDigestForUser({ ... });
//
//       // Persist digest run
//       // await adminDb.collection("digest_runs").add({ userId, date: today, ... });
//     }
//   });

export default {};
