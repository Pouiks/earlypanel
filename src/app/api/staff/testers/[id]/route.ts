import { NextRequest, NextResponse } from "next/server";
import { getStaffMember } from "@/lib/staff-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { logStaffAction } from "@/lib/audit";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const staff = await getStaffMember();
  if (!staff) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Config serveur manquante" }, { status: 500 });
  }

  const { id } = await params;

  const { data, error } = await admin
    .from("testers")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Testeur introuvable" }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const staff = await getStaffMember();
  if (!staff) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Config serveur manquante" }, { status: 500 });

  const { id } = await params;
  const body = await request.json();

  const allowed: Record<string, unknown> = {};
  if ("persona_id" in body) allowed.persona_id = body.persona_id;
  if ("persona_locked" in body) allowed.persona_locked = !!body.persona_locked;
  if ("gender" in body) allowed.gender = body.gender || null;

  if (Object.keys(allowed).length === 0) {
    return NextResponse.json({ error: "Aucun champ modifiable" }, { status: 400 });
  }

  const { data, error } = await admin
    .from("testers")
    .update({ ...allowed, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logStaffAction(
    {
      staff_id: staff.id,
      staff_email: staff.email,
      action: "tester.update",
      entity_type: "tester",
      entity_id: id,
      metadata: { fields: Object.keys(allowed) },
    },
    request
  );

  return NextResponse.json(data);
}

/**
 * DELETE /api/staff/testers/[id]
 *
 * Supprime DEFINITIVEMENT un testeur. Action sensible :
 *   - cascade DB sur project_testers, mission_answers, payouts, nda,
 *     tester_payment_info, etc. (toutes les FKs ON DELETE CASCADE)
 *   - supprime aussi l'utilisateur auth.users associe pour que l'email puisse
 *     etre reutilise pour une nouvelle inscription
 *   - log immuable dans staff_audit_log avec l'identite du testeur supprime
 *     (preuve a posteriori, RGPD audit trail)
 *
 * Securite : double confirmation cote client (typing email + bouton),
 * mais cote serveur on require juste le staff auth — pas de "are you sure"
 * (le client est responsable de l'UX).
 *
 * Cas d'usage : faux testeurs / donnees inventees / spam d'inscription.
 * Pour une suspension reversible, utiliser PATCH avec un champ status.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const staff = await getStaffMember();
  if (!staff) return NextResponse.json({ error: "Non autorise" }, { status: 401 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Config serveur manquante" }, { status: 500 });

  const { id } = await params;

  // On lit le testeur AVANT suppression pour conserver l'identite dans l'audit log.
  const { data: tester, error: fetchError } = await admin
    .from("testers")
    .select("id, email, first_name, last_name, auth_user_id, missions_completed, total_earned")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }
  if (!tester) {
    return NextResponse.json({ error: "Testeur introuvable" }, { status: 404 });
  }

  // Garde-fou : on bloque la suppression si le testeur a des missions
  // completees (donnees produites a conserver pour les rapports clients).
  // Le staff doit suspendre/rejeter le compte plutot que supprimer.
  if (tester.missions_completed > 0 || (tester.total_earned ?? 0) > 0) {
    return NextResponse.json(
      {
        error: "Suppression impossible : ce testeur a des missions completees ou des paiements. Utilisez le statut 'rejete' pour le desactiver sans perdre l'historique.",
      },
      { status: 409 }
    );
  }

  // 1) Suppression DB du testeur (cascade sur toutes les tables liees).
  const { error: deleteError } = await admin
    .from("testers")
    .delete()
    .eq("id", id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  // 2) Suppression de l'utilisateur auth pour liberer l'email. Best-effort :
  //    si ca echoue, le testeur DB est deja supprime, on log mais on ne
  //    rollback pas (le user auth orphelin sera ignore au prochain login).
  let authDeleted = false;
  if (tester.auth_user_id) {
    const { error: authError } = await admin.auth.admin.deleteUser(tester.auth_user_id);
    if (authError) {
      console.error("[staff/testers DELETE] auth user delete failed:", authError.message);
    } else {
      authDeleted = true;
    }
  }

  // 3) Audit log immuable — preuve juridique (qui a supprime quoi, quand).
  await logStaffAction(
    {
      staff_id: staff.id,
      staff_email: staff.email,
      action: "tester.delete",
      entity_type: "tester",
      entity_id: id,
      metadata: {
        deleted_email: tester.email,
        deleted_first_name: tester.first_name,
        deleted_last_name: tester.last_name,
        auth_user_deleted: authDeleted,
      },
    },
    request
  );

  return NextResponse.json({
    success: true,
    deleted_email: tester.email,
    auth_user_deleted: authDeleted,
  });
}
