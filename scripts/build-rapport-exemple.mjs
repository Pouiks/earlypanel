// =====================================================================
// Genere public/earlypanel-rapport-exemple.pdf (lead magnet de la page
// d'accueil) a partir de content/rapport-exemple/index.html.
//
//   node scripts/build-rapport-exemple.mjs      (ou : npm run rapport:exemple)
//
// - Impression A4 via le Chromium de Playwright (deja installe pour les E2E).
// - Garde-fou typographique : le build echoue si la source contient un
//   tiret long (U+2014) ou un demi-cadratin (U+2013). Ces caracteres sont
//   bannis du livrable client.
// - Le nombre de pages est verifie (un debordement creerait une page vide).
// - Les metadonnees PDF sont reecrites (titre, auteur, producteur).
//
// Liens injectes depuis .env / .env.local, avec les memes defauts que le
// site (src/lib/cta-links.ts) :
//   NEXT_PUBLIC_CONTACT_EMAIL  → adresse affichee en derniere page
//   NEXT_PUBLIC_BOOKING_URL    → cible du bouton « Reserver un appel »
//                                (defaut : la landing /entreprises, lien
//                                perenne si le Calendly change)
// =====================================================================

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { PDFDocument } from "pdf-lib";
import { loadEnv } from "./e2e/lib.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "content", "rapport-exemple", "index.html");
const OUT = join(ROOT, "public", "earlypanel-rapport-exemple.pdf");
const EXPECTED_PAGES = 12;

const env = loadEnv(ROOT);
const contactEmail = env.NEXT_PUBLIC_CONTACT_EMAIL || "contact@earlypanel.fr";
const bookingUrl = env.NEXT_PUBLIC_BOOKING_URL || "https://www.earlypanel.fr/entreprises";

let html = readFileSync(SRC, "utf8");

const forbidden = html.match(/[—–]/g);
if (forbidden) {
  console.error(
    `Refus : ${forbidden.length} tiret(s) long(s) ou demi-cadratin(s) dans ${SRC}. ` +
      "Remplacer par une virgule, deux-points, parentheses ou un point median.",
  );
  process.exit(1);
}

for (const [token, value] of [
  ["{{CONTACT_EMAIL}}", contactEmail],
  ["{{BOOKING_URL}}", bookingUrl],
]) {
  html = html.split(token).join(value);
}
const leftover = html.match(/\{\{[A-Z_]+\}\}/g);
if (leftover) {
  console.error(`Placeholder(s) non remplace(s) : ${[...new Set(leftover)].join(", ")}`);
  process.exit(1);
}

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "load" });
  await page.emulateMedia({ media: "print" });
  const raw = await page.pdf({
    format: "A4",
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
  });

  const doc = await PDFDocument.load(raw);
  const pages = doc.getPageCount();
  if (pages !== EXPECTED_PAGES) {
    throw new Error(
      `${pages} pages generees au lieu de ${EXPECTED_PAGES} : une section deborde (ou manque). PDF non ecrit.`,
    );
  }
  doc.setTitle("Rapport de test utilisateurs · Clearflow (exemple earlypanel)");
  doc.setAuthor("earlypanel");
  doc.setSubject("Exemple de rapport de test utilisateurs (cas fictif)");
  doc.setCreator("earlypanel");
  doc.setProducer("earlypanel");
  doc.setLanguage("fr-FR");
  const now = new Date();
  doc.setCreationDate(now);
  doc.setModificationDate(now);

  const bytes = await doc.save();
  writeFileSync(OUT, bytes);
  console.log(`OK : ${OUT} (${pages} pages, ${Math.round(bytes.length / 1024)} Ko)`);
  console.log(`     contact : ${contactEmail}`);
  console.log(`     bouton  : ${bookingUrl}`);
} finally {
  await browser.close();
}
