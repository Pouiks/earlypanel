import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, buildWelcomeEmail, buildNewTesterAdminEmail } from "@/lib/email";
import { tryGetAppUrl } from "@/lib/app-url";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    // M4 : rate limit anti-bot. 5 inscriptions par heure et par IP.
    const ip = getClientIp(request);
    const rl = rateLimit(`register:${ip}`, { windowMs: 60 * 60 * 1000, max: 5 });
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Trop d'inscriptions, reessayez plus tard" },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } }
      );
    }

    const {
      email,
      first_name,
      last_name,
      sector,
      digital_level,
      availability,
    } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email requis" },
        { status: 400 }
      );
    }

    // G10 : validation regex sommaire pour eviter les payloads bidons.
    const emailNormalized = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailNormalized)) {
      return NextResponse.json({ error: "Email invalide" }, { status: 400 });
    }

    const adminClient = createAdminClient();

    if (!adminClient) {
      // G14 : en production, l'absence de client admin est une erreur de
      // configuration (pas un mode mock silencieux).
      if (process.env.NODE_ENV === "production") {
        console.error("[Register] Admin client unavailable in production");
        return NextResponse.json(
          { error: "Service indisponible. Reessayez plus tard." },
          { status: 503 }
        );
      }
      console.warn("[Register] Supabase not configured — mock mode (dev only)");
      return NextResponse.json({ success: true, mock: true });
    }

    // G3 : detection prealable des doublons cote `testers` pour eviter de
    // creer un user auth orphelin si la table testers a deja une ligne.
    const { data: existingTester } = await adminClient
      .from("testers")
      .select("id, auth_user_id")
      .eq("email", emailNormalized)
      .maybeSingle();

    if (existingTester) {
      return NextResponse.json(
        { error: "Cet email est deja enregistre. Connectez-vous depuis votre espace." },
        { status: 409 }
      );
    }

    const { data: authData, error: authError } =
      await adminClient.auth.admin.createUser({
        email: emailNormalized,
        email_confirm: false,
      });

    if (authError) {
      // G3 : detection multi-codes (selon version supabase) au lieu d'un
      // simple .includes("already been registered").
      const msg = authError.message || "";
      const code = (authError as { code?: string }).code || "";
      if (
        code === "email_exists" ||
        code === "user_already_exists" ||
        /already.+registered/i.test(msg) ||
        /already.+exists/i.test(msg)
      ) {
        return NextResponse.json(
          { error: "Cet email est deja enregistre. Connectez-vous depuis votre espace." },
          { status: 409 }
        );
      }
      throw authError;
    }

    const userId = authData.user.id;

    // G3 : insertion testers transactionnelle. Si elle echoue, on doit
    // rollback la creation auth pour eviter un user auth orphelin qui
    // bloquerait toute reinscription future avec le meme email.
    // Validation defensive des champs pre-remplis depuis la landing :
    // listes blanches strictes pour respecter les CHECK constraints DB.
    const ALLOWED_DIGITAL = new Set(["debutant", "intermediaire", "avance", "expert"]);
    const ALLOWED_AVAILABILITY = new Set(["1-2", "3-5", "5+"]);
    const ALLOWED_SECTORS = new Set([
      "Tech / SaaS", "E-commerce", "Finance / Banque", "Assurance",
      "Santé", "RH / Recrutement", "Juridique", "Éducation",
      "Immobilier", "Transport / Logistique", "Industrie", "Autre",
    ]);

    const safeSector =
      typeof sector === "string" && ALLOWED_SECTORS.has(sector) ? sector : null;
    const safeDigital =
      typeof digital_level === "string" && ALLOWED_DIGITAL.has(digital_level)
        ? digital_level
        : null;
    const safeAvailability =
      typeof availability === "string" && ALLOWED_AVAILABILITY.has(availability)
        ? availability
        : null;

    const { error: insertError } = await adminClient
      .from("testers")
      .insert({
        email: emailNormalized,
        auth_user_id: userId,
        first_name: first_name || null,
        last_name: last_name || null,
        // Pre-remplissage depuis la landing : reduit la friction onboarding.
        // Le testeur arrivera sur step 1 mais step 2 aura deja sector +
        // digital_level remplis, et step 5 aura availability rempli.
        sector: safeSector,
        digital_level: safeDigital,
        availability: safeAvailability,
        status: "pending",
        profile_completed: false,
        profile_step: 1,
        source: "landing",
      });

    if (insertError) {
      console.error("[Register] testers insert failed, rolling back auth user", insertError.message);
      try {
        await adminClient.auth.admin.deleteUser(userId);
      } catch (rollbackErr) {
        console.error("[Register] Auth rollback FAILED — orphan user", userId, rollbackErr);
      }
      return NextResponse.json(
        { error: "Erreur lors de la creation du profil. Reessayez." },
        { status: 500 }
      );
    }

    const appUrl = tryGetAppUrl();
    if (!appUrl) {
      console.error("[Register] APP_URL missing in prod");
      return NextResponse.json(
        { error: "Service indisponible. Reessayez plus tard." },
        { status: 500 }
      );
    }

    const { data: linkData, error: linkError } =
      await adminClient.auth.admin.generateLink({
        type: "magiclink",
        email: emailNormalized,
        options: {
          redirectTo: `${appUrl}/app/auth/callback`,
        },
      });

    if (linkError) throw linkError;

    const hashedToken = linkData.properties?.hashed_token;
    const magicLink = hashedToken
      ? `${appUrl}/app/auth/callback?token_hash=${encodeURIComponent(hashedToken)}&type=magiclink`
      : linkData.properties?.action_link || "";

    await sendEmail({
      to: emailNormalized,
      toName: first_name ? `${first_name} ${last_name || ""}`.trim() : undefined,
      subject: first_name
        ? `${first_name}, complétez votre profil earlypanel →`
        : "Complétez votre profil earlypanel →",
      html: buildWelcomeEmail(magicLink, first_name || undefined),
    });

    // Notification interne staff : envoi best-effort, ne casse jamais
    // l'inscription si l'envoi echoue. La cle ADMIN_NOTIFICATION_EMAIL est
    // prioritaire ; fallback sur ADMIN_EMAIL si non definie.
    const adminEmail =
      process.env.ADMIN_NOTIFICATION_EMAIL?.trim() ||
      process.env.ADMIN_EMAIL?.trim();
    if (adminEmail) {
      try {
        await sendEmail({
          to: adminEmail,
          subject: `[earlypanel] Nouvelle inscription : ${emailNormalized}`,
          html: buildNewTesterAdminEmail({
            email: emailNormalized,
            firstName: first_name || null,
            lastName: last_name || null,
            ip,
            source: "landing",
            // Champs pre-remplis depuis la landing : aide a evaluer la
            // qualite/profil de l'inscription en un coup d'oeil cote staff.
            prefilledFields: {
              sector: safeSector,
              digital_level: safeDigital,
              availability: safeAvailability,
            },
          }),
        });
      } catch (notifyErr) {
        console.error("[Register] admin notification failed", notifyErr);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Register] Error:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'inscription" },
      { status: 500 }
    );
  }
}
