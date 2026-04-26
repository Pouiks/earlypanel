import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { tryGetAppUrl } from "@/lib/app-url";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  try {
    // M3 : rate limit double (IP + email) pour empecher le spam de magic
    // links. Quotas separes : 5/min par IP (anti-bot), 3/heure par email
    // (anti-harcelement d'un compte cible).
    const ip = getClientIp(request);
    const rlIp = rateLimit(`login:ip:${ip}`, { windowMs: 60_000, max: 5 });
    if (!rlIp.ok) {
      return NextResponse.json(
        { error: "Trop de requetes, reessayez dans une minute" },
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

    const rlEmail = rateLimit(`login:email:${emailNormalized}`, {
      windowMs: 60 * 60 * 1000,
      max: 3,
    });
    if (!rlEmail.ok) {
      // M3 : meme reponse que le succes pour ne pas reveler que l'email existe.
      // Le testeur reel n'a pas besoin de plus de 3 magic links par heure.
      console.warn("[Login] rate limit hit for email", emailNormalized);
      return NextResponse.json({ success: true });
    }

    const appUrl = tryGetAppUrl();
    if (!appUrl) {
      console.error("[Login] APP_URL missing in prod");
      return NextResponse.json(
        { error: "Service indisponible. Reessayez plus tard." },
        { status: 500 }
      );
    }

    const adminClient = createAdminClient();
    if (!adminClient) {
      return NextResponse.json({ error: "Configuration serveur manquante" }, { status: 500 });
    }

    const { data: linkData, error: linkError } =
      await adminClient.auth.admin.generateLink({
        type: "magiclink",
        email: emailNormalized,
        options: {
          redirectTo: `${appUrl}/app/auth/callback`,
        },
      });

    // M3 - anti-enumeration : peu importe que l'email existe ou non, on
    // retourne 200 systematiquement. La page de login affiche "Email envoye"
    // dans tous les cas. Si l'email existe vraiment, on envoie le magic link.
    if (linkError || !linkData) {
      console.warn("[Login] generateLink failed (likely user not found):", linkError?.message);
      return NextResponse.json({ success: true });
    }

    const hashedToken = linkData.properties?.hashed_token;
    const magicLink = hashedToken
      ? `${appUrl}/app/auth/callback?token_hash=${encodeURIComponent(hashedToken)}&type=magiclink`
      : linkData.properties?.action_link || "";

    if (!magicLink) {
      console.warn("[Login] No magic link generated for", emailNormalized);
      return NextResponse.json({ success: true });
    }

    await sendEmail({
      to: emailNormalized,
      subject: "Votre lien de connexion earlypanel",
      html: buildLoginEmail(magicLink),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Login] Error:", error);
    // Meme en cas d'erreur interne, on ne distingue pas pour eviter l'enumeration.
    return NextResponse.json({ success: true });
  }
}

function buildLoginEmail(magicLink: string): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <span style="font-size: 22px; font-weight: 700; color: #1d1d1f; letter-spacing: -0.04em;">
          early<span style="color: #0A7A5A;">panel</span>
        </span>
      </div>
      <h1 style="font-size: 20px; font-weight: 700; color: #1d1d1f; margin: 0 0 12px; text-align: center;">
        Votre lien de connexion
      </h1>
      <p style="font-size: 15px; color: #6e6e73; line-height: 1.6; text-align: center; margin: 0 0 28px;">
        Cliquez sur le bouton ci-dessous pour accéder à votre espace testeur.
        Ce lien est valable 1 heure.
      </p>
      <div style="text-align: center; margin-bottom: 28px;">
        <a href="${magicLink}" style="display: inline-block; padding: 14px 36px; background: #0A7A5A; color: #fff; border-radius: 980px; font-size: 15px; font-weight: 700; text-decoration: none;">
          Se connecter &rarr;
        </a>
      </div>
      <p style="font-size: 12px; color: #86868b; text-align: center; line-height: 1.5;">
        Si vous n&apos;avez pas demandé ce lien, ignorez cet email.
      </p>
    </div>
  `;
}
