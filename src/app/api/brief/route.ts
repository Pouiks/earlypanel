import { NextResponse, type NextRequest } from "next/server";
import { sendEmail, buildBriefAdminEmail } from "@/lib/email";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { checkJunkFields } from "@/lib/junk-detection";

/**
 * POST /api/brief : formulaire "Demarrer un projet" (/entreprises#brief).
 *
 * Pas de DB : on envoie un email interne (ADMIN_NOTIFICATION_EMAIL ou
 * ADMIN_EMAIL). Public, donc double rate-limit (IP + email) et honeypot.
 * Le honeypot rempli renvoie 200 sans rien envoyer, pour ne pas donner
 * d'indice au bot.
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function str(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rlIp = rateLimit(`brief:ip:${ip}`, { windowMs: 60_000, max: 5 });
    if (!rlIp.ok) {
      return NextResponse.json(
        { error: "Trop de requêtes, réessayez dans une minute" },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rlIp.retryAfterMs / 1000)) } }
      );
    }

    const body = await request.json().catch(() => ({}));

    if (str(body.website, 200)) {
      // Honeypot rempli : bot. On repond comme si tout allait bien.
      return NextResponse.json({ ok: true });
    }

    const email = str(body.email, 200).toLowerCase();
    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: "Email invalide" }, { status: 400 });
    }

    const rlEmail = rateLimit(`brief:email:${email}`, { windowMs: 60 * 60 * 1000, max: 3 });
    if (!rlEmail.ok) {
      return NextResponse.json(
        { error: "Vous avez déjà envoyé plusieurs demandes. On revient vers vous rapidement." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rlEmail.retryAfterMs / 1000)) } }
      );
    }

    const need = str(body.need, 4000);
    if (need.length < 20) {
      return NextResponse.json(
        { error: "Décrivez votre besoin en quelques phrases (20 caractères minimum)" },
        { status: 400 }
      );
    }

    const firstName = str(body.first_name, 100);
    const lastName = str(body.last_name, 100);
    const junk = checkJunkFields([
      { label: "Le prénom", value: firstName || null },
      { label: "Le nom", value: lastName || null },
    ]);
    if (!junk.ok) {
      return NextResponse.json({ error: junk.reason }, { status: 400 });
    }

    const adminEmail =
      process.env.ADMIN_NOTIFICATION_EMAIL?.trim() || process.env.ADMIN_EMAIL?.trim();
    if (!adminEmail) {
      console.error("[brief] ADMIN_NOTIFICATION_EMAIL / ADMIN_EMAIL manquant");
      return NextResponse.json(
        { error: "Service indisponible. Écrivez-nous à contact@earlypanel.fr." },
        { status: 500 }
      );
    }

    await sendEmail({
      to: adminEmail,
      subject: `[earlypanel] Nouveau brief : ${str(body.company, 200) || email}`,
      html: buildBriefAdminEmail({
        email,
        firstName,
        lastName,
        company: str(body.company, 200),
        productType: str(body.product_type, 100),
        budget: str(body.budget, 100),
        need,
        ip,
        userAgent: request.headers.get("user-agent") ?? "",
      }),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[brief]", err);
    return NextResponse.json({ error: "Erreur lors de l'envoi" }, { status: 500 });
  }
}
