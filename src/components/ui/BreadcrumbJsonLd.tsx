import JsonLd from "@/components/ui/JsonLd";
import { breadcrumbJsonLd, type BreadcrumbItem } from "@/lib/json-ld";

/** BreadcrumbList : URLs absolues (SITE_URL). */
export default function BreadcrumbJsonLd({ items }: { items: BreadcrumbItem[] }) {
  return <JsonLd data={breadcrumbJsonLd(items)} />;
}
