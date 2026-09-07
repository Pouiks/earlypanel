import JsonLd from "@/components/ui/JsonLd";
import { organizationJsonLd, websiteJsonLd } from "@/lib/json-ld";

/** Organization + WebSite, injectes une fois dans le root layout. */
export default function OrganizationJsonLd() {
  return (
    <>
      <JsonLd data={organizationJsonLd()} />
      <JsonLd data={websiteJsonLd()} />
    </>
  );
}
