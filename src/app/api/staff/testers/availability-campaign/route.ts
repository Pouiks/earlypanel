import { NextRequest, NextResponse } from "next/server";
import { getStaffMember } from "@/lib/staff-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, buildAvailabilityCampaignEmail } from "@/lib/email";
import { signActionToken } from "@/lib/action-token";
import { tryGetAppUrl } from "@/lib/app-url";
import { logStaffAction } from "@/lib/audit";

export const runtime = "nodejs";
// Envoi séquentiel throttlé (~2,5 mails/s) : sur un gros volume la fonction doit
// pouvoir tourner plus que les 10-15 s par défaut de Vercel, sinon elle est tuée
// en plein milieu (envoi partiel + erreur affichée). 60 s couvre ~150 mails.
export const maxDuration = 60;

/**
 * POST /api/staff/testers/availability-campaign
 *
 * Envoie à tous les testeurs actifs (status='active' + profile_completed) un
 * email « êtes-vous toujours disponible ? » avec 2 boutons cliquables sans
 * login. Pattern email-avant-DB (cf. nda/send) : envoi → puis marquage
 * `availability_check_sent_at`. Cooldown 7 j = idempotence (ré-appelable pour
 * drainer un gros volume ; un double-clic ne renvoie pas 2×).
 *
 * Body (optionnel) : { tester_ids?: string[] } pour cibler un sous-ensemble.
 */
const COOLDOWN_DAYS = 7;

export async function POST(request: NextRequest) {
  const staff = await getStaffMember();
  if (!staff) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Config serveur manquante" }, { status: 500 });

  const appUrl = tryGetAppUrl();
  if (!appUrl) {
    return NextResponse.json({ error: "APP_URL non configuré" }, { status: 500 });
  }

  const body = await request.json().catch(() => ({}));
  const testerIds = Array.isArray(body?.tester_ids)
    ? (body.tester_ids as unknown[]).filter((x): x is string => typeof x === "string")
    : null;
  // Mode test : envoi à UN SEUL destinataire (par email), sans cooldown et sans
  // marquer availability_check_sent_at — pour valider le rendu + les liens en
  // conditions réelles avant le tir de masse, sans consommer le cooldown.
  const testEmail =
    typeof body?.test_email === "string" && body.test_email.trim() ? body.test_email.trim() : null;
  const isTest = !!testEmail;

  let recipients: { id: string; email: string | null; first_name: string | null }[] | null;
  if (isTest) {
    const { data, error } = await admin
      .from("testers")
      .select("id, email, first_name")
      .ilike("email", testEmail!)
      .limit(1);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data || data.length === 0) {
      return NextResponse.json({ error: `Aucun testeur avec l'email ${testEmail}` }, { status: 404 });
    }
    recipients = data;
  } else {
    const cooldownIso = new Date(Date.now() - COOLDOWN_DAYS * 24 * 60 * 60 * 1000).toISOString();
    // Destinataires : actifs + profil complet, hors cooldown.
    let query = admin
      .from("testers")
      .select("id, email, first_name")
      .eq("status", "active")
      .eq("profile_completed", true)
      .or(`availability_check_sent_at.is.null,availability_check_sent_at.lt.${cooldownIso}`);
    if (testerIds && testerIds.length > 0) query = query.in("id", testerIds);

    const { data, error: selErr } = await query;
    if (selErr) {
      return NextResponse.json({ error: selErr.message }, { status: 500 });
    }
    recipients = data;
  }

  const results: { tester_id: string; success: boolean; error?: string }[] = [];
  const throttle = process.env.SKIP_EMAILS !== "true"; // pas de débit Resend à gérer en dev

  for (const t of recipients ?? []) {
    if (!t.email) continue;
    try {
      const confirmToken = signActionToken(t.id as string, "availability_confirm");
      const manageToken = signActionToken(t.id as string, "availability_manage");
      const ouiUrl = `${appUrl}/app/auth/availability?token=${encodeURIComponent(confirmToken)}&choice=oui`;
      const nonUrl = `${appUrl}/app/auth/availability?token=${encodeURIComponent(manageToken)}&choice=non`;

      // Email d'abord (email-avant-DB).
      await sendEmail({
        to: t.email as string,
        toName: (t.first_name as string) || undefined,
        subject: "Êtes-vous toujours disponible pour des tests earlypanel ?",
        html: buildAvailabilityCampaignEmail({
          firstName: (t.first_name as string) ?? null,
          ouiUrl,
          nonUrl,
        }),
      });

      // Puis marquage d'idempotence — SAUF en mode test (ne pas consommer le
      // cooldown du destinataire de test).
      if (!isTest) {
        await admin
          .from("testers")
          .update({ availability_check_sent_at: new Date().toISOString() })
          .eq("id", t.id);
      }

      results.push({ tester_id: t.id as string, success: true });
    } catch (e) {
      results.push({ tester_id: t.id as string, success: false, error: e instanceof Error ? e.message : "Erreur envoi" });
    }

    if (throttle && !isTest) await new Promise((r) => setTimeout(r, 400)); // ~2,5 mails/s
  }

  const sent = results.filter((r) => r.success).length;

  await logStaffAction(
    {
      staff_id: staff.id,
      staff_email: staff.email,
      action: isTest ? "availability_campaign.test" : "availability_campaign.sent",
      entity_type: "tester",
      metadata: {
        sent,
        total: results.length,
        cooldown_days: COOLDOWN_DAYS,
        targeted_subset: !!testerIds,
        test_email: testEmail ?? undefined,
        errors: results.filter((r) => !r.success),
      },
    },
    request
  );

  return NextResponse.json({
    sent,
    total: results.length,
    test: isTest,
    errors: results.filter((r) => !r.success),
  });
}
