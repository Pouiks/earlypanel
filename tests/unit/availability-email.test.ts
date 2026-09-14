import { describe, it, expect } from "vitest";
import { buildAvailabilityCampaignEmail } from "@/lib/email";

// L'email de campagne est le point de contact réel avec les testeurs : on
// verrouille que les 2 liens d'action y figurent bien et que le prénom est
// échappé (les liens sont générés côté serveur, mais le prénom vient d'un
// champ libre → risque XSS dans le HTML de l'email).

const OUI = "https://earlypanel.co/app/auth/availability?token=AAA&choice=oui";
const NON = "https://earlypanel.co/app/auth/availability?token=BBB&choice=non";

describe("buildAvailabilityCampaignEmail", () => {
  it("intègre les deux liens d'action Oui / Non", () => {
    const html = buildAvailabilityCampaignEmail({ firstName: "Marie", ouiUrl: OUI, nonUrl: NON });
    expect(html).toContain(OUI);
    expect(html).toContain(NON);
  });

  it("personnalise avec le prénom quand présent", () => {
    const html = buildAvailabilityCampaignEmail({ firstName: "Marie", ouiUrl: OUI, nonUrl: NON });
    expect(html).toContain("Bonjour Marie");
  });

  it("retombe sur « Bonjour, » sans prénom", () => {
    const html = buildAvailabilityCampaignEmail({ firstName: null, ouiUrl: OUI, nonUrl: NON });
    expect(html).toContain("Bonjour,");
  });

  it("la dernière relance annonce la mise en pause, pas les autres", () => {
    const last = buildAvailabilityCampaignEmail({ firstName: "Marie", ouiUrl: OUI, nonUrl: NON, isLast: true });
    const normal = buildAvailabilityCampaignEmail({ firstName: "Marie", ouiUrl: OUI, nonUrl: NON });
    expect(last).toContain("dernière relance");
    expect(last).toContain("mis en pause");
    expect(normal).not.toContain("dernière relance");
  });

  it("échappe le HTML du prénom (anti-XSS)", () => {
    const html = buildAvailabilityCampaignEmail({
      firstName: "<script>alert(1)</script>",
      ouiUrl: OUI,
      nonUrl: NON,
    });
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
