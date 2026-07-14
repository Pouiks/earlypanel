import type { Event, ErrorEvent } from "@sentry/nextjs";

// Conservative, regex-based scrubbers. Goal: "no PII slips through" rather
// than perfect parsing. Run on every event before it leaves the process,
// as defense-in-depth on top of `sendDefaultPii: false`.

const EMAIL_RE = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
// IBAN: country code + 2 check digits + 11–30 BBAN chars (letters/digits,
// optional spaces). Covers FR / EU / UK / CH formats earlypanel accepts.
const IBAN_RE = /\b[A-Z]{2}\d{2}(?:\s?[A-Z0-9]){11,30}\b/g;

export function scrubString(s: string): string {
  return s.replace(EMAIL_RE, "[EMAIL]").replace(IBAN_RE, "[IBAN]");
}

function stripQueryString(url: string): string {
  const q = url.indexOf("?");
  return q === -1 ? url : url.slice(0, q);
}

// Generic over T so it accepts both `Event` and `ErrorEvent` and preserves
// the input's narrower type — Sentry's `beforeSend` hook is typed for
// `ErrorEvent` specifically, not the generic `Event`.
export function scrubEvent<T extends Event | ErrorEvent>(event: T): T | null {
  // 1. Drop request payload wholesale. Headers can hold cookies/auth tokens,
  //    data can hold IBAN/email/free-text answers, query strings can hold
  //    magic-link tokens. None of this is needed to read the stack trace.
  if (event.request) {
    event.request = {
      ...event.request,
      cookies: undefined,
      data: undefined,
      headers: undefined,
      query_string: undefined,
    };
    if (typeof event.request.url === "string") {
      event.request.url = stripQueryString(event.request.url);
    }
  }

  // 2. Scrub exception messages — `new Error(\`Invalid IBAN ${iban}\`)` etc.
  if (event.exception?.values) {
    for (const ex of event.exception.values) {
      if (ex.value) ex.value = scrubString(ex.value);
    }
  }
  if (event.message) {
    event.message = scrubString(event.message);
  }

  // 3. Scrub breadcrumbs already collected (some may include PII in messages).
  if (event.breadcrumbs) {
    for (const bc of event.breadcrumbs) {
      if (bc.message) bc.message = scrubString(bc.message);
      if (typeof bc.data?.url === "string") {
        bc.data.url = stripQueryString(bc.data.url);
      }
    }
  }

  // 4. Strip user identity even if some integration set it.
  if (event.user) event.user = undefined;

  // 5. Hide hostname / runtime hints that have no business leaving the box.
  if (event.server_name) event.server_name = undefined;

  return event;
}
