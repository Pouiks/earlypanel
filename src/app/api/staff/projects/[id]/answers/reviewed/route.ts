import { NextRequest, NextResponse } from "next/server";
import { getStaffMember } from "@/lib/staff-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkOrigin, forbiddenOriginResponse } from "@/lib/csrf";

/**
 * PATCH : marque une reponse comme lue (ou non lue) dans le depouillement.
 * Body : { tester_id: string, question_id: string, reviewed: boolean }
 *
 * Aide de relecture persistee (migration 042) : sans effet sur la
 * notation, le score ou le paiement, donc pas d'audit.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!checkOrigin(request)) return forbiddenOriginResponse();

  const staff = await getStaffMember();
  if (!staff) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Config serveur" }, { status: 500 });

  const { id: projectId } = await params;
  const body = await request.json().catch(() => ({}));
  const testerId = typeof body?.tester_id === "string" ? body.tester_id : "";
  const questionId = typeof body?.question_id === "string" ? body.question_id : "";
  const reviewed = body?.reviewed === true;

  if (!testerId || !questionId) {
    return NextResponse.json({ error: "tester_id et question_id requis" }, { status: 400 });
  }

  const { data, error } = await admin
    .from("project_tester_answers")
    .update({
      reviewed_at: reviewed ? new Date().toISOString() : null,
      reviewed_by: reviewed ? staff.id : null,
    })
    .eq("project_id", projectId)
    .eq("tester_id", testerId)
    .eq("question_id", questionId)
    .select("reviewed_at");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data || data.length === 0) {
    return NextResponse.json({ error: "Réponse introuvable" }, { status: 404 });
  }

  return NextResponse.json({ reviewed_at: data[0].reviewed_at ?? null });
}
