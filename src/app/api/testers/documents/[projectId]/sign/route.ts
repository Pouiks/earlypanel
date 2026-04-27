import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateNdaPdf, buildNdaVariables } from "@/lib/nda-pdf";
import { logStaffAction } from "@/lib/audit";
import { sendEmail } from "@/lib/email";
import { tryGetAppUrl } from "@/lib/app-url";

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
  // G4 : data.buffer peut etre plus grand que la vue (cas d'un Uint8Array slice).
  // On copie les octets utiles dans un nouveau Uint8Array pour ne hasher QUE
  // la zone correspondant a la vue, et eviter aussi les soucis de typage avec
  // SharedArrayBuffer (digest n'accepte que ArrayBuffer / ArrayBufferView).
  const exact = new Uint8Array(data.byteLength);
  exact.set(data);
  const hashBuffer = await crypto.subtle.digest("SHA-256", exact);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function ensureDocumentsBucketPrivate(
  admin: ReturnType<typeof createAdminClient>
): Promise<void> {
  if (!admin) return;
  const { data: buckets } = await admin.storage.listBuckets();
  const existing = buckets?.find((b) => b.name === "documents");
  if (!existing) {
    // G4 : bucket doit etre PRIVE (les NDA contiennent des donnees personnelles).
    await admin.storage.createBucket("documents", { public: false });
    return;
  }
  if (existing.public) {
    // Bucket cree historiquement en public : on le bascule en prive (best-effort).
    try {
      await admin.storage.updateBucket("documents", { public: false });
    } catch (err) {
      console.error("[NDA sign] Failed to flip documents bucket to private", err);
    }
  }
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

  await ensureDocumentsBucketPrivate(admin);

  const { error: uploadError } = await admin.storage
    .from("documents")
    .upload(filePath, pdfBytes, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadError) {
    // G4 : si l'upload echoue, on REFUSE de signer. Sans PDF stocke, marquer
    // le NDA comme signe rendrait la preuve juridique incomplete et empecherait
    // toute reprise (puisque la transition `nda_sent -> nda_signed` est unique).
    console.error("[NDA sign] Storage upload failed:", uploadError.message);
    return NextResponse.json(
      { error: "Stockage du document indisponible. Reessayez dans quelques instants." },
      { status: 503 }
    );
  }

  // G4 : on stocke le PATH dans le bucket prive (et non une URL publique).
  // Le prefixe `storage:` permet a /api/testers/documents de detecter qu'il
  // doit generer une URL signee a la volee. Les URL publiques historiques
  // restent lisibles tant qu'elles n'ont pas ce prefixe.
  const documentRef = `storage:${filePath}`;

  // G6 : transition atomique nda_sent -> nda_signed. Le filtre `.eq("status", "nda_sent")`
  // garantit qu'un second appel concurrent qui ne trouve plus la ligne en
  // nda_sent ne re-signe pas le meme NDA.
  const { data: updatedRows, error: updateError } = await admin
    .from("project_testers")
    .update({
      status: "nda_signed",
      nda_signed_at: signedAt,
      nda_document_url: documentRef,
      nda_signer_ip: ip,
      nda_signer_user_agent: userAgent,
      nda_document_hash: documentHash,
    })
    .eq("project_id", projectId)
    .eq("tester_id", tester.id)
    .eq("status", "nda_sent")
    .select("id");

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  if (!updatedRows || updatedRows.length === 0) {
    // Race ou re-tentative : la ligne n'est plus en nda_sent.
    return NextResponse.json(
      { error: "Le NDA n'est plus a l'etat 'envoye' (deja signe ou expire)" },
      { status: 409 }
    );
  }

  // Genere l'URL signee retournee a l'UI (TTL court = 1h).
  const { data: signedUrlData } = await admin.storage
    .from("documents")
    .createSignedUrl(filePath, 60 * 60);

  // Audit log immuable separe : la table `staff_audit_log` est append-only
  // (pas d'UPDATE/DELETE) et son contenu sert de preuve de la chaine de
  // signature en cas de litige. On y stocke un snapshot complet des elements
  // de preuve (hash, IP, UA, ref NDA, timestamp serveur, signataire).
  await logStaffAction(
    {
      staff_id: null,
      staff_email: tester.email as string,
      action: "nda.signed_by_tester",
      entity_type: "project_tester",
      entity_id: pt.id as string,
      metadata: {
        tester_id: tester.id,
        project_id: projectId,
        nda_ref: variables.nda_ref,
        document_hash: documentHash,
        document_path: filePath,
        signed_at_iso: signedAt,
        // tester_email duplique le staff_email pour faciliter la recherche
        // ulterieure dans l'audit log (le champ staff_email est utilise
        // comme "qui a fait l'action" - ici le tester lui-meme).
        tester_email: tester.email,
        tester_first_name: tester.first_name,
        tester_last_name: tester.last_name,
        tester_birth_date: tester.birth_date ?? null,
      },
    },
    request
  );

  // Email post-signature : confirme au testeur que son NDA est valide et
  // l'oriente vers sa mission. Best-effort : un echec d'envoi ne doit pas
  // invalider la signature deja faite.
  try {
    const appUrl = tryGetAppUrl();
    if (appUrl) {
      const missionLink = `${appUrl}/app/dashboard/missions`;
      await sendEmail({
        to: tester.email as string,
        toName: `${tester.first_name ?? ""} ${tester.last_name ?? ""}`.trim() || undefined,
        subject: `NDA validé - démarrez votre mission ${project?.title ?? ""}`,
        html: buildPostSignatureEmail({
          firstName: (tester.first_name as string) ?? "",
          projectTitle: (project?.title as string) ?? "votre mission",
          companyName: (project?.company_name as string) ?? "",
          missionLink,
          ndaRef: variables.nda_ref,
        }),
      });
    }
  } catch (mailErr) {
    // Best-effort : on log mais on ne casse pas la reponse.
    console.error("[NDA sign] post-signature email failed", mailErr);
  }

  return NextResponse.json({
    success: true,
    signed_at: signedAt,
    document_url: signedUrlData?.signedUrl ?? null,
    document_hash: documentHash,
    nda_ref: variables.nda_ref,
  });
}

function buildPostSignatureEmail(opts: {
  firstName: string;
  projectTitle: string;
  companyName: string;
  missionLink: string;
  ndaRef: string;
}): string {
  const greeting = opts.firstName ? `Bonjour ${opts.firstName},` : "Bonjour,";
  return `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#fff;border-radius:20px;overflow:hidden;">
        <tr><td style="background:#0A7A5A;padding:24px 32px;">
          <span style="font-size:18px;font-weight:700;color:#fff;letter-spacing:-0.5px;">early<span style="color:#2DD4A0;">panel</span></span>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="font-size:16px;color:#1d1d1f;margin:0 0 16px;font-weight:600;">${greeting}</p>
          <p style="font-size:14px;color:#6e6e73;line-height:1.6;margin:0 0 8px;">Votre accord de confidentialité a bien été signé pour le projet :</p>
          <p style="font-size:15px;color:#1d1d1f;font-weight:700;margin:8px 0 4px;">${opts.projectTitle}</p>
          ${opts.companyName ? `<p style="font-size:13px;color:#86868B;margin:0 0 20px;">${opts.companyName}</p>` : ""}
          <p style="font-size:14px;color:#6e6e73;line-height:1.6;margin:0 0 28px;">Vous pouvez désormais accéder à la mission et la démarrer dès maintenant.</p>
          <a href="${opts.missionLink}" style="display:inline-block;background:#0A7A5A;color:#fff;padding:14px 28px;border-radius:980px;font-size:15px;font-weight:700;text-decoration:none;">Démarrer la mission →</a>
          <p style="font-size:12px;color:#86868B;line-height:1.5;margin:28px 0 0;">Référence du NDA signé : <strong>${opts.ndaRef}</strong></p>
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:0.5px solid rgba(0,0,0,0.08);">
          <p style="font-size:11px;color:#86868B;margin:0;">earlypanel · Made in France</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();
}
