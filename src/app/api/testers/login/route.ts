import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email requis" }, { status: 400 });
    }

    const adminClient = createAdminClient();
    if (!adminClient) {
      return NextResponse.json({ error: "Configuration serveur manquante" }, { status: 500 });
    }

    const { data: linkData, error: linkError } =
      await adminClient.auth.admin.generateLink({
        type: "magiclink",
        email,
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/app/auth/callback`,
        },
      });

    if (linkError) {
      if (linkError.message?.includes("User not found")) {
        return NextResponse.json(
          { error: "Aucun compte trouvé pour cet email. Inscrivez-vous d'abord." },
          { status: 404 }
        );
      }
      throw linkError;
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const hashedToken = linkData.properties?.hashed_token;
    const magicLink = hashedToken
      ? `${appUrl}/app/auth/callback?token_hash=${encodeURIComponent(hashedToken)}&type=magiclink`
      : linkData.properties?.action_link || "";

    await sendEmail({
      to: email,
      subject: "Votre lien de connexion testpanel",
      html: buildLoginEmail(magicLink),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Login] Error:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'envoi du lien" },
      { status: 500 }
    );
  }
}

function buildLoginEmail(magicLink: string): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <span style="font-size: 22px; font-weight: 700; color: #1d1d1f; letter-spacing: -0.04em;">
          test<span style="color: #0A7A5A;">panel</span>
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
