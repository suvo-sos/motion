import { useEffect, useMemo, useState } from "react";
import { IconCheck, IconChevronDown } from "@tabler/icons-react";
import { HexAlphaColorPicker } from "react-colorful";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * shadcn-style colour picker.
 *
 * Built from the project's shadcn primitives (Button, Input, Popover) with
 * react-colorful for the saturation / hue / alpha area, restyled in
 * app/global.css (.motion-color-picker) to match the shadcn control language.
 *
 * One component for every colour picker button in the studio:
 *  - variant="field" (default): full-width button with swatch + value, used
 *    in the Properties panel, the generic attribute editor and keyframes.
 *  - variant="swatch": compact 32px swatch-only button, used on the canvas
 *    toolbar for the artboard background.
 */

const COLOR_SWATCHES = [
  "#000000",
  "#171717",
  "#404040",
  "#737373",
  "#a3a3a3",
  "#d4d4d4",
  "#f5f5f5",
  "#ffffff",
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#eab308",
  "#84cc16",
  "#22c55e",
  "#10b981",
  "#14b8a6",
  "#06b6d4",
  "#0ea5e9",
  "#2391FF",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#d946ef",
  "#ec4899",
];

const NONE_SWATCH_STYLE = {
  backgroundImage:
    "linear-gradient(135deg, transparent 44%, hsl(var(--muted-foreground)) 44%, hsl(var(--muted-foreground)) 56%, transparent 56%)",
};

function isLightColor(value: string): boolean {
  const hex = value.trim().replace("#", "");
  const rgbPart =
    hex.length === 3 || hex.length === 4 ? hex.slice(0, 3) : hex.slice(0, 6);
  const full =
    rgbPart.length === 3
      ? rgbPart
          .split("")
          .map((char) => char + char)
          .join("")
      : rgbPart;
  if (full.length !== 6) return false;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  if ([r, g, b].some(Number.isNaN)) return false;
  return (r * 299 + g * 587 + b * 114) / 1000 > 160;
}

function normalizeHex(value: string): string | null {
  const match = /^#?([0-9a-f]{3,8})$/i.exec(value.trim());
  if (!match) return null;
  let hex = (match[1] ?? "").toLowerCase();
  if (hex.length === 3 || hex.length === 4) {
    hex = hex
      .split("")
      .map((char) => char + char)
      .join("");
  }
  if (hex.length === 6) hex += "ff";
  if (hex.length !== 8) return null;
  return `#${hex}`;
}

function rgbToHex(r: number, g: number, b: number, a = 1): string {
  const channel = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, "0");
  const base = `#${channel(r)}${channel(g)}${channel(b)}`;
  return a >= 0.999 ? base : `${base}${channel(a * 255)}`;
}

function stripOpaqueHex(value: string): string {
  return value.length === 9 && value.slice(7).toLowerCase() === "ff"
    ? value.slice(0, 7)
    : value;
}

let colorCanvasContext: CanvasRenderingContext2D | null | undefined;
function cssColorToHex(value: string): string | null {
  const direct = normalizeHex(value);
  if (direct) return direct;
  if (typeof document === "undefined") return null;
  if (colorCanvasContext === undefined) {
    colorCanvasContext = document.createElement("canvas").getContext("2d");
  }
  if (!colorCanvasContext) return null;

  // Let the browser resolve named colors, rgb()/hsl(), currentColor, etc.
  const sentinel = "#fe01fe";
  colorCanvasContext.fillStyle = sentinel;
  colorCanvasContext.fillStyle = value;
  const resolved = colorCanvasContext.fillStyle;
  if (resolved.toLowerCase() === sentinel) return null;

  const resolvedHex = normalizeHex(resolved);
  if (resolvedHex) return resolvedHex;

  const rgba = /^rgba?\(([^)]+)\)$/i.exec(resolved);
  if (rgba) {
    const parts = (rgba[1] ?? "")
      .split(/[\s,/]+/)
      .filter(Boolean)
      .map((part) => Number.parseFloat(part));
    if (parts.length >= 3 && parts.slice(0, 3).every((n) => !Number.isNaN(n))) {
      return rgbToHex(parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0, parts[3] ?? 1);
    }
  }
  return null;
}

const RECENT_COLORS_KEY = "motion-studio-recent-colors";
function readRecentColors(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_COLORS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((c): c is string => typeof c === "string") : [];
  } catch {
    return [];
  }
}

export function ColorPicker({
  value,
  onChange,
  allowNone = false,
  variant = "field",
  label,
  documentColors,
}: {
  value: string;
  onChange: (value: string) => void;
  allowNone?: boolean;
  variant?: "field" | "swatch";
  /** Accessible label for the swatch variant (also shown on hover). */
  label?: string;
  /** Colours already used in the current file, shown as a document palette. */
  documentColors?: string[] | undefined;
}) {
  const [draft, setDraft] = useState(value);
  const [open, setOpen] = useState(false);
  const isNone = value.trim().toLowerCase() === "none" || value.trim() === "";
  const pickerColor = useMemo(() => cssColorToHex(value) ?? "#000000", [value]);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const [recentColors, setRecentColors] = useState<string[]>(() => readRecentColors());
  const commit = (next: string) => {
    const clean = stripOpaqueHex(next);
    setDraft(clean);
    onChange(clean);
    if (/^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(clean)) {
      setRecentColors((prev) => {
        const nextList = [clean, ...prev.filter((c) => c.toLowerCase() !== clean.toLowerCase())].slice(0, 8);
        try { localStorage.setItem(RECENT_COLORS_KEY, JSON.stringify(nextList)); } catch { /* storage unavailable */ }
        return nextList;
      });
    }
  };
  const eyedropperSupported = typeof window !== "undefined" && "EyeDropper" in window;
  const pickFromScreen = async () => {
    try {
      const EyeDropperCtor = (window as unknown as { EyeDropper: new () => { open: () => Promise<{ sRGBHex: string }> } }).EyeDropper;
      const result = await new EyeDropperCtor().open();
      if (result?.sRGBHex) commit(result.sRGBHex);
    } catch {
      // User cancelled the eyedropper, or it is unavailable.
    }
  };

  const commitDraft = (next: string, final = false) => {
    setDraft(next);
    const trimmed = next.trim();
    if (!trimmed) {
      if (final) setDraft(value);
      return;
    }
    if (trimmed.toLowerCase() === "none") {
      if (allowNone) {
        onChange("none");
      } else if (final) {
        setDraft(value);
      }
      return;
    }
    if (cssColorToHex(trimmed)) {
      onChange(trimmed);
      return;
    }
    // Allow arbitrary CSS paints such as url(#gradient) or currentColor when
    // the field is committed, while not thrashing the SVG on every keystroke.
    if (final && !/^#?[0-9a-f]*$/i.test(trimmed)) {
      onChange(trimmed);
      return;
    }
    if (final) setDraft(value);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {variant === "swatch" ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="relative group size-8 shrink-0 p-1"
            aria-label={label ?? "Pick a color"}
          >
            <span className="motion-checkerboard block size-full overflow-hidden rounded-[3px] border border-border">
              <span
                className="block size-full"
                style={isNone ? NONE_SWATCH_STYLE : { backgroundColor: value }}
              />
            </span>
            <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-1.5 py-0.5 text-[11px] font-medium text-background opacity-0 shadow transition-opacity group-hover:opacity-100">{label ?? "Pick a color"}</span>
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 w-full justify-start px-2 text-left text-xs font-normal dark:bg-background"
          >
            <span className="motion-checkerboard size-4 shrink-0 overflow-hidden rounded-[3px] border border-border">
              <span
                className="block size-full"
                style={isNone ? NONE_SWATCH_STYLE : { backgroundColor: value }}
              />
            </span>
            <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-foreground">
              {isNone ? "None" : value}
            </span>
            <IconChevronDown className="size-3 shrink-0 text-muted-foreground" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={6} className="w-[268px] p-3">
        <div className="space-y-3">
          <div className="motion-color-picker">
            <HexAlphaColorPicker color={pickerColor} onChange={commit} />
          </div>

          <div className="flex items-end gap-2">
            <span className="motion-checkerboard size-8 shrink-0 overflow-hidden rounded-md border border-border">
              <span
                className="block size-full"
                style={isNone ? NONE_SWATCH_STYLE : { backgroundColor: value }}
              />
            </span>
            <label className="min-w-0 flex-1 space-y-1">
              <span className="block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Hex
              </span>
              <Input
                value={draft}
                onChange={(event) => commitDraft(event.target.value)}
                onBlur={() => commitDraft(draft, true)}
                onFocus={(event) => event.currentTarget.select()}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    commitDraft(draft, true);
                    setOpen(false);
                  }
                }}
                className="h-7 font-mono text-[11px]"
                placeholder="#000000"
                spellCheck={false}
              />
            </label>
          </div>

          {documentColors && documentColors.length > 0 ? (
            <div className="space-y-1.5">
              <span className="block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Document
              </span>
              <div className="flex flex-wrap gap-1.5">
                {documentColors.map((color) => (
                  <button key={color} type="button" onClick={() => commit(color)} className="grid size-6 place-items-center rounded-[5px] border border-black/10 transition-transform hover:scale-110" style={{ backgroundColor: color }} aria-label={`Use ${color}`} />
                ))}
              </div>
            </div>
          ) : null}
          {recentColors.length > 0 ? (
            <div className="space-y-1.5">
              <span className="block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Recent
              </span>
              <div className="flex flex-wrap gap-1.5">
                {recentColors.map((color) => (
                  <button key={color} type="button" onClick={() => commit(color)} className="grid size-6 place-items-center rounded-[5px] border border-black/10 transition-transform hover:scale-110" style={{ backgroundColor: color }} aria-label={`Use ${color}`} />
                ))}
              </div>
            </div>
          ) : null}
          {eyedropperSupported ? (
            <Button type="button" variant="outline" size="sm" onClick={pickFromScreen} className="w-full justify-start text-[11px] text-muted-foreground">Pick a colour from the screen</Button>
          ) : null}

          <div className="space-y-1.5">
            <span className="block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Presets
            </span>
            <div className="grid grid-cols-8 gap-1.5">
              {COLOR_SWATCHES.map((color) => {
                const active =
                  value.trim().toLowerCase() === color.toLowerCase();
                return (
                  <button
                    key={color}
                    type="button"
                    onClick={() => commit(color)}
                    className={cn(
                      "grid size-6 place-items-center rounded-[5px] border transition-transform hover:scale-110",
                      active
                        ? "border-[#2391FF] ring-2 ring-[#2391FF]/30"
                        : "border-black/10",
                    )}
                    style={{ backgroundColor: color }}
                    aria-label={`Use ${color}`}
                  >
                    {active ? (
                      <IconCheck
                        className={cn(
                          "size-3",
                          isLightColor(color) ? "text-black" : "text-white",
                        )}
                      />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          {allowNone ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => commit("none")}
              className={cn(
                "w-full justify-start text-[11px]",
                isNone
                  ? "border-[#2391FF] text-[#2391FF] hover:text-[#2391FF]"
                  : "text-muted-foreground",
              )}
            >
              <span
                className="size-3 rounded-[2px] border border-border"
                style={NONE_SWATCH_STYLE}
              />
              No color
            </Button>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}
