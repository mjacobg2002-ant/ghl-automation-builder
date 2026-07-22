/**
 * Action steps and triggers don't live in MongoDB -- they're JSON blobs in
 * Firebase Storage (docs/data-schemas.md "Firebase Storage"). Steps are
 * fetched via the signed `fileUrl` returned on workflow metadata; triggers
 * have no signed URL and must be built from `triggersFilePath` against the
 * `highlevel-backend.appspot.com` bucket (docs/api-reference.md "Reading
 * Triggers").
 */

const TRIGGERS_BUCKET = "highlevel-backend.appspot.com";

/** Fetches and JSON-parses a Firebase Storage file. Returns null on any failure (missing file, non-JSON, network error). */
export async function fetchFirebaseFile<T = unknown>(url: string): Promise<T | null> {
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const text = await resp.text();
    if (!text) return null;
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

/** Builds the signed-less public download URL for a triggers JSON blob from its storage path. */
export function buildTriggersStorageUrl(triggersFilePath: string): string {
  const encoded = encodeURIComponent(triggersFilePath);
  return `https://firebasestorage.googleapis.com/v0/b/${TRIGGERS_BUCKET}/o/${encoded}?alt=media`;
}
