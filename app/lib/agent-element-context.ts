import {
  insertAgentComposerReference,
  setAgentChatContextItem,
} from "@agent-native/core/client/agent-chat";
import { focusAgentChat } from "@agent-native/toolkit/app/chat";

import type { Track } from "../../lib/motion";

/** Keep a huge embedded artwork from flooding the composer context. */
const MAX_MARKUP_LENGTH = 1800;

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

/** The element's own markup, straight from the project SVG. */
function elementMarkup(svg: string | null | undefined, id: string): string {
  if (!svg || !id) return "";
  try {
    const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
    const element = doc.getElementById(id);
    if (!element) return "";
    const markup = new XMLSerializer().serializeToString(element);
    return markup.length > MAX_MARKUP_LENGTH
      ? `${markup.slice(0, MAX_MARKUP_LENGTH)}…`
      : markup;
  } catch {
    // A malformed SVG simply loses the markup quote; the rest still helps.
    return "";
  }
}

function describeTracks(tracks: Track[] | undefined, id: string): string {
  if (!id || !tracks?.length) return "";
  return tracks
    .filter((track) => track.target === id)
    .map(
      (track) =>
        `${track.property} (${track.keyframes.length} keyframe${
          track.keyframes.length === 1 ? "" : "s"
        })`,
    )
    .join(", ");
}

export function agentElementContextKey(element: AgentElementTarget): string {
  return `motion-element:${element.id || element.path}`;
}

/**
 * Tag one element in the agent composer and focus it, so the user can ask for
 * a change in plain language instead of describing which shape they mean.
 */
export function askAgentAboutElement({
  element,
  label,
  projectId,
  projectTitle,
  svg,
  tracks,
}: AskAgentAboutElementOptions): void {
  if (typeof window === "undefined") return;

  const key = agentElementContextKey(element);
  const selector = element.id
    ? `<${element.tag}> #${element.id}`
    : `<${element.tag}> at path ${element.path || "artboard"}`;
  const markup = elementMarkup(svg, element.id);
  const animated = describeTracks(tracks, element.id);
  const projectHref = projectId
    ? `/motion?id=${encodeURIComponent(projectId)}`
    : "/motion";

  const context = [
    `Element context: ${element.tag}:${element.id || element.path}`,
    `The user picked this element in the studio's Elements list and wants you to change it.`,
    projectTitle ? `Project: "${projectTitle}" (${projectHref})` : `Project: ${projectHref}`,
    projectId ? `Project id: ${projectId}` : "",
    `Element: ${selector}`,
    `Element label: ${label}`,
    element.id ? `Element id: ${element.id}` : "",
    element.path ? `Tree path: ${element.path}` : "",
    animated ? `Existing animation: ${animated}` : "Existing animation: none",
    markup ? `Current markup:\n${markup}` : "",
    "Update the animation with the save-animation action, keeping element ids stable so existing tracks keep targeting the same element.",
  ]
    .filter(Boolean)
    .join("\n");

  const item = { key, title: element.id ? `#${element.id}` : label, context };
  setAgentChatContextItem({ ...item, openSidebar: true, focus: true });

  // Also drop a mention into the composer itself. Unlike the context chip (which
  // is stripped from the transcript and only feeds the agent), a composer
  // mention is serialized into the message text, so the sent bubble shows the
  // same element tag the user saw before sending.
  insertAgentComposerReference(
    {
      label: item.title,
      icon: "element",
      refType: "motion-element",
      refId: element.id || null,
      source: "motion-element",
    },
    { openSidebar: true },
  );

  focusAgentChat();
}
