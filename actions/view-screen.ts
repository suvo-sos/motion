import { defineAction } from "@agent-native/core/action";
import { readAppState } from "@agent-native/core/application-state";
import { z } from "zod";

export default defineAction({
  description:
    "Read the Chat app's current navigation state. Basic navigation is already included in <current-screen>; use this action only when you need a fresh read.",
  schema: z.object({}),
  http: false,
  readOnly: true,
  run: async () => {
    const navigation = await readAppState("navigation");
    const url = await readAppState("__url__");

    const screen: Record<string, unknown> = {};
    if (navigation) screen.navigation = navigation;
    if (url) screen.url = url;

    // Surface the open animation id when the studio is open, so the agent
    // always targets the right row and re-reads it before editing.
    const searchParams = (url as any)?.searchParams ?? {};
    const id =
      (typeof searchParams?.id === "string" && searchParams.id) ||
      (typeof searchParams?.get === "function" ? searchParams.get("id") : null);
    if (id) screen.animationId = id;

    if (Object.keys(screen).length === 0) {
      return "No application state found. Is the app running?";
    }
    return screen;
  },
});
