import { navigateWithAgentChatViewTransition } from "@agent-native/core/client/agent-chat";
import { useT } from "@agent-native/core/client/i18n";
import { focusAgentChat } from "@agent-native/toolkit/app/chat";
import { AgentSidebar } from "@agent-native/toolkit/app/chat";
import { type ReactNode, useEffect } from "react";
import { useNavigate } from "react-router";

import { readLastChatThread } from "@/lib/chat-home-thread";
import { chatThreadPath } from "@/lib/chat-paths";
import { TAB_ID } from "@/lib/tab-id";

interface AgentInspectorProps {
  children: ReactNode;
  chatHomeHandoffActive: boolean;
  chatHomeHandoffPending: boolean;
}

/** Contextual inspector shell used on secondary chat routes. */
export function AgentInspector({
  children,
  chatHomeHandoffActive,
  chatHomeHandoffPending,
}: AgentInspectorProps) {
  const navigate = useNavigate();
  const t = useT();

  // Note: there used to be a "close the sidebar on /motion -> /home" effect
  // here. It could never fire — Layout unmounts this component on /motion,
  // so on returning home it mounted fresh with no memory of the studio
  // route, and the sidebar reopened from persisted state. Home now does
  // not mount this component at all (see Layout), and LayoutShell dispatches
  // the close event on entering home, so this dead effect is removed.

  // The home composer starts its thread on /chat, then the agent navigates to
  // /motion. Point the shared sidebar at that thread so the prompt, the run and
  // its tool calls stay visible beside the project.
  useEffect(() => {
    if (!chatHomeHandoffActive) return;
    const threadId = readLastChatThread();
    if (!threadId) return;
    const openThread = () => {
      window.dispatchEvent(
        new CustomEvent("agent-chat:open-thread", {
          detail: { threadId, source: "studio-handoff" },
        }),
      );
    };
    openThread();
    // The sidebar panel is lazy-loaded; replay once in case it was not
    // listening yet. Duplicate open requests for the same thread are ignored.
    const retry = window.setTimeout(openThread, 500);
    return () => window.clearTimeout(retry);
  }, [chatHomeHandoffActive]);

  function openAskAgentFullscreen(threadId?: string) {
    focusAgentChat();
    navigateWithAgentChatViewTransition(navigate, chatThreadPath(threadId));
  }

  return (
    <AgentSidebar
      position="right"
      chatViewTransition
      chatViewTransitionHandoff={chatHomeHandoffPending}
      // The studio continues the same conversation the home composer started.
      // Scoping the sidebar to the animation gave every project a fresh thread,
      // so arriving at /motion after a build hid the prompt that produced it
      // and made the agent look idle. Chat continuity lives in one place; the
      // project context still reaches the agent through the current screen.
      storageKey="chat"
      browserTabId={TAB_ID}
      openOnChatRunning={chatHomeHandoffActive}
      onFullscreenRequest={openAskAgentFullscreen}
      emptyStateText={t("chat.inspectEmptyState")}
      agentPageHref="/settings/agent"
      suggestions={[
        t("chat.inspectSuggestionCapabilities"),
        t("chat.inspectSuggestionHello"),
        t("chat.inspectSuggestionAction"),
      ]}
    >
      {children}
    </AgentSidebar>
  );
}
