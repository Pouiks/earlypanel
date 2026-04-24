import { PDFDocument, StandardFonts, rgb, PDFPage, PDFFont } from "pdf-lib";

export interface NdaVariables {
  tester_first_name: string;
  tester_last_name: string;
  tester_email: string;
  tester_phone: string;
  tester_address: string;
  tester_city: string;
  tester_postal_code: string;
  tester_birth_date: string;
  tester_job_title: string;
  tester_sector: string;
  project_title: string;
  project_ref: string;
  company_name: string;
  contact_name: string;
  contact_email: string;
  sign_date: string;
  sign_ip: string;
  nda_ref: string;
}

export const NDA_VARIABLE_LIST: { key: keyof NdaVariables; label: string; source: string }[] = [
  { key: "tester_first_name", label: "Prénom du testeur", source: "testers.first_name" },
  { key: "tester_last_name", label: "Nom du testeur", source: "testers.last_name" },
  { key: "tester_email", label: "Email du testeur", source: "testers.email" },
  { key: "tester_phone", label: "Téléphone du testeur", source: "testers.phone" },
  { key: "tester_address", label: "Adresse du testeur", source: "testers.address" },
  { key: "tester_city", label: "Ville du testeur", source: "testers.city" },
  { key: "tester_postal_code", label: "Code postal du testeur", source: "testers.postal_code" },
  { key: "tester_birth_date", label: "Date de naissance du testeur", source: "testers.birth_date" },
  { key: "tester_job_title", label: "Poste du testeur", source: "testers.job_title" },
  { key: "tester_sector", label: "Secteur du testeur", source: "testers.sector" },
  { key: "project_title", label: "Titre du projet", source: "projects.title" },
  { key: "project_ref", label: "Référence du projet", source: "projects.ref_number" },
  { key: "company_name", label: "Nom de la société cliente", source: "projects.company_name" },
  { key: "contact_name", label: "Nom du contact client", source: "projects.contact_*" },
  { key: "contact_email", label: "Email du contact client", source: "projects.contact_email" },
  { key: "sign_date", label: "Date de signature", source: "Auto (moment de la signature)" },
  { key: "sign_ip", label: "Adresse IP du signataire", source: "Auto (header HTTP)" },
  { key: "nda_ref", label: "Référence du document NDA", source: "Auto (généré)" },
];

function replaceVariables(html: string, vars: NdaVariables): string {
  return html.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    const value = (vars as unknown as Record<string, string>)[key];
    return value || match;
  });
}

interface NdaPdfParams {
  ndaTitle: string;
  ndaContentHtml: string;
  variables: NdaVariables;
  signed: boolean;
}

const PAGE_MARGIN = 50;
const LINE_HEIGHT = 16;
const FONT_SIZE = 10;
const TITLE_SIZE = 16;
const SUBTITLE_SIZE = 12;

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li>/gi, "  • ")
    .replace(/<\/h[23]>/gi, "\n\n")
    .replace(/<h[23][^>]*>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  const lines: string[] = [];
  const paragraphs = text.split("\n");

  for (const paragraph of paragraphs) {
    if (paragraph.trim() === "") {
      lines.push("");
      continue;
    }
    const words = paragraph.split(" ");
    let currentLine = "";
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const width = font.widthOfTextAtSize(testLine, fontSize);
      if (width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
  }
  return lines;
}

function addNewPage(doc: PDFDocument): { page: PDFPage; y: number } {
  const page = doc.addPage([595, 842]);
  return { page, y: 842 - PAGE_MARGIN };
}

export async function generateNdaPdf(params: NdaPdfParams): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const maxWidth = 595 - PAGE_MARGIN * 2;
  let { page, y } = addNewPage(doc);

  const black = rgb(0, 0, 0);
  const gray = rgb(0.4, 0.4, 0.4);
  const green = rgb(0.04, 0.478, 0.353);

  // Header bar
  page.drawRectangle({ x: 0, y: 842 - 60, width: 595, height: 60, color: green });
  page.drawText("earlypanel", { x: PAGE_MARGIN, y: 842 - 40, size: 18, font: fontBold, color: rgb(1, 1, 1) });

  const refText = params.variables.nda_ref || "NDA";
  page.drawText(refText, {
    x: 595 - PAGE_MARGIN - fontBold.widthOfTextAtSize(refText, 9),
    y: 842 - 38, size: 9, font: fontBold, color: rgb(0.8, 1, 0.9),
  });

  y = 842 - 60 - 30;

  // Title
  page.drawText(params.ndaTitle, { x: PAGE_MARGIN, y, size: TITLE_SIZE, font: fontBold, color: black });
  y -= TITLE_SIZE + 12;

  // Project & tester info
  const v = params.variables;
  const infoLines = [
    `Projet : ${v.project_title}${v.project_ref ? ` (${v.project_ref})` : ""}`,
    `Société : ${v.company_name}`,
    `Testeur : ${v.tester_first_name} ${v.tester_last_name}`,
    `Email : ${v.tester_email}`,
  ];
  for (const line of infoLines) {
    page.drawText(line, { x: PAGE_MARGIN, y, size: FONT_SIZE, font, color: gray });
    y -= LINE_HEIGHT;
  }

  y -= 12;
  page.drawLine({ start: { x: PAGE_MARGIN, y }, end: { x: 595 - PAGE_MARGIN, y }, thickness: 0.5, color: rgb(0.85, 0.85, 0.85) });
  y -= 20;

  // NDA content with variables replaced
  const resolvedHtml = replaceVariables(params.ndaContentHtml, params.variables);
  const content = stripHtml(resolvedHtml);
  const wrappedLines = wrapText(content, font, FONT_SIZE, maxWidth);

  for (const line of wrappedLines) {
    if (y < PAGE_MARGIN + 60) {
      ({ page, y } = addNewPage(doc));
    }
    if (line === "") {
      y -= LINE_HEIGHT * 0.5;
      continue;
    }
    page.drawText(line, { x: PAGE_MARGIN, y, size: FONT_SIZE, font, color: black });
    y -= LINE_HEIGHT;
  }

  // Signature block
  if (y < PAGE_MARGIN + 160) {
    ({ page, y } = addNewPage(doc));
  }

  y -= 30;
  page.drawLine({ start: { x: PAGE_MARGIN, y }, end: { x: 595 - PAGE_MARGIN, y }, thickness: 0.5, color: rgb(0.85, 0.85, 0.85) });
  y -= 24;

  if (params.signed) {
    page.drawText("DOCUMENT SIGNÉ ÉLECTRONIQUEMENT", { x: PAGE_MARGIN, y, size: SUBTITLE_SIZE, font: fontBold, color: green });
    y -= 20;

    const sigLines = [
      `Signé par : ${v.tester_first_name} ${v.tester_last_name}`,
      `Email : ${v.tester_email}`,
      `Date : ${v.sign_date}`,
      `Adresse IP : ${v.sign_ip || "Non disponible"}`,
      `Référence : ${v.nda_ref}`,
      "",
      "Le signataire a déclaré avoir lu et accepté les termes du présent",
      "accord de confidentialité en cliquant sur le bouton « Signer ce document »",
      "dans son espace personnel earlypanel.",
      "",
      "Ce document fait foi de preuve de consentement au sens du règlement",
      "eIDAS (signature électronique simple).",
    ];

    for (const line of sigLines) {
      page.drawText(line, { x: PAGE_MARGIN, y, size: FONT_SIZE, font, color: gray });
      y -= LINE_HEIGHT;
    }
  } else {
    page.drawText("EN ATTENTE DE SIGNATURE", { x: PAGE_MARGIN, y, size: SUBTITLE_SIZE, font: fontBold, color: rgb(0.7, 0.26, 0.04) });
    y -= 20;
    page.drawText("Ce document n'a pas encore été signé par le testeur.", { x: PAGE_MARGIN, y, size: FONT_SIZE, font, color: gray });
  }

  // Footer
  const pages = doc.getPages();
  for (let i = 0; i < pages.length; i++) {
    const p = pages[i];
    const footerText = `earlypanel — Confidentiel — ${v.nda_ref} — Page ${i + 1}/${pages.length}`;
    p.drawText(footerText, { x: PAGE_MARGIN, y: 25, size: 8, font, color: rgb(0.6, 0.6, 0.6) });
  }

  return doc.save();
}

export function buildNdaVariables(opts: {
  tester: Record<string, unknown>;
  project: Record<string, unknown>;
  signedAt?: string;
  signerIp?: string;
}): NdaVariables {
  const { tester: t, project: p, signedAt, signerIp } = opts;
  const projectRef = (p.ref_number as string) || "";

  let birthFormatted = "";
  if (t.birth_date) {
    try {
      birthFormatted = new Date(t.birth_date as string).toLocaleDateString("fr-FR", { dateStyle: "long" });
    } catch { birthFormatted = t.birth_date as string; }
  }

  let signDateFormatted = "";
  if (signedAt) {
    try {
      signDateFormatted = new Date(signedAt).toLocaleString("fr-FR", {
        dateStyle: "long", timeStyle: "short", timeZone: "Europe/Paris",
      });
    } catch { signDateFormatted = signedAt; }
  }

  const testerId = (t.id as string || "").substring(0, 8).toUpperCase();
  const ndaRef = projectRef
    ? `NDA-${projectRef}-${testerId}`
    : `NDA-${testerId}-${Date.now().toString(36).toUpperCase()}`;

  return {
    tester_first_name: (t.first_name as string) || "",
    tester_last_name: (t.last_name as string) || "",
    tester_email: (t.email as string) || "",
    tester_phone: (t.phone as string) || "",
    tester_address: (t.address as string) || "",
    tester_city: (t.city as string) || "",
    tester_postal_code: (t.postal_code as string) || "",
    tester_birth_date: birthFormatted,
    tester_job_title: (t.job_title as string) || "",
    tester_sector: (t.sector as string) || "",
    project_title: (p.title as string) || "",
    project_ref: projectRef,
    company_name: (p.company_name as string) || "",
    contact_name: [(p.contact_first_name as string) || "", (p.contact_last_name as string) || ""].filter(Boolean).join(" "),
    contact_email: (p.contact_email as string) || "",
    sign_date: signDateFormatted,
    sign_ip: signerIp || "",
    nda_ref: ndaRef,
  };
}

export function defaultNdaHtml(): string {
  return `
<h2>ACCORD DE NON-DIVULGATION (NDA)</h2>
<h3>Accord de Confidentialité — Mission Testeur</h3>

<p><strong>Entre les soussignés :</strong></p>

<p><strong>earlypanel</strong>, société par actions simplifiée, représentée dans le cadre de la mission référencée <strong>{{project_ref}}</strong>,</p>
<p>ci-après dénommée <strong>« earlypanel »</strong>,</p>

<p><strong>ET</strong></p>

<p><strong>{{tester_first_name}} {{tester_last_name}}</strong>, demeurant à {{tester_address}}, {{tester_postal_code}} {{tester_city}},</p>
<p>ci-après dénommé(e) <strong>« le Testeur »</strong>,</p>
<p>Ci-après collectivement désignées <strong>« les Parties »</strong>.</p>

<h2>PRÉAMBULE</h2>
<p>Dans le cadre de la mission de test utilisateur référencée <strong>{{project_ref}}</strong>, portant sur le produit digital <strong>« {{project_title}} »</strong> développé par la société <strong>{{company_name}}</strong> (ci-après « le Client »), earlypanel souhaite faire appel aux services du Testeur pour réaliser une session de test et répondre à un questionnaire d'évaluation.</p>
<p>Le Testeur sera amené à accéder à des informations, fonctionnalités et interfaces non encore rendues publiques, susceptibles de constituer des informations confidentielles au sens du présent accord.</p>

<h2>ARTICLE 1 — DÉFINITION DES INFORMATIONS CONFIDENTIELLES</h2>
<p>Sont considérées comme <strong>Informations Confidentielles</strong> toutes les informations, données, documents, matériaux, logiciels, interfaces, maquettes, prototypes, spécifications techniques, fonctionnalités, éléments visuels, workflows, contenus éditoriaux, données commerciales ou stratégiques auxquels le Testeur aura accès dans le cadre de la mission.</p>
<p>Sont notamment visés sans que cette liste soit limitative :</p>
<li>L'accès à l'interface du produit en version bêta ou pré-production</li>
<li>Les URLs, identifiants et mots de passe communiqués pour les besoins du test</li>
<li>Les fonctionnalités non encore publiées ou annoncées publiquement</li>
<li>Les questionnaires, grilles d'évaluation et méthodologies de test</li>
<li>Toute donnée ou information relative aux choix de conception du produit</li>

<h2>ARTICLE 2 — OBLIGATIONS DU TESTEUR</h2>
<p>Le Testeur s'engage à <strong>garder strictement confidentielles</strong> toutes les Informations Confidentielles auxquelles il aura accès dans le cadre de la mission.</p>
<p>Le Testeur s'engage notamment à :</p>
<li>Ne pas divulguer, communiquer, reproduire ou transmettre les Informations Confidentielles à quelque tiers que ce soit</li>
<li>Ne pas publier, partager ou évoquer publiquement les fonctionnalités, interfaces ou contenus auxquels il a accès</li>
<li>N'utiliser les Informations Confidentielles qu'aux seules fins d'exécution de la mission de test</li>
<li>Ne pas réaliser de captures d'écran, enregistrements vidéo ou audio de l'interface testée, sauf autorisation écrite</li>
<li>Informer immédiatement earlypanel en cas de divulgation accidentelle ou non autorisée</li>
<p>Ces obligations s'appliquent pendant toute la durée de la mission et pendant une période de <strong>2 (deux) ans</strong> à compter de la fin de la mission.</p>

<h2>ARTICLE 3 — PROPRIÉTÉ INTELLECTUELLE</h2>
<p>Le Testeur reconnaît que l'ensemble des Informations Confidentielles demeurent la propriété exclusive de earlypanel et/ou du Client.</p>
<p>Les réponses, observations et retours fournis par le Testeur dans le cadre de la mission deviennent la propriété de earlypanel, qui peut les transmettre au Client sous forme anonymisée ou pseudonymisée.</p>

<h2>ARTICLE 4 — DONNÉES PERSONNELLES</h2>
<p>Dans le cadre du présent accord, earlypanel traite des données personnelles relatives au Testeur conformément au Règlement Général sur la Protection des Données (RGPD) et à la politique de confidentialité disponible sur earlypanel.fr.</p>
<p>Le Testeur dispose d'un droit d'accès, de rectification et de suppression de ses données en écrivant à contact@earlypanel.fr.</p>

<h2>ARTICLE 5 — RESPONSABILITÉ ET SANCTIONS</h2>
<p>Toute violation des obligations de confidentialité pourra engager la responsabilité civile et, le cas échéant, pénale du Testeur. earlypanel se réserve le droit de suspendre l'accès à la plateforme et de réclamer réparation du préjudice subi.</p>

<h2>ARTICLE 6 — DURÉE ET LOI APPLICABLE</h2>
<p>Le présent accord prend effet à la date de sa signature et demeure en vigueur pendant <strong>2 (deux) ans</strong> après la fin de la mission. Il est soumis au droit français. Tout litige sera porté devant les tribunaux compétents de Paris.</p>
`.trim();
}
