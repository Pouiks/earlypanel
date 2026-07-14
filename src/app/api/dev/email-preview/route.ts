import { NextRequest, NextResponse } from "next/server";
import {
  buildAvailabilityCampaignEmail,
  buildWelcomeEmail,
  buildLeadMagnetEmail,
  buildNewTesterAdminEmail,
} from "@/lib/email";

export const runtime = "nodejs";

/**
 * GET /api/dev/email-preview?type=<type>
 *
 * Aperçu des emails transactionnels DANS LE NAVIGATEUR, avec des données
 * d'exemple — pour valider le rendu sans envoyer quoi que ce soit (SKIP_EMAILS
 * masque le HTML, seul le lien magique est logué). DEV UNIQUEMENT (403 en prod ;
 * aucune donnée réelle, uniquement des templates + valeurs factices).
 *
 * Sans `type` : page d'index listant les emails prévisualisables.
 */
const SAMPLE_BASE = "https://earlypanel.fr";

const TEMPLATES: Record<string, { label: string; render: () => string }> = {
  availability: {
    label: "Campagne de disponibilité (2 boutons Oui / Non)",
    render: () =>
      buildAvailabilityCampaignEmail({
        firstName: "Camille",
        ouiUrl: `${SAMPLE_BASE}/app/auth/availability?token=SAMPLE_TOKEN&choice=oui`,
        nonUrl: `${SAMPLE_BASE}/app/auth/availability?token=SAMPLE_TOKEN&choice=non`,
      }),
  },
  welcome: {
    label: "Bienvenue testeur (magic link d'inscription)",
    render: () =>
      buildWelcomeEmail(`${SAMPLE_BASE}/app/auth/callback?token_hash=SAMPLE&type=magiclink`, "Camille"),
  },
  "lead-magnet": {
    label: "Lead magnet (exemple de rapport)",
    render: () => buildLeadMagnetEmail(),
  },
  "new-tester-admin": {
    label: "Notification admin (nouvelle inscription)",
    render: () =>
      buildNewTesterAdminEmail({
        email: "camille.fabre@exemple.fr",
        firstName: "Camille",
        lastName: "Fabre",
        ip: "82.65.12.34",
        source: "landing",
        prefilledFields: { sector: "Tech / SaaS", digital_level: "avance", availability: "3-5" },
      }),
  },
};

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Aperçu email indisponible en production" }, { status: 403 });
  }

  const type = request.nextUrl.searchParams.get("type");

  if (!type) {
    const items = Object.entries(TEMPLATES)
      .map(([k, v]) => `<li style="margin:8px 0"><a href="?type=${k}" style="color:#0A7A5A;font-weight:600">${k}</a> : ${v.label}</li>`)
      .join("");
    const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Aperçu emails</title></head>
      <body style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:640px;margin:40px auto;padding:0 20px;color:#1d1d1f">
        <h1 style="font-size:22px">Aperçu des emails (dev)</h1>
        <p style="color:#6e6e73">Rendu des templates avec des données factices, rien n'est envoyé.</p>
        <ul style="list-style:none;padding:0;font-size:15px">${items}</ul>
      </body></html>`;
    return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  }

  const tpl = TEMPLATES[type];
  if (!tpl) {
    return NextResponse.json(
      { error: `type inconnu. Disponibles : ${Object.keys(TEMPLATES).join(", ")}` },
      { status: 400 }
    );
  }

  return new NextResponse(tpl.render(), { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
