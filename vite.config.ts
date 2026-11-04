import { agentNative } from "@agent-native/core/vite";
import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";

const reactRouterPlugins = reactRouter as unknown as () => any[];
const agentNativePlugins = agentNative as unknown as (
  options?: Parameters<typeof agentNative>[0],
) => any[];
export default defineConfig({
  optimizeDeps: {
    // AgentKit sets noDiscovery: true, so every client dep must be pre-bundled
    // here or Vite re-optimizes mid-session, forces full reloads, and the
    // dev-recovery script gives up with "Dev server out of sync".
    include: [
      // Studio route (/motion) deps.
      "react-colorful",
      "@radix-ui/react-context-menu",
      // Boolean path ops in motion.tsx load this dynamically; without
      // pre-bundling, AgentKit's noDiscovery mode makes Vite re-optimize
      // mid-session, drop the HMR socket ('socket hang up'), and force a
      // full reload when the op is first used.
      "polygon-clipping",
      // Agent sidebar panel deps. The panel (AgentSidebarPanel, lazy) pulls
      // the whole assistant chat in on first open; with these left to
      // on-demand transform, that first open stalled on the panel's
      // Suspense skeleton and never resolved. Pre-bundling the toolkit
      // and core client packages at server start makes the panel load
      // from the optimized bundle instead.
      "@agent-native/toolkit",
      "@agent-native/core",
    ],
    entries: [
      "app/entry.client.tsx",
      "app/root.tsx",
      "app/components/layout/{Layout,Sidebar,AgentInspector}.tsx",
      "app/components/chat/ChatRouteContent.tsx",
      "app/routes/{home,motion,chat.$threadId}.tsx",
    ],
  },
  plugins: [
    ...reactRouterPlugins(),
    ...agentNativePlugins({
      ssrStubs: ["shiki"],
    }),
  ],
});
