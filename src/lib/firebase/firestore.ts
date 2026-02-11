import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  type DocumentData,
  type QueryConstraint,
  type WithFieldValue,
} from "firebase/firestore";
import { getClientDb } from "./client";

// ── Collection references ──────────────────────────────────────────────────────

export const collections = {
  users: "users",
  profiles: "profiles",
  jobSearches: "job_searches",
  jobSources: "job_sources",
  jobPosts: "job_posts",
  jobMatches: "job_matches",
  resumesOriginal: "resumes_original",
  resumesParsed: "resumes_parsed",
  resumeVersions: "resume_versions",
  atsScores: "ats_scores",
  feedback: "feedback",
  loopState: "loop_state",
  digestRuns: "digest_runs",
} as const;

export type CollectionName = (typeof collections)[keyof typeof collections];

// ── Helpers ────────────────────────────────────────────────────────────────────

export function colRef(name: CollectionName) {
  return collection(getClientDb(), name);
}

export function docRef(name: CollectionName, id: string) {
  return doc(getClientDb(), name, id);
}

export async function getDocument<T = DocumentData>(
  collectionName: CollectionName,
  id: string
): Promise<(T & { id: string }) | null> {
  const snap = await getDoc(docRef(collectionName, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as T) };
}

export async function queryDocuments<T = DocumentData>(
  collectionName: CollectionName,
  ...constraints: QueryConstraint[]
): Promise<(T & { id: string })[]> {
  const q = query(colRef(collectionName), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as T) }));
}

export async function createDocument<T extends DocumentData>(
  collectionName: CollectionName,
  id: string,
  data: WithFieldValue<T>
) {
  await setDoc(docRef(collectionName, id), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    version: 1,
  });
}

export async function updateDocument(
  collectionName: CollectionName,
  id: string,
  data: Record<string, unknown>
) {
  await updateDoc(docRef(collectionName, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteDocument(
  collectionName: CollectionName,
  id: string
) {
  await deleteDoc(docRef(collectionName, id));
}

// Re-export useful Firestore utilities
export { where, orderBy, limit, serverTimestamp };
