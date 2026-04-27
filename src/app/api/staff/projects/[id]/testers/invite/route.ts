import { NextRequest, NextResponse } from "next/server";
import { getStaffMember } from "@/lib/staff-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import {
  projectAllowsNdaSend,
  projectAllowsStaffAssignTesters,
  projectIsClosedForCampaign,
} from "@/lib/project-lifecycle";
import { tryGetAppUrl } from "@/lib/app-url";
import { defaultNdaHtml } from "@/lib/nda-pdf";
import { logStaffAction } from "@/lib/audit";
import {
  REQUIRED_FIELDS,
  isTesterEligibleForInvitation,
} from "@/lib/profile-completeness";

// Endpoint d'invitation automatisee : combine les anciennes etapes
// "assigner" (POST .../testers) + "envoyer NDA" (POST .../nda/send) en une
// seule action atomique. Le testeur passe directement de "non assigne" a
// "nda_sent" sans transition par "selected".
//
// Conserve toutes les gardes existantes :
//   - Projet non clos / archive
//   - Testeurs actifs avec profil complet uniquement
//   - Au moins une question avant activation auto du projet
//   - Email envoye AVANT la transition (rollback impossible si DB plante apres)
//   - Auto-creation du NDA via defaultNdaHtml() si aucun configure
//
// L'endpoint legacy POST .../testers reste disponible pour les cas
// "shortlist sans envoi" (ajout en status='selected').

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const staff = await getStaffMember();
  if (!staff) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Config serveur manquante" }, { status: 500 });

  const { id: projectId } = await params;
  const { tester_ids } = await request.json();

  if (!Array.isArray(tester_ids) || tester_ids.length === 0) {
    return NextResponse.json({ error: "tester_ids requis" }, { status: 400 });
  }

  const { data: proj } = await admin
    .from("projects")
    .select("status, title, company_name")
    .eq("id", projectId)
    .single();

  if (!proj) return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });

  if (projectIsClosedForCampaign(proj.status as string)) {
    return NextResponse.json(
      { error: "Projet clos : invitation impossible" },
      { status: 400 }
    );
  }
  if (!projectAllowsStaffAssignTesters(proj.status as string)) {
    return NextResponse.json({ error: "Statut projet incompatible" }, { status: 400 });
  }
  if (!projectAllowsNdaSend(proj.status as string)) {
    return NextResponse.json({ error: "Statut projet incompatible pour l'envoi NDA" }, { status: 400 });
  }

  // Garde-fou : au moins une question avant d'activer/inviter (sinon le
  // testeur arrive sur un ecran vide).
  const { count: questionsCount } = await admin
    .from("project_questions")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);

  if (!questionsCount || questionsCount === 0) {
    return NextResponse.json(
      { error: "Ajoutez au moins une question avant d'inviter des testeurs." },
      { status: 400 }
    );
  }

  // Filtrage eligibilite : seuls les testeurs actifs avec profil COMPLET
  // (ie. tous les champs requis pour le NDA + activation) peuvent recevoir
  // une invitation. Defense en profondeur : on ne se repose pas uniquement
  // sur `profile_completed` car cette colonne pourrait etre desyncro avec
  // le contenu reel (cf. PROJECT_CONTEXT C14). On recalcule via
  // computeProfileCompleteness sur les champs eux-memes.
  const SELECT_FIELDS = [
    "id",
    "email",
    "first_name",
    "last_name",
    "status",
    "profile_completed",
    ...REQUIRED_FIELDS.map((f) => f.key),
  ].join(", ");

  const { data: candidates } = await admin
    .from("testers")
    .select(SELECT_FIELDS)
    .in("id", tester_ids);

  type Candidate = {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    status: string;
    profile_completed: boolean;
    [key: string]: unknown;
  };

  const eligible: Candidate[] = ((candidates as unknown as Candidate[]) ?? []).filter(
    (t) => isTesterEligibleForInvitation(t)
  );
  const eligibleIds = eligible.map((t) => t.id);
  const rejectedIds = tester_ids.filter((id: string) => !eligibleIds.includes(id));

  if (eligibleIds.length === 0) {
    return NextResponse.json(
      {
        error:
          "Aucun testeur eligible : seuls les testeurs actifs avec un profil complet (incluant adresse, ville, code postal, date de naissance) peuvent etre invites.",
        rejected_tester_ids: rejectedIds,
      },
      { status: 400 }
    );
  }

  // Auto-creation du NDA avec le template par defaut si absent. Cela evite
  // que le staff ait a configurer le NDA explicitement avant d'inviter -
  // simplifie le flow tout en restant correct (le defaut est valide).
  const { data: existingNda } = await admin
    .from("project_ndas")
    .select("id, title, content_html")
    .eq("project_id", projectId)
    .maybeSingle();

  let nda = existingNda;
  if (!nda) {
    const { data: created, error: createNdaError } = await admin
      .from("project_ndas")
      .insert({
        project_id: projectId,
        title: "Accord de confidentialité (NDA)",
        content_html: defaultNdaHtml(),
      })
      .select("id, title, content_html")
      .single();
    if (createNdaError) {
      return NextResponse.json(
        { error: `Impossible de créer le NDA par défaut : ${createNdaError.message}` },
        { status: 500 }
      );
    }
    nda = created;
  }

  // Activation du projet si en draft (cohérent avec /nda/send historique).
  if (proj.status === "draft") {
    await admin.from("projects").update({ status: "active" }).eq("id", projectId);
  }

  const appUrl = tryGetAppUrl();
  if (!appUrl) {
    return NextResponse.json(
      { error: "Service indisponible : URL applicative non configurée." },
      { status: 500 }
    );
  }
  const docLink = `${appUrl}/app/dashboard/documents`;
  const nowIso = new Date().toISOString();

  const results: { tester_id: string; success: boolean; error?: string }[] = [];

  // Pour chaque testeur eligible : upsert atomique en nda_sent + email.
  // On envoie l'email AVANT le UPDATE final pour que, si l'email echoue,
  // le testeur reste en etat "non invite" et on puisse retenter (memo
  // pattern utilise dans /nda/send historique).
  for (const candidate of eligible) {
    try {
      // Verification de l'etat actuel du project_tester. Trois cas :
      //   1) N'existe pas → on insert direct en nda_sent
      //   2) Existe en 'selected' → on transitionne vers nda_sent
      //   3) Existe en autre statut (nda_sent, signed, ...) → skip (deja invite)
      const { data: existing } = await admin
        .from("project_testers")
        .select("id, status")
        .eq("project_id", projectId)
        .eq("tester_id", candidate.id)
        .maybeSingle();

      if (existing && existing.status !== "selected") {
        results.push({
          tester_id: candidate.id,
          success: false,
          error: `Testeur deja en statut '${existing.status}'`,
        });
        continue;
      }

      // Envoi email d'abord (G5 : pas de transition avant envoi reussi)
      try {
        await sendEmail({
          to: candidate.email as string,
          toName: `${candidate.first_name ?? ""} ${candidate.last_name ?? ""}`.trim() || undefined,
          subject: `NDA a signer - ${proj.title ?? "Mission earlypanel"}`,
          html: buildNdaInviteEmail({
            firstName: (candidate.first_name as string) ?? "",
            projectTitle: (proj.title as string) ?? "votre mission",
            companyName: (proj.company_name as string) ?? "",
            docLink,
          }),
        });
      } catch (mailErr) {
        console.error("[testers/invite] email send failed for", candidate.id, mailErr);
        results.push({
          tester_id: candidate.id,
          success: false,
          error: "Envoi de l'email impossible. Réessayez plus tard.",
        });
        continue;
      }

      // Transition / insert atomique. Pour le cas 1 (n'existe pas), upsert
      // avec onConflict ignoreDuplicates ne marche pas car on veut update
      // si selected. On fait deux branches distinctes pour rester atomique :
      if (existing) {
        // Transition selected → nda_sent (filtre sur status pour atomicite)
        const { data: updated, error: updErr } = await admin
          .from("project_testers")
          .update({ status: "nda_sent", nda_sent_at: nowIso })
          .eq("id", existing.id)
          .eq("status", "selected")
          .select("id");

        if (updErr || !updated || updated.length === 0) {
          console.error("[testers/invite] transition failed AFTER email", candidate.id, updErr?.message);
          results.push({
            tester_id: candidate.id,
            success: false,
            error: "Email envoyé mais statut non mis à jour. Contactez le support.",
          });
          continue;
        }
      } else {
        // Insert direct en nda_sent
        const { error: insErr } = await admin
          .from("project_testers")
          .insert({
            project_id: projectId,
            tester_id: candidate.id,
            status: "nda_sent",
            nda_sent_at: nowIso,
          });

        if (insErr) {
          console.error("[testers/invite] insert failed AFTER email", candidate.id, insErr.message);
          results.push({
            tester_id: candidate.id,
            success: false,
            error: "Email envoyé mais assignation non créée. Contactez le support.",
          });
          continue;
        }
      }

      results.push({ tester_id: candidate.id, success: true });
    } catch (err) {
      console.error("[testers/invite] unexpected error for", candidate.id, err);
      results.push({
        tester_id: candidate.id,
        success: false,
        error: "Erreur lors de l'invitation",
      });
    }
  }

  const successCount = results.filter((r) => r.success).length;

  await logStaffAction(
    {
      staff_id: staff.id,
      staff_email: staff.email,
      action: "project.testers_invited",
      entity_type: "project",
      entity_id: projectId,
      metadata: {
        invited_count: successCount,
        total_requested: tester_ids.length,
        rejected_for_eligibility: rejectedIds.length,
        results: results.map((r) => ({
          tester_id: r.tester_id,
          success: r.success,
          error: r.error ?? null,
        })),
      },
    },
    request
  );

  return NextResponse.json({
    invited: successCount,
    total: tester_ids.length,
    rejected_tester_ids: rejectedIds,
    results,
  });
}

function buildNdaInviteEmail(opts: {
  firstName: string;
  projectTitle: string;
  companyName: string;
  docLink: string;
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
          <p style="font-size:14px;color:#6e6e73;line-height:1.6;margin:0 0 8px;">Vous avez été invité(e) à participer à un nouveau projet de test :</p>
          <p style="font-size:15px;color:#1d1d1f;font-weight:700;margin:8px 0 4px;">${opts.projectTitle}</p>
          ${opts.companyName ? `<p style="font-size:13px;color:#86868B;margin:0 0 20px;">${opts.companyName}</p>` : ""}
          <p style="font-size:14px;color:#6e6e73;line-height:1.6;margin:0 0 28px;">Avant de démarrer, merci de signer l'accord de confidentialité (NDA) dans votre espace personnel.</p>
          <a href="${opts.docLink}" style="display:inline-block;background:#0A7A5A;color:#fff;padding:14px 28px;border-radius:980px;font-size:15px;font-weight:700;text-decoration:none;">Lire et signer le NDA →</a>
          <p style="font-size:12px;color:#86868B;line-height:1.5;margin:28px 0 0;">Si vous n'êtes pas concerné par cette invitation, ignorez cet email.</p>
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
