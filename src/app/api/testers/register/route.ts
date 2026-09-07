import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, buildWelcomeEmail, buildNewTesterAdminEmail } from "@/lib/email";
import { tryGetAppUrl } from "@/lib/app-url";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { checkJunkFields } from "@/lib/junk-detection";

/**
 * Verification Cloudflare Turnstile. Fail-closed des que TURNSTILE_SECRET_KEY
 * est definie : token absent ou invalide = refus. Sans secret (dev local,
 * ou widget pas encore configure) on laisse passer.
 */
async function verifyTurnstile(token: unknown, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) return true;
  if (typeof token !== "string" || !token) return false;
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token, remoteip: ip }),
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch (err) {
    console.error("[Register] Turnstile verify failed", err);
    return false;
  }
}

function cleanText(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim().slice(0, max);
  return t || null;
}

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
      job_title,
      city,
      devices,
      digital_level,
      availability,
      website,
      turnstile_token,
    } = await request.json();

    // Honeypot rempli : bot. On repond comme un succes pour ne rien reveler.
    if (typeof website === "string" && website.trim()) {
      return NextResponse.json({ success: true });
    }

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

    // Metier requis : un panel « selectionne a la main » ne peut pas trier
    // des profils sans poste. Verifie avant tout appel DB.
    if (typeof job_title !== "string" || !job_title.trim()) {
      return NextResponse.json({ error: "Indiquez votre métier ou poste actuel" }, { status: 400 });
    }

    // Rate-limit par email (3/h) : evite qu'on cible un compte precis.
    const rlEmail = rateLimit(`register:email:${emailNormalized}`, { windowMs: 60 * 60 * 1000, max: 3 });
    if (!rlEmail.ok) {
      return NextResponse.json(
        { error: "Trop de tentatives pour cet email, reessayez plus tard" },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rlEmail.retryAfterMs / 1000)) } }
      );
    }

    if (!(await verifyTurnstile(turnstile_token, ip))) {
      return NextResponse.json(
        { error: "Vérification anti-robot échouée. Rechargez la page et réessayez." },
        { status: 400 }
      );
    }

    // Detection des inscriptions bidons (azerty / Test Test / aaaa...).
    // On valide les 2 noms s'ils sont fournis ; le reste est optionnel.
    const junkCheck = checkJunkFields([
      { label: "Le prenom", value: typeof first_name === "string" ? first_name : null },
      { label: "Le nom", value: typeof last_name === "string" ? last_name : null },
    ]);
    if (!junkCheck.ok) {
      return NextResponse.json({ error: junkCheck.reason }, { status: 400 });
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
    // Metier + ville : texte libre borne. Pre-remplissent l'onboarding (step 2
    // et step 1) ; le trigger d'activation exige les 18 champs, donc aucun
    // risque d'activer un profil incomplet.
    const safeJobTitle = cleanText(job_title, 120);
    const safeCity = cleanText(city, 120);
    // Equipement : liste blanche alignee sur Step4Technical / testers.devices.
    const ALLOWED_DEVICES = new Set(["PC Windows", "Mac", "iPhone", "Smartphone Android"]);
    const safeDevices = Array.isArray(devices)
      ? Array.from(new Set(devices.filter((d): d is string => typeof d === "string" && ALLOWED_DEVICES.has(d))))
      : [];

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
        job_title: safeJobTitle,
        city: safeCity,
        devices: safeDevices,
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
              job_title: safeJobTitle,
              city: safeCity,
              devices: safeDevices,
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
