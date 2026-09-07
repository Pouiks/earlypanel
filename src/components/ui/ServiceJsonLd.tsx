import JsonLd from "@/components/ui/JsonLd";
import { serviceJsonLd } from "@/lib/json-ld";

/** Service « Tests utilisateurs » : sur / et /entreprises. */
export default function ServiceJsonLd() {
  return <JsonLd data={serviceJsonLd()} />;
}
