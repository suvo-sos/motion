import { defineAction } from "@agent-native/core/action";
import { writeAppStateForCurrentTab } from "@agent-native/core/application-state";
import { z } from "zod";

export default defineAction({
  description:
    "Navigate the UI to a specific view or path. Writes a navigate command to application state which the UI reads and auto-deletes.",
  schema: z.object({
    view: z.string().optional().describe("View name to navigate to"),
    path: z.string().optional().describe("URL path to navigate to (may include a query string)"),
    query: z
      .string()
      .optional()
      .describe('Query string to append, e.g. "id=abc" or "id=abc&foo=bar"'),
    searchParams: z
      .record(z.string(), z.string())
      .optional()
      .describe("Query parameters as a key/value object, e.g. { id: \"abc\" }"),
    threadId: z.string().optional().describe("Chat thread ID to open"),
  }),
  http: false,
  run: async (args) => {
    if (!args.view && !args.path) {
      throw new Error("At least --view or --path is required.");
    }
    let path = args.path ?? "";
    const params = new URLSearchParams();
    if (args.query) {
      const q = args.query.startsWith("?") ? args.query.slice(1) : args.query;
      new URLSearchParams(q).forEach((v, k) => params.set(k, v));
    }
    if (args.searchParams) {
      for (const [k, v] of Object.entries(args.searchParams)) params.set(k, v);
    }
    const queryString = params.toString();
    if (queryString) {
      path = path.includes("?")
        ? `${path}&${queryString}`
        : `${path}?${queryString}`;
    }
    const nav: Record<string, string> = {};
    if (args.view) nav.view = args.view;
    if (path) nav.path = path;
    if (args.threadId) nav.threadId = args.threadId;
    if (queryString) nav.query = queryString;
    nav._writeId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await writeAppStateForCurrentTab("navigate", nav);
    return `Navigating to ${args.view || path}`;
  },
});
