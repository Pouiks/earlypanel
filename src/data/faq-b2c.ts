import type { FaqItem } from "@/types";

export const faqB2C: FaqItem[] = [
  {
    question: "Est-ce que je dois déclarer ces revenus ?",
    answer:
      "Oui. Les revenus issus des tests sont des revenus complémentaires à déclarer aux impôts. Stripe vous fournit un récapitulatif annuel de vos gains pour simplifier votre déclaration.",
  },
  {
    question: "Combien de temps faut-il par mission ?",
    answer:
      "En moyenne 25 minutes. Chaque invitation précise la durée estimée avant que vous acceptiez. Vous ne pouvez jamais être surpris par une mission plus longue que prévue.",
  },
  {
    question: "Quand et comment suis-je payé ?",
    answer:
      "Par virement bancaire sous 72h après validation de votre test. Vous configurez votre IBAN une seule fois via notre interface sécurisée Stripe. Aucun intermédiaire.",
  },
  {
    question: "Que se passe-t-il si mon test est refusé ?",
    answer:
      "On vous explique pourquoi par email. Un test est refusé uniquement si les réponses sont trop courtes ou incohérentes. Vous ne serez pas payé pour ce test, mais votre profil reste actif.",
  },
  {
    question: "Mes données personnelles sont-elles protégées ?",
    answer:
      "Absolument. Vos données ne sont jamais revendues à des tiers. Elles servent uniquement au matching avec les missions. Tout est conforme RGPD, vous pouvez demander leur suppression à tout moment.",
  },
  {
    question: "Combien de missions vais-je recevoir par mois ?",
    answer:
      "Cela dépend de votre profil et de la demande côté clients. En moyenne, nos testeurs reçoivent 1 à 3 missions par mois. Les profils rares et experts reçoivent davantage d'invitations.",
  },
];
