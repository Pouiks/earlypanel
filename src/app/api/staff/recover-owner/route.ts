import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { tryGetAppUrl } from "@/lib/app-url";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { logStaffAction } from "@/lib/audit";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Endpoint "break-glass" : utilisable uniquement avec STAFF_SETUP_KEY (env
// var stockee cote Vercel, jamais commitee). Genere un magic link recovery
// pour un compte STAFF ADMIN existant. Permet de retrouver l'acces a la prod
// sans passer par la console Supabase si jamais le mot de passe est perdu.
//
// La meme cle est reutilisee pour /api/staff/setup (bootstrap du 1er admin)
// et pour cet endpoint (recovery). Setup se desactive automatiquement apres
// le 1er admin cree, donc seule l'utilisation recovery reste accessible
// ensuite. Garder la cle longue, secrete, et la rotater apres usage reel.
//
// Utilisation :
//   curl -X POST https://earlypanel.fr/api/staff/recover-owner \
//     -H "Content-Type: application/json" \
//     -d '{"email":"virgilejoinville@gmail.com","recovery_key":"<STAFF_SETUP_KEY>"}'

export async function POST(request: NextRequest) {
  try {
    // Rate limit dur : 3 tentatives/heure par IP. Decourage le brute-force
    // de la cle si elle leakait par accident.
    const ip = getClientIp(request);
    const rl = rateLimit(`recover_owner:ip:${ip}`, {
      windowMs: 60 * 60 * 1000,
      max: 3,
    });
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Trop de tentatives, réessayez plus tard" },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } }
      );
    }

    const expectedKey = process.env.STAFF_SETUP_KEY?.trim();
    if (!expectedKey) {
      console.error("[recover-owner] STAFF_SETUP_KEY non configuree");
      return NextResponse.json({ error: "Endpoint indisponible" }, { status: 503 });
    }

    const { email, recovery_key } = await request.json();

    if (!recovery_key || typeof recovery_key !== "string" || recovery_key !== expectedKey) {
      // Audit explicite des tentatives ratees pour reperer une attaque.
      await logStaffAction(
        {
          staff_id: null,
          staff_email: typeof email === "string" ? email : null,
          action: "staff.recover_owner_rejected",
          metadata: { reason: "invalid_key" },
        },
        request
      );
      return NextResponse.json({ error: "Clé de récupération invalide" }, { status: 403 });
    }

    if (!email || typeof email !== "string" || !EMAIL_REGEX.test(email.trim().toLowerCase())) {
      return NextResponse.json({ error: "Email invalide" }, { status: 400 });
    }

    const emailNormalized = email.trim().toLowerCase();

    const appUrl = tryGetAppUrl();
    if (!appUrl) {
      return NextResponse.json({ error: "Service indisponible" }, { status: 500 });
    }

    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json({ error: "Configuration serveur manquante" }, { status: 500 });
    }

    // Restreint aux staff_members avec role 'admin'. Cela evite que le
    // endpoint puisse servir a recuperer n'importe quel compte staff
    // ordinaire (qui doit passer par /staff/forgot via email).
    const { data: member } = await admin
      .from("staff_members")
      .select("id, email, role")
      .eq("email", emailNormalized)
      .eq("role", "admin")
      .maybeSingle();

    if (!member) {
      await logStaffAction(
        {
          staff_id: null,
          staff_email: emailNormalized,
          action: "staff.recover_owner_rejected",
          metadata: { reason: "not_admin_or_unknown" },
        },
        request
      );
      // On retourne quand meme un succes pour ne pas confirmer l'existence
      // ou non du compte (anti-enumeration meme avec la cle valide).
      return NextResponse.json({ success: true });
    }

    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: "recovery",
      email: emailNormalized,
      options: {
        redirectTo: `${appUrl}/staff/auth/callback`,
      },
    });

    if (linkError || !linkData) {
      console.error("[recover-owner] generateLink failed:", linkError?.message);
      return NextResponse.json({ error: "Impossible de générer le lien" }, { status: 500 });
    }

    const hashedToken = linkData.properties?.hashed_token;
    const recoveryLink = hashedToken
      ? `${appUrl}/staff/auth/callback?token_hash=${encodeURIComponent(hashedToken)}&type=recovery`
      : linkData.properties?.action_link || "";

    if (!recoveryLink) {
      return NextResponse.json({ error: "Impossible de générer le lien" }, { status: 500 });
    }

    await sendEmail({
      to: emailNormalized,
      subject: "[earlypanel] Récupération de votre accès admin",
      html: buildRecoveryEmail(recoveryLink),
    });

    await logStaffAction(
      {
        staff_id: member.id,
        staff_email: emailNormalized,
        action: "staff.recover_owner_used",
        entity_type: "auth_user",
        metadata: { ip_used: ip },
      },
      request
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[recover-owner] Error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

function buildRecoveryEmail(link: string): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <span style="font-size: 22px; font-weight: 700; color: #1d1d1f; letter-spacing: -0.04em;">
          early<span style="color: #0A7A5A;">panel</span>
        </span>
        <div style="margin-top: 6px; font-size: 11px; font-weight: 600; color: #b91c1c; text-transform: uppercase; letter-spacing: 0.08em;">
          Récupération admin
        </div>
      </div>
      <h1 style="font-size: 20px; font-weight: 700; color: #1d1d1f; margin: 0 0 12px; text-align: center;">
        Récupération de votre accès admin
      </h1>
      <p style="font-size: 15px; color: #6e6e73; line-height: 1.6; text-align: center; margin: 0 0 24px;">
        Une demande de récupération d'accès admin a été émise via la clé de secours.
        Si c'est bien vous, cliquez sur le bouton ci-dessous pour définir un nouveau mot de passe.
      </p>
      <div style="background: #fef2f2; border-radius: 12px; padding: 16px; margin: 0 0 24px;">
        <p style="font-size: 13px; color: #991b1b; line-height: 1.5; margin: 0;">
          <strong>Si vous n'êtes pas à l'origine de cette demande</strong>,
          ignorez cet email et changez immédiatement la clé STAFF_SETUP_KEY dans vos variables d'environnement Vercel.
        </p>
      </div>
      <div style="text-align: center; margin-bottom: 28px;">
        <a href="${link}" style="display: inline-block; padding: 14px 36px; background: #0A7A5A; color: #fff; border-radius: 980px; font-size: 15px; font-weight: 700; text-decoration: none;">
          Définir un nouveau mot de passe &rarr;
        </a>
      </div>
      <p style="font-size: 12px; color: #86868b; text-align: center; line-height: 1.5;">
        Lien valable 1 heure, à usage unique.
      </p>
    </div>
  `;
}
