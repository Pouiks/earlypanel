import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, buildWelcomeEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const { email, first_name, last_name } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email requis" },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    if (!adminClient) {
      console.warn("[Register] Supabase not configured — mock mode");
      return NextResponse.json({ success: true, mock: true });
    }

    const { data: authData, error: authError } =
      await adminClient.auth.admin.createUser({
        email,
        email_confirm: false,
      });

    if (authError) {
      if (authError.message?.includes("already been registered")) {
        return NextResponse.json(
          { error: "Cet email est déjà enregistré. Connectez-vous depuis votre espace." },
          { status: 409 }
        );
      }
      throw authError;
    }

    const userId = authData.user.id;

    const { error: insertError } = await adminClient
      .from("testers")
      .insert({
        email,
        auth_user_id: userId,
        first_name: first_name || null,
        last_name: last_name || null,
        status: "pending",
        profile_completed: false,
        profile_step: 1,
        source: "landing",
      });

    if (insertError) throw insertError;

    const { data: linkData, error: linkError } =
      await adminClient.auth.admin.generateLink({
        type: "magiclink",
        email,
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/app/auth/callback`,
        },
      });

    if (linkError) throw linkError;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const hashedToken = linkData.properties?.hashed_token;
    const magicLink = hashedToken
      ? `${appUrl}/app/auth/callback?token_hash=${encodeURIComponent(hashedToken)}&type=magiclink`
      : linkData.properties?.action_link || "";

    await sendEmail({
      to: email,
      toName: first_name ? `${first_name} ${last_name || ""}`.trim() : undefined,
      subject: first_name
        ? `${first_name}, complétez votre profil earlypanel →`
        : "Complétez votre profil earlypanel →",
      html: buildWelcomeEmail(magicLink, first_name || undefined),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Register] Error:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'inscription" },
      { status: 500 }
    );
  }
}
