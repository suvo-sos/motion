import {
  insertAgentComposerReference,
  type AgentComposerReference,
} from "@agent-native/core/client/agent-chat";
import { focusAgentChat } from "@agent-native/toolkit/app/chat";

import type { Track } from "../../lib/motion";

export interface AgentElementTarget {
  tag: string;
  id: string;
  path: string;
}

/**
 * The glyph a mention chip shows for an element, so the pill reads as the
 * shape it points at (a #element01 means nothing on its own). Kept small
 * enough to sit in the chip's 14px icon frame; the chip's white pill and
 * sizing live in app/global.css.
 */
const ELEMENT_GLYPHS: Record<string, string> = {
  rect: "▭",
  circle: "●",
  ellipse: "⬭",
  line: "╱",
  polyline: "⌒",
  polygon: "▲",
  path: "∿",
  text: "T",
  image: "▣",
  g: "▦",
  use: "⎘",
  svg: "◇",
};

/** Shape glyph for a tag name; a neutral hexagon for anything unknown. */
export function elementGlyph(tag: string): string {
  return ELEMENT_GLYPHS[tag.toLowerCase()] ?? "⬢";
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

/** One element the user asked the agent about, paired with its tree label. */
export interface AgentElementSuggestion {
  element: AgentElementTarget;
  label: string;
}

export interface AskAgentAboutElementsOptions {
  elements: AgentElementSuggestion[];
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

/** Short display token for the input: full ids can be long, and the input
 * should stay readable. The full id is still sent as refId below, so the
 * agent can resolve the exact element even when the shown token is cut. */
function shortMentionLabel(element: AgentElementTarget, label: string): string {
  if (!element.id) return label;
  const token = `#${element.id}`;
  return token.length > 20 ? `${token.slice(0, 19)}…` : token;
}

/** The prompt composer's Tiptap contenteditable, once the sidebar has mounted. */
function findComposerEditor(): HTMLElement | null {
  return document.querySelector<HTMLElement>(
    ".ProseMirror[contenteditable=\"true\"], [contenteditable=\"true\"]",
  );
}

/**
 * Fallback plain-text insertion into the composer. Plain text is what the
 * agent actually reads anyway — a mention serializes to the same token — so
 * a missing chip is worse than a plain-text id.
 */
function insertPlainTextToken(editor: HTMLElement, token: string): void {
  const selection = window.getSelection();
  if (selection) {
    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }
  editor.focus();
  const existing = (editor.textContent || "").trim();
  const text = `${existing ? " " : ""}${token} `;
  document.execCommand("insertText", false, text);
}

/**
 * A colour must show as a circle in the prompt, not as code text — that only
 * happens when the toolkit mention chip lands. Plain text is only a last
 * resort, so retry the mention insertion first: if the token is still missing
 * after a retry, only then fall back to plain text, so it is present.
 */
function retryMentionUntilVisible(
  token: string,
  insertFn: () => void,
  alternate?: string,
): void {
  const check = (attempt: number) => {
    const editor = findComposerEditor();
    if (!editor) return;
    const editorText = editor.textContent || "";
    if (editorText.includes(token)) return;
    if (alternate && editorText.includes(alternate)) return;
    if (attempt < 1) {
      insertFn();
      focusAgentChat();
      window.setTimeout(() => check(attempt + 1), 400);
      return;
    }
    insertPlainTextToken(editor, token);
  };
  window.setTimeout(() => check(0), 400);
}


function composerReferenceFor(
  element: AgentElementTarget,
  label: string,
): AgentComposerReference {
  return {
    label: shortMentionLabel(element, label),
    // The chip draws its own icon from `media`: the element's shape glyph.
    // No fill here, so the chip's surface colour (set in app/global.css)
    // shows through and the glyph reads like text on the prompt.
    media: { type: "text", text: elementGlyph(element.tag) },
    icon: "element",
    refType: "motion-element",
    refId: element.id || null,
    source: "motion-element",
  };
}

/**
 * True when the prompt already carries a chip for this element id. Reading
 * the chip's data attribute works even when the visible label was shortened
 * with an ellipsis, unlike a text match.
 */
function hasElementChip(editor: HTMLElement, id: string): boolean {
  return Array.from(
    editor.querySelectorAll<HTMLElement>(
      '[data-mention-ref-type="motion-element"]',
    ),
  ).some((chip) => chip.getAttribute("data-mention-ref-id") === id);
}

/**
 * Append a plain-text element token for every target whose id is not already
 * in the prompt. This is only a safety net for a composer that mounted too
 * late to accept the chips; when the mention batch lands, every target is
 * already a chip and nothing is appended.
 */
function appendMissingElementTokens(
  editor: HTMLElement,
  targets: AgentElementSuggestion[],
): void {
  for (const item of targets) {
    const id = item.element.id;
    if (!id) continue;
    if (hasElementChip(editor, id)) continue;
    const token = `#${id}`;
    if ((editor.textContent || "").includes(token)) continue;
    insertPlainTextToken(editor, token);
  }
}

/**
 * Tag one or more elements in the agent composer and focus it, so the user
 * can ask for a change in plain language instead of describing which shape
 * they mean. Writing-area only: no context chip on top of the text input.
 * Each tagged element lands as its own mention chip, and chips stack, so the
 * user can tag several elements (one by one or from a multi-selection) and
 * refer to each of them in a single prompt.
 */
export function askAgentAboutElements({
  elements,
}: AskAgentAboutElementsOptions): void {
  if (typeof window === "undefined") return;
  const targets = elements.filter((item) => item && item.element);
  if (targets.length === 0) return;

  // One insertion per element. The composer's append guard is patched to let
  // element chips stack, so tagging a second (or third) element adds another
  // chip even when the prompt already has text.
  const insertAll = () => {
    for (const item of targets) {
      insertAgentComposerReference(
        composerReferenceFor(item.element, item.label),
        { openSidebar: true },
      );
    }
  };

  insertAll();
  focusAgentChat();

  // Give the lazy sidebar a moment to mount; retry only the chips that did
  // not land, then fall back to plain text for anything still missing.
  window.setTimeout(() => {
    const editor = findComposerEditor();
    if (!editor) return;
    const missing = targets.filter(
      (item) =>
        item.element.id && !hasElementChip(editor, item.element.id),
    );
    if (missing.length === 0) return;
    for (const item of missing) {
      insertAgentComposerReference(
        composerReferenceFor(item.element, item.label),
        { openSidebar: true },
      );
    }
    focusAgentChat();
    window.setTimeout(() => {
      const retryEditor = findComposerEditor();
      if (!retryEditor) return;
      appendMissingElementTokens(retryEditor, targets);
    }, 400);
  }, 400);
}

/**
 * Tag one element in the agent composer and focus it, so the user can ask for
 * a change in plain language instead of describing which shape they mean.
 * Writing-area only: no context chip on top of the text input.
 */
export function askAgentAboutElement({
  element,
  label,
}: AskAgentAboutElementOptions): void {
  askAgentAboutElements({ elements: [{ element, label }] });
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
  const insertFn = () => {
    insertAgentComposerReference(
      {
        label: code,
        // The chip's icon frame is filled with the colour, so the prompt
        // shows a dot of the exact shade instead of a hex code. Gradients
        // fall back to the studio's backfill pass, which sets the same
        // value as a background shorthand (background-color rejects it).
        media: { type: "text", text: "●", backgroundColor: code },
        icon: "color",
        refType: "motion-color",
        refId: code,
        source: "motion-color",
      },
      { openSidebar: true },
    );
  };
  insertFn();
  focusAgentChat();
  // Retry the mention before falling back to plain text, so the
  // colour shows as a circle, not as code text.
  retryMentionUntilVisible(code, insertFn);
}
