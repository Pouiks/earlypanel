import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { tryGetAppUrl } from "@/lib/app-url";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { logStaffAction } from "@/lib/audit";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rlIp = rateLimit(`staff_forgot:ip:${ip}`, { windowMs: 60_000, max: 3 });
    if (!rlIp.ok) {
      return NextResponse.json(
        { error: "Trop de requêtes, réessayez dans une minute" },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rlIp.retryAfterMs / 1000)) } }
      );
    }

    const { email } = await request.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email requis" }, { status: 400 });
    }

    const emailNormalized = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(emailNormalized)) {
      return NextResponse.json({ error: "Email invalide" }, { status: 400 });
    }

    const rlEmail = rateLimit(`staff_forgot:email:${emailNormalized}`, {
      windowMs: 60 * 60 * 1000,
      max: 3,
    });
    if (!rlEmail.ok) {
      // Anti-enumeration : meme reponse que le succes.
      console.warn("[staff/forgot] rate limit hit for email", emailNormalized);
      return NextResponse.json({ success: true });
    }

    const appUrl = tryGetAppUrl();
    if (!appUrl) {
      console.error("[staff/forgot] APP_URL missing in prod");
      return NextResponse.json(
        { error: "Service indisponible. Réessayez plus tard." },
        { status: 500 }
      );
    }

    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json({ error: "Configuration serveur manquante" }, { status: 500 });
    }

    // On ne genere le lien que si l'email correspond reellement a un membre
    // staff (sinon Supabase enverrait un email recovery a n'importe qui).
    // Mais on retourne 200 dans tous les cas pour eviter l'enumeration.
    const { data: member } = await admin
      .from("staff_members")
      .select("id, email")
      .eq("email", emailNormalized)
      .maybeSingle();

    if (!member) {
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
      console.warn("[staff/forgot] generateLink failed:", linkError?.message);
      return NextResponse.json({ success: true });
    }

    const hashedToken = linkData.properties?.hashed_token;
    const recoveryLink = hashedToken
      ? `${appUrl}/staff/auth/callback?token_hash=${encodeURIComponent(hashedToken)}&type=recovery`
      : linkData.properties?.action_link || "";

    if (!recoveryLink) {
      console.warn("[staff/forgot] No recovery link generated for", emailNormalized);
      return NextResponse.json({ success: true });
    }

    await sendEmail({
      to: emailNormalized,
      subject: "Réinitialisation de votre mot de passe earlypanel",
      html: buildRecoveryEmail(recoveryLink),
    });

    await logStaffAction(
      {
        staff_id: member.id,
        staff_email: emailNormalized,
        action: "staff.password_recovery_requested",
        entity_type: "auth_user",
      },
      request
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[staff/forgot] Error:", error);
    return NextResponse.json({ success: true });
  }
}

function buildRecoveryEmail(link: string): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <span style="font-size: 22px; font-weight: 700; color: #1d1d1f; letter-spacing: -0.04em;">
          early<span style="color: #0A7A5A;">panel</span>
        </span>
        <div style="margin-top: 6px; font-size: 11px; font-weight: 600; color: #0A7A5A; text-transform: uppercase; letter-spacing: 0.08em;">
          Espace Staff
        </div>
      </div>
      <h1 style="font-size: 20px; font-weight: 700; color: #1d1d1f; margin: 0 0 12px; text-align: center;">
        Réinitialiser votre mot de passe
      </h1>
      <p style="font-size: 15px; color: #6e6e73; line-height: 1.6; text-align: center; margin: 0 0 28px;">
        Vous avez demandé à réinitialiser votre mot de passe.
        Cliquez sur le bouton ci-dessous pour définir un nouveau mot de passe.
        Ce lien est valable 1 heure.
      </p>
      <div style="text-align: center; margin-bottom: 28px;">
        <a href="${link}" style="display: inline-block; padding: 14px 36px; background: #0A7A5A; color: #fff; border-radius: 980px; font-size: 15px; font-weight: 700; text-decoration: none;">
          Choisir un nouveau mot de passe &rarr;
        </a>
      </div>
      <p style="font-size: 12px; color: #86868b; text-align: center; line-height: 1.5;">
        Si vous n&apos;avez pas demandé cette réinitialisation, ignorez cet email — votre mot de passe restera inchangé.
      </p>
    </div>
  `;
}
