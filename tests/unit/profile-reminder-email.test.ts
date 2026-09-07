import { describe, it, expect } from "vitest";
import { buildProfileReminderEmail } from "@/lib/email";

// Email de relance profil incomplet : on verrouille le lien, le compteur de
// champs, l'echappement du prenom (champ libre) et le wording du dernier rappel.

const LINK = "https://www.earlypanel.fr/app/auth/callback?token_hash=AAA&type=magiclink&next=%2Fapp%2Fonboarding";
const base = { firstName: "Marie", missingCount: 13, missingLabels: ["Téléphone", "Adresse", "Ville", "Code postal", "Date de naissance", "Métier", "Outils"], magicLink: LINK, reminderNumber: 1, isLast: false };

describe("buildProfileReminderEmail", () => {
  it("contient le magic link et le nombre de champs manquants", () => {
    const html = buildProfileReminderEmail(base);
    expect(html).toContain(LINK);
    expect(html).toContain("Il manque 13 informations");
    expect(html).toContain("Bonjour Marie");
  });

  it("liste au plus 5 champs puis « et N autres »", () => {
    const html = buildProfileReminderEmail(base);
    expect(html).toContain("Date de naissance");
    expect(html).not.toContain("<li style=\"margin:0 0 4px;\">Outils</li>");
    expect(html).toContain("et 2 autres");
  });

  it("échappe le prénom", () => {
    const html = buildProfileReminderEmail({ ...base, firstName: "<img src=x>" });
    expect(html).not.toContain("<img src=x>");
    expect(html).toContain("&lt;img src=x&gt;");
  });

  it("singulier pour 1 champ, « Bonjour, » sans prénom", () => {
    const html = buildProfileReminderEmail({ ...base, firstName: null, missingCount: 1, missingLabels: ["Ville"] });
    expect(html).toContain("Il manque 1 information :");
    expect(html).toContain("Bonjour,");
  });

  it("le dernier rappel le dit explicitement", () => {
    const html = buildProfileReminderEmail({ ...base, reminderNumber: 3, isLast: true });
    expect(html).toContain("dernier rappel");
  });
});
