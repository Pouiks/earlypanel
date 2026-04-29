import { ImageResponse } from "next/og";

/**
 * OG image generee dynamiquement (Next 16 file convention).
 * Servie a https://earlypanel.fr/opengraph-image (Next genere le hash dans
 * l'URL pour le cache busting). Utilisee automatiquement par les metadonnees
 * OG/Twitter de toutes les pages — pas besoin de la referencer dans layout.tsx.
 *
 * Pourquoi PNG et pas SVG : Facebook, LinkedIn, WhatsApp, iMessage et Slack
 * ne parsent pas correctement les SVG comme og:image. PNG est le format
 * universellement supporte (spec OG officielle).
 *
 * Doc : https://nextjs.org/docs/app/api-reference/file-conventions/metadata/opengraph-image
 */

export const runtime = "edge";

export const alt = "earlypanel — Tests utilisateurs livres en 5 jours";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          backgroundColor: "#ffffff",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {/* Bande verte gauche */}
        <div
          style={{
            width: 6,
            height: "100%",
            backgroundColor: "#0A7A5A",
          }}
        />

        {/* Contenu principal */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "80px",
          }}
        >
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "baseline" }}>
            <span
              style={{
                fontSize: 36,
                fontWeight: 700,
                color: "#0A7A5A",
                letterSpacing: "-0.02em",
              }}
            >
              early
            </span>
            <span
              style={{
                fontSize: 36,
                fontWeight: 700,
                color: "#1d1d1f",
                letterSpacing: "-0.02em",
              }}
            >
              panel
            </span>
            <span
              style={{
                fontSize: 36,
                fontWeight: 700,
                color: "#2DD4A0",
                marginLeft: 4,
              }}
            >
              .
            </span>
          </div>

          {/* Titre principal + badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 40,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
              <span
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: "#0A7A5A",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  marginBottom: 24,
                }}
              >
                Tests utilisateurs · Rapport actionnable
              </span>
              <span
                style={{
                  fontSize: 88,
                  fontWeight: 700,
                  color: "#1d1d1f",
                  letterSpacing: "-0.03em",
                  lineHeight: 1,
                }}
              >
                Vos tests utilisateurs
              </span>
              <span
                style={{
                  fontSize: 88,
                  fontWeight: 700,
                  color: "#0A7A5A",
                  letterSpacing: "-0.03em",
                  lineHeight: 1,
                  marginTop: 16,
                }}
              >
                en 5 jours.
              </span>
            </div>

            {/* Badge "5 jours" */}
            <div
              style={{
                width: 180,
                height: 180,
                borderRadius: 90,
                backgroundColor: "#E8F7F1",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: 140,
                  height: 140,
                  borderRadius: 70,
                  backgroundColor: "#ffffff",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span
                  style={{
                    fontSize: 64,
                    fontWeight: 700,
                    color: "#0A7A5A",
                    letterSpacing: "-0.04em",
                    lineHeight: 1,
                  }}
                >
                  5
                </span>
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#0A7A5A",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    marginTop: 4,
                  }}
                >
                  jours
                </span>
              </div>
            </div>
          </div>

          {/* Footer : url + tagline */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              borderTop: "1px solid #e5e5ea",
              paddingTop: 24,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontSize: 20,
                  fontWeight: 500,
                  color: "#6e6e73",
                }}
              >
                earlypanel.fr
              </span>
              <span
                style={{
                  fontSize: 16,
                  fontWeight: 500,
                  color: "#6e6e73",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                }}
              >
                Panel qualifie · Rapport en 5 jours
              </span>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
