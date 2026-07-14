import * as Sentry from "@sentry/nextjs";
import { scrubEvent } from "./sentry.scrub";

const dsn = process.env.NEXT_PUBLIC_GLITCHTIP_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    maxBreadcrumbs: 20,
    ignoreErrors: ["NEXT_REDIRECT", "NEXT_NOT_FOUND"],
    beforeSend(event) {
      return scrubEvent(event);
    },
  });
}
