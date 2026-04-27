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
    const rlIp = rateLimit(`staff_magic:ip:${ip}`, { windowMs: 60_000, max: 5 });
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

    const rlEmail = rateLimit(`staff_magic:email:${emailNormalized}`, {
      windowMs: 60 * 60 * 1000,
      max: 3,
    });
    if (!rlEmail.ok) {
      console.warn("[staff/login/magic] rate limit hit for email", emailNormalized);
      return NextResponse.json({ success: true });
    }

    const appUrl = tryGetAppUrl();
    if (!appUrl) {
      console.error("[staff/login/magic] APP_URL missing in prod");
      return NextResponse.json(
        { error: "Service indisponible. Réessayez plus tard." },
        { status: 500 }
      );
    }

    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json({ error: "Configuration serveur manquante" }, { status: 500 });
    }

    // On ne genere/envoie un magic link que si l'email correspond a un staff.
    // 200 systematique pour anti-enumeration.
    const { data: member } = await admin
      .from("staff_members")
      .select("id, email")
      .eq("email", emailNormalized)
      .maybeSingle();

    if (!member) {
      return NextResponse.json({ success: true });
    }

    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: emailNormalized,
      options: {
        redirectTo: `${appUrl}/staff/auth/callback`,
      },
    });

    if (linkError || !linkData) {
      console.warn("[staff/login/magic] generateLink failed:", linkError?.message);
      return NextResponse.json({ success: true });
    }

    const hashedToken = linkData.properties?.hashed_token;
    const magicLink = hashedToken
      ? `${appUrl}/staff/auth/callback?token_hash=${encodeURIComponent(hashedToken)}&type=magiclink`
      : linkData.properties?.action_link || "";

    if (!magicLink) {
      console.warn("[staff/login/magic] No link generated for", emailNormalized);
      return NextResponse.json({ success: true });
    }

    await sendEmail({
      to: emailNormalized,
      subject: "Votre lien de connexion staff earlypanel",
      html: buildMagicLinkEmail(magicLink),
    });

    await logStaffAction(
      {
        staff_id: member.id,
        staff_email: emailNormalized,
        action: "staff.magic_link_requested",
        entity_type: "auth_user",
      },
      request
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[staff/login/magic] Error:", error);
    return NextResponse.json({ success: true });
  }
}

function buildMagicLinkEmail(link: string): string {
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
        Votre lien de connexion
      </h1>
      <p style="font-size: 15px; color: #6e6e73; line-height: 1.6; text-align: center; margin: 0 0 28px;">
        Cliquez sur le bouton ci-dessous pour accéder à l'espace staff.
        Ce lien est valable 1 heure et à usage unique.
      </p>
      <div style="text-align: center; margin-bottom: 28px;">
        <a href="${link}" style="display: inline-block; padding: 14px 36px; background: #0A7A5A; color: #fff; border-radius: 980px; font-size: 15px; font-weight: 700; text-decoration: none;">
          Se connecter &rarr;
        </a>
      </div>
      <p style="font-size: 12px; color: #86868b; text-align: center; line-height: 1.5;">
        Si vous n&apos;avez pas demandé ce lien, ignorez cet email.
      </p>
    </div>
  `;
}
