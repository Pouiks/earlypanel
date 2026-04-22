import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateNdaPdf, buildNdaVariables } from "@/lib/nda-pdf";

async function getSupabaseClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); }
          catch { /* Server Component context */ }
        },
      },
    }
  );
}

async function sha256(data: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", data.buffer as ArrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const supabase = await getSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Config serveur manquante" }, { status: 500 });

  const { projectId } = await params;

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown";
  const userAgent = request.headers.get("user-agent") || "unknown";

  const { data: tester } = await admin
    .from("testers")
    .select("*")
    .eq("auth_user_id", user.id)
    .single();

  if (!tester) return NextResponse.json({ error: "Profil introuvable" }, { status: 404 });

  const { data: pt } = await admin
    .from("project_testers")
    .select("id, status")
    .eq("project_id", projectId)
    .eq("tester_id", tester.id)
    .single();

  if (!pt) return NextResponse.json({ error: "Vous n'êtes pas assigné à ce projet" }, { status: 403 });
  if (pt.status === "nda_signed" || pt.status === "invited" || pt.status === "in_progress" || pt.status === "completed") {
    return NextResponse.json({ error: "NDA déjà signé" }, { status: 400 });
  }
  if (pt.status !== "nda_sent") {
    return NextResponse.json({ error: "Aucun NDA à signer pour ce projet" }, { status: 400 });
  }

  const { data: project } = await admin
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();

  const { data: nda } = await admin
    .from("project_ndas")
    .select("title, content_html")
    .eq("project_id", projectId)
    .single();

  if (!nda) return NextResponse.json({ error: "NDA introuvable pour ce projet" }, { status: 404 });

  const signedAt = new Date().toISOString();

  const variables = buildNdaVariables({
    tester: tester as Record<string, unknown>,
    project: (project || {}) as Record<string, unknown>,
    signedAt,
    signerIp: ip,
  });

  const pdfBytes = await generateNdaPdf({
    ndaTitle: nda.title,
    ndaContentHtml: nda.content_html,
    variables,
    signed: true,
  });

  const documentHash = await sha256(pdfBytes);
  const filePath = `ndas/${projectId}/${tester.id}_${Date.now()}.pdf`;

  const { data: buckets } = await admin.storage.listBuckets();
  if (!buckets?.find((b) => b.name === "documents")) {
    await admin.storage.createBucket("documents", { public: true });
  }

  const { error: uploadError } = await admin.storage
    .from("documents")
    .upload(filePath, pdfBytes, {
      contentType: "application/pdf",
      upsert: true,
    });

  let documentUrl = "";
  if (uploadError) {
    console.error("[NDA sign] Storage upload failed:", uploadError.message);
    documentUrl = `storage-error://${filePath}`;
  } else {
    const { data: urlData } = admin.storage.from("documents").getPublicUrl(filePath);
    documentUrl = urlData.publicUrl;
  }

  const { error: updateError } = await admin
    .from("project_testers")
    .update({
      status: "nda_signed",
      nda_signed_at: signedAt,
      nda_document_url: documentUrl,
      nda_signer_ip: ip,
      nda_signer_user_agent: userAgent,
      nda_document_hash: documentHash,
    })
    .eq("project_id", projectId)
    .eq("tester_id", tester.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    signed_at: signedAt,
    document_url: documentUrl,
    document_hash: documentHash,
    nda_ref: variables.nda_ref,
  });
}
