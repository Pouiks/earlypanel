import type { Scenario } from "@/types";

export const scenarios: Scenario[] = [
  {
    tag: "Parcours d'onboarding",
    session: "Session · Logiciel de facturation",
    question: "À quelle étape vous êtes-vous arrêté, et pourquoi ?",
    hint: "Décrivez précisément ce qui s'est passé, même si c'est technique.",
    answer:
      'Lorsque j\'ai cliqué sur "Se connecter", une erreur est apparue et m\'a redirigé vers une page blanche.\n\nJ\'ai ouvert la console et j\'ai vu : "TypeError: Cannot read properties of undefined (reading \'token\')"\n\nJ\'ai essayé de recommencer 2 fois, même résultat.',
    progress: "Question 3 sur 6",
    pct: "50%",
    fill: "50%",
    name: "Marie L.",
    job: "Chargée RH",
    avatar: "ML",
    avatarBg: "#1a3326",
    avatarColor: "#2DD4A0",
    device: "Ordinateur · Chrome",
  },
  {
    tag: "Tunnel de paiement",
    session: "Session · Application e-commerce",
    question:
      "Qu'est-ce qui vous a empêché de finaliser votre commande ?",
    hint: "Pensez aux informations demandées, aux étapes, aux messages affichés.",
    answer:
      "Tout allait bien jusqu'à la saisie de ma carte. Le formulaire a vidé tous mes champs après que j'ai corrigé le numéro.\n\nJ'ai dû tout ressaisir 3 fois. À la 3ème tentative j'ai abandonné.\n\nAussi : les frais de livraison n'apparaissent qu'à la dernière étape — c'est frustrant.",
    progress: "Question 4 sur 7",
    pct: "57%",
    fill: "57%",
    name: "Simon R.",
    job: "Freelance dev",
    avatar: "SR",
    avatarBg: "#1a2535",
    avatarColor: "#85B7EB",
    device: "Mobile · Safari",
  },
  {
    tag: "Dashboard analytique",
    session: "Session · SaaS RH",
    question:
      "Avez-vous trouvé facilement l'information que vous cherchiez ?",
    hint: "Dites-nous où vous avez cherché et ce que vous avez trouvé ou non.",
    answer:
      "Je cherchais le rapport des congés sur les 6 derniers mois.\n\nJ'ai d'abord cliqué sur \"Rapports\" puis \"Congés\" mais les filtres de date ne fonctionnent pas comme prévu — impossible de choisir une plage personnalisée.\n\nJ'ai finalement trouvé en passant par \"Export\", ce qui n'est vraiment pas logique.",
    progress: "Question 2 sur 5",
    pct: "40%",
    fill: "40%",
    name: "Amira K.",
    job: "Responsable RH",
    avatar: "AK",
    avatarBg: "#2a1f0e",
    avatarColor: "#EF9F27",
    device: "Tablette · Firefox",
  },
];
