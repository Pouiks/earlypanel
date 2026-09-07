import JsonLd from "@/components/ui/JsonLd";
import { faqJsonLd, type FaqItem } from "@/lib/json-ld";

/**
 * FAQPage : passer LE MEME tableau que celui qui alimente <FaqAccordion>,
 * pour que le balisage et le texte visible restent identiques.
 */
export default function FaqJsonLd({ items }: { items: FaqItem[] }) {
  return <JsonLd data={faqJsonLd(items)} />;
}
