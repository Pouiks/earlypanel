import type { Metadata } from "next";
import SituationLanding from "@/components/b2b/SituationLanding";

export const metadata: Metadata = {
  title: "Tests utilisateurs pour agences et studios produit · Marque blanche",
  description:
    "Agences digitales, studios produit, freelances : ajoutez un test utilisateur clés en main à vos devis. Panel, questionnaire, relecture et rapport pris en charge, livrable à votre marque ou à la nôtre.",
  alternates: { canonical: "/agences" },
  openGraph: {
    title: "Tests utilisateurs pour agences et studios · earlypanel",
    description: "Revendez un test utilisateur clés en main dans vos devis. Marque blanche ou apport d'affaires.",
    url: "/agences",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "earlypanel · Tests utilisateurs livrés en 5 jours", type: "image/png" }],
  },
};

const faq = [
  {
    q: "Le rapport peut-il être livré à la marque de mon agence ?",
    a: "Oui. En marque blanche, le rapport et la restitution portent votre identité, earlypanel reste invisible pour votre client final, et vous facturez la prestation dans votre devis. En mode apporteur d'affaires, on contractualise directement avec votre client et vous percevez une commission sur la mission. On choisit le mode ensemble au premier appel.",
  },
  {
    q: "Qui signe le NDA quand il y a un client final ?",
    a: "Chaque testeur signe un NDA avec earlypanel avant tout accès. Entre earlypanel et votre agence, un NDA mutuel couvre les informations de votre client final. Si votre client exige un NDA direct, on le signe aussi. Les preuves de signature (hash, horodatage, IP) sont conservées.",
  },
  {
    q: "Quel volume pouvez-vous absorber ?",
    a: "Chaque mission est relue à la main, donc on limite volontairement le nombre de missions simultanées. Pour un partenariat agence, on réserve des créneaux à l'avance : dites-nous votre rythme prévisionnel (une mission par mois, une par sprint) et on bloque la capacité correspondante.",
  },
  {
    q: "Comment intégrer un test earlypanel dans un devis client ?",
    a: "Le plus simple : une ligne « Test utilisateur avec 8 à 12 profils cibles, rapport et restitution » entre la phase design et le développement, ou avant la mise en production. On vous fournit un descriptif de prestation prêt à coller et un forfait fixe, que vous marginez librement.",
  },
  {
    q: "Peut-on démarrer par une seule mission avant de parler partenariat ?",
    a: "Oui, et c'est ce qu'on recommande. Une première mission sur un projet client en cours, au tarif standard, pour que vous jugiez le livrable. Si ça vous convient, on met en place le cadre partenariat (marque blanche ou apport d'affaires, remise volume, créneaux réservés).",
  },
];

export default function AgencesPage() {
  return (
    <SituationLanding
      path="/agences"
      breadcrumbName="Agences et studios"
      eyebrow="Agences digitales · Studios produit · Freelances"
      h1={<>Ajoutez un test utilisateur <em>clés en main</em> à vos devis.</>}
      lede="Vous concevez et développez pour des clients finaux. Vous savez qu'un test utilisateur avant le développement ou avant la mise en production éviterait des allers-retours coûteux. Mais recruter des testeurs, écrire le questionnaire, lire les retours et rédiger un rapport n'est pas votre métier. C'est le nôtre."
      problem={{
        title: "Le problème : le test utilisateur est dans vos recommandations, jamais dans vos devis.",
        paragraphs: [
          "Vous le proposez, le client trouve ça intéressant, puis la ligne saute au premier arbitrage budgétaire parce que personne ne sait exactement ce qu'elle contient ni combien de temps elle mobilise votre équipe.",
          "Quand le test se fait quand même, c'est un chef de projet qui envoie un lien Figma à cinq connaissances et compile des retours dans un Notion. Le client n'y voit pas de valeur, et vous non plus.",
          "Avec earlypanel, le test devient une prestation cadrée, avec un livrable que votre client peut tenir en main : profils sélectionnés selon sa cible, questionnaire co-construit, relecture humaine, rapport rédigé, restitution. Vous la revendez, on la produit.",
        ],
      }}
      method={{
        title: "Comment ça marche avec une agence.",
        intro: "Deux modes possibles, choisis ensemble au premier appel : marque blanche ou apport d'affaires.",
        steps: [
          { title: "Marque blanche", body: "Vous vendez la prestation dans votre devis, à votre marge. On produit le test, le rapport et la restitution sous votre identité. Votre client ne voit qu'un seul interlocuteur : vous." },
          { title: "Apport d'affaires", body: "Vous nous présentez votre client, on contractualise directement avec lui, vous percevez une commission sur la mission. Utile quand vous ne voulez pas porter la prestation." },
          { title: "Capacité réservée", body: "Chaque mission est relue à la main, donc la capacité est limitée. Pour un partenariat, on bloque des créneaux selon votre rythme (une mission par sprint, par mois, par projet)." },
        ],
      }}
      deliverable={{
        title: "Ce que votre client reçoit, et ce que vous gardez.",
        intro: "Le livrable est le même que pour un client direct : un rapport rédigé, pas des données brutes.",
        bullets: [
          "Un descriptif de prestation prêt à intégrer dans vos devis, avec le forfait fixe correspondant.",
          "Des testeurs choisis à la main selon la cible de votre client, NDA signé avant tout accès.",
          "Un questionnaire co-construit avec votre équipe design ou produit.",
          "Un rapport rédigé et priorisé, à votre marque si vous le souhaitez, et une restitution en visio.",
          "Un argument de vente concret pour la phase de design : « on valide avec de vrais utilisateurs avant de coder ».",
        ],
      }}
      faq={faq}
      ctaTitle="Vous avez un projet client où un test aurait sa place ?"
    />
  );
}
