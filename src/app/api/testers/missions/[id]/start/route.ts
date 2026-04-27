import { NextResponse, type NextRequest } from "next/server";
import { getAuthedTester } from "@/lib/tester-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { projectAllowsTesterWork } from "@/lib/project-lifecycle";
import { logStaffAction } from "@/lib/audit";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authed = await getAuthedTester();
    if (!authed) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const admin = createAdminClient();
    if (!admin) return NextResponse.json({ error: "Config serveur" }, { status: 500 });

    const { id: projectId } = await params;

    const { data: pt } = await admin
      .from("project_testers")
      .select("id, status, started_at, tester:testers(email)")
      .eq("project_id", projectId)
      .eq("tester_id", authed.testerId)
      .maybeSingle();

    if (!pt) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

    if (!["nda_signed", "invited"].includes(pt.status)) {
      return NextResponse.json(
        { error: "Mission déjà démarrée ou terminée" },
        { status: 409 }
      );
    }

    const { data: project } = await admin
      .from("projects")
      .select("start_date, end_date, status")
      .eq("id", projectId)
      .single();

    if (!project) return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
    if (!projectAllowsTesterWork(project.status as string)) {
      return NextResponse.json(
        { error: "Le projet n'est pas ouvert aux tests" },
        { status: 403 }
      );
    }

    const now = new Date();
    if (project.start_date && new Date(project.start_date) > now) {
      return NextResponse.json(
        { error: "La mission n'a pas encore commencé" },
        { status: 400 }
      );
    }
    if (project.end_date && new Date(project.end_date) < now) {
      return NextResponse.json(
        { error: "La mission est expirée" },
        { status: 400 }
      );
    }

    // G6 : transition atomique. Le filtre `.in("status", ["nda_signed","invited"])`
    // garantit qu'un double-clic ou deux requetes concurrentes ne creent pas
    // deux `started_at` differents (lost-update sur le timestamp de demarrage).
    const { data: updatedRows, error: updateErr } = await admin
      .from("project_testers")
      .update({
        status: "in_progress",
        started_at: now.toISOString(),
      })
      .eq("id", pt.id)
      .in("status", ["nda_signed", "invited"])
      .select("id");

    if (updateErr) {
      console.error("[mission/start] update error:", updateErr);
      return NextResponse.json({ error: "Erreur démarrage" }, { status: 500 });
    }

    if (!updatedRows || updatedRows.length === 0) {
      // Quelqu'un a deja demarre la mission entre la lecture et l'update.
      return NextResponse.json(
        { error: "Mission deja demarree par une autre requete" },
        { status: 409 }
      );
    }

    const testerEmail = (pt.tester as { email?: string } | null)?.email ?? null;
    await logStaffAction(
      {
        staff_id: null,
        staff_email: testerEmail,
        action: "mission.started",
        entity_type: "project_tester",
        entity_id: pt.id as string,
        metadata: {
          project_id: projectId,
          tester_id: authed.testerId,
          started_at_iso: now.toISOString(),
        },
      },
      request,
    );

    return NextResponse.json({ success: true, started_at: now.toISOString() });
  } catch (err) {
    console.error("[mission/start] error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
