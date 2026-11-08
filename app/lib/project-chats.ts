/**
 * Per-project agent chats: each project remembers the agent thread that
 * built it, so reopening a project reopens its conversation instead of
 * showing whatever thread another project left in the sidebar.
 *
 * The agent sidebar itself is framework-owned (storageKey="chat"), and it
 * only persists one active thread pointer in localStorage
 * (`agent-chat-active-thread:chat...`). We keep a small map from project id
 * to thread id next to it and switch that pointer when the project changes.
 * The thread content itself lives on the server, in the framework's
 * agent-chat threads — this map only remembers which thread belongs to
 * which project, in this browser.
 *
 * Deliberately not the framework's `scope` prop: scoping the sidebar to
 * the animation was tried before and hid the home composer's thread when
 * the agent navigated to /motion after a build. This map preserves that
 * handoff — the thread that just built the project is recorded as the
 * project's thread — and only switches when a project already has one.
 */

import { TAB_ID } from "./tab-id";

const PROJECT_CHATS_KEY = "motion-studio-project-chats:v1";

/** Prefix of the sidebar's active-thread pointer (storageKey "chat").
 * The framework writes both a tab-scoped key
 * (`agent-chat-active-thread:chat:tab:<tabId>`) and the legacy key without
 * the tab part; either holds the same plain thread id. */
const ACTIVE_THREAD_PREFIX = "agent-chat-active-thread:chat";

type ProjectChatMap = Record<string, string>;

function readMap(): ProjectChatMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(PROJECT_CHATS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    const map: ProjectChatMap = {};
    // One thread belongs to one project. A thread recorded under two
    // projects is a steal from the earlier buggy window (the recorder
    // used to adopt whatever thread the sidebar showed) — keep the
    // first claim, which is the project the thread was built for, and
    // drop the later ones so the poisoned project starts fresh.
    const seenThreads = new Set<string>();
    let dropped = false;
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof key === "string" && typeof value === "string" && value) {
        if (seenThreads.has(value)) {
          dropped = true;
          continue;
        }
        seenThreads.add(value);
        map[key] = value;
      }
    }
    if (dropped) writeMap(map);
    return map;
  } catch {
    return {};
  }
}

function writeMap(map: ProjectChatMap): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PROJECT_CHATS_KEY, JSON.stringify(map));
  } catch {
    // Storage can be unavailable or full in restricted contexts; the
    // project still opens, it just will not remember its thread.
  }
}

/** The thread id recorded for a project, or null when it has none yet. */
export function getProjectChatThread(projectId: string): string | null {
  return readMap()[projectId] ?? null;
}

/** The project a thread belongs to, or null when no project maps to it. */
export function getProjectForChatThread(threadId: string): string | null {
  if (!threadId) return null;
  for (const [projectId, mapped] of Object.entries(readMap())) {
    if (mapped === threadId) return projectId;
  }
  return null;
}

/** Record that this thread belongs to this project. */
export function setProjectChatThread(
  projectId: string,
  threadId: string,
): void {
  if (!projectId || !threadId) return;
  const map = readMap();
  if (map[projectId] === threadId) return;
  // A thread already belongs to another project: never steal it. The
  // sidebar only shows one thread, so without this the recorder would
  // adopt the previous project's conversation for the project just
  // opened. The caller starts a fresh chat for the new project instead.
  const owner = getProjectForChatThread(threadId);
  if (owner && owner !== projectId) return;
  map[projectId] = threadId;
  writeMap(map);
}

/** Forget a project's thread (used when the project is deleted). */
export function removeProjectChatThread(projectId: string): void {
  const map = readMap();
  if (!(projectId in map)) return;
  delete map[projectId];
  writeMap(map);
}

/**
 * The thread the agent sidebar is showing right now, read from its own
 * persisted pointer. Returns null when the sidebar has no thread yet.
 *
 * The pointer is per browser tab (`...:chat:tab:<tabId>`), and every tab
 * the user ever opened leaves its own stale key behind — so scanning for
 * the first `:tab:` key returned another tab's old thread, and projects
 * were recorded under the wrong conversation. Read this tab's exact key
 * first, then the legacy key the sidebar also writes on every persist.
 * When neither exists the sidebar has no thread yet (fresh tab, or the
 * keys were just cleared for a new chat) — report none rather than
 * scanning other tabs' keys, which would resurrect another tab's thread.
 */
export function readActiveSidebarThread(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const exact = window.localStorage.getItem(
      `${ACTIVE_THREAD_PREFIX}:tab:${TAB_ID}`,
    );
    if (exact) return exact;
    const legacy = window.localStorage.getItem(ACTIVE_THREAD_PREFIX);
    if (legacy) return legacy;
    return null;
  } catch {
    return null;
  }
}

/**
 * True when the server still has this thread. A thread id can outlive its
 * server row — a client draft that was never persisted, a thread deleted
 * elsewhere, or a row lost when local dev storage was reset — and opening
 * it then 404s and shows an empty chat. Only a 404 means dead: anything
 * else (401, network error) is treated as alive, so an auth hiccup never
 * evicts a good thread.
 */
export async function isProjectChatThreadAlive(
  threadId: string,
): Promise<boolean> {
  if (typeof window === "undefined" || !threadId) return false;
  try {
    const res = await fetch(
      `/_agent-native/agent-chat/threads/${encodeURIComponent(threadId)}`,
      { method: "GET" },
    );
    return res.status !== 404;
  } catch {
    return true;
  }
}

/**
 * Ask the agent sidebar to open a thread — the same event the home
 * handoff uses (`agent-chat:open-thread`), so the panel switches to that
 * conversation. Duplicate opens of the same thread are ignored by the panel.
 */
export function openProjectChatThread(threadId: string): void {
  if (typeof window === "undefined" || !threadId) return;
  window.dispatchEvent(
    new CustomEvent("agent-chat:open-thread", {
      detail: { threadId, source: "project-chat" },
    }),
  );
}
