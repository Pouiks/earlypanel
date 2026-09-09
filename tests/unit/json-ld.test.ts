import { describe, it, expect } from "vitest";
import {
  organizationJsonLd,
  websiteJsonLd,
  serviceJsonLd,
  faqJsonLd,
  breadcrumbJsonLd,
  articleJsonLd,
  serializeJsonLd,
  ORGANIZATION_ID,
} from "@/lib/json-ld";
import { SITE_URL } from "@/lib/site";

/**
 * Garde-fou JSON-LD : chaque builder doit produire un objet serialisable en
 * JSON valide (parse du round-trip), avec les champs schema.org attendus et
 * des URLs absolues sur l'hote canonique www.
 *
 * Validation semantique complete : https://validator.schema.org (coller le
 * HTML rendu d'une page) — non automatisable ici.
 */
function roundTrip(obj: unknown) {
  return JSON.parse(serializeJsonLd(obj));
}

describe("json-ld builders", () => {
  it("SITE_URL est l'hote canonique www", () => {
    expect(SITE_URL).toBe("https://www.earlypanel.fr");
  });

  it("Organization : identite, fondateur, adresse, email, sameAs", () => {
    const o = roundTrip(organizationJsonLd());
    expect(o["@context"]).toBe("https://schema.org");
    expect(o["@type"]).toBe("Organization");
    expect(o["@id"]).toBe(ORGANIZATION_ID);
    expect(o.name).toBe("earlypanel");
    expect(o.url).toBe(SITE_URL);
    expect(o.logo.startsWith(SITE_URL)).toBe(true);
    expect(o.email).toBe("contact@earlypanel.fr");
    expect(o.founder).toMatchObject({ "@type": "Person", name: "Virgile Joinville" });
    expect(o.address).toMatchObject({ "@type": "PostalAddress", addressLocality: "Montpellier", addressCountry: "FR" });
    expect(o.sameAs).toContain("https://www.linkedin.com/company/earlypanel/");
  });

  it("WebSite : reference l'Organization par @id", () => {
    const w = roundTrip(websiteJsonLd());
    expect(w["@type"]).toBe("WebSite");
    expect(w.url).toBe(SITE_URL);
    expect(w.publisher).toEqual({ "@id": ORGANIZATION_ID });
  });

  it("Service : type, provider, areaServed FR, offre en EUR HT", () => {
    const s = roundTrip(serviceJsonLd());
    expect(s["@type"]).toBe("Service");
    expect(s.serviceType).toBe("Tests utilisateurs");
    expect(s.provider).toEqual({ "@id": ORGANIZATION_ID });
    expect(s.areaServed).toMatchObject({ "@type": "Country", name: "FR" });
    expect(s.url).toBe(`${SITE_URL}/entreprises`);
    expect(s.offers.priceSpecification).toMatchObject({ minPrice: 1500, maxPrice: 6000, priceCurrency: "EUR", valueAddedTaxIncluded: false });
  });

  it("FAQPage : une Question par item, texte identique a la source", () => {
    const items = [
      { q: "Combien ça coûte ?", a: "Entre 1 500 et 6 000 € HT." },
      { q: "Quel délai ?", a: "5 jours ouvrés <b>après</b> lancement." },
    ];
    const f = roundTrip(faqJsonLd(items));
    expect(f["@type"]).toBe("FAQPage");
    expect(f.mainEntity).toHaveLength(2);
    expect(f.mainEntity[0]).toEqual({ "@type": "Question", name: items[0].q, acceptedAnswer: { "@type": "Answer", text: items[0].a } });
    expect(f.mainEntity[1].acceptedAnswer.text).toBe(items[1].a);
  });

  it("FAQPage vide reste un JSON valide", () => {
    expect(roundTrip(faqJsonLd([])).mainEntity).toEqual([]);
  });

  it("BreadcrumbList : positions 1..n et URLs absolues", () => {
    const b = roundTrip(breadcrumbJsonLd([
      { name: "Accueil", url: SITE_URL },
      { name: "Entreprises", url: `${SITE_URL}/entreprises` },
    ]));
    expect(b["@type"]).toBe("BreadcrumbList");
    expect(b.itemListElement.map((i: { position: number }) => i.position)).toEqual([1, 2]);
    for (const i of b.itemListElement) expect(i.item.startsWith("https://www.earlypanel.fr")).toBe(true);
  });

  it("Article : auteur et editeur = organisation, dates, blog parent, URL www", () => {
    const a = roundTrip(articleJsonLd({
      title: "Combien de testeurs ?",
      description: "Repères.",
      url: `${SITE_URL}/blog/combien-de-testeurs`,
      datePublished: "2026-09-09",
      dateModified: "2026-09-10",
      tags: ["panel", "méthode"],
    }));
    expect(a["@type"]).toBe("Article");
    expect(a.headline).toBe("Combien de testeurs ?");
    expect(a.author["@id"]).toBe(ORGANIZATION_ID);
    expect(a.publisher["@id"]).toBe(ORGANIZATION_ID);
    expect(a.datePublished).toBe("2026-09-09");
    expect(a.dateModified).toBe("2026-09-10");
    expect(a.keywords).toBe("panel, méthode");
    expect(a.isPartOf.url).toBe(`${SITE_URL}/blog`);
    expect(a.mainEntityOfPage["@id"].startsWith("https://www.earlypanel.fr/blog/")).toBe(true);
  });

  it("serializeJsonLd echappe </script> pour ne pas casser le HTML", () => {
    const out = serializeJsonLd({ a: "</script><script>alert(1)</script>" });
    expect(out).not.toContain("</script>");
    expect(JSON.parse(out).a).toBe("</script><script>alert(1)</script>");
  });

  it("aucune URL apex (sans www) dans les builders", () => {
    const all = serializeJsonLd([organizationJsonLd(), websiteJsonLd(), serviceJsonLd()]);
    expect(all).not.toMatch(/https:\/\/earlypanel\.fr/);
  });
});
