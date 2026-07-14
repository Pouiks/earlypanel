import * as Sentry from "@sentry/nextjs";
import { scrubEvent } from "./sentry.scrub";

const dsn = process.env.NEXT_PUBLIC_GLITCHTIP_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    sendDefaultPii: false,

    // Errors only. Performance tracing + session replay are off because:
    // - replay records DOM, which on tester pages includes free-text answers
    // - tracing captures full URLs (with magic-link tokens) and span headers
    tracesSampleRate: 0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,

    maxBreadcrumbs: 30,

    ignoreErrors: [
      "ResizeObserver loop limit exceeded",
      "ResizeObserver loop completed with undelivered notifications",
      "Non-Error promise rejection captured",
      "NetworkError when attempting to fetch resource",
      "Failed to fetch",
    ],

    denyUrls: [
      /^chrome-extension:\/\//i,
      /^moz-extension:\/\//i,
      /^safari-extension:\/\//i,
      /^webkit-masked-url:\/\//i,
    ],

    beforeBreadcrumb(breadcrumb) {
      // Drop network breadcrumbs that hit endpoints handling PII. We don't
      // need the URL to debug a UI error, and the URL itself can contain
      // tokens/emails (magic-link callbacks, query-filtered lists, etc.).
      if (breadcrumb.category === "fetch" || breadcrumb.category === "xhr") {
        const url = String(breadcrumb.data?.url ?? "");
        if (
          /\/api\/(staff|testers|webhooks|admin|dev)\b/.test(url) ||
          /\/auth\//.test(url)
        ) {
          return null;
        }
      }
      // Console breadcrumbs are dropped wholesale: developers may have logged
      // sensitive shapes during debugging and we don't want them to ship.
      if (breadcrumb.category === "console") return null;
      return breadcrumb;
    },

    beforeSend(event) {
      return scrubEvent(event);
    },
  });
}
