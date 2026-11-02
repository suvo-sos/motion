export type FontCategory =
  | "Sans Serif"
  | "Serif"
  | "Monospace"
  | "Display"
  | "Handwriting";

export interface FontOption {
  /** Human-readable family name (also the Google Fonts family). */
  name: string;
  /** Full CSS font stack stored on the SVG element. */
  stack: string;
  category: FontCategory;
  /** Whether the family can be fetched from Google Fonts on demand. */
  google?: boolean;
}

function googleFont(
  name: string,
  category: FontCategory,
  fallback: string,
): FontOption {
  return {
    name,
    stack: `"${name}", ${fallback}`,
    category,
    google: true,
  };
}

export const FONT_OPTIONS: FontOption[] = [
  // Sans Serif — system
  { name: "Inter", stack: '"Inter", "Inter Variable", ui-sans-serif, system-ui, sans-serif', category: "Sans Serif" },
  { name: "Helvetica", stack: 'Helvetica, "Helvetica Neue", Arial, sans-serif', category: "Sans Serif" },
  { name: "Arial", stack: 'Arial, Helvetica, sans-serif', category: "Sans Serif" },
  { name: "SF Pro", stack: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif', category: "Sans Serif" },
  // Sans Serif — Google
  googleFont("Roboto", "Sans Serif", "sans-serif"),
  googleFont("Open Sans", "Sans Serif", "sans-serif"),
  googleFont("Lato", "Sans Serif", "sans-serif"),
  googleFont("Montserrat", "Sans Serif", "sans-serif"),
  googleFont("Poppins", "Sans Serif", "sans-serif"),
  googleFont("DM Sans", "Sans Serif", "sans-serif"),
  googleFont("Manrope", "Sans Serif", "sans-serif"),
  googleFont("Plus Jakarta Sans", "Sans Serif", "sans-serif"),
  googleFont("Space Grotesk", "Sans Serif", "sans-serif"),
  googleFont("Outfit", "Sans Serif", "sans-serif"),
  googleFont("Sora", "Sans Serif", "sans-serif"),
  googleFont("Figtree", "Sans Serif", "sans-serif"),
  googleFont("Work Sans", "Sans Serif", "sans-serif"),
  googleFont("Nunito", "Sans Serif", "sans-serif"),
  googleFont("Quicksand", "Sans Serif", "sans-serif"),
  googleFont("Rubik", "Sans Serif", "sans-serif"),
  googleFont("Karla", "Sans Serif", "sans-serif"),
  googleFont("Barlow", "Sans Serif", "sans-serif"),
  googleFont("Archivo", "Sans Serif", "sans-serif"),
  googleFont("IBM Plex Sans", "Sans Serif", "sans-serif"),
  googleFont("Public Sans", "Sans Serif", "sans-serif"),

  // Serif — system
  { name: "Georgia", stack: 'Georgia, "Times New Roman", serif', category: "Serif" },
  { name: "Times New Roman", stack: '"Times New Roman", Times, serif', category: "Serif" },
  // Serif — Google
  googleFont("Playfair Display", "Serif", "serif"),
  googleFont("Merriweather", "Serif", "serif"),
  googleFont("Lora", "Serif", "serif"),
  googleFont("DM Serif Display", "Serif", "serif"),
  googleFont("Cormorant Garamond", "Serif", "serif"),
  googleFont("Libre Baskerville", "Serif", "serif"),
  googleFont("EB Garamond", "Serif", "serif"),
  googleFont("Source Serif 4", "Serif", "serif"),
  googleFont("Fraunces", "Serif", "serif"),
  googleFont("Bodoni Moda", "Serif", "serif"),
  googleFont("Crimson Pro", "Serif", "serif"),

  // Monospace — system
  { name: "Courier New", stack: '"Courier New", Courier, monospace', category: "Monospace" },
  { name: "Menlo", stack: 'Menlo, Monaco, Consolas, monospace', category: "Monospace" },
  { name: "Monaco", stack: 'Monaco, Menlo, Consolas, monospace', category: "Monospace" },
  // Monospace — Google
  googleFont("JetBrains Mono", "Monospace", "monospace"),
  googleFont("Fira Code", "Monospace", "monospace"),
  googleFont("IBM Plex Mono", "Monospace", "monospace"),
  googleFont("Source Code Pro", "Monospace", "monospace"),
  googleFont("Space Mono", "Monospace", "monospace"),

  // Display
  googleFont("Oswald", "Display", "sans-serif"),
  googleFont("Bebas Neue", "Display", "sans-serif"),
  googleFont("Anton", "Display", "sans-serif"),
  googleFont("Archivo Black", "Display", "sans-serif"),
  googleFont("Righteous", "Display", "sans-serif"),
  googleFont("Fredoka", "Display", "sans-serif"),
  googleFont("Bungee", "Display", "sans-serif"),
  googleFont("Monoton", "Display", "sans-serif"),
  googleFont("Audiowide", "Display", "sans-serif"),
  googleFont("Orbitron", "Display", "sans-serif"),
  googleFont("Press Start 2P", "Display", "monospace"),
  googleFont("Silkscreen", "Display", "monospace"),

  // Handwriting
  googleFont("Caveat", "Handwriting", "cursive"),
  googleFont("Pacifico", "Handwriting", "cursive"),
  googleFont("Dancing Script", "Handwriting", "cursive"),
  googleFont("Great Vibes", "Handwriting", "cursive"),
  googleFont("Satisfy", "Handwriting", "cursive"),
  googleFont("Kalam", "Handwriting", "cursive"),
  googleFont("Patrick Hand", "Handwriting", "cursive"),
  googleFont("Indie Flower", "Handwriting", "cursive"),
  googleFont("Permanent Marker", "Handwriting", "cursive"),
];

export const DEFAULT_FONT: FontOption = FONT_OPTIONS[0]!;

/** Extract the primary family name from a CSS font stack / SVG attribute. */
export function fontNameFromStack(stack: string | undefined | null): string {
  if (!stack) return "Inter";
  const first =
    stack
      .split(",")[0]
      ?.trim()
      .replace(/&quot;|&apos;/g, "")
      .replace(/^["']|["']$/g, "") ?? "";
  if (!first) return "Inter";
  const known = FONT_OPTIONS.find(
    (font) => font.name.toLowerCase() === first.toLowerCase(),
  );
  return known?.name ?? first;
}

export function findFont(name: string | undefined | null): FontOption | undefined {
  if (!name) return undefined;
  return FONT_OPTIONS.find(
    (font) => font.name.toLowerCase() === name.trim().toLowerCase(),
  );
}

const requestedFonts = new Set<string>();

/**
 * Load a Google-hosted family on demand so the canvas preview matches what the
 * SVG references. System families are ignored (they are already available).
 */
export function ensureFontLoaded(name: string | undefined | null): void {
  if (typeof document === "undefined" || !name) return;
  const font = findFont(name);
  if (!font?.google || requestedFonts.has(font.name)) return;
  requestedFonts.add(font.name);

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.crossOrigin = "anonymous";
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(
    font.name,
  ).replace(/%20/g, "+")}&display=swap`;
  document.head.appendChild(link);
}
