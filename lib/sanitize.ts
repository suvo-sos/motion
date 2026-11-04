/**
 * Shared SVG sanitiser, used by the stage preview and by every export.
 *
 * Previously the stage only stripped <script> tags with a regex, while the
 * import path stripped much more and exports embedded the raw SVG — so
 * the same artwork was treated differently in three places, and none of
 * them could be relied on. This is the one place that decides what is
 * safe, and every path goes through it.
 *
 * What it removes, deliberately and only that:
 * - Elements that can run or embed foreign content: script, foreignObject,
 *   iframe, object, embed, link, meta, and SMIL animation of href.
 * - Event-handler attributes (onload, onclick, …) on any element.
 * - href / xlink:href values that start with javascript:, data:text/html
 *   or vbscript:, and style attributes containing javascript: or
 *   expression(.
 *
 * What it keeps, on purpose: <style> (artworks legitimately style
 * themselves with it, and modern browsers do not run JS from SVG <style>),
 * <image> hrefs to http(s)/data:image sources, gradients, filters,
 * markers, patterns and SMIL that does not touch href. Removing <style>
 * would silently restyle existing projects, so it stays.
 */

const DANGEROUS_TAGS = new Set([
  "script",
  "foreignobject",
  "iframe",
  "object",
  "embed",
  "link",
  "meta",
]);

const DANGEROUS_HREF = /^(javascript|data:text\/html|vbscript):/i;

function isDangerousHref(value: string): boolean {
  return DANGEROUS_HREF.test(value.trim());
}

function cleanElement(el: Element): void {
  const tag = el.tagName.toLowerCase();
  // SMIL that animates href can retarget a link to a javascript: URL.
  if ((tag === "animate" || tag === "set") && (el.getAttribute("attributeName") ?? "").toLowerCase().includes("href")) {
    el.remove();
    return;
  }
  // Remove event handlers and dangerous hrefs/styles. Iterate a copy:
  // removing attributes while iterating the live list skips entries.
  for (const attr of Array.from(el.attributes)) {
    const name = attr.name.toLowerCase();
    if (name.startsWith("on")) {
      el.removeAttribute(attr.name);
    } else if ((name === "href" || name === "xlink:href") && isDangerousHref(attr.value)) {
      el.removeAttribute(attr.name);
    } else if (name === "style" && /javascript:|expression\(/i.test(attr.value)) {
      el.removeAttribute(attr.name);
    }
  }
  // Recurse a copy for the same reason: removing a child mid-iteration
  // skips its sibling.
  for (const child of Array.from(el.children)) {
    if (DANGEROUS_TAGS.has(child.tagName.toLowerCase())) {
      child.remove();
    } else {
      cleanElement(child);
    }
  }
}

/** Regex fallback for environments without DOMParser (SSR, plain Node
    tests). Weaker than the DOM pass — it cannot see through nesting —
    but it still removes the same classes of payload, and the DOM pass is
    what runs in the app itself. */
function regexSanitize(svg: string): string {
  return svg
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, "")
    .replace(/<script\b[^>]*\/?>/gi, "")
    .replace(/<(foreignobject|iframe|object|embed|link|meta)\b[^>]*>[\s\S]*?<\/(foreignobject|iframe|object|embed|link|meta)\s*>/gi, "")
    .replace(/<(foreignobject|iframe|object|embed|link|meta)\b[^>]*\/?>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s(?:xlink:)?href\s*=\s*"\s*(?:javascript|data:text\/html|vbscript):[^"]*"/gi, "")
    .replace(/\s(?:xlink:)?href\s*=\s*'\s*(?:javascript|data:text\/html|vbscript):[^']*'/gi, "");
}

export function sanitizeSvg(svg: string): string {
  if (!svg) return svg;
  if (typeof DOMParser === "undefined" || typeof XMLSerializer === "undefined") {
    return regexSanitize(svg);
  }
  try {
    const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
    if (doc.querySelector("parsererror")) return regexSanitize(svg);
    const root = doc.documentElement;
    if (!root || root.tagName.toLowerCase() !== "svg") return regexSanitize(svg);
    cleanElement(root);
    return new XMLSerializer().serializeToString(root);
  } catch {
    return regexSanitize(svg);
  }
}
