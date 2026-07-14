import * as Sentry from "@sentry/nextjs";
import { scrubEvent } from "./sentry.scrub";

const dsn = process.env.NEXT_PUBLIC_GLITCHTIP_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    sendDefaultPii: false,

    // Errors only — see sentry.client.config.ts for rationale.
    tracesSampleRate: 0,

    maxBreadcrumbs: 30,

    // Local variables in stack frames can carry decrypted IBANs, raw emails,
    // CRON_SECRET fragments, service-role keys… Explicit opt-out.
    includeLocalVariables: false,

    // Skip events that aren't really application errors:
    //  - NEXT_REDIRECT / NEXT_NOT_FOUND are control flow, not errors
    //  - User-facing 401/404/429 are not actionable in the inbox
    ignoreErrors: [
      "NEXT_REDIRECT",
      "NEXT_NOT_FOUND",
      /^Unauthorized$/,
      /^Too many requests$/,
    ],

    beforeSend(event) {
      return scrubEvent(event);
    },
  });
}
