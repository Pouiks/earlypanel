import { createAdminClient } from "@/lib/supabase/admin";
import type { NextRequest } from "next/server";

// Helper minimaliste pour ecrire dans staff_audit_log.
// Best-effort : un echec d'audit ne doit JAMAIS bloquer l'action principale.
// On loggue en console si l'insert echoue (et plus tard, on enverra a Sentry).

export interface StaffAuditEntry {
  staff_id: string | null;
  staff_email?: string | null;
  action: string;
  entity_type?: string | null;
  entity_id?: string | null;
  metadata?: Record<string, unknown> | null;
}

export async function logStaffAction(
  entry: StaffAuditEntry,
  request?: NextRequest
): Promise<void> {
  try {
    const admin = createAdminClient();
    if (!admin) return;

    const ip = request
      ? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        request.headers.get("x-real-ip") ||
        null
      : null;
    const userAgent = request?.headers.get("user-agent") ?? null;

    const { error } = await admin.from("staff_audit_log").insert({
      staff_id: entry.staff_id,
      staff_email: entry.staff_email ?? null,
      action: entry.action,
      entity_type: entry.entity_type ?? null,
      entity_id: entry.entity_id ?? null,
      metadata: entry.metadata ?? null,
      ip,
      user_agent: userAgent,
    });

    if (error) {
      console.error("[audit] failed to log staff action", entry.action, error);
    }
  } catch (e) {
    // Ne jamais throw : l'audit ne doit jamais casser l'action metier.
    console.error("[audit] unexpected error", e);
  }
}
