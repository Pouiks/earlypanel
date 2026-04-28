import type { Metadata } from "next";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import OrganizationJsonLd from "@/components/ui/OrganizationJsonLd";
import CookieBanner from "@/components/ui/CookieBanner";
import "./globals.css";

export const metadata: Metadata = {
  // Title : structure "promesse + marque" optimisee SEO. Mots-cles : tests
  // utilisateurs, panel humain, livraison rapide, France.
  title: {
    default: "Tests utilisateurs clés en main · Panel humain qualifié — earlypanel",
    template: "%s · earlypanel",
  },
  description:
    "Service de tests utilisateurs B2B en France. Panel humain de 500+ testeurs qualifiés (SaaS, fintech, healthtech, e-commerce). NDA contractualisé, atelier de cadrage offert, rapport livré en 5 jours.",
  keywords: [
    "tests utilisateurs",
    "user testing France",
    "panel testeurs",
    "test UX",
    "test produit SaaS",
    "audit utilisateur",
    "test MVP",
    "tests qualitatifs",
    "earlypanel",
  ],
  authors: [{ name: "earlypanel" }],
  metadataBase: new URL("https://earlypanel.fr"),
  openGraph: {
    title: "earlypanel — Tests utilisateurs B2B clés en main",
    description:
      "Panel humain de 500+ testeurs. NDA contractualisé. Rapport actionnable en 5 jours. Pour startups, scale-ups, agences digitales.",
    type: "website",
    locale: "fr_FR",
    url: "https://earlypanel.fr",
    siteName: "earlypanel",
    images: [
      {
        url: "/og_image_variant_a_5jours.svg",
        width: 1200,
        height: 630,
        alt: "earlypanel — Tests utilisateurs livrés en 5 jours",
        type: "image/svg+xml",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "earlypanel — Tests utilisateurs B2B clés en main",
    description: "500+ testeurs qualifiés. NDA inclus. Rapport en 5 jours.",
    images: ["/og_image_variant_a_5jours.svg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "https://earlypanel.fr",
  },
  // Icones du site : detectees par tous les browsers + iOS (Apple touch icon).
  // Les fichiers sont dans /public et servis a la racine.
  icons: {
    // Favicon classique (browsers desktop, onglets, bookmarks)
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    // Apple touch icon (homescreen iOS, partage iMessage, Safari Pin)
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    // Shortcut pour les vieux browsers Windows (IE) — fallback ico
    shortcut: ["/favicon.ico"],
  },
  manifest: undefined, // pas de PWA pour l'instant ; ajouter /manifest.json si besoin
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Matomo : ne se charge QUE si vraiment configure. Eviter de tirer un
  // script qui pointe vers https://YOUR_MATOMO_URL/ et echoue silencieusement.
  const matomoUrl = process.env.NEXT_PUBLIC_MATOMO_URL?.trim();
  const matomoSiteId = process.env.NEXT_PUBLIC_MATOMO_SITE_ID?.trim();
  const matomoEnabled =
    matomoUrl && matomoSiteId && !matomoUrl.includes("YOUR_MATOMO_URL");

  // Microsoft Clarity : derriere env var pour pouvoir activer/desactiver
  // sans toucher au code. Cookieless mode (gratuit, illimite, RGPD-clean).
  const clarityProjectId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID?.trim();

  return (
    <html lang="fr">
      <head>
        {/* JSON-LD Organization + WebSite : injecte une fois pour tout le site.
            Aide Google (Knowledge Panel) et les LLM (citations dans ChatGPT,
            Claude, Perplexity, Gemini) a comprendre qu'earlypanel est une
            entreprise francaise de tests utilisateurs. */}
        <OrganizationJsonLd />

        {/* Matomo : conditionnel, mode cookieless (disableCookies). */}
        {matomoEnabled && (
          <Script id="matomo" strategy="afterInteractive">{`
            var _paq = window._paq = window._paq || [];
            _paq.push(['disableCookies']);
            _paq.push(['trackPageView']);
            _paq.push(['enableLinkTracking']);
            (function() {
              var u = "${matomoUrl}/";
              _paq.push(['setTrackerUrl', u + 'matomo.php']);
              _paq.push(['setSiteId', '${matomoSiteId}']);
              var d = document, g = d.createElement('script'), s = d.getElementsByTagName('script')[0];
              g.async = true; g.src = u + 'matomo.js'; s.parentNode.insertBefore(g, s);
            })();
          `}</Script>
        )}

        {/* Microsoft Clarity : heatmaps + session recordings, gratuit illimite.
            Dashboard : https://clarity.microsoft.com/projects/view/<projectId>/dashboard */}
        {clarityProjectId && (
          <Script id="clarity" strategy="afterInteractive">{`
            (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "${clarityProjectId}");
          `}</Script>
        )}
      </head>
      <body>
        {children}
        {/* Vercel Analytics : cookieless, plug & play, gratuit sur Hobby. */}
        <Analytics />
        {/* Bandeau d'information cookies (pas un consentement actif :
            tous nos analytics sont cookieless donc informer suffit). */}
        <CookieBanner />
      </body>
    </html>
  );
}
