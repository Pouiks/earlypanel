import { NextRequest, NextResponse } from "next/server";
import { getStaffMember } from "@/lib/staff-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { logStaffAction } from "@/lib/audit";
import { DOCUMENTS_BUCKET } from "@/lib/storage";

/**
 * DELETE : supprime un document de projet (objet storage puis ligne).
 * Si le retrait storage echoue, on ne supprime pas la ligne : mieux vaut
 * une ligne visible qu'un fichier orphelin dans le bucket.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const staff = await getStaffMember();
  if (!staff) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Config serveur manquante" }, { status: 500 });

  const { id: projectId, docId } = await params;

  const { data: row } = await admin
    .from("project_documents")
    .select("id, project_id, file_name, storage_path")
    .eq("id", docId)
    .maybeSingle();

  if (!row || row.project_id !== projectId) {
    return NextResponse.json({ error: "Document introuvable" }, { status: 404 });
  }

  const { error: storageError } = await admin.storage.from(DOCUMENTS_BUCKET).remove([row.storage_path as string]);
  if (storageError) {
    return NextResponse.json({ error: `Stockage : ${storageError.message}` }, { status: 500 });
  }

  const { error } = await admin.from("project_documents").delete().eq("id", docId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logStaffAction(
    {
      staff_id: staff.id,
      staff_email: staff.email ?? null,
      action: "project.document_deleted",
      entity_type: "project",
      entity_id: projectId,
      metadata: { document_id: docId, file_name: row.file_name, storage_path: row.storage_path },
    },
    request
  );

  return NextResponse.json({ success: true });
}
