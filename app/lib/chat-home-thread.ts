import { markClientDraftThread } from "@agent-native/toolkit/app/chat/agentkit-chat/rail";

const CHAT_HOME_THREAD_STORAGE_KEY = "agent-native.chat-home-thread";
const LAST_CHAT_THREAD_STORAGE_KEY = "agent-native.motion.last-chat-thread";
const CHAT_HOME_THREAD_TTL_MS = 10 * 60 * 1000;

type PendingChatHomeThread = {
  id: string;
  issuedAt: number;
};

function createChatThreadId(): string {
  return `chat-${
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : Date.now().toString(36)
  }`;
}

export function getChatHomeThreadId(): string {
  const create = () => {
    const id = createChatThreadId();
    markClientDraftThread(id);
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.setItem(
          CHAT_HOME_THREAD_STORAGE_KEY,
          JSON.stringify({
            id,
            issuedAt: Date.now(),
          } satisfies PendingChatHomeThread),
        );
        // coercion-ok: sessionStorage is optional startup deduplication; a fresh id remains valid when unavailable.
      } catch {
        // Session storage can be unavailable in restricted browser contexts.
      }
    }
    return id;
  };

  if (typeof window === "undefined") return create();

  try {
    const raw = window.sessionStorage.getItem(CHAT_HOME_THREAD_STORAGE_KEY);
    if (raw) {
      const pending = JSON.parse(raw) as Partial<PendingChatHomeThread>;
      if (
        typeof pending.id === "string" &&
        pending.id.startsWith("chat-") &&
        typeof pending.issuedAt === "number" &&
        Date.now() - pending.issuedAt <= CHAT_HOME_THREAD_TTL_MS
      ) {
        return pending.id;
      }
    }
    // coercion-ok: sessionStorage is optional startup deduplication; a fresh id remains valid when unavailable.
  } catch {
    // Fall through to a fresh id when the stored handoff cannot be read.
  }

  return create();
}

export function clearChatHomeThreadId(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(CHAT_HOME_THREAD_STORAGE_KEY);
    // coercion-ok: clearing optional sessionStorage cannot invalidate the durable chat route.
  } catch {
    // Session storage can be unavailable in restricted browser contexts.
  }
}

export function consumeChatHomeThreadId(threadId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.sessionStorage.getItem(CHAT_HOME_THREAD_STORAGE_KEY);
    window.sessionStorage.removeItem(CHAT_HOME_THREAD_STORAGE_KEY);
    if (!raw) return false;
    const pending = JSON.parse(raw) as Partial<PendingChatHomeThread>;
    return (
      pending.id === threadId &&
      typeof pending.issuedAt === "number" &&
      Date.now() - pending.issuedAt <= CHAT_HOME_THREAD_TTL_MS
    );
  } catch {
    // coercion-ok: sessionStorage is optional lifecycle attribution; the chat remains valid when unavailable.
    return false;
  }
}

/**
 * Remember the thread the home composer just started, so the studio sidebar can
 * reopen it after the agent navigates from /chat to /motion. `getChatHomeThreadId`
 * is consumed by the chat route, so it is already gone by the time the studio mounts.
 */
export function rememberLastChatThread(threadId: string): void {
  if (typeof window === "undefined" || !threadId) return;
  try {
    window.sessionStorage.setItem(
      LAST_CHAT_THREAD_STORAGE_KEY,
      JSON.stringify({ id: threadId, issuedAt: Date.now() }),
    );
    // coercion-ok: the studio simply starts a fresh thread when this is unavailable.
  } catch {
    // Session storage can be unavailable in restricted browser contexts.
  }
}

export function readLastChatThread(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(LAST_CHAT_THREAD_STORAGE_KEY);
    if (!raw) return null;
    const pending = JSON.parse(raw) as Partial<PendingChatHomeThread>;
    if (
      typeof pending.id === "string" &&
      typeof pending.issuedAt === "number" &&
      Date.now() - pending.issuedAt <= CHAT_HOME_THREAD_TTL_MS
    ) {
      return pending.id;
    }
    // coercion-ok: an expired handoff id is ignored and the sidebar starts fresh.
  } catch {
    // Ignore malformed or unavailable storage.
  }
  return null;
}

/**
 * Forget the handoff. A handoff is a one-time message: once the studio has
 * opened the thread it names, it must not linger — left alone it lives 10
 * minutes and would claim every project opened after it.
 */
export function clearLastChatThread(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(LAST_CHAT_THREAD_STORAGE_KEY);
  } catch {
    // Ignore unavailable storage.
  }
}

/**
 * Mint a brand-new home thread id (a new conversation). Used when the
 * stored home thread already built a project: a new prompt from home is a
 * new project, so it starts on a fresh thread instead of continuing the
 * previous project's conversation.
 */
export function createFreshChatHomeThreadId(): string {
  const id = createChatThreadId();
  markClientDraftThread(id);
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.setItem(
        CHAT_HOME_THREAD_STORAGE_KEY,
        JSON.stringify({
          id,
          issuedAt: Date.now(),
        } satisfies PendingChatHomeThread),
      );
    } catch {
      // Session storage can be unavailable in restricted browser contexts.
    }
  }
  return id;
}

