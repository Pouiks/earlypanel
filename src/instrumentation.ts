// Next.js instrumentation entry point. Loaded once at server cold start
// (Node runtime) and once at edge cold start. `register()` is awaited before
// any request is handled, so the Sentry SDK is initialised in time to catch
// the first error.

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

// Forward Next's request-level errors to Sentry. This catches errors thrown
// during the React server-rendering pass that the standard runtime hooks miss.
export async function onRequestError(
  err: unknown,
  request: {
    path: string;
    method: string;
    headers: Record<string, string | string[] | undefined>;
  },
  context: {
    routerKind: "Pages Router" | "App Router";
    routePath: string;
    routeType: "render" | "route" | "action" | "middleware";
    revalidateReason: "on-demand" | "stale" | undefined;
    renderSource:
      | "react-server-components"
      | "react-server-components-payload"
      | "server-rendering";
  },
) {
  const Sentry = await import("@sentry/nextjs");
  Sentry.captureRequestError(err, request, context);
}
