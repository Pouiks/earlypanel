import { NextRequest, NextResponse } from "next/server";
import { getStaffMember } from "@/lib/staff-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { projectAllowsNdaSend, projectIsClosedForCampaign } from "@/lib/project-lifecycle";
import { tryGetAppUrl } from "@/lib/app-url";
import { logStaffAction } from "@/lib/audit";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const staff = await getStaffMember();
  if (!staff) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Config serveur manquante" }, { status: 500 });

  const { id } = await params;
  const { tester_ids } = await request.json();

  if (!Array.isArray(tester_ids) || tester_ids.length === 0) {
    return NextResponse.json({ error: "tester_ids requis" }, { status: 400 });
  }

  const { data: projRow } = await admin
    .from("projects")
    .select("status")
    .eq("id", id)
    .single();

  if (!projRow) {
    return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
  }
  if (projectIsClosedForCampaign(projRow.status as string)) {
    return NextResponse.json(
      { error: "Projet clos : envoi de NDA impossible" },
      { status: 400 }
    );
  }
  if (!projectAllowsNdaSend(projRow.status as string)) {
    return NextResponse.json({ error: "Statut projet incompatible" }, { status: 400 });
  }

  if (projRow.status === "draft") {
    // Garde-fou : ne pas activer un projet sans question, sinon les testeurs verront un ecran vide
    // et la soumission echouera avec "Aucune question".
    const { count: questionsCount } = await admin
      .from("project_questions")
      .select("id", { count: "exact", head: true })
      .eq("project_id", id);

    if (!questionsCount || questionsCount === 0) {
      return NextResponse.json(
        {
          error:
            "Impossible d'activer le projet : ajoutez au moins une question avant d'envoyer le NDA.",
        },
        { status: 400 }
      );
    }

    await admin.from("projects").update({ status: "active" }).eq("id", id);
  }

  const { data: nda } = await admin
    .from("project_ndas")
    .select("*")
    .eq("project_id", id)
    .single();

  if (!nda) {
    return NextResponse.json(
      { error: "Aucun NDA configuré pour ce projet. Créez-le d'abord." },
      { status: 400 }
    );
  }

  const { data: project } = await admin
    .from("projects")
    .select("title, company_name")
    .eq("id", id)
    .single();

  const results: { tester_id: string; success: boolean; error?: string }[] = [];

  for (const testerId of tester_ids) {
    try {
      const { data: pt } = await admin
        .from("project_testers")
        .select("status")
        .eq("project_id", id)
        .eq("tester_id", testerId)
        .single();

      if (!pt || pt.status !== "selected") {
        results.push({ tester_id: testerId, success: false, error: "Testeur non eligible" });
        continue;
      }

      const { data: tester } = await admin
        .from("testers")
        .select("email, first_name, last_name")
        .eq("id", testerId)
        .single();

      if (!tester) {
        results.push({ tester_id: testerId, success: false, error: "Testeur introuvable" });
        continue;
      }

      const appUrl = tryGetAppUrl();
      if (!appUrl) {
        console.error("[nda/send] APP_URL missing in prod");
        results.push({ tester_id: testerId, success: false, error: "Service indisponible" });
        continue;
      }
      const docLink = `${appUrl}/app/dashboard/documents`;

      // G5 : envoyer l'email AVANT toute mise a jour de statut. Si l'envoi
      // echoue, on ne marque pas le testeur en `nda_sent`, ce qui permet une
      // re-tentative ulterieure sans laisser le testeur en etat "envoye sans
      // email".
      try {
        await sendEmail({
          to: tester.email,
          toName: `${tester.first_name} ${tester.last_name}`,
          subject: `NDA a signer - ${project?.title || "Mission earlypanel"}`,
          html: buildNdaNotificationEmail(
            tester.first_name || "",
            project?.title || "votre mission",
            project?.company_name || "",
            docLink
          ),
        });
      } catch (mailErr) {
        // Log detaille cote serveur, message generique cote client (G5).
        console.error("[nda/send] Email send failed for", testerId, mailErr);
        results.push({
          tester_id: testerId,
          success: false,
          error: "Envoi de l'email impossible. Reessayez plus tard.",
        });
        continue;
      }

      // G6 : transition atomique selected -> nda_sent. Le filtre `.eq("status","selected")`
      // empeche un double envoi si une autre requete concurrente a deja modifie le statut.
      const { data: updatedRows, error: updateError } = await admin
        .from("project_testers")
        .update({ status: "nda_sent", nda_sent_at: new Date().toISOString() })
        .eq("project_id", id)
        .eq("tester_id", testerId)
        .eq("status", "selected")
        .select("id");

      if (updateError) {
        console.error("[nda/send] DB update failed AFTER email sent for", testerId, updateError.message);
        // L'email est deja parti : on ne peut pas le rollback. On signale a
        // l'operateur via les logs ; cote API on remonte un succes partiel.
        results.push({
          tester_id: testerId,
          success: false,
          error: "Email envoye mais statut non mis a jour. Contactez le support.",
        });
        continue;
      }

      if (!updatedRows || updatedRows.length === 0) {
        // Race: statut change entre la lecture et l'update. Email parti quand meme.
        console.warn("[nda/send] Race: status changed after email send for", testerId);
        results.push({
          tester_id: testerId,
          success: false,
          error: "Statut testeur modifie entre temps. Email envoye, statut non mis a jour.",
        });
        continue;
      }

      await logStaffAction(
        {
          staff_id: staff.id,
          staff_email: staff.email,
          action: "nda.sent",
          entity_type: "project_tester",
          entity_id: updatedRows[0].id as string,
          metadata: {
            project_id: id,
            tester_id: testerId,
            tester_email: tester.email,
            project_title: project?.title ?? null,
            nda_id: nda.id,
          },
        },
        request,
      );

      results.push({ tester_id: testerId, success: true });
    } catch (err) {
      // Message generique cote API : on ne fuite pas l'erreur interne (G5/G13).
      console.error("[nda/send] Unexpected error for", testerId, err);
      results.push({
        tester_id: testerId,
        success: false,
        error: "Erreur lors de l'envoi du NDA.",
      });
    }
  }

  const sent = results.filter((r) => r.success).length;
  return NextResponse.json({ sent, total: tester_ids.length, results });
}

function buildNdaNotificationEmail(
  firstName: string,
  projectTitle: string,
  companyName: string,
  docLink: string
): string {
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
          <p style="font-size:16px;color:#1d1d1f;margin:0 0 16px;font-weight:600;">Bonjour ${firstName},</p>
          <p style="font-size:14px;color:#6e6e73;line-height:1.6;margin:0 0 8px;">Un accord de confidentialité (NDA) est disponible dans votre espace pour le projet :</p>
          <p style="font-size:15px;color:#1d1d1f;font-weight:700;margin:8px 0 4px;">${projectTitle}</p>
          ${companyName ? `<p style="font-size:13px;color:#86868B;margin:0 0 20px;">${companyName}</p>` : ""}
          <p style="font-size:14px;color:#6e6e73;line-height:1.6;margin:0 0 28px;">Pour participer à cette mission, veuillez lire et signer ce document dans votre espace personnel.</p>
          <a href="${docLink}" style="display:inline-block;background:#0A7A5A;color:#fff;padding:14px 28px;border-radius:980px;font-size:15px;font-weight:700;text-decoration:none;">Voir mes documents →</a>
          <p style="font-size:12px;color:#86868B;line-height:1.5;margin:28px 0 0;">Si vous n'êtes pas concerné par cette demande, ignorez cet email.</p>
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
