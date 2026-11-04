import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  IconFolderFilled,
  IconLetterT,
  IconPencilFilled,
  IconPlusFilled,
  IconSearchFilled,
  IconTrashFilled,
  IconTriangleSquareCircle,
  IconX,
} from "@tabler/icons-react";
import { Input } from "./ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover";

/**
 * One asset ready to drop on the canvas. `svg` is the inner markup of a
 * 0 0 vbW vbH viewBox (built-ins are all 100 x 100); the studio wraps it
 * in a <g> scaled to fit the artboard centre, so the markup must not
 * depend on being a top-level <svg>.
 */
export type AssetInsert = {
  name: string;
  svg: string;
  vbW: number;
  vbH: number;
};

type BuiltInAsset = AssetInsert & {
  id: string;
  category: string;
  keywords: string;
};

type MyAsset = AssetInsert & { id: string };

const MY_ASSETS_KEY = "motion-studio-my-assets";

const CATEGORIES = [
  "All",
  "Shapes",
  "Cursors",
  "People",
  "Vehicles",
  "Games",
  "Fruits",
  "Objects",
  "My Assets",
] as const;

const BUILT_IN_ASSETS: BuiltInAsset[] = [
  // Shapes
  { id: "rect", name: "Rectangle", category: "Shapes", keywords: "rectangle square box", vbW: 100, vbH: 100, svg: '<rect x="18" y="28" width="64" height="44" rx="2" fill="#2391FF"/>' },
  { id: "round-rect", name: "Rounded rectangle", category: "Shapes", keywords: "rounded rectangle square box", vbW: 100, vbH: 100, svg: '<rect x="18" y="28" width="64" height="44" rx="14" fill="#2391FF"/>' },
  { id: "circle", name: "Circle", category: "Shapes", keywords: "circle round dot", vbW: 100, vbH: 100, svg: '<circle cx="50" cy="50" r="34" fill="#2391FF"/>' },
  { id: "ellipse", name: "Ellipse", category: "Shapes", keywords: "ellipse oval round", vbW: 100, vbH: 100, svg: '<ellipse cx="50" cy="50" rx="36" ry="24" fill="#2391FF"/>' },
  { id: "triangle", name: "Triangle", category: "Shapes", keywords: "triangle pyramid", vbW: 100, vbH: 100, svg: '<polygon points="50,14 88,82 12,82" fill="#2391FF"/>' },
  { id: "star", name: "Star", category: "Shapes", keywords: "star favourite", vbW: 100, vbH: 100, svg: '<polygon points="50,10 61,38 90,38 67,56 76,84 50,67 24,84 33,56 10,38 39,38" fill="#2391FF"/>' },
  { id: "line", name: "Line", category: "Shapes", keywords: "line diagonal stroke", vbW: 100, vbH: 100, svg: '<line x1="16" y1="84" x2="84" y2="16" stroke="#2391FF" stroke-width="6" stroke-linecap="round"/>' },
  { id: "heart", name: "Heart", category: "Shapes", keywords: "heart love like", vbW: 100, vbH: 100, svg: '<path d="M50 86 C22 62 10 44 18 27 C26 12 46 16 50 32 C54 16 74 12 82 27 C90 44 78 62 50 86 Z" fill="#ef4444"/>' },
  { id: "diamond", name: "Diamond", category: "Shapes", keywords: "diamond gem rhombus", vbW: 100, vbH: 100, svg: '<polygon points="50,10 86,50 50,90 14,50" fill="#f59e0b"/>' },
  { id: "hexagon", name: "Hexagon", category: "Shapes", keywords: "hexagon six sides", vbW: 100, vbH: 100, svg: '<polygon points="50,8 86,29 86,71 50,92 14,71 14,29" fill="#10b981"/>' },
  { id: "arrow", name: "Arrow", category: "Shapes", keywords: "arrow right direction next", vbW: 100, vbH: 100, svg: '<polygon points="12,42 58,42 58,24 88,50 58,76 58,58 12,58" fill="#8b5cf6"/>' },
  { id: "cloud", name: "Cloud", category: "Shapes", keywords: "cloud weather sky", vbW: 100, vbH: 100, svg: '<g fill="#e5e7eb"><circle cx="36" cy="62" r="16"/><circle cx="55" cy="50" r="20"/><circle cx="72" cy="62" r="14"/><rect x="28" y="58" width="56" height="16" rx="8"/></g>' },
  { id: "speech-bubble", name: "Speech bubble", category: "Shapes", keywords: "speech bubble chat talk message", vbW: 100, vbH: 100, svg: '<g fill="#2391FF"><rect x="14" y="16" width="72" height="48" rx="12"/><polygon points="30,64 30,84 48,64"/></g>' },
  // Cursors
  { id: "cursor-pointer", name: "Mouse pointer", category: "Cursors", keywords: "cursor mouse pointer arrow click", vbW: 100, vbH: 100, svg: '<path d="M28 10 L28 82 L44 66 L54 88 L64 83 L54 62 L78 62 Z" fill="#ffffff" stroke="#171717" stroke-width="3" stroke-linejoin="round"/>' },
  { id: "cursor-crosshair", name: "Crosshair", category: "Cursors", keywords: "cursor crosshair target aim", vbW: 100, vbH: 100, svg: '<g fill="none" stroke="#ef4444" stroke-width="4"><circle cx="50" cy="50" r="22"/><line x1="50" y1="10" x2="50" y2="28"/><line x1="50" y1="72" x2="50" y2="90"/><line x1="10" y1="50" x2="28" y2="50"/><line x1="72" y1="50" x2="90" y2="50"/></g>' },
  { id: "cursor-move", name: "Move arrows", category: "Cursors", keywords: "cursor move drag arrows", vbW: 100, vbH: 100, svg: '<g fill="#2391FF"><polygon points="50,8 60,26 40,26"/><polygon points="50,92 60,74 40,74"/><polygon points="8,50 26,40 26,60"/><polygon points="92,50 74,40 74,60"/><rect x="42" y="42" width="16" height="16" rx="3"/></g>' },
  // People
  { id: "human-face", name: "Human face", category: "People", keywords: "human face person head smile avatar", vbW: 100, vbH: 100, svg: '<g><circle cx="50" cy="48" r="32" fill="#fcd9b8"/><path d="M18 46 C18 22 82 22 82 46 C74 32 26 32 18 46 Z" fill="#374151"/><circle cx="38" cy="50" r="4" fill="#171717"/><circle cx="62" cy="50" r="4" fill="#171717"/><path d="M38 64 Q50 74 62 64" fill="none" stroke="#171717" stroke-width="3" stroke-linecap="round"/></g>' },
  { id: "person", name: "Person", category: "People", keywords: "person human user body avatar", vbW: 100, vbH: 100, svg: '<g><circle cx="50" cy="26" r="14" fill="#fcd9b8"/><path d="M20 88 C20 62 80 62 80 88 Z" fill="#2391FF"/></g>' },
  { id: "smiley", name: "Smiley", category: "People", keywords: "smiley happy face emoji smile", vbW: 100, vbH: 100, svg: '<g><circle cx="50" cy="50" r="36" fill="#facc15"/><circle cx="38" cy="42" r="4" fill="#171717"/><circle cx="62" cy="42" r="4" fill="#171717"/><path d="M34 60 Q50 74 66 60" fill="none" stroke="#171717" stroke-width="4" stroke-linecap="round"/></g>' },
  // Vehicles
  { id: "car", name: "Car", category: "Vehicles", keywords: "car vehicle drive road auto", vbW: 100, vbH: 100, svg: '<g><path d="M14 62 L20 48 Q22 42 30 42 L38 42 L48 30 Q50 26 56 26 L68 26 Q74 26 78 34 L82 42 L86 42 Q88 42 88 48 L88 62 Q88 66 84 66 L16 66 Q12 66 14 62 Z" fill="#ef4444"/><path d="M42 42 L50 30 L64 30 L70 42 Z" fill="#bfdbfe"/><circle cx="32" cy="66" r="8" fill="#171717"/><circle cx="32" cy="66" r="3" fill="#ffffff"/><circle cx="68" cy="66" r="8" fill="#171717"/><circle cx="68" cy="66" r="3" fill="#ffffff"/></g>' },
  { id: "truck", name: "Truck", category: "Vehicles", keywords: "truck vehicle delivery lorry", vbW: 100, vbH: 100, svg: '<g><rect x="10" y="34" width="44" height="32" fill="#f59e0b"/><rect x="54" y="44" width="26" height="22" fill="#2391FF"/><rect x="60" y="48" width="12" height="10" fill="#bfdbfe"/><circle cx="26" cy="68" r="8" fill="#171717"/><circle cx="66" cy="68" r="8" fill="#171717"/></g>' },
  { id: "bicycle", name: "Bicycle", category: "Vehicles", keywords: "bicycle bike cycle ride", vbW: 100, vbH: 100, svg: '<g><circle cx="28" cy="68" r="16" fill="none" stroke="#171717" stroke-width="4"/><circle cx="72" cy="68" r="16" fill="none" stroke="#171717" stroke-width="4"/><g stroke="#2391FF" stroke-width="4" stroke-linecap="round"><line x1="28" y1="68" x2="50" y2="40"/><line x1="72" y1="68" x2="50" y2="40"/><line x1="50" y1="40" x2="68" y2="40"/><line x1="28" y1="68" x2="72" y2="68"/></g></g>' },
  // Games
  { id: "dice", name: "Dice", category: "Games", keywords: "dice game roll five casino", vbW: 100, vbH: 100, svg: '<g><rect x="18" y="18" width="64" height="64" rx="12" fill="#ffffff" stroke="#171717" stroke-width="3"/><g fill="#171717"><circle cx="34" cy="34" r="5"/><circle cx="66" cy="34" r="5"/><circle cx="50" cy="50" r="5"/><circle cx="34" cy="66" r="5"/><circle cx="66" cy="66" r="5"/></g></g>' },
  { id: "controller", name: "Game controller", category: "Games", keywords: "game controller joystick play", vbW: 100, vbH: 100, svg: '<g><rect x="14" y="34" width="72" height="36" rx="16" fill="#374151"/><rect x="26" y="46" width="16" height="4" fill="#ffffff"/><rect x="32" y="40" width="4" height="16" fill="#ffffff"/><circle cx="64" cy="46" r="4" fill="#ef4444"/><circle cx="74" cy="56" r="4" fill="#facc15"/></g>' },
  { id: "pawn", name: "Chess pawn", category: "Games", keywords: "chess pawn game piece", vbW: 100, vbH: 100, svg: '<g fill="#f3f4f6" stroke="#171717" stroke-width="2"><circle cx="50" cy="26" r="12"/><path d="M36 70 C36 52 64 52 64 70 L72 82 L28 82 Z"/></g>' },
  // Fruits
  { id: "apple", name: "Apple", category: "Fruits", keywords: "apple fruit red food", vbW: 100, vbH: 100, svg: '<g><path d="M50 34 C36 22 18 28 18 50 C18 70 32 88 50 88 C68 88 82 70 82 50 C82 28 64 22 50 34 Z" fill="#ef4444"/><path d="M50 34 C50 26 54 20 60 16" fill="none" stroke="#78350f" stroke-width="4" stroke-linecap="round"/><ellipse cx="66" cy="24" rx="10" ry="5" fill="#22c55e" transform="rotate(-20 66 24)"/></g>' },
  { id: "banana", name: "Banana", category: "Fruits", keywords: "banana fruit yellow food", vbW: 100, vbH: 100, svg: '<path d="M22 30 C30 62 52 82 78 78 C82 78 82 70 76 68 C56 66 40 52 34 30 C32 24 20 24 22 30 Z" fill="#facc15"/>' },
  { id: "orange", name: "Orange", category: "Fruits", keywords: "orange fruit citrus food", vbW: 100, vbH: 100, svg: '<g><circle cx="50" cy="58" r="30" fill="#f97316"/><path d="M50 28 C50 22 54 18 60 16" stroke="#78350f" stroke-width="4" fill="none" stroke-linecap="round"/><ellipse cx="66" cy="22" rx="10" ry="5" fill="#22c55e" transform="rotate(-20 66 22)"/></g>' },
  { id: "strawberry", name: "Strawberry", category: "Fruits", keywords: "strawberry fruit berry red food", vbW: 100, vbH: 100, svg: '<g><path d="M24 40 C24 32 76 32 76 40 C76 62 62 86 50 86 C38 86 24 62 24 40 Z" fill="#ef4444"/><path d="M34 34 L50 22 L66 34 L58 40 L42 40 Z" fill="#22c55e"/><g fill="#ffffff"><circle cx="40" cy="52" r="2"/><circle cx="56" cy="52" r="2"/><circle cx="48" cy="64" r="2"/></g></g>' },
  { id: "grapes", name: "Grapes", category: "Fruits", keywords: "grapes fruit purple food", vbW: 100, vbH: 100, svg: '<g><g fill="#8b5cf6"><circle cx="50" cy="30" r="10"/><circle cx="38" cy="44" r="10"/><circle cx="62" cy="44" r="10"/><circle cx="44" cy="58" r="10"/><circle cx="56" cy="58" r="10"/><circle cx="50" cy="72" r="10"/></g><path d="M50 20 C50 14 54 10 60 8" stroke="#78350f" stroke-width="3" fill="none"/></g>' },
  // Objects
  { id: "coffee-cup", name: "Coffee cup", category: "Objects", keywords: "coffee cup mug drink hot", vbW: 100, vbH: 100, svg: '<g><path d="M26 34 L74 34 L68 78 L32 78 Z" fill="#ffffff" stroke="#171717" stroke-width="3" stroke-linejoin="round"/><path d="M74 42 q12 2 10 12 q-2 10 -12 8" fill="none" stroke="#171717" stroke-width="3"/><path d="M40 24 q4 -6 0 -12 M54 24 q4 -6 0 -12" fill="none" stroke="#9ca3af" stroke-width="3" stroke-linecap="round"/></g>' },
  { id: "key", name: "Key", category: "Objects", keywords: "key lock unlock", vbW: 100, vbH: 100, svg: '<g><g fill="none" stroke="#f59e0b" stroke-width="6"><circle cx="34" cy="34" r="16"/><line x1="46" y1="46" x2="82" y2="82"/></g><g stroke="#f59e0b" stroke-width="6" stroke-linecap="round"><line x1="68" y1="68" x2="68" y2="82"/><line x1="80" y1="80" x2="80" y2="68"/></g></g>' },
  { id: "bell", name: "Bell", category: "Objects", keywords: "bell ring notification alarm", vbW: 100, vbH: 100, svg: '<g><path d="M50 16 C30 16 22 34 22 52 L22 62 L78 62 L78 52 C78 34 70 16 50 16 Z" fill="#facc15"/><circle cx="50" cy="70" r="8" fill="#f59e0b"/><rect x="46" y="8" width="8" height="8" rx="4" fill="#f59e0b"/></g>' },
  { id: "camera", name: "Camera", category: "Objects", keywords: "camera photo picture", vbW: 100, vbH: 100, svg: '<g><rect x="14" y="30" width="72" height="46" rx="8" fill="#374151"/><rect x="36" y="22" width="28" height="10" rx="3" fill="#374151"/><circle cx="50" cy="53" r="16" fill="#ffffff" stroke="#9ca3af" stroke-width="3"/><circle cx="50" cy="53" r="8" fill="#2391FF"/><circle cx="76" cy="40" r="3" fill="#ef4444"/></g>' },
  { id: "umbrella", name: "Umbrella", category: "Objects", keywords: "umbrella rain weather", vbW: 100, vbH: 100, svg: '<g><path d="M12 54 A38 38 0 0 1 88 54 Z" fill="#ef4444"/><path d="M50 54 L50 82 Q50 90 58 90" fill="none" stroke="#374151" stroke-width="4" stroke-linecap="round"/></g>' },
  { id: "clock", name: "Clock", category: "Objects", keywords: "clock time watch hour", vbW: 100, vbH: 100, svg: '<g><circle cx="50" cy="50" r="34" fill="#ffffff" stroke="#171717" stroke-width="3"/><line x1="50" y1="50" x2="50" y2="28" stroke="#171717" stroke-width="4" stroke-linecap="round"/><line x1="50" y1="50" x2="66" y2="58" stroke="#171717" stroke-width="4" stroke-linecap="round"/><circle cx="50" cy="50" r="4" fill="#ef4444"/></g>' },
  { id: "music-note", name: "Music note", category: "Objects", keywords: "music note song sound", vbW: 100, vbH: 100, svg: '<g fill="#2391FF"><ellipse cx="34" cy="74" rx="12" ry="9" transform="rotate(-20 34 74)"/><rect x="42" y="18" width="5" height="52"/><path d="M42 18 Q58 22 68 32 L68 22 Q58 14 42 18 Z"/></g>' },
];
function loadMyAssets(): MyAsset[] {
  try {
    const raw = window.localStorage.getItem(MY_ASSETS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as MyAsset[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (a) => a && typeof a.name === "string" && typeof a.svg === "string",
    );
  } catch {
    return [];
  }
}

function AssetPreview({ asset }: { asset: AssetInsert }) {
  return (
    <svg
      viewBox={`0 0 ${asset.vbW} ${asset.vbH}`}
      className="size-12 shrink-0"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: asset.svg }}
    />
  );
}

export function AssetLibraryPopover({
  onAddAsset,
  onAddText,
  onAddGroup,
  onDrawPen,
}: {
  onAddAsset: (asset: AssetInsert) => void;
  onAddText: () => void;
  onAddGroup: () => void;
  onDrawPen: () => void;
}) {
  // All declared at the top of this component, before any handler that
  // reads them, so no effect or handler can hit a declaration-order crash.
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("All");
  const [myAssets, setMyAssets] = useState<MyAsset[]>(loadMyAssets);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const saveMyAssets = (next: MyAsset[]) => {
    setMyAssets(next);
    try {
      window.localStorage.setItem(MY_ASSETS_KEY, JSON.stringify(next));
    } catch {
      toast.error("Could not save that asset — browser storage is full.");
    }
  };

  const visibleBuiltIn = useMemo(() => {
    const q = query.trim().toLowerCase();
    return BUILT_IN_ASSETS.filter((a) => {
      // A search searches everything, regardless of the active category.
      if (q) {
        return `${a.name} ${a.keywords} ${a.category}`.toLowerCase().includes(q);
      }
      return category === "All" || a.category === category;
    });
  }, [query, category]);

  const visibleMyAssets = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (category !== "All" && category !== "My Assets") return [];
    if (!q) return myAssets;
    return myAssets.filter((a) => a.name.toLowerCase().includes(q));
  }, [query, category, myAssets]);

  const showingMyAssetsTab = category === "My Assets" && !query.trim();

  const handleInsert = (asset: AssetInsert) => {
    onAddAsset(asset);
    setOpen(false);
  };

  const handleImportFile = async (file: File | null | undefined) => {
    if (!file) return;
    try {
      const text = await file.text();
      const doc = new DOMParser().parseFromString(text, "image/svg+xml");
      const root = doc.documentElement;
      if (!root || root.nodeName.toLowerCase() !== "svg") {
        toast.error("That file is not an SVG.");
        return;
      }
      // Same sanitising rule as the studio's SVG import: no scripts,
      // no foreignObject, no event handlers, no javascript: hrefs.
      doc
        .querySelectorAll("script, foreignObject, style")
        .forEach((n) => n.remove());
      doc.querySelectorAll("*").forEach((el) => {
        Array.from(el.attributes).forEach((attr) => {
          if (attr.name.toLowerCase().startsWith("on")) {
            el.removeAttribute(attr.name);
          }
          if (
            (attr.name === "href" || attr.name === "xlink:href") &&
            attr.value.trim().toLowerCase().startsWith("javascript:")
          ) {
            el.removeAttribute(attr.name);
          }
        });
      });
      const inner = Array.from(root.children)
        .map((child) => new XMLSerializer().serializeToString(child))
        .join("");
      if (!inner.trim()) {
        toast.error("That SVG has nothing to import.");
        return;
      }
      const vbParts = (root.getAttribute("viewBox") || "")
        .split(/[\s,]+/)
        .map(Number);
      const vbW =
        vbParts.length === 4 && Number.isFinite(vbParts[2]) && vbParts[2]! > 0
          ? vbParts[2]!
          : Number(root.getAttribute("width")) || 100;
      const vbH =
        vbParts.length === 4 && Number.isFinite(vbParts[3]) && vbParts[3]! > 0
          ? vbParts[3]!
          : Number(root.getAttribute("height")) || 100;
      const baseName = file.name.replace(/\.svg$/i, "").replace(/[-_]+/g, " ").trim() || "My asset";
      const asset: MyAsset = {
        id: `my-${Math.random().toString(36).substring(2, 8)}`,
        name: baseName,
        svg: inner,
        vbW,
        vbH,
      };
      saveMyAssets([...myAssets, asset]);
      setCategory("My Assets");
      setQuery("");
      toast.success(`Added "${baseName}" to My Assets`);
    } catch {
      toast.error("Could not read that SVG file.");
    }
  };

  const handleDeleteMyAsset = (id: string) => {
    saveMyAssets(myAssets.filter((a) => a.id !== id));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative group grid size-6 place-items-center rounded-[5px] text-muted-foreground transition-colors hover:text-foreground data-[state=open]:text-[#2391FF]"
          aria-label="Add shape and assets"
        >
          <IconTriangleSquareCircle className="size-5" strokeWidth={2.25} />
          <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-1.5 py-0.5 text-[11px] font-medium text-background opacity-0 shadow transition-opacity group-hover:opacity-100">
            Add shape
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[560px] max-w-[92vw] p-0">
        <div className="flex flex-col">
          {/* Search, always at the top. */}
          <div className="relative border-b border-border p-2">
            <IconSearchFilled className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search assets… try car, face, dice, apple"
              className="h-9 pl-9 text-sm"
              aria-label="Search assets"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-4 top-1/2 grid size-5 -translate-y-1/2 place-items-center rounded text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <IconX className="size-4" />
              </button>
            ) : null}
          </div>

          {/* Category groups, horizontally scrollable so they never wrap. */}
          <div className="flex gap-1 overflow-x-auto border-b border-border px-2 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  category === c
                    ? "bg-[#2391FF] text-white"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Asset grid. */}
          <div className="max-h-[420px] overflow-y-auto p-2">
            {showingMyAssetsTab ? (
              <div className="grid grid-cols-4 gap-1.5">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex min-h-[104px] flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border p-2 text-muted-foreground transition-colors hover:border-[#2391FF] hover:text-[#2391FF]"
                >
                  <IconPlusFilled className="size-6" />
                  <span className="text-[11px] font-medium leading-tight">
                    Import SVG…
                  </span>
                </button>
                {myAssets.map((asset) => (
                  <div key={asset.id} className="group relative">
                    <button
                      type="button"
                      onClick={() => handleInsert(asset)}
                      className="flex min-h-[104px] w-full flex-col items-center justify-center gap-1 rounded-lg p-2 transition-colors hover:bg-muted"
                      title={`Add ${asset.name} to the canvas`}
                    >
                      <AssetPreview asset={asset} />
                      <span className="w-full truncate text-center text-[11px] leading-tight text-foreground">
                        {asset.name}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteMyAsset(asset.id)}
                      className="absolute right-1 top-1 hidden size-5 place-items-center rounded text-muted-foreground hover:text-red-500 group-hover:grid"
                      aria-label={`Remove ${asset.name} from My Assets`}
                    >
                      <IconTrashFilled className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : visibleBuiltIn.length === 0 && visibleMyAssets.length === 0 ? (
              <div className="px-2 py-10 text-center">
                <p className="text-sm font-medium">No assets found</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Try a different word, or import your own SVG into My Assets.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setCategory("My Assets");
                    setQuery("");
                  }}
                  className="mt-3 rounded-md bg-[#2391FF] px-3 py-1.5 text-xs font-medium text-white"
                >
                  Go to My Assets
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-1.5">
                {visibleBuiltIn.map((asset) => (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => handleInsert(asset)}
                    className="flex min-h-[104px] flex-col items-center justify-center gap-1 rounded-lg p-2 transition-colors hover:bg-muted"
                    title={`Add ${asset.name} to the canvas`}
                  >
                    <AssetPreview asset={asset} />
                    <span className="w-full truncate text-center text-[11px] leading-tight text-foreground">
                      {asset.name}
                    </span>
                  </button>
                ))}
                {visibleMyAssets.map((asset) => (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => handleInsert(asset)}
                    className="flex min-h-[104px] flex-col items-center justify-center gap-1 rounded-lg p-2 transition-colors hover:bg-muted"
                    title={`Add ${asset.name} to the canvas`}
                  >
                    <AssetPreview asset={asset} />
                    <span className="w-full truncate text-center text-[11px] leading-tight text-foreground">
                      {asset.name}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {category === "My Assets" && myAssets.length === 0 && !query.trim() ? (
              <p className="px-2 pb-1 pt-2 text-center text-xs text-muted-foreground">
                No assets yet. Import an SVG and it will live here, ready to
                drop on any canvas.
              </p>
            ) : null}
          </div>

          {/* Footer: the old dropdown items that are not assets. */}
          <div className="flex items-center gap-1 border-t border-border p-2">
            <button
              type="button"
              onClick={() => {
                onAddText();
                setOpen(false);
              }}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <IconLetterT className="size-4 text-rose-500" />
              Text
            </button>
            <button
              type="button"
              onClick={() => {
                onAddGroup();
                setOpen(false);
              }}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <IconFolderFilled className="size-4 text-amber-500" />
              New group
            </button>
            <button
              type="button"
              onClick={() => {
                onDrawPen();
                setOpen(false);
              }}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <IconPencilFilled className="size-4 text-primary" />
              Draw with pen
            </button>
            {category !== "My Assets" ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-[#2391FF] transition-colors hover:bg-[#2391FF]/10"
              >
                <IconPlusFilled className="size-4" />
                Import to My Assets
              </button>
            ) : null}
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".svg,image/svg+xml"
          className="hidden"
          onChange={(e) => {
            void handleImportFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
