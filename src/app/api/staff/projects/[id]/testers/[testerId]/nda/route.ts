import { NextResponse, type NextRequest } from "next/server";
import { getStaffMember } from "@/lib/staff-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { logStaffAction } from "@/lib/audit";
import { DOCUMENTS_BUCKET } from "@/lib/storage";

/**
 * GET /api/staff/projects/[id]/testers/[testerId]/nda
 *
 * Ouvre le NDA signe par un testeur (PDF genere a la signature, hash SHA-256
 * stocke sur project_testers). Jusqu'ici seul le testeur pouvait le
 * telecharger : en cas de litige client, le staff devait aller chercher le
 * fichier a la main dans le bucket.
 *
 *   - Auth staff, 404 si aucun document (NDA pas encore signe).
 *   - URL signee fraiche, 5 min. `?download=1` force le telechargement avec
 *     un nom explicite, sinon affichage inline dans l'onglet.
 *   - Audit `nda.viewed_by_staff` : qui a consulte quel document, quand. Le
 *     PDF contient des donnees personnelles (identite, adresse, IP).
 */

interface NdaRow {
  id: string;
  status: string;
  nda_document_url: string | null;
  nda_document_hash: string | null;
  nda_signed_at: string | null;
  tester: { first_name: string | null; last_name: string | null } | { first_name: string | null; last_name: string | null }[] | null;
  project: { ref_number: string | null; title: string | null } | { ref_number: string | null; title: string | null }[] | null;
}

function sanitizeFilename(input: string): string {
  return input.replace(/[^a-zA-Z0-9 _-]/g, "_").replace(/_+/g, "_").trim().slice(0, 80) || "doc";
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; testerId: string }> },
) {
  const staff = await getStaffMember();
  if (!staff) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Config serveur manquante" }, { status: 500 });

  const { id: projectId, testerId } = await params;

  const { data, error } = await admin
    .from("project_testers")
    .select("id, status, nda_document_url, nda_document_hash, nda_signed_at, tester:testers(first_name, last_name), project:projects(ref_number, title)")
    .eq("project_id", projectId)
    .eq("tester_id", testerId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const pt = data as NdaRow | null;
  if (!pt) return NextResponse.json({ error: "Testeur introuvable sur ce projet" }, { status: 404 });

  const docRef = pt.nda_document_url as string | null;
  if (!docRef || !pt.nda_signed_at) {
    return NextResponse.json({ error: "Aucun NDA signé pour ce testeur" }, { status: 404 });
  }

  const tester = Array.isArray(pt.tester) ? pt.tester[0] : pt.tester;
  const project = Array.isArray(pt.project) ? pt.project[0] : pt.project;
  const wantsDownload = ["1", "true"].includes(request.nextUrl.searchParams.get("download") ?? "");

  let target: string;
  if (docRef.startsWith("storage:")) {
    const storagePath = docRef.slice("storage:".length);
    const projectRef = project?.ref_number || project?.title || "projet";
    const testerName = `${tester?.first_name ?? ""}_${tester?.last_name ?? ""}`.trim() || "testeur";
    const filename = sanitizeFilename(`NDA-${projectRef}-${testerName}`) + ".pdf";

    const { data: signed, error: signErr } = await admin.storage
      .from(DOCUMENTS_BUCKET)
      .createSignedUrl(storagePath, 60 * 5, wantsDownload ? { download: filename } : undefined);

    if (signErr || !signed?.signedUrl) {
      console.error("[staff nda view] signed URL error:", signErr?.message);
      return NextResponse.json({ error: "Document indisponible. Réessayez." }, { status: 503 });
    }
    target = signed.signedUrl;
  } else {
    // Valeurs historiques (URL publique pre-G4) : on redirige telles quelles.
    target = docRef;
  }

  await logStaffAction(
    {
      staff_id: staff.id,
      staff_email: staff.email,
      action: "nda.viewed_by_staff",
      entity_type: "project_tester",
      entity_id: pt.id as string,
      metadata: {
        project_id: projectId,
        tester_id: testerId,
        document_hash: pt.nda_document_hash ?? null,
        download: wantsDownload,
      },
    },
    request,
  );

  return NextResponse.redirect(target);
}
