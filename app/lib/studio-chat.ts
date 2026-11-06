import { clearLastChatThread } from "./chat-home-thread";

/**
 * Opening a project is a fresh start, not a resumption. The agent sidebar
 * remembers the last thread it showed in this browser tab, so without a reset
 * every template or saved project opened with someone else's conversation
 * already on screen.
 *
 * The sidebar persists two pointers (`agent-chat-active-thread` for the open
 * thread and `agent-chat-open-tabs` for its tab strip). Dropping them before
 * the panel mounts makes it start on a brand-new empty chat; the window event
 * covers the case where the panel is already mounted and holds the old thread
 * in memory only.
 */
const SIDEBAR_STORAGE_PREFIXES = [
  "agent-chat-active-thread",
  "agent-chat-open-tabs",
];

function isSidebarStorageKey(key: string): boolean {
  return SIDEBAR_STORAGE_PREFIXES.some(
    (prefix) => key === prefix || key.startsWith(`${prefix}:`),
  );
}

/** Start the studio with no previous conversation in the agent sidebar. */
export function startFreshStudioChat(): void {
  if (typeof window === "undefined") return;

  // A fresh studio chat also ends any pending home handoff — otherwise the
  // handoff (which lives 10 minutes) would claim this project for the
  // previous home conversation.
  clearLastChatThread();

  try {
    const stale: string[] = [];
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (key && isSidebarStorageKey(key)) stale.push(key);
    }
    for (const key of stale) window.localStorage.removeItem(key);
    // coercion-ok: without storage the panel simply falls back to the thread it
    // already holds in memory, which the event below still replaces.
  } catch {
    // Storage can be unavailable in restricted browser contexts.
  }

  window.dispatchEvent(new CustomEvent("agent-chat:new-chat"));
}
