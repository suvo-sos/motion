import { configureClientRouterBasename } from "@agent-native/core/client/api-path";
import { installRouteChunkRecovery } from "@agent-native/core/client/route-chunk-recovery";
import { hydrateRoot } from "react-dom/client";
import { HydratedRouter } from "react-router/dom";

installRouteChunkRecovery();

// React 19 logs a dev-only warning every time it renders the inline theme /
// locale bootstrap <script> elements. Those scripts are SSR-only by design:
// they run before hydration and must not run again on the client. The warning
// is expected noise, so drop just that message and let every other error
// through (including the route-chunk recovery hook installed above).
if (import.meta.env.DEV) {
  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    if (
      typeof args[0] === "string" &&
      args[0].startsWith(
        "Encountered a script tag while rendering React component",
      )
    ) {
      return;
    }
    originalError(...args);
  };
}

configureClientRouterBasename();

hydrateRoot(document, <HydratedRouter />);
