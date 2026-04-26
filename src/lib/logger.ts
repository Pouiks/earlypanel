// W4 : logger centralise. Wrapper sur console.* avec niveaux structures
// (debug/info/warn/error), prefixe automatique de scope, et serialisation
// JSON en production pour faciliter le parsing par Vercel/Datadog/Sentry.
//
// Pattern d'usage :
//   const log = logger("api/payouts");
//   log.info("paying", { count: 3 });
//   log.error("transfer failed", { id, err });
//
// En dev : sortie console lisible (couleurs natives Vercel/terminal).
// En prod : JSON one-liner avec { level, scope, msg, data, timestamp }.

type Level = "debug" | "info" | "warn" | "error";

const isProd = process.env.NODE_ENV === "production";

function format(level: Level, scope: string, msg: string, data?: unknown): string | unknown[] {
  if (isProd) {
    return JSON.stringify({
      level,
      scope,
      msg,
      data: data ?? undefined,
      timestamp: new Date().toISOString(),
    });
  }
  // En dev on prefere un format lisible. On retourne un tuple a destructurer
  // dans les console.*.
  if (data !== undefined) return [`[${scope}]`, msg, data];
  return [`[${scope}]`, msg];
}

function emit(level: Level, scope: string, msg: string, data?: unknown) {
  const out = format(level, scope, msg, data);
  const fn =
    level === "debug" ? console.debug
    : level === "info" ? console.info
    : level === "warn" ? console.warn
    : console.error;
  if (Array.isArray(out)) fn(...out);
  else fn(out);
}

export interface Logger {
  debug(msg: string, data?: unknown): void;
  info(msg: string, data?: unknown): void;
  warn(msg: string, data?: unknown): void;
  error(msg: string, data?: unknown): void;
}

export function logger(scope: string): Logger {
  return {
    debug: (msg, data) => emit("debug", scope, msg, data),
    info: (msg, data) => emit("info", scope, msg, data),
    warn: (msg, data) => emit("warn", scope, msg, data),
    error: (msg, data) => emit("error", scope, msg, data),
  };
}
