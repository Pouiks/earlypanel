import { serializeJsonLd } from "@/lib/json-ld";

/**
 * Injecte un objet JSON-LD dans le HTML. dangerouslySetInnerHTML est
 * volontaire : c'est l'API standard pour le JSON-LD en SSR, et le contenu
 * vient de nos builders (src/lib/json-ld.ts), jamais d'un input utilisateur.
 */
export default function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />;
}
