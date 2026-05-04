import type { NextConfig } from "next";

// M1 : security headers globaux. CSP volontairement absente pour cette passe
// (risque de casser tiptap, iframes Stripe, tracking Resend) ; a evaluer
// separement avec mode `Content-Security-Policy-Report-Only`.
const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  // Cache stale CSS chunks plus longtemps + dont leak la version Next dans
  // les headers. Micro-polish qui evite un fingerprinting pour rien.
  poweredByHeader: false,

  // Compression Brotli/Gzip explicite (Vercel le fait deja par defaut, mais
  // on rend l'intention explicite pour les autres deploiements).
  compress: true,

  experimental: {
    // Inline les chunks CSS critiques dans le HTML <style> au lieu de servir
    // un fichier separe. Elimine le 2e round trip render-blocking sur la
    // chaine critique LCP. Next.js 15+, stable en pratique sur landing
    // statiques. Pour les pages avec beaucoup de CSS dynamique (dashboard
    // staff/testeur), Next decide automatiquement de sortir un chunk separe.
    inlineCss: true,

    // Tree-shake plus agressivement les gros packages : Next n'inclut que
    // les fonctions reellement utilisees, reduit le bundle JS de 10-30%.
    optimizePackageImports: [
      "@dnd-kit/core",
      "@dnd-kit/sortable",
      "@dnd-kit/utilities",
      "react-markdown",
    ],
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
