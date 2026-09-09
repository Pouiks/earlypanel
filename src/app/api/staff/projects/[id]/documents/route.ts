import { NextRequest, NextResponse } from "next/server";
import { getStaffMember } from "@/lib/staff-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { logStaffAction } from "@/lib/audit";
import { DOCUMENTS_BUCKET, ensureDocumentsBucketPrivate } from "@/lib/storage";
import {
  detectDocumentMime,
  extensionForDocumentMime,
  sanitizeFileName,
  MAX_DOCUMENT_BYTES,
  MAX_DOCUMENTS_PER_PROJECT,
} from "@/lib/document-validation";
import type { ProjectDocument } from "@/types/staff";

const SIGNED_URL_TTL = 60 * 60; // 1 h, comme les NDA

const SELECT = "id, project_id, kind, file_name, storage_path, mime_type, size_bytes, created_at, uploader:staff_members(first_name, last_name)";

type Row = Omit<ProjectDocument, "url" | "uploaded_by_name"> & {
  uploader: { first_name: string | null; last_name: string | null } | { first_name: string | null; last_name: string | null }[] | null;
};

async function withUrls(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  rows: Row[]
): Promise<ProjectDocument[]> {
  return Promise.all(
    rows.map(async (r) => {
      const { data } = await admin.storage.from(DOCUMENTS_BUCKET).createSignedUrl(r.storage_path, SIGNED_URL_TTL);
      const u = Array.isArray(r.uploader) ? r.uploader[0] : r.uploader;
      const { uploader: _uploader, ...rest } = r;
      void _uploader;
      return {
        ...rest,
        url: data?.signedUrl ?? null,
        uploaded_by_name: [u?.first_name, u?.last_name].filter(Boolean).join(" ") || null,
      };
    })
  );
}

/** GET : documents du projet (brief client), avec URL signee 1 h. Staff uniquement. */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const staff = await getStaffMember();
  if (!staff) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Config serveur manquante" }, { status: 500 });

  const { id: projectId } = await params;

  const { data, error } = await admin
    .from("project_documents")
    .select(SELECT)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const documents = await withUrls(admin, (data ?? []) as unknown as Row[]);
  return NextResponse.json({ documents });
}

/**
 * POST multipart/form-data : `file` (PDF, txt ou md, 10 Mo max).
 * Le type est detecte sur les octets, pas sur le Content-Type du navigateur.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const staff = await getStaffMember();
  if (!staff) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Config serveur manquante" }, { status: 500 });

  const { id: projectId } = await params;

  const { data: project } = await admin.from("projects").select("id").eq("id", projectId).maybeSingle();
  if (!project) return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });
  }
  if (file.size > MAX_DOCUMENT_BYTES) {
    return NextResponse.json({ error: "Fichier trop volumineux (10 Mo maximum)" }, { status: 413 });
  }

  const originalName = sanitizeFileName((file as File).name ?? "document");
  const buffer = new Uint8Array(await file.arrayBuffer());
  const mime = detectDocumentMime(buffer, originalName);
  if (!mime) {
    return NextResponse.json(
      { error: "Format non pris en charge : déposez un PDF ou un fichier texte (.txt, .md)" },
      { status: 415 }
    );
  }

  const { count } = await admin
    .from("project_documents")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);
  if ((count ?? 0) >= MAX_DOCUMENTS_PER_PROJECT) {
    return NextResponse.json(
      { error: `${MAX_DOCUMENTS_PER_PROJECT} documents maximum par projet` },
      { status: 409 }
    );
  }

  await ensureDocumentsBucketPrivate(admin);

  const storagePath = `briefs/${projectId}/${crypto.randomUUID()}.${extensionForDocumentMime(mime)}`;
  const { error: uploadError } = await admin.storage
    .from(DOCUMENTS_BUCKET)
    .upload(storagePath, buffer, { contentType: mime, upsert: false });
  if (uploadError) {
    return NextResponse.json({ error: `Stockage : ${uploadError.message}` }, { status: 500 });
  }

  const { data: row, error: insertError } = await admin
    .from("project_documents")
    .insert({
      project_id: projectId,
      kind: "brief",
      file_name: originalName,
      storage_path: storagePath,
      mime_type: mime,
      size_bytes: buffer.byteLength,
      uploaded_by: staff.id,
    })
    .select(SELECT)
    .single();

  if (insertError || !row) {
    // Pas de ligne = pas de fichier orphelin dans le bucket.
    await admin.storage.from(DOCUMENTS_BUCKET).remove([storagePath]);
    return NextResponse.json({ error: insertError?.message ?? "Insertion impossible" }, { status: 500 });
  }

  await logStaffAction(
    {
      staff_id: staff.id,
      staff_email: staff.email ?? null,
      action: "project.document_uploaded",
      entity_type: "project",
      entity_id: projectId,
      metadata: { document_id: row.id, file_name: originalName, mime_type: mime, size_bytes: buffer.byteLength, storage_path: storagePath },
    },
    request
  );

  const [document] = await withUrls(admin, [row as unknown as Row]);
  return NextResponse.json({ document }, { status: 201 });
}
