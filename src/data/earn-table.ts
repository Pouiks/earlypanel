import type { EarnRow } from "@/types";

export const earnRows: EarnRow[] = [
  {
    profile: "Grand public",
    subtitle: "Tout profil",
    duration: "20–25 min",
    earn: "15€",
  },
  {
    profile: "Professionnel actif",
    subtitle: "Salarié ou freelance",
    duration: "25–30 min",
    earn: "20€",
  },
  {
    profile: "Expert métier",
    subtitle: "RH, compta, IT, commerce…",
    duration: "30 min",
    earn: "30–35€",
    badge: "Expert",
    badgeType: "premium",
  },
  {
    profile: "Profil rare",
    subtitle: "DAF, DSI, médecin, juriste…",
    duration: "30–45 min",
    earn: "40–50€",
    badge: "Premium",
    badgeType: "premium",
  },
];
