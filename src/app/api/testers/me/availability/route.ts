import { NextRequest, NextResponse } from "next/server";
import { getAuthedTester } from "@/lib/tester-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkOrigin, forbiddenOriginResponse } from "@/lib/csrf";
import { computeProfileCompleteness } from "@/lib/profile-completeness";
import { logStaffAction } from "@/lib/audit";

/**
 * POST /api/testers/me/availability
 *
 * Gestion self-service (authentifiée) de la disponibilité et de l'état du
 * compte testeur. Le `status` étant hors allowlist de PATCH /api/testers/me
 * (sécurité), ces transitions passent par cette route dédiée via le client
 * service-role.
 *
 * Body : { action: "confirm_available" | "set_unavailable" | "deactivate" | "reactivate" }
 *   - confirm_available : fenêtre de dispo 90 j (+ réactive si le compte était inactif).
 *   - set_unavailable   : plus d'offres (available_until = null), reste actif — réversible.
 *   - deactivate        : status = 'inactive' (soft opt-out réversible).
 *   - reactivate        : inactive → active (si profil complet).
 */
const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;
const VALID = ["confirm_available", "set_unavailable", "deactivate", "reactivate"] as const;
type Action = (typeof VALID)[number];

export async function POST(request: NextRequest) {
  if (!checkOrigin(request)) return forbiddenOriginResponse();

  const authed = await getAuthedTester();
  if (!authed) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Config serveur manquante" }, { status: 500 });

  const body = await request.json().catch(() => null);
  const action = body?.action as Action | undefined;
  if (!action || !VALID.includes(action)) {
    return NextResponse.json({ error: "action invalide" }, { status: 400 });
  }

  const { data: tester } = await admin
    .from("testers")
    .select("*")
    .eq("id", authed.testerId)
    .maybeSingle();
  if (!tester) return NextResponse.json({ error: "Profil introuvable" }, { status: 404 });

  const nowIso = new Date().toISOString();
  const patch: Record<string, unknown> = { availability_responded_at: nowIso, updated_at: nowIso };
  let statusFilter: string | null = null; // garde atomique si transition de statut

  if (action === "confirm_available") {
    patch.available_until = new Date(Date.now() + NINETY_DAYS_MS).toISOString();
    // "Je suis disponible" implique redevenir actif si le compte était inactif.
    if (tester.status === "inactive" && computeProfileCompleteness(tester).isComplete) {
      patch.status = "active";
    }
  } else if (action === "set_unavailable") {
    patch.available_until = null;
  } else if (action === "deactivate") {
    patch.status = "inactive";
  } else if (action === "reactivate") {
    if (!computeProfileCompleteness(tester).isComplete) {
      return NextResponse.json(
        { error: "Profil incomplet — complétez votre profil avant de réactiver votre compte." },
        { status: 400 }
      );
    }
    if (tester.status !== "inactive") {
      return NextResponse.json({ error: "Le compte n'est pas désactivé." }, { status: 409 });
    }
    patch.status = "active";
    statusFilter = "inactive"; // ne réactive que depuis inactive (anti-race)
  }

  let query = admin.from("testers").update(patch).eq("id", authed.testerId);
  if (statusFilter) query = query.eq("status", statusFilter);
  const { data: updated, error } = await query.select("id, status, available_until").maybeSingle();

  if (error) {
    console.error("[me/availability] update error:", error.message);
    return NextResponse.json({ error: "Erreur lors de la mise à jour" }, { status: 500 });
  }
  if (!updated) {
    return NextResponse.json({ error: "Action non appliquée" }, { status: 409 });
  }

  await logStaffAction(
    {
      staff_id: null,
      staff_email: tester.email,
      action: `tester.availability.${action}`,
      entity_type: "tester",
      entity_id: authed.testerId,
      metadata: { status: updated.status, available_until: updated.available_until },
    },
    request
  );

  return NextResponse.json({
    success: true,
    status: updated.status,
    available_until: updated.available_until,
  });
}
