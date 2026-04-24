import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "earlypanel — Tests utilisateurs clés en main",
  description:
    "Des vrais utilisateurs testent votre produit. Questionnaires ciblés, analyse actionnelle, livraison en 5 jours. Clés en main.",
  metadataBase: new URL("https://earlypanel.fr"),
  openGraph: {
    title: "earlypanel — Tests utilisateurs clés en main",
    description:
      "Des vrais utilisateurs testent votre produit. Rapport actionnable livré en 5 jours.",
    type: "website",
    url: "https://earlypanel.fr",
  },
  alternates: {
    canonical: "https://earlypanel.fr",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <head>
        <Script id="matomo" strategy="afterInteractive">{`
          var _paq = window._paq = window._paq || [];
          _paq.push(['disableCookies']);
          _paq.push(['trackPageView']);
          _paq.push(['enableLinkTracking']);
          (function() {
            var u = "${process.env.NEXT_PUBLIC_MATOMO_URL || "https://YOUR_MATOMO_URL"}/";
            _paq.push(['setTrackerUrl', u + 'matomo.php']);
            _paq.push(['setSiteId', '${process.env.NEXT_PUBLIC_MATOMO_SITE_ID || "1"}']);
            var d = document, g = d.createElement('script'), s = d.getElementsByTagName('script')[0];
            g.async = true; g.src = u + 'matomo.js'; s.parentNode.insertBefore(g, s);
          })();
        `}</Script>
      </head>
      <body>{children}</body>
    </html>
  );
}
