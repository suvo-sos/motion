import { insertAgentComposerReference } from "@agent-native/core/client/agent-chat";
import { focusAgentChat } from "@agent-native/toolkit/app/chat";

import type { Track } from "../../lib/motion";

export interface AgentElementTarget {
  tag: string;
  id: string;
  path: string;
}

export interface AskAgentAboutElementOptions {
  element: AgentElementTarget;
  label: string;
  projectId?: string | null;
  projectTitle?: string | null;
  /** Current project markup, used to quote the element's own source. */
  svg?: string | null;
  /** The project's keyframe tracks, so existing motion is part of the context. */
  tracks?: Track[];
}

export function agentElementContextKey(element: AgentElementTarget): string {
  return `motion-element:${element.id || element.path}`;
}

/**
 * Tag one element in the agent composer and focus it, so the user can ask for
 * a change in plain language instead of describing which shape they mean.
 * Writing-area only: no context chip on top of the text input. The mention
 * is serialized into the message text itself, so the sent bubble shows the
 * same element tag the user saw before sending.
 */
/** Short display token for the input: full ids can be long, and the input
 * should stay readable. The full id is still sent as refId below, so the
 * agent can resolve the exact element even when the shown token is cut. */
function shortMentionLabel(element: AgentElementTarget, label: string): string {
  if (!element.id) return label;
  const token = `#${element.id}`;
  return token.length > 20 ? `${token.slice(0, 19)}…` : token;
}

export function askAgentAboutElement({
  element,
  label,
}: AskAgentAboutElementOptions): void {
  if (typeof window === "undefined") return;
  insertAgentComposerReference(
    {
      label: shortMentionLabel(element, label), 
      icon: "element",
      refType: "motion-element",
      refId: element.id || null,
      source: "motion-element",
    },
    { openSidebar: true },
  );
  focusAgentChat();
}

/**
 * Mention one exact colour in the agent composer, so the user can say
 * "use this colour" with a code instead of a vague name. Writing-area
 * only: no context chip on top of the text input, so the colour shows
 * exactly once, in the prompt area. The composer mention serializes the
 * code into the message text itself, and refId carries it too.
 */
export function askAgentAboutColor(code: string): void {
  if (typeof window === "undefined" || !code) return;
  insertAgentComposerReference(
    {
      label: code,
      icon: "color",
      refType: "motion-color",
      refId: code,
      source: "motion-color",
    },
    { openSidebar: true },
  );
  focusAgentChat();
  // Tell the studio's mention styler to turn this code's chip into a
  // colour circle in the input. The label stays the code, so if the
  // restyle misses, the code still shows and still sends.
  window.dispatchEvent(new CustomEvent("motion-color-mentioned", { detail: code }));
}
