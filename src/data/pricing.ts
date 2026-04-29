import type { PricingPack } from "@/types";

export const pricingPacks: PricingPack[] = [
  {
    category: "Essentiel",
    name: "Quick Test",
    price: "700€",
    features: [
      "5 testeurs ciblés",
      "Questionnaire 25 min",
      "Rapport synthétique",
      "Livraison en 3 jours",
    ],
    trackingId: "pack_quick",
  },
  {
    category: "Le plus choisi",
    name: "Standard",
    price: "1 200€",
    features: [
      "10 testeurs ciblés",
      "Analyse UX complète",
      "KPIs quanti + quali",
      "Recommandations priorisées",
    ],
    featured: true,
    trackingId: "pack_standard",
  },
  {
    category: "Premium",
    name: "Expert",
    price: "2 200€",
    features: [
      "15 testeurs + profils experts",
      "Analyse IA pré-test incluse",
      "Rapport complet + slides",
      "2 sessions de restitution",
      "Suivi 30 jours post-livraison",
    ],
    trackingId: "pack_expert",
  },
];
