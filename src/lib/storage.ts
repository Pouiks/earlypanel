import type { createAdminClient } from "@/lib/supabase/admin";

/** Bucket prive partage : NDA signes et documents de projet (brief). */
export const DOCUMENTS_BUCKET = "documents";

/**
 * Garantit que le bucket `documents` existe et est PRIVE. Copie de la
 * logique de la route de signature NDA (G4) pour les routes staff ; la
 * route NDA garde la sienne pour ne pas etre touchee par ce lot.
 */
export async function ensureDocumentsBucketPrivate(
  admin: NonNullable<ReturnType<typeof createAdminClient>>
): Promise<void> {
  const { data: buckets } = await admin.storage.listBuckets();
  const existing = buckets?.find((b) => b.name === DOCUMENTS_BUCKET);
  if (!existing) {
    await admin.storage.createBucket(DOCUMENTS_BUCKET, { public: false });
    return;
  }
  if (existing.public) {
    try {
      await admin.storage.updateBucket(DOCUMENTS_BUCKET, { public: false });
    } catch (err) {
      console.error("[storage] Failed to flip documents bucket to private", err);
    }
  }
}
