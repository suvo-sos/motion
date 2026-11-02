import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Link, useSearchParams } from "react-router";
import * as ContextMenuPrimitive from "@radix-ui/react-context-menu";
import {
  useActionQuery,
  useActionMutation,
} from "@agent-native/core/client/hooks";
import { AgentToggleButton } from "@agent-native/toolkit/app/chat";
import { AgentNativeIcon } from "@agent-native/toolkit/app/shared/AgentNativeIcon";
import {
  IconAdjustmentsHorizontal,
  IconArrowBackUp,
  IconArrowForwardUp,
  IconBrush,
  IconCheck,
  IconChevronDown,
  IconChevronRight,
  IconCircle,
  IconDiamond,
  IconDiamondFilled,
  IconDownload,
  IconEye,
  IconEyeOff,
  IconFolder,
  IconFolderOpen,
  IconFrame,
  IconFolderPlus,
  IconHandMove,
  IconLetterT,
  IconLink,
  IconLock,
  IconLockOpen,
  IconMaximize,
  IconPhoto,
  IconPlayerPauseFilled,
  IconPlayerPlayFilled,
  IconPlayerSkipBack,
  IconPlus,
  IconPointer,
  IconRepeat,
  IconSearch,
  IconShape,
  IconSparkles,
  IconSquare,
  IconTrash,
  IconVector,
  IconX,
  IconZoomIn,
  IconZoomOut,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { SvgExportDialog } from "../components/SvgExportDialog";
import { HexAlphaColorPicker } from "react-colorful";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  applyAt,
  PROPERTY_DEFINITIONS,
  PROPERTY_GROUPS,
  sampleTrack,
  type Keyframe,
  type MotionAnimation,
  type Property,
  type Track,
} from "../../lib/motion";
import { runExport, type ExportFormat } from "../../lib/export";
import {
  getMotionEditorActions,
  publishMotionEditor,
  resetMotionEditor,
  setMotionEditorActions,
  useMotionEditorSnapshot,
  type MotionEditorActions,
} from "../lib/motion-editor";
import {
  DEFAULT_FONT,
  FONT_OPTIONS,
  ensureFontLoaded,
  findFont,
  fontNameFromStack,
  type FontOption,
} from "../lib/fonts";

const SAMPLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <rect width="200" height="200" fill="#ffffff"/>
  <circle id="ball" cx="100" cy="60" r="18" fill="#171717"/>
  <circle id="dot" cx="40" cy="160" r="6" fill="#a3a3a3"/>
</svg>`;

const SAMPLE_TRACKS: Track[] = [
  {
    target: "ball",
    property: "translateY",
    keyframes: [
      { t: 0, v: -40, ease: "ease-in" },
      { t: 0.5, v: 90, ease: "ease-out" },
      { t: 1, v: -40, ease: "ease-in" },
    ],
  },
  {
    target: "ball",
    property: "scale",
    keyframes: [
      { t: 0, v: 1 },
      { t: 0.5, v: 1.25 },
      { t: 1, v: 1 },
    ],
  },
  {
    target: "dot",
    property: "translateX",
    keyframes: [
      { t: 0, v: 0, ease: "ease-in-out" },
      { t: 0.5, v: 120, ease: "ease-in-out" },
      { t: 1, v: 0, ease: "ease-in-out" },
    ],
  },
];

const EASING_OPTIONS = [
  { value: "", label: "Linear" },
  { value: "ease-in", label: "Ease in" },
  { value: "ease-out", label: "Ease out" },
  { value: "ease-in-out", label: "Ease in-out" },
  { value: "cubic-bezier(0.34,1.56,0.64,1)", label: "Overshoot" },
  { value: "cubic-bezier(0.22,1,0.36,1)", label: "Expo out" },
  { value: "cubic-bezier(0.16,1,0.3,1)", label: "Smooth" },
];

const FONT_WEIGHT_OPTIONS = [
  { value: "100", label: "Thin · 100" },
  { value: "200", label: "Extra light · 200" },
  { value: "300", label: "Light · 300" },
  { value: "400", label: "Regular · 400" },
  { value: "500", label: "Medium · 500" },
  { value: "600", label: "Semi bold · 600" },
  { value: "700", label: "Bold · 700" },
  { value: "800", label: "Extra bold · 800" },
  { value: "900", label: "Black · 900" },
];

const FONT_STYLE_OPTIONS = [
  { value: "normal", label: "Normal" },
  { value: "italic", label: "Italic" },
  { value: "oblique", label: "Oblique" },
];

const TEXT_ANCHOR_OPTIONS = [
  { value: "start", label: "Left" },
  { value: "middle", label: "Center" },
  { value: "end", label: "Right" },
];

interface Selection {
  track: number;
  keyframe: number;
}

interface StudioSnapshot {
  tracks: Track[];
  duration: number;
  loop: boolean;
}

function cloneTracks(tracks: Track[]): Track[] {
  return JSON.parse(JSON.stringify(tracks)) as Track[];
}

function numericAttribute(
  value: string | undefined | null,
  fallback: string,
): string {
  const parsed = parseFloat(value ?? "");
  return Number.isFinite(parsed) ? String(parsed) : fallback;
}

function normalizeWeight(value: string | undefined | null): string {
  if (!value) return "400";
  const next = value.trim().toLowerCase();
  if (next === "bold" || next === "bolder") return "700";
  if (next === "normal" || next === "lighter") return "400";
  return next;
}

interface PromptOptions {
  title: string;
  description?: string;
  label?: string;
  defaultValue?: string;
  placeholder?: string;
  confirmLabel?: string;
  multiline?: boolean;
  required?: boolean;
}

function PromptDialog({
  options,
  onCancel,
  onSubmit,
}: {
  options: PromptOptions;
  onCancel: () => void;
  onSubmit: (value: string) => void;
}) {
  const [value, setValue] = useState(options.defaultValue ?? "");

  useEffect(() => {
    setValue(options.defaultValue ?? "");
  }, [options.defaultValue]);

  const submit = () => {
    if (options.required && !value.trim()) return;
    onSubmit(value);
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{options.title}</DialogTitle>
          {options.description ? (
            <DialogDescription>{options.description}</DialogDescription>
          ) : null}
        </DialogHeader>
        <div className="space-y-2 py-1">
          {options.label ? (
            <Label htmlFor="motion-prompt-input">{options.label}</Label>
          ) : null}
          {options.multiline ? (
            <Textarea
              id="motion-prompt-input"
              autoFocus
              rows={5}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder={options.placeholder}
              className="font-mono text-xs"
            />
          ) : (
            <Input
              id="motion-prompt-input"
              autoFocus
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder={options.placeholder}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  submit();
                }
              }}
            />
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={submit}
            disabled={Boolean(options.required) && !value.trim()}
          >
            {options.confirmLabel ?? "Apply"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function usePromptDialog() {
  const [request, setRequest] = useState<{
    options: PromptOptions;
    id: number;
  } | null>(null);
  const resolverRef = useRef<((value: string | null) => void) | null>(null);
  const nextIdRef = useRef(0);

  const prompt = useCallback((options: PromptOptions) => {
    return new Promise<string | null>((resolve) => {
      resolverRef.current?.(null);
      resolverRef.current = resolve;
      nextIdRef.current += 1;
      setRequest({ options, id: nextIdRef.current });
    });
  }, []);

  const settle = (value: string | null) => {
    resolverRef.current?.(value);
    resolverRef.current = null;
    setRequest(null);
  };

  const dialog = request ? (
    <PromptDialog
      key={request.id}
      options={request.options}
      onCancel={() => settle(null)}
      onSubmit={(value) => settle(value)}
    />
  ) : null;

  return { prompt, dialog };
}

interface ElementBox {
  /** Position and size in viewer coordinates (screen px). */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Position and size in SVG user units, relative to the artboard. */
  ux: number;
  uy: number;
  uw: number;
  uh: number;
}

type ResizeCorner = "nw" | "ne" | "sw" | "se";

const RESIZE_CORNERS: Array<{
  corner: ResizeCorner;
  cursor: string;
  left: string;
  top: string;
}> = [
  { corner: "nw", cursor: "nwse-resize", left: "0%", top: "0%" },
  { corner: "ne", cursor: "nesw-resize", left: "100%", top: "0%" },
  { corner: "sw", cursor: "nesw-resize", left: "0%", top: "100%" },
  { corner: "se", cursor: "nwse-resize", left: "100%", top: "100%" },
];

function findSnap(
  features: number[],
  targets: number[],
  threshold = 6,
): { delta: number; line: number } | null {
  let best: { delta: number; line: number } | null = null;
  for (const feature of features) {
    for (const target of targets) {
      const delta = target - feature;
      if (
        Math.abs(delta) <= threshold &&
        (!best || Math.abs(delta) < Math.abs(best.delta))
      ) {
        best = { delta, line: target };
      }
    }
  }
  return best;
}

export default function MotionRoute() {
  const [title, setTitle] = useState("");
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [lockedIds, setLockedIds] = useState<Set<string>>(new Set());
  const [timelineHeight, setTimelineHeight] = useState(256);
  const undoRef = useRef<() => void>(() => {});
  const redoRef = useRef<() => void>(() => {});
  const { prompt, dialog: promptDialog } = usePromptDialog();
  const [params, setParams] = useSearchParams();
  const list = useActionQuery(
    "list-animations",
    {},
    { refetchInterval: 3000 } as any,
  );
  const save = useActionMutation("save-animation");

  const animations = ((list.data as any)?.animations ?? []) as Array<{
    id: string;
    title: string;
    duration: number;
    loop: boolean;
    updatedAt?: string;
  }>;

  const selectedId = params.get("id") ?? animations[0]?.id ?? null;

  const detail = useActionQuery(
    "get-animation",
    { id: selectedId ?? "" },
    {
      enabled: Boolean(selectedId),
      refetchInterval: 3000,
    } as any,
  );
  const animation = (detail.data as any)?.animation as MotionAnimation | null;

  // Debug logging for animations
  useEffect(() => {
    if (animation) {
      console.log('🎨 Animation loaded:', {
        id: animation.id,
        title: animation.title,
        svgLength: animation.svg?.length || 0,
        svgPreview: animation.svg?.substring(0, 200) || '(empty)',
        hasScript: animation.svg?.includes('<script') || false,
        hasViewBox: animation.svg?.includes('viewBox') || false,
        hasSvgTag: animation.svg?.includes('<svg') || false,
        tracksCount: animation.tracks?.length || 0,
      });
    }
  }, [animation?.id, animation?.updatedAt]);

  // Optimistic SVG: static property edits update the artboard immediately while
  // the debounced save travels to the server.
  const [previewSvg, setPreviewSvg] = useState<string | null>(null);
  const serverSvgRef = useRef<string | null>(null);
  useEffect(() => {
    setPreviewSvg(null);
    serverSvgRef.current = animation?.svg ?? null;
  }, [animation?.id]);
  useEffect(() => {
    if (!animation) return;
    if (serverSvgRef.current === null) {
      serverSvgRef.current = animation.svg;
      return;
    }
    if (animation.svg === serverSvgRef.current) return;
    serverSvgRef.current = animation.svg;
    setPreviewSvg(animation.svg);
  }, [animation?.svg]);
  const liveAnimation =
    animation && previewSvg && previewSvg !== animation.svg
      ? { ...animation, svg: previewSvg }
      : animation;

  useEffect(() => {
    if (animation) setTitle(animation.title);
  }, [animation?.id, animation?.updatedAt]);

  useEffect(() => {
    if (!animation?.svg) {
      setHiddenIds(new Set());
      setLockedIds(new Set());
      setSelectedElementId(null);
      return;
    }
    const { hidden, locked } = getHiddenAndLockedIds(animation.svg);
    setHiddenIds(hidden);
    setLockedIds(locked);
  }, [animation?.id]);

  const select = (id: string | null) => {
    if (id) setParams({ id });
    else setParams({});
  };

  // Follow work the agent does: when a new animation appears (or an existing
  // one jumps to the top after an agent edit), bring it into view.
  const topId = animations[0]?.id ?? null;
  const prevTopRef = useRef<string | null>(null);
  useEffect(() => {
    const prev = prevTopRef.current;
    prevTopRef.current = topId;
    if (topId && prev && prev !== topId) setParams({ id: topId });
  }, [topId, setParams]);

  // The studio is a two-up: the board and the agent. Make sure the agent
  // panel is open when the studio mounts, even on a fresh profile.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent("agent-panel:open"));
    }, 400);
    return () => window.clearTimeout(timer);
  }, []);

  const createSample = async () => {
    const res: any = await save.mutateAsync({
      title: "Bouncing ball",
      svg: SAMPLE_SVG,
      tracks: SAMPLE_TRACKS,
      duration: 1600,
      loop: true,
    });
    if (res?.id) {
      await list.refetch();
      select(res.id);
    }
  };

  const saveAnimation = async (next: MotionAnimation) => {
    await save.mutateAsync({
      id: next.id,
      title: next.title,
      svg: next.svg,
      tracks: next.tracks,
      duration: next.duration,
      loop: next.loop,
    });
    await list.refetch();
    await detail.refetch();
  };

  const handleToggleLock = async (node: TreeNode) => {
    if (!animation) return;
    const doc = new DOMParser().parseFromString(animation.svg, "image/svg+xml");
    let el: Element | null = null;
    let targetId = node.id;

    if (targetId) {
      el = doc.getElementById(targetId);
    } else {
      el = getElementByPath(doc, node.path);
      if (el) {
        targetId = `${node.tag}-${Math.random().toString(36).substring(2, 6)}`;
        el.setAttribute("id", targetId);
      }
    }
    if (!el || !targetId) return;

    const nextLocked = new Set(lockedIds);
    const willLock = !nextLocked.has(targetId);
    if (willLock) {
      nextLocked.add(targetId);
      el.setAttribute("data-locked", "true");
    } else {
      nextLocked.delete(targetId);
      el.removeAttribute("data-locked");
    }
    setLockedIds(nextLocked);

    const nextSvg = new XMLSerializer().serializeToString(doc.documentElement);
    await saveAnimation({ ...animation, svg: nextSvg });
  };

  const handleToggleHide = async (node: TreeNode) => {
    if (!animation) return;
    const doc = new DOMParser().parseFromString(animation.svg, "image/svg+xml");
    let el: Element | null = null;
    let targetId = node.id;

    if (targetId) {
      el = doc.getElementById(targetId);
    } else {
      el = getElementByPath(doc, node.path);
      if (el) {
        targetId = `${node.tag}-${Math.random().toString(36).substring(2, 6)}`;
        el.setAttribute("id", targetId);
      }
    }
    if (!el || !targetId) return;

    const nextHidden = new Set(hiddenIds);
    const willHide = !nextHidden.has(targetId);
    if (willHide) {
      nextHidden.add(targetId);
      el.setAttribute("data-hidden", "true");
      el.setAttribute("display", "none");
    } else {
      nextHidden.delete(targetId);
      el.removeAttribute("data-hidden");
      if (el.getAttribute("display") === "none") {
        el.removeAttribute("display");
      }
    }
    setHiddenIds(nextHidden);

    const nextSvg = new XMLSerializer().serializeToString(doc.documentElement);
    await saveAnimation({ ...animation, svg: nextSvg });
  };

  const handleRenameElement = async (node: TreeNode) => {
    if (!animation) return;
    const currentId = node.id || "";
    const next = await prompt({
      title: currentId ? "Rename element" : "Assign element ID",
      label: "Element ID",
      defaultValue: currentId || node.tag,
      placeholder: "element-id",
      required: true,
      confirmLabel: currentId ? "Rename" : "Assign",
    });
    if (!next || next === currentId) return;
    const cleanId = next.trim().replace(/\s+/g, "-");
    const doc = new DOMParser().parseFromString(animation.svg, "image/svg+xml");
    let el: Element | null = null;
    if (currentId) {
      el = doc.getElementById(currentId);
    } else {
      el = getElementByPath(doc, node.path);
    }
    if (el) {
      el.setAttribute("id", cleanId);
      const nextSvg = new XMLSerializer().serializeToString(doc.documentElement);
      const nextTracks = (animation.tracks || []).map((t) =>
        t.target === currentId ? { ...t, target: cleanId } : t,
      );
      if (currentId && lockedIds.has(currentId)) {
        setLockedIds((prev) => {
          const s = new Set(prev);
          s.delete(currentId);
          s.add(cleanId);
          return s;
        });
      }
      if (currentId && hiddenIds.has(currentId)) {
        setHiddenIds((prev) => {
          const s = new Set(prev);
          s.delete(currentId);
          s.add(cleanId);
          return s;
        });
      }
      if (selectedElementId === currentId) {
        setSelectedElementId(cleanId);
      }
      await saveAnimation({ ...animation, svg: nextSvg, tracks: nextTracks });
    }
  };

  const handleRemoveElement = async (node: TreeNode) => {
    if (!animation) return;
    const doc = new DOMParser().parseFromString(animation.svg, "image/svg+xml");
    let el: Element | null = null;
    if (node.id) {
      el = doc.getElementById(node.id);
    } else {
      el = getElementByPath(doc, node.path);
    }
    if (el) {
      el.remove();
      const nextSvg = new XMLSerializer().serializeToString(doc.documentElement);
      const nextTracks = node.id
        ? (animation.tracks || []).filter((t) => t.target !== node.id)
        : animation.tracks;
      if (node.id && selectedElementId === node.id) {
        setSelectedElementId(null);
      }
      await saveAnimation({ ...animation, svg: nextSvg, tracks: nextTracks });
      toast.success(`Removed ${node.id ? `#${node.id}` : `<${node.tag}>`}`);
    }
  };

  const handleEditText = async (node: TreeNode) => {
    if (!animation) return;
    const doc = new DOMParser().parseFromString(animation.svg, "image/svg+xml");
    let el: Element | null = null;
    if (node.id) {
      el = doc.getElementById(node.id);
    } else {
      el = getElementByPath(doc, node.path);
    }
    if (el && (el.tagName.toLowerCase() === "text" || el.tagName.toLowerCase() === "tspan")) {
      const currentText = el.textContent || "";
      const newText = await prompt({
        title: "Edit text",
        label: "Text content",
        defaultValue: currentText,
        multiline: true,
        confirmLabel: "Save",
      });
      if (newText !== null && newText !== currentText) {
        el.textContent = newText;
        const nextSvg = new XMLSerializer().serializeToString(doc.documentElement);
        await saveAnimation({ ...animation, svg: nextSvg });
      }
    }
  };

  const handleEditImageSource = async (node: TreeNode) => {
    if (!animation) return;
    const doc = new DOMParser().parseFromString(animation.svg, "image/svg+xml");
    let el: Element | null = null;
    if (node.id) {
      el = doc.getElementById(node.id);
    } else {
      el = getElementByPath(doc, node.path);
    }
    if (el && el.tagName.toLowerCase() === "image") {
      const currentHref = el.getAttribute("href") || el.getAttribute("xlink:href") || "";
      const newHref = await prompt({
        title: "Edit image source",
        label: "URL or data URI",
        defaultValue: currentHref,
        placeholder: "https://…",
        confirmLabel: "Save",
      });
      if (newHref !== null && newHref !== currentHref) {
        el.setAttribute("href", newHref);
        el.removeAttribute("xlink:href"); // Remove old namespaced version
        const nextSvg = new XMLSerializer().serializeToString(doc.documentElement);
        await saveAnimation({ ...animation, svg: nextSvg });
      }
    }
  };

  const handleEditPath = async (node: TreeNode) => {
    if (!animation) return;
    const doc = new DOMParser().parseFromString(animation.svg, "image/svg+xml");
    let el: Element | null = null;
    if (node.id) {
      el = doc.getElementById(node.id);
    } else {
      el = getElementByPath(doc, node.path);
    }
    if (el && el.tagName.toLowerCase() === "path") {
      const currentPath = el.getAttribute("d") || "";
      const newPath = await prompt({
        title: "Edit path data",
        label: "d attribute",
        defaultValue: currentPath,
        multiline: true,
        confirmLabel: "Save",
      });
      if (newPath !== null && newPath !== currentPath) {
        el.setAttribute("d", newPath);
        const nextSvg = new XMLSerializer().serializeToString(doc.documentElement);
        await saveAnimation({ ...animation, svg: nextSvg });
      }
    }
  };

  const handleEditAttributes = async (node: TreeNode) => {
    if (!animation) return;
    const doc = new DOMParser().parseFromString(animation.svg, "image/svg+xml");
    let el: Element | null = null;
    if (node.id) {
      el = doc.getElementById(node.id);
    } else {
      el = getElementByPath(doc, node.path);
    }
    if (el) {
      const attrName = await prompt({
        title: "Edit attribute",
        description: "Enter an SVG attribute name to view and change its value.",
        label: "Attribute name",
        placeholder: "fill",
        required: true,
      });
      if (!attrName) return;

      const currentValue = el.getAttribute(attrName) || "";
      const newValue = await prompt({
        title: `Edit “${attrName}”`,
        label: "Value",
        defaultValue: currentValue,
        placeholder: "Attribute value",
        confirmLabel: "Save",
      });
      
      if (newValue !== null) {
        if (newValue === "") {
          el.removeAttribute(attrName);
        } else {
          el.setAttribute(attrName, newValue);
        }
        const nextSvg = new XMLSerializer().serializeToString(doc.documentElement);
        await saveAnimation({ ...animation, svg: nextSvg });
      }
    }
  };

  const handleUnhideAll = async () => {
    if (!animation || hiddenIds.size === 0) return;
    const doc = new DOMParser().parseFromString(animation.svg, "image/svg+xml");
    hiddenIds.forEach((id) => {
      const el = doc.getElementById(id);
      if (el) {
        el.removeAttribute("data-hidden");
        if (el.getAttribute("display") === "none") {
          el.removeAttribute("display");
        }
      }
    });
    setHiddenIds(new Set());
    const nextSvg = new XMLSerializer().serializeToString(doc.documentElement);
    await saveAnimation({ ...animation, svg: nextSvg });
  };

  const handleUnlockAll = async () => {
    if (!animation || lockedIds.size === 0) return;
    const doc = new DOMParser().parseFromString(animation.svg, "image/svg+xml");
    lockedIds.forEach((id) => {
      const el = doc.getElementById(id);
      if (el) {
        el.removeAttribute("data-locked");
      }
    });
    setLockedIds(new Set());
    const nextSvg = new XMLSerializer().serializeToString(doc.documentElement);
    await saveAnimation({ ...animation, svg: nextSvg });
  };

  const handleAddElement = async (type: "rect" | "circle" | "text" | "g") => {
    if (!animation) return;
    const doc = new DOMParser().parseFromString(animation.svg, "image/svg+xml");
    const svgEl = doc.documentElement;
    const vb = svgEl.getAttribute("viewBox")?.split(/\s+/).map(Number) || [0, 0, 200, 200];
    const cx = Math.round((vb[0] ?? 0) + (vb[2] || 200) / 2);
    const cy = Math.round((vb[1] ?? 0) + (vb[3] || 200) / 2);

    const id = `${type}-${Math.random().toString(36).substring(2, 6)}`;
    let newEl: Element;

    if (type === "rect") {
      newEl = doc.createElementNS("http://www.w3.org/2000/svg", "rect");
      newEl.setAttribute("id", id);
      newEl.setAttribute("x", String(cx - 30));
      newEl.setAttribute("y", String(cy - 30));
      newEl.setAttribute("width", "60");
      newEl.setAttribute("height", "60");
      newEl.setAttribute("rx", "6");
      newEl.setAttribute("fill", "#2391FF");
    } else if (type === "circle") {
      newEl = doc.createElementNS("http://www.w3.org/2000/svg", "circle");
      newEl.setAttribute("id", id);
      newEl.setAttribute("cx", String(cx));
      newEl.setAttribute("cy", String(cy));
      newEl.setAttribute("r", "28");
      newEl.setAttribute("fill", "#2391FF");
    } else if (type === "text") {
      newEl = doc.createElementNS("http://www.w3.org/2000/svg", "text");
      newEl.setAttribute("id", id);
      newEl.setAttribute("x", String(cx));
      newEl.setAttribute("y", String(cy));
      newEl.setAttribute("text-anchor", "middle");
      newEl.setAttribute("dominant-baseline", "middle");
      newEl.setAttribute("fill", "#171717");
      newEl.setAttribute("font-size", "20");
      newEl.setAttribute(
        "font-family",
        '"Inter", "Inter Variable", ui-sans-serif, system-ui, sans-serif',
      );
      newEl.setAttribute("font-weight", "600");
      newEl.textContent = "Motion";
    } else {
      newEl = doc.createElementNS("http://www.w3.org/2000/svg", "g");
      newEl.setAttribute("id", id);
    }

    const selected = selectedElementId
      ? doc.getElementById(selectedElementId)
      : null;
    const host =
      selected && selected.nodeName.toLowerCase() === "g" ? selected : svgEl;
    host.appendChild(newEl);
    const nextSvg = new XMLSerializer().serializeToString(svgEl);
    await saveAnimation({ ...animation, svg: nextSvg });
    setSelectedElementId(id);
  };

  const handleAddImage = async (data: File | string) => {
    if (!animation) return;
    const insertImage = async (href: string, naturalW = 100, naturalH = 100) => {
      const doc = new DOMParser().parseFromString(animation.svg, "image/svg+xml");
      const svgEl = doc.documentElement;
      const vb = svgEl.getAttribute("viewBox")?.split(/\s+/).map(Number) || [0, 0, 200, 200];
      const maxW = (vb[2] || 200) * 0.5;
      const aspect = naturalW / naturalH || 1;
      const width = Math.round(Math.min(maxW, 80));
      const height = Math.round(width / aspect);
      const cx = Math.round((vb[0] ?? 0) + (vb[2] || 200) / 2 - width / 2);
      const cy = Math.round((vb[1] ?? 0) + (vb[3] || 200) / 2 - height / 2);

      const id = `image-${Math.random().toString(36).substring(2, 6)}`;
      const imageEl = doc.createElementNS("http://www.w3.org/2000/svg", "image");
      imageEl.setAttribute("id", id);
      imageEl.setAttribute("href", href);
      imageEl.setAttribute("x", String(cx));
      imageEl.setAttribute("y", String(cy));
      imageEl.setAttribute("width", String(width));
      imageEl.setAttribute("height", String(height));

      const selected =
        selectedElementId && selectedElementId !== id
          ? doc.getElementById(selectedElementId)
          : null;
      const host =
        selected && selected.nodeName.toLowerCase() === "g"
          ? selected
          : svgEl;
      host.appendChild(imageEl);
      const nextSvg = new XMLSerializer().serializeToString(svgEl);
      await saveAnimation({ ...animation, svg: nextSvg });
      setSelectedElementId(id);
    };

    if (typeof data === "string") {
      const img = new Image();
      img.onload = () => void insertImage(data, img.width, img.height);
      img.onerror = () => void insertImage(data, 100, 100);
      img.src = data;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        if (!dataUrl) return;
        const img = new Image();
        img.onload = () => void insertImage(dataUrl, img.width, img.height);
        img.src = dataUrl;
      };
      reader.readAsDataURL(data);
    }
  };

  return (
    <div className="flex h-full w-full min-w-0 overflow-hidden bg-background text-foreground">
      <div
        className="flex w-64 shrink-0 flex-col border-r border-sidebar-border"
        style={{ paddingBottom: timelineHeight }}
      >
        <LeftSidebarWithTabs
          animation={liveAnimation ?? null}
          title={title}
          selectedElementId={selectedElementId}
          hiddenIds={hiddenIds}
          lockedIds={lockedIds}
          onSelectElement={setSelectedElementId}
          onToggleLock={handleToggleLock}
          onToggleHide={handleToggleHide}
          onRenameElement={handleRenameElement}
          onRemoveElement={handleRemoveElement}
          onEditText={handleEditText}
          onEditImageSource={handleEditImageSource}
          onEditPath={handleEditPath}
          onEditAttributes={handleEditAttributes}
          onUnhideAll={handleUnhideAll}
          onUnlockAll={handleUnlockAll}
          onAddElement={handleAddElement}
          onAddImage={handleAddImage}
          onTitleChange={setTitle}
          onSave={saveAnimation}
          onPreviewSvg={setPreviewSvg}
          onUndo={() => undoRef.current?.()}
          onRedo={() => redoRef.current?.()}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        {!selectedId ? (
          <EmptyStudio
            loading={list.isLoading}
            onSample={createSample}
          />
        ) : detail.isLoading && !animation ? (
          <>
            <StudioTopBar
              center={<span className="text-[13px] text-muted-foreground">Loading…</span>}
            />
            <div className="flex flex-1 items-center justify-center">
              <Skeleton className="h-64 w-64 rounded-2xl" />
            </div>
          </>
        ) : !animation ? (
          <div className="flex flex-1 flex-col">
            <StudioTopBar
              center={<span className="text-[13px] text-muted-foreground">Not found</span>}
            />
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              This animation no longer exists.
            </div>
          </div>
        ) : (
          <StudioWorkspace
            key={animation.id}
            animation={liveAnimation ?? animation}
            title={title}
            onSave={saveAnimation}
            timelineHeight={timelineHeight}
            onTimelineHeightChange={setTimelineHeight}
            onRegisterUndoRedo={(u, r) => {
              undoRef.current = u;
              redoRef.current = r;
            }}
            selectedElementId={selectedElementId}
            onSelectElement={setSelectedElementId}
            hiddenIds={hiddenIds}
            lockedIds={lockedIds}
          />
        )}
      </div>
      {promptDialog}
    </div>
  );
}

interface TreeNode {
  tag: string;
  id: string;
  path: string;
  hasChildren: boolean;
  children: TreeNode[];
}

interface MoveTarget {
  id: string;
  label: string;
  depth: number;
  path: string;
}

const IGNORED_TAGS = new Set(["style", "title", "desc", "metadata", "script"]);

/** Children that belong in the visible element tree (paint order, no defs). */
function getTreeChildren(node: Element): Element[] {
  return Array.from(node.children).filter((child) => {
    const tag = child.nodeName.toLowerCase();
    return !IGNORED_TAGS.has(tag) && tag !== "defs";
  });
}

function parseElementTree(svg: string): TreeNode | null {
  try {
    const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
    const root = doc.documentElement;
    if (!root || root.nodeName.toLowerCase() !== "svg") return null;

    const walk = (node: Element, path: string): TreeNode => {
      const validChildren = getTreeChildren(node);

      return {
        tag: node.nodeName.toLowerCase(),
        id: node.getAttribute("id") || "",
        path,
        hasChildren: validChildren.length > 0,
        children: validChildren.map((c, i) =>
          walk(c, path ? `${path}/${i}` : `${i}`),
        ),
      };
    };

    return walk(root, "");
  } catch {
    return null;
  }
}

function getElementByPath(doc: Document, path: string): Element | null {
  if (!path) return doc.documentElement;
  const parts = path.split("/").map(Number);
  let current: Element = doc.documentElement;
  for (const idx of parts) {
    const validChildren = getTreeChildren(current);
    if (!validChildren[idx]) return null;
    current = validChildren[idx];
  }
  return current;
}

function getHiddenAndLockedIds(svg: string): { hidden: Set<string>; locked: Set<string> } {
  const hidden = new Set<string>();
  const locked = new Set<string>();
  try {
    const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
    doc.querySelectorAll("[id]").forEach((el) => {
      const id = el.getAttribute("id");
      if (!id) return;
      if (
        el.getAttribute("data-hidden") === "true" ||
        el.getAttribute("display") === "none" ||
        (el as HTMLElement).style?.display === "none"
      ) {
        hidden.add(id);
      }
      if (
        el.getAttribute("data-locked") === "true" ||
        el.getAttribute("pointer-events") === "none" ||
        (el as HTMLElement).style?.pointerEvents === "none"
      ) {
        locked.add(id);
      }
    });
  } catch (err) {
    console.error("Failed to parse hidden/locked IDs:", err);
  }
  return { hidden, locked };
}

function getElementIcon(tag: string, isExpanded: boolean) {
  const t = tag.toLowerCase();
  switch (t) {
    case "svg":
      return { Icon: IconFrame, color: "text-blue-500 dark:text-blue-400" };
    case "g":
      return {
        Icon: isExpanded ? IconFolderOpen : IconFolder,
        color: "text-amber-500 dark:text-amber-400",
      };
    case "image":
    case "img":
      return { Icon: IconPhoto, color: "text-sky-500 dark:text-sky-400" };
    case "rect":
    case "foreignobject":
      return { Icon: IconSquare, color: "text-emerald-500 dark:text-emerald-400" };
    case "circle":
    case "ellipse":
      return { Icon: IconCircle, color: "text-violet-500 dark:text-violet-400" };
    case "path":
    case "polygon":
    case "polyline":
    case "line":
      return { Icon: IconVector, color: "text-indigo-500 dark:text-indigo-400" };
    case "text":
    case "tspan":
      return { Icon: IconLetterT, color: "text-rose-500 dark:text-rose-400" };
    default:
      return { Icon: IconShape, color: "text-muted-foreground" };
  }
}

const ELEMENT_LABELS: Record<string, string> = {
  svg: "Artboard",
  g: "Group",
  rect: "Rectangle",
  circle: "Circle",
  ellipse: "Ellipse",
  path: "Path",
  polygon: "Polygon",
  polyline: "Polyline",
  line: "Line",
  text: "Text",
  tspan: "Text",
  image: "Image",
  use: "Instance",
};

function getElementLabel(node: TreeNode): string {
  const tag = node.tag.toLowerCase();
  if (node.id) {
    const auto = node.id.match(/^(rect|circle|text|g|image|group)-[a-z0-9]{2,8}$/i);
    if (auto) {
      const key = auto[1]?.toLowerCase() ?? tag;
      return ELEMENT_LABELS[key] ?? ELEMENT_LABELS[tag] ?? node.tag;
    }
    return node.id;
  }
  return ELEMENT_LABELS[tag] ?? node.tag;
}

const TREE_INDENT = 16;
const TREE_BASE = 8;

function TreeLines({
  depth,
  isLast,
  ancestorContinues,
}: {
  depth: number;
  isLast: boolean;
  ancestorContinues: boolean[];
}) {
  if (depth === 0) return null;

  // Rails line up with the centre of the chevron at each ancestor level.
  const railX = (level: number) => TREE_BASE + level * TREE_INDENT + 7;
  const currentX = railX(depth - 1);

  return (
    <div
      className="pointer-events-none absolute inset-0 select-none"
      aria-hidden="true"
    >
      {Array.from({ length: Math.max(0, depth - 1) }).map((_, level) => {
        if (!ancestorContinues[level + 1]) return null;
        return (
          <span
            key={level}
            className="absolute top-0 bottom-0 w-px bg-sidebar-border"
            style={{ left: railX(level) }}
          />
        );
      })}

      {/* Connector for this node: ├── when it has siblings below, └── when last. */}
      <span
        className={`absolute w-px bg-sidebar-border ${
          isLast ? "top-0 h-1/2" : "top-0 bottom-0"
        }`}
        style={{ left: currentX }}
      />
      <span
        className="absolute top-1/2 h-px bg-sidebar-border"
        style={{ left: currentX, width: 9 }}
      />
    </div>
  );
}

function ElementRow({
  node,
  depth,
  isLast,
  ancestorContinues,
  isCollapsed,
  isSelected,
  isPrimary,
  isLocked,
  isHidden,
  hasTracks,
  onToggleCollapse,
  onSelect,
  onToggleLock,
  onToggleHide,
  onRename,
  onDelete,
  onEditText,
  onEditImageSource,
  onEditPath,
  onEditAttributes,
  moveTargets,
  onGroupElement,
  onUngroupElement,
  onMoveElement,
}: {
  node: TreeNode;
  depth: number;
  isLast: boolean;
  ancestorContinues: boolean[];
  isCollapsed: boolean;
  isSelected: boolean;
  isPrimary: boolean;
  isLocked: boolean;
  isHidden: boolean;
  hasTracks: boolean;
  onToggleCollapse: (key: string) => void;
  onSelect: (id: string | null, additive: boolean) => void;
  onToggleLock: (node: TreeNode) => void;
  onToggleHide: (node: TreeNode) => void;
  onRename: (node: TreeNode) => void;
  onDelete: (node: TreeNode) => void;
  onEditText: (node: TreeNode) => void;
  onEditImageSource: (node: TreeNode) => void;
  onEditPath: (node: TreeNode) => void;
  onEditAttributes: (node: TreeNode) => void;
  moveTargets: MoveTarget[];
  onGroupElement: (node: TreeNode) => void;
  onUngroupElement: (node: TreeNode) => void;
  onMoveElement: (node: TreeNode, targetPath: string | null) => void;
}) {
  const { Icon, color } = getElementIcon(node.tag, !isCollapsed);
  const nodeKey = node.id || node.path;
  const label = getElementLabel(node);
  const isGroup = node.tag.toLowerCase() === "g";
  const alwaysShowActions = isLocked || isHidden;

  return (
    <ContextMenuPrimitive.Root>
      <ContextMenuPrimitive.Trigger asChild>
        <div
          className={`group relative flex h-7 select-none items-center rounded-[5px] pr-1 text-[12px] transition-colors ${
            isSelected
              ? `bg-[#2391FF]/10 font-medium text-sidebar-accent-foreground ${
                  isPrimary ? "shadow-[inset_2px_0_0_#2391FF]" : ""
                }`
              : "text-sidebar-foreground hover:bg-sidebar-accent/50"
          } ${isHidden ? "opacity-55" : ""}`}
          style={{ paddingLeft: TREE_BASE + depth * TREE_INDENT }}
          title={`${label} · ${node.tag}`}
          onClick={(event) => {
            if (!node.id) return;
            onSelect(node.id, event.metaKey || event.ctrlKey);
          }}
          onDoubleClick={() => onRename(node)}
        >
          <TreeLines
            depth={depth}
            isLast={isLast}
            ancestorContinues={ancestorContinues}
          />

          {/* Collapse chevron */}
          {node.hasChildren ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleCollapse(nodeKey);
              }}
              className="mr-1 grid size-3.5 shrink-0 place-items-center rounded-sm text-sidebar-foreground/50 transition-colors hover:bg-sidebar-foreground/10 hover:text-sidebar-foreground"
              title={isCollapsed ? "Expand" : "Collapse"}
            >
              {isCollapsed ? (
                <IconChevronRight className="size-3" />
              ) : (
                <IconChevronDown className="size-3" />
              )}
            </button>
          ) : (
            <span className="mr-1 size-3.5 shrink-0" />
          )}

          {/* Element-type icon */}
          <span
            className={`mr-1.5 grid size-4 shrink-0 place-items-center ${color}`}
          >
            <Icon className="size-3.5" />
          </span>

          {/* Name (no leading hash — the icon communicates the type) */}
          <span
            className={`min-w-0 truncate ${isGroup ? "font-medium" : ""} ${
              isHidden ? "text-sidebar-foreground/60 line-through" : ""
            }`}
          >
            {label}
          </span>

          {isGroup && node.children.length > 0 ? (
            <span className="ml-1.5 shrink-0 text-[10px] tabular-nums text-sidebar-foreground/40">
              {node.children.length}
            </span>
          ) : null}

          {hasTracks ? (
            <span
              className="ml-1.5 size-1.5 shrink-0 rounded-full bg-[#2391FF]"
              title="Animated"
            />
          ) : null}

          {node.id ? (
            <div
              className={`ml-auto flex shrink-0 items-center gap-0.5 pl-1 transition-opacity ${
                alwaysShowActions
                  ? "opacity-100"
                  : "pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100"
              }`}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleLock(node);
                }}
                className={`grid size-5 shrink-0 place-items-center rounded transition-colors ${
                  isLocked
                    ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 hover:bg-amber-500/30"
                    : "text-sidebar-foreground/50 hover:bg-sidebar-foreground/10 hover:text-sidebar-foreground"
                }`}
                title={isLocked ? "Unlock element" : "Lock element"}
              >
                {isLocked ? (
                  <IconLock className="size-3" />
                ) : (
                  <IconLockOpen className="size-3" />
                )}
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleHide(node);
                }}
                className={`grid size-5 shrink-0 place-items-center rounded transition-colors ${
                  isHidden
                    ? "bg-sidebar-foreground/10 text-sidebar-foreground hover:bg-sidebar-foreground/15"
                    : "text-sidebar-foreground/50 hover:bg-sidebar-foreground/10 hover:text-sidebar-foreground"
                }`}
                title={isHidden ? "Show element" : "Hide element"}
              >
                {isHidden ? (
                  <IconEyeOff className="size-3" />
                ) : (
                  <IconEye className="size-3" />
                )}
              </button>
            </div>
          ) : (
            <div className="ml-auto" />
          )}
        </div>
      </ContextMenuPrimitive.Trigger>

      {/* Context Menu */}
      <ContextMenuPrimitive.Portal>
        <ContextMenuPrimitive.Content className="z-50 min-w-[190px] rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-80">
          {node.id ? (
            <>
              <ContextMenuPrimitive.Item
                className="flex cursor-pointer items-center justify-between rounded px-2 py-1.5 text-[12px] outline-none hover:bg-accent"
                onSelect={() => navigator.clipboard?.writeText(node.id)}
              >
                <span>Copy ID</span>
                <span className="text-[10px] text-muted-foreground font-mono">{node.id}</span>
              </ContextMenuPrimitive.Item>
              <ContextMenuPrimitive.Item
                className="cursor-pointer rounded px-2 py-1.5 text-[12px] outline-none hover:bg-accent"
                onSelect={() => onRename(node)}
              >
                Rename ID
              </ContextMenuPrimitive.Item>
            </>
          ) : (
            <ContextMenuPrimitive.Item
              className="cursor-pointer rounded px-2 py-1.5 text-[12px] outline-none hover:bg-accent"
              onSelect={() => onRename(node)}
            >
              Assign ID...
            </ContextMenuPrimitive.Item>
          )}

          <div className="my-1 h-px bg-border" />

          {/* Element-specific edit options */}
          {node.tag.toLowerCase() === "text" || node.tag.toLowerCase() === "tspan" ? (
            <ContextMenuPrimitive.Item
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-[12px] outline-none hover:bg-accent"
              onSelect={() => onEditText(node)}
            >
              <IconLetterT className="size-3.5 text-rose-500" />
              <span>Edit Text Content</span>
            </ContextMenuPrimitive.Item>
          ) : null}

          {node.tag.toLowerCase() === "image" ? (
            <ContextMenuPrimitive.Item
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-[12px] outline-none hover:bg-accent"
              onSelect={() => onEditImageSource(node)}
            >
              <IconPhoto className="size-3.5 text-sky-500" />
              <span>Edit Image Source</span>
            </ContextMenuPrimitive.Item>
          ) : null}

          {node.tag.toLowerCase() === "path" ? (
            <ContextMenuPrimitive.Item
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-[12px] outline-none hover:bg-accent"
              onSelect={() => onEditPath(node)}
            >
              <IconVector className="size-3.5 text-indigo-500" />
              <span>Edit Path Data</span>
            </ContextMenuPrimitive.Item>
          ) : null}

          <ContextMenuPrimitive.Item
            className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-[12px] outline-none hover:bg-accent"
            onSelect={() => onEditAttributes(node)}
          >
            <IconAdjustmentsHorizontal className="size-3.5 text-primary" />
            <span>Edit Attribute...</span>
          </ContextMenuPrimitive.Item>

          {node.path ? (
            <>
              <div className="my-1 h-px bg-border" />
              <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Structure
              </div>
              <ContextMenuPrimitive.Item
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-[12px] outline-none hover:bg-accent"
                onSelect={() => onGroupElement(node)}
              >
                <IconFolderPlus className="size-3.5 text-amber-500" />
                <span>Group</span>
              </ContextMenuPrimitive.Item>
              {isGroup && node.hasChildren ? (
                <ContextMenuPrimitive.Item
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-[12px] outline-none hover:bg-accent"
                  onSelect={() => onUngroupElement(node)}
                >
                  <IconFolderOpen className="size-3.5 text-amber-500" />
                  <span>Ungroup</span>
                </ContextMenuPrimitive.Item>
              ) : null}
              {moveTargets.length > 0 ? (
                <ContextMenuPrimitive.Sub>
                  <ContextMenuPrimitive.SubTrigger className="flex cursor-pointer items-center justify-between rounded px-2 py-1.5 text-[12px] outline-none hover:bg-accent">
                    <span className="flex items-center gap-2">
                      <IconFolder className="size-3.5 text-muted-foreground" />
                      <span>Move into</span>
                    </span>
                    <IconChevronRight className="size-3.5 text-muted-foreground" />
                  </ContextMenuPrimitive.SubTrigger>
                  <ContextMenuPrimitive.Portal>
                    <ContextMenuPrimitive.SubContent className="z-50 min-w-[190px] rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md">
                      <ContextMenuPrimitive.Item
                        className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-[12px] outline-none hover:bg-accent"
                        onSelect={() => onMoveElement(node, null)}
                      >
                        <IconFrame className="size-3.5 text-blue-500" />
                        <span>Artboard</span>
                      </ContextMenuPrimitive.Item>
                      {moveTargets.map((target) => (
                        <ContextMenuPrimitive.Item
                          key={target.path}
                          className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-[12px] outline-none hover:bg-accent"
                          onSelect={() => onMoveElement(node, target.path)}
                        >
                          <IconFolder className="size-3.5 text-amber-500" />
                          <span
                            className="min-w-0 truncate"
                            style={{ paddingLeft: target.depth * 8 }}
                          >
                            {target.label}
                          </span>
                        </ContextMenuPrimitive.Item>
                      ))}
                    </ContextMenuPrimitive.SubContent>
                  </ContextMenuPrimitive.Portal>
                </ContextMenuPrimitive.Sub>
              ) : null}
            </>
          ) : null}

          <div className="my-1 h-px bg-border" />

          <ContextMenuPrimitive.Item
            className="flex cursor-pointer items-center justify-between rounded px-2 py-1.5 text-[12px] outline-none hover:bg-accent"
            onSelect={() => onToggleLock(node)}
          >
            <span>{isLocked ? "Unlock Element" : "Lock Element"}</span>
            {isLocked ? <IconLock className="size-3.5 text-amber-500" /> : <IconLockOpen className="size-3.5 text-muted-foreground" />}
          </ContextMenuPrimitive.Item>

          <ContextMenuPrimitive.Item
            className="flex cursor-pointer items-center justify-between rounded px-2 py-1.5 text-[12px] outline-none hover:bg-accent"
            onSelect={() => onToggleHide(node)}
          >
            <span>{isHidden ? "Show Element" : "Hide Element"}</span>
            {isHidden ? <IconEyeOff className="size-3.5 text-muted-foreground" /> : <IconEye className="size-3.5 text-muted-foreground" />}
          </ContextMenuPrimitive.Item>

          <div className="my-1 h-px bg-border" />

          <ContextMenuPrimitive.Item
            className="cursor-pointer rounded px-2 py-1.5 text-[12px] text-destructive outline-none hover:bg-destructive/10"
            onSelect={() => onDelete(node)}
          >
            Delete Element
          </ContextMenuPrimitive.Item>
        </ContextMenuPrimitive.Content>
      </ContextMenuPrimitive.Portal>
    </ContextMenuPrimitive.Root>
  );
}

function PropertiesPanel({
  animation,
  selectedElementId,
  onSave,
  onPreviewSvg,
  onSelectElement,
}: {
  animation: MotionAnimation | null;
  selectedElementId: string | null;
  onSave: (next: MotionAnimation) => Promise<void>;
  onPreviewSvg?: (svg: string) => void;
  onSelectElement: (id: string | null) => void;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(
    new Set([
      "animate",
      "group",
      "typography",
      "transforms",
      "link",
      "appearance",
      "filters",
    ])
  );
  const [localAttributes, setLocalAttributes] = useState<Record<string, string>>({});
  const [localTextContent, setLocalTextContent] = useState("");
  const saveTimeoutRef = useRef<number | null>(null);
  const draftSvgRef = useRef<string>("");
  const pendingSvgRef = useRef<string | null>(null);
  const latestAnimationRef = useRef<MotionAnimation | null>(animation ?? null);

  useEffect(() => {
    latestAnimationRef.current = animation ?? null;
  }, [animation]);

  useEffect(() => {
    draftSvgRef.current = animation?.svg ?? "";
  }, [animation?.id, animation?.svg]);

  const scheduleSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = window.setTimeout(() => {
      const latest = latestAnimationRef.current;
      const svg = pendingSvgRef.current ?? draftSvgRef.current;
      if (!latest || !svg) return;
      void onSave({ ...latest, svg });
      pendingSvgRef.current = null;
    }, 400);
  }, [onSave]);

  const applySvgUpdate = useCallback(
    (mutator: (el: Element) => void) => {
      const latest = latestAnimationRef.current;
      if (!latest || !selectedElementId) return;
      const source = draftSvgRef.current || latest.svg;
      const doc = new DOMParser().parseFromString(source, "image/svg+xml");
      const el = doc.getElementById(selectedElementId);
      if (!el) return;
      mutator(el);
      const nextSvg = new XMLSerializer().serializeToString(doc.documentElement);
      draftSvgRef.current = nextSvg;
      pendingSvgRef.current = nextSvg;
      onPreviewSvg?.(nextSvg);
      scheduleSave();
    },
    [selectedElementId, onPreviewSvg, scheduleSave],
  );

  const selectedElement = useMemo(() => {
    if (!animation || !selectedElementId) return null;
    try {
      const doc = new DOMParser().parseFromString(animation.svg, "image/svg+xml");
      const el = doc.getElementById(selectedElementId);
      if (!el) return null;
      
      // Extract all attributes
      const attrs: Record<string, string> = {};
      Array.from(el.attributes).forEach((attr) => {
        attrs[attr.name] = attr.value;
      });

      // Parse transform if exists
      const position = { x: 0, y: 0 };
      const scale = { x: 1, y: 1 };
      const rotate = 0;
      const skew = { x: 0, y: 0 };

      // Extract position from x, y attributes or transform
      if (attrs.x) position.x = parseFloat(attrs.x) || 0;
      if (attrs.y) position.y = parseFloat(attrs.y) || 0;
      if (attrs.cx) position.x = parseFloat(attrs.cx) || 0;
      if (attrs.cy) position.y = parseFloat(attrs.cy) || 0;

      return {
        tag: el.tagName.toLowerCase(),
        id: selectedElementId,
        attributes: attrs,
        textContent: el.textContent || "",
        transform: {
          position,
          scale,
          rotate,
          skew,
          origin: { x: 0, y: 0 },
        },
      };
    } catch {
      return null;
    }
  }, [animation?.svg, selectedElementId]);

  // Initialize local state when element changes
  useEffect(() => {
    if (selectedElement) {
      setLocalAttributes(selectedElement.attributes);
      setLocalTextContent(selectedElement.textContent);
    }
  }, [selectedElement?.id]);

  const toggleSection = (section: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  const updateAttribute = (attrName: string, value: string) => {
    // Update local state immediately for responsive UI
    setLocalAttributes((prev) => ({ ...prev, [attrName]: value }));
    applySvgUpdate((el) => {
      if (value === "" || value === null || value === undefined) {
        el.removeAttribute(attrName);
      } else {
        el.setAttribute(attrName, value);
      }
    });
  };

  const updateTextContent = useCallback(
    (value: string) => {
      setLocalTextContent(value);
      applySvgUpdate((el) => {
        el.textContent = value;
      });
    },
    [applySvgUpdate],
  );

  // Flush any pending edit when the selection or panel changes.
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current);
      const latest = latestAnimationRef.current;
      const svg = pendingSvgRef.current;
      if (latest && svg) void onSave({ ...latest, svg });
      pendingSvgRef.current = null;
    };
  }, [onSave, selectedElementId]);

  if (!selectedElement) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center">
        <div className="rounded-full bg-muted p-4 mb-3">
          <IconAdjustmentsHorizontal className="size-8 text-muted-foreground" />
        </div>
        <h3 className="text-sm font-semibold text-foreground mb-1">No Selection</h3>
        <p className="text-xs text-muted-foreground">
          Select an element to view its properties
        </p>
      </div>
    );
  }

  // Use local state for display
  const attrs = localAttributes;
  const textContent = localTextContent;

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* Selected Element Header */}
      <div className="shrink-0 border-b border-sidebar-border bg-sidebar-accent/50 px-3 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="size-2 rounded-full bg-primary shrink-0" />
            <span className="text-sm font-semibold text-foreground truncate">
              {selectedElement.id}
            </span>
            <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono uppercase text-muted-foreground">
              {selectedElement.tag}
            </span>
          </div>
          <button
            onClick={() => onSelectElement(null)}
            className="grid size-6 shrink-0 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
            title="Deselect"
          >
            <IconX className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Properties Sections */}
      <div className="flex-1 p-2 space-y-2">
        {/* Animate Section */}
        <PropertySection
          title="Animate"
          icon={<IconSparkles className="size-4" />}
          isExpanded={expanded.has("animate")}
          onToggle={() => toggleSection("animate")}
        >
          <AnimateSection
            targetId={selectedElement.id}
            attributes={attrs}
          />
        </PropertySection>

        {/* Group Section */}
        <PropertySection
          title="Group"
          icon={<IconFrame className="size-4" />}
          isExpanded={expanded.has("group")}
          onToggle={() => toggleSection("group")}
        >
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <PropertyFieldWithUnit
                label="X"
                value={attrs.x || attrs.cx || "0"}
                unit="x"
                onChange={(v) => {
                  const attr = selectedElement.tag === "circle" ? "cx" : "x";
                  updateAttribute(attr, v);
                }}
              />
              <PropertyFieldWithUnit
                label="Y"
                value={attrs.y || attrs.cy || "0"}
                unit="y"
                onChange={(v) => {
                  const attr = selectedElement.tag === "circle" ? "cy" : "y";
                  updateAttribute(attr, v);
                }}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <PropertyFieldWithUnit
                label="W"
                value={attrs.width || "0"}
                unit="w"
                onChange={(v) => updateAttribute("width", v)}
              />
              <PropertyFieldWithUnit
                label="H"
                value={attrs.height || "0"}
                unit="h"
                onChange={(v) => updateAttribute("height", v)}
              />
            </div>
            {(selectedElement.tag === "text" || selectedElement.tag === "tspan") && (
              <PropertyField
                label="Content"
                value={textContent}
                onChange={(v) => updateTextContent(v)}
                multiline
              />
            )}
          </div>
        </PropertySection>

        {/* Typography Section — fonts, weight, spacing and live preview */}
        {(selectedElement.tag === "text" || selectedElement.tag === "tspan") && (
          <PropertySection
            title="Typography"
            icon={<IconLetterT className="size-4" />}
            isExpanded={expanded.has("typography")}
            onToggle={() => toggleSection("typography")}
          >
            <div className="space-y-3">
              <FontFamilyMenu
                value={attrs["font-family"] ?? DEFAULT_FONT.stack}
                onChange={(stack) => updateAttribute("font-family", stack)}
              />
              <div className="grid grid-cols-2 gap-2">
                <PropertyFieldWithUnit
                  label="Size"
                  value={numericAttribute(attrs["font-size"], "20")}
                  unit="px"
                  onChange={(v) => updateAttribute("font-size", v)}
                />
                <PropertyMenuSelect
                  label="Weight"
                  value={normalizeWeight(attrs["font-weight"])}
                  options={FONT_WEIGHT_OPTIONS}
                  onChange={(v) => updateAttribute("font-weight", v)}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <PropertyFieldWithUnit
                  label="Letter spacing"
                  value={numericAttribute(attrs["letter-spacing"], "0")}
                  unit="px"
                  onChange={(v) => updateAttribute("letter-spacing", v)}
                />
                <PropertyMenuSelect
                  label="Anchor"
                  value={attrs["text-anchor"] ?? "start"}
                  options={TEXT_ANCHOR_OPTIONS}
                  onChange={(v) => updateAttribute("text-anchor", v)}
                />
              </div>
              <PropertyMenuSelect
                label="Style"
                value={attrs["font-style"] ?? "normal"}
                options={FONT_STYLE_OPTIONS}
                onChange={(v) => updateAttribute("font-style", v)}
              />
              <div className="rounded-md border border-border bg-muted/40 px-3 py-2">
                <div className="mb-1 flex items-center justify-between gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <span>Preview</span>
                  <span className="truncate">
                    {fontNameFromStack(attrs["font-family"])}
                  </span>
                </div>
                <div
                  className="truncate text-foreground"
                  style={{
                    fontFamily: attrs["font-family"] ?? DEFAULT_FONT.stack,
                    fontSize: `${Math.min(
                      26,
                      Math.max(
                        10,
                        parseFloat(attrs["font-size"] ?? "20") || 20,
                      ),
                    )}px`,
                    fontWeight: normalizeWeight(attrs["font-weight"]),
                    fontStyle: attrs["font-style"] ?? "normal",
                    letterSpacing: `${
                      parseFloat(attrs["letter-spacing"] ?? "0") || 0
                    }px`,
                  }}
                >
                  {textContent.trim() || "The quick brown fox"}
                </div>
              </div>
            </div>
          </PropertySection>
        )}

        {/* Link Section */}
        {selectedElement.tag === "image" && (
          <PropertySection
            title="Link"
            isExpanded={expanded.has("link")}
            onToggle={() => toggleSection("link")}
          >
            <PropertyField
              label="Image URL"
              value={attrs.href || attrs["xlink:href"] || ""}
              onChange={(v) => updateAttribute("href", v)}
              placeholder="https://..."
            />
          </PropertySection>
        )}

        {/* Appearance Section */}
        <PropertySection
          title="Appearance"
          icon={<IconBrush className="size-4" />}
          isExpanded={expanded.has("appearance")}
          onToggle={() => toggleSection("appearance")}
        >
          <div className="space-y-3">
            <PropertySelect
              label="Compositing"
              value="Source Over"
              options={["Source Over", "Multiply", "Screen", "Overlay"]}
              onChange={() => {}}
            />
            <PropertySelect
              label="Order"
              value="Fill, Stroke, Markers"
              options={["Fill, Stroke, Markers", "Stroke, Fill, Markers", "Fill, Markers, Stroke"]}
              onChange={() => {}}
            />
            <div className="flex items-center gap-2">
              <PropertySelect
                label="Blending"
                value="Normal"
                options={["Normal", "Multiply", "Screen", "Overlay", "Darken", "Lighten", "Color Dodge", "Color Burn"]}
                onChange={() => {}}
              />
              <div className="flex items-center gap-1.5 pt-5">
                <Checkbox
                  checked={/\bisolation\s*:\s*isolate\b/.test(attrs.style || "")}
                  onCheckedChange={(checked) => {
                    const currentStyle = (attrs.style || "").trim();
                    const withoutIsolation = currentStyle
                      .replace(/\s*;?\s*isolation\s*:\s*isolate\s*;?/g, "")
                      .replace(/^;+|;+$/g, "")
                      .trim();
                    updateAttribute(
                      "style",
                      checked
                        ? [withoutIsolation, "isolation: isolate"]
                            .filter(Boolean)
                            .join("; ")
                        : withoutIsolation,
                    );
                  }}
                  className="size-3.5"
                />
                <span className="text-xs text-muted-foreground">Isolate</span>
              </div>
            </div>
            <PropertySlider
              label="Opacity"
              value={parseFloat(attrs.opacity || "1") * 100}
              onChange={(v) => updateAttribute("opacity", (v / 100).toString())}
              min={0}
              max={100}
              unit="%"
            />
            <div className="grid grid-cols-2 gap-2">
              <PropertyColorField
                label="Fill"
                value={attrs.fill || "#000000"}
                onChange={(v) => updateAttribute("fill", v)}
              />
              <PropertyColorField
                label="Stroke"
                value={attrs.stroke || "none"}
                onChange={(v) => updateAttribute("stroke", v)}
                allowNone
              />
            </div>
            <PropertyFieldWithUnit
              label="Stroke Width"
              value={attrs["stroke-width"] || "1"}
              unit="px"
              onChange={(v) => updateAttribute("stroke-width", v)}
            />
          </div>
        </PropertySection>

      </div>
    </div>
  );
}

function AnimateSection({
  targetId,
  attributes,
}: {
  targetId: string;
  attributes: Record<string, string>;
}) {
  const editor = useMotionEditorSnapshot();
  const actions = getMotionEditorActions();
  const time = editor.time;

  const tracked = useMemo(
    () => editor.tracks.filter((track) => track.target === targetId),
    [editor.tracks, targetId],
  );
  const trackedProps = useMemo(
    () => new Set(tracked.map((track) => track.property)),
    [tracked],
  );

  const missing = PROPERTY_GROUPS.flatMap((group) => group.properties).filter(
    (property) => !trackedProps.has(property),
  );

  const initialValue = (property: Property) => {
    const def = PROPERTY_DEFINITIONS[property];
    if (property === "fill") return attributes.fill || "#000000";
    if (property === "stroke") return attributes.stroke || "#000000";
    if (property === "strokeWidth")
      return parseFloat(attributes["stroke-width"] || "1") || 1;
    if (property === "opacity") {
      const parsed = parseFloat(attributes.opacity || "1");
      return Number.isFinite(parsed) ? parsed : 1;
    }
    return def.default;
  };

  return (
    <div className="space-y-2">
      <p className="text-[10px] leading-relaxed text-muted-foreground">
        Add a property, move the playhead, and change its value. Keyframes are
        created automatically.
      </p>

      <div className="flex items-center gap-1.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 flex-1 text-xs gap-1.5"
              disabled={!actions || missing.length === 0}
            >
              <IconPlus className="size-3.5" />
              Add property
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52 max-h-72 overflow-y-auto">
            {PROPERTY_GROUPS.map((group) => {
              const available = group.properties.filter((property) =>
                missing.includes(property),
              );
              if (available.length === 0) return null;
              return (
                <div key={group.id} className="py-1">
                  <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {group.label}
                  </div>
                  {available.map((property) => {
                    const def = PROPERTY_DEFINITIONS[property];
                    return (
                      <DropdownMenuItem
                        key={property}
                        onClick={() =>
                          actions?.addProperty(
                            targetId,
                            property,
                            initialValue(property),
                          )
                        }
                      >
                        <span className="flex-1">{def.label}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {def.unit}
                        </span>
                      </DropdownMenuItem>
                    );
                  })}
                </div>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 w-7 shrink-0 p-0"
          title="Quick add: Move X"
          onClick={() =>
            actions?.addProperty(targetId, "translateX", 0)
          }
          disabled={!actions || trackedProps.has("translateX")}
        >
          <IconVector className="size-3.5" />
        </Button>
      </div>

      {tracked.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-muted/20 px-3 py-4 text-center text-[11px] text-muted-foreground">
          No animated properties yet. Add one above to start.
        </div>
      ) : (
        <div className="space-y-2">
          {tracked.map((track) => (
            <AnimateTrackRow
              key={track.property}
              track={track}
              time={time}
              actions={actions}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AnimateTrackRow({
  track,
  time,
  actions,
}: {
  track: Track;
  time: number;
  actions: MotionEditorActions | null;
}) {
  const def = PROPERTY_DEFINITIONS[track.property];
  const raw = sampleTrack(track, time);
  const numericValue =
    typeof raw === "number" ? raw : Number(raw) || 0;
  const displayValue =
    def.displayScale && Number.isFinite(numericValue)
      ? numericValue * def.displayScale
      : numericValue;
  const atKey = track.keyframes.some(
    (keyframe) => Math.abs(keyframe.t - time) < 0.005,
  );

  const [draft, setDraft] = useState(String(displayValue));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setDraft(String(displayValue));
  }, [displayValue, focused]);

  const commit = (text: string) => {
    if (!actions) return;
    if (def.kind === "color") {
      actions.setValueAtTime(track.target, track.property, text, time);
      return;
    }
    const parsed = Number(text);
    if (!Number.isFinite(parsed)) return;
    const internal =
      def.displayScale && def.displayScale !== 0
        ? parsed / def.displayScale
        : parsed;
    actions.setValueAtTime(track.target, track.property, internal, time);
  };

  return (
    <div className="rounded-md border border-border bg-background/40 p-2">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium text-foreground">
          {def.label}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            title={
              atKey
                ? "Remove keyframe at playhead"
                : "Add keyframe at playhead"
            }
            onClick={() => {
              if (!actions) return;
              if (atKey) {
                if (track.keyframes.length <= 1) return;
                actions.removeKeyframe(track.target, track.property, time);
              } else {
                actions.addKeyframe(track.target, track.property, time);
              }
            }}
            className="grid size-5 place-items-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            {atKey ? (
              <IconDiamondFilled className="size-3 text-[#2391FF]" />
            ) : (
              <IconDiamond className="size-3" />
            )}
          </button>
          <button
            type="button"
            title="Remove animation"
            onClick={() =>
              actions?.removeProperty(track.target, track.property)
            }
            className="grid size-5 place-items-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          >
            <IconTrash className="size-3" />
          </button>
        </div>
      </div>
      {def.kind === "color" ? (
        <ColorPicker
          value={String(raw)}
          onChange={(value) => commit(value)}
        />
      ) : (
        <div className="flex items-center gap-1.5">
          <Input
            type="number"
            value={draft}
            min={def.min}
            max={def.max}
            step={def.step}
            onFocus={() => setFocused(true)}
            onChange={(event) => {
              setDraft(event.target.value);
              commit(event.target.value);
            }}
            onBlur={() => {
              setFocused(false);
              setDraft(String(displayValue));
            }}
            className="h-7 text-xs"
          />
          {def.unit ? (
            <span className="w-6 shrink-0 text-right text-[10px] text-muted-foreground">
              {def.unit}
            </span>
          ) : null}
        </div>
      )}
      <div className="mt-1 text-[9px] text-muted-foreground/70">
        {track.keyframes.length} keyframe
        {track.keyframes.length === 1 ? "" : "s"}
      </div>
    </div>
  );
}

function PropertySection({
  title,
  icon,
  isExpanded,
  onToggle,
  children,
}: {
  title: string;
  icon?: ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-sidebar-border bg-sidebar overflow-hidden">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-sidebar-accent/50 transition-colors"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-sidebar-foreground">
          {icon ? <span className="text-muted-foreground">{icon}</span> : null}
          {title}
        </span>
        {isExpanded ? (
          <IconChevronDown className="size-4 text-muted-foreground" />
        ) : (
          <IconChevronRight className="size-4 text-muted-foreground" />
        )}
      </button>
      {isExpanded && (
        <div className="border-t border-sidebar-border p-3 space-y-3">
          {children}
        </div>
      )}
    </div>
  );
}

function PropertyField({
  label,
  value,
  onChange,
  readOnly,
  multiline,
  type = "text",
  placeholder,
  step,
  min,
  max,
}: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  multiline?: boolean;
  type?: string;
  placeholder?: string;
  step?: string;
  min?: string;
  max?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {multiline ? (
        <Textarea
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          readOnly={readOnly}
          placeholder={placeholder}
          rows={3}
          className="min-h-[72px] resize-none text-sm"
        />
      ) : (
        <Input
          type={type}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          readOnly={readOnly}
          placeholder={placeholder}
          step={step}
          min={min}
          max={max}
          className="h-8 text-sm"
        />
      )}
    </div>
  );
}

function PropertyFieldWithUnit({
  label,
  value,
  unit,
  onChange,
}: {
  label: string;
  value: string;
  unit: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      {label && <label className="text-xs font-medium text-muted-foreground">{label}</label>}
      <div className="flex items-center gap-1">
        <Input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 text-xs flex-1 min-w-0"
        />
        {unit && (
          <span className="text-xs text-muted-foreground w-6 shrink-0">{unit}</span>
        )}
      </div>
    </div>
  );
}

function PropertySelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-7 w-full text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt} value={opt} className="text-xs">
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function FontFamilyMenu({
  value,
  onChange,
}: {
  value: string;
  onChange: (stack: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const currentName = fontNameFromStack(value);
  const current = findFont(currentName);

  useEffect(() => {
    ensureFontLoaded(currentName);
  }, [currentName]);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const order: Array<FontOption["category"]> = [
      "Sans Serif",
      "Serif",
      "Monospace",
      "Display",
      "Handwriting",
    ];
    return order
      .map((category) => ({
        category,
        fonts: FONT_OPTIONS.filter(
          (font) =>
            font.category === category &&
            (!q || font.name.toLowerCase().includes(q)),
        ),
      }))
      .filter((group) => group.fonts.length > 0);
  }, [query]);

  const choose = (font: FontOption) => {
    ensureFontLoaded(font.name);
    onChange(font.stack);
    setOpen(false);
    setQuery("");
  };

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">Font</label>
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setQuery("");
        }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex h-7 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-2 text-xs text-foreground transition-colors hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <span
              className="min-w-0 truncate"
              style={{ fontFamily: current?.stack ?? value }}
            >
              {currentName}
            </span>
            <IconChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 p-0">
          <div className="border-b border-border p-2">
            <div className="relative">
              <IconSearch className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search fonts…"
                className="h-8 pl-7 text-xs"
              />
            </div>
          </div>
          <div className="max-h-72 overflow-y-auto p-1">
            {groups.map((group) => (
              <div key={group.category} className="py-1">
                <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {group.category}
                </div>
                {group.fonts.map((font) => {
                  const active = font.name === currentName;
                  return (
                    <button
                      key={font.name}
                      type="button"
                      onMouseEnter={() => ensureFontLoaded(font.name)}
                      onClick={() => choose(font)}
                      className={`flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left transition-colors ${
                        active
                          ? "bg-[#2391FF]/10 text-[#2391FF]"
                          : "hover:bg-accent"
                      }`}
                    >
                      <span
                        className="min-w-0 truncate text-[13px]"
                        style={{ fontFamily: font.stack }}
                      >
                        {font.name}
                      </span>
                      {active ? (
                        <IconCheck className="size-3.5 shrink-0" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ))}
            {groups.length === 0 ? (
              <div className="px-2 py-6 text-center text-xs text-muted-foreground">
                No fonts match.
              </div>
            ) : null}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function PropertyMenuSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  const current = options.find((option) => option.value === value);
  return (
    <div className="space-y-1.5">
      {label ? (
        <label className="text-xs font-medium text-muted-foreground">
          {label}
        </label>
      ) : null}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex h-7 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-2 text-xs text-foreground transition-colors hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <span className="min-w-0 truncate">{current?.label ?? value}</span>
            <IconChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-h-72 w-48 overflow-y-auto">
          <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
            {options.map((option) => (
              <DropdownMenuRadioItem
                key={option.value}
                value={option.value}
                className="text-xs"
              >
                {option.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function PropertySlider({
  label,
  value,
  onChange,
  min,
  max,
  unit,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  unit: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-muted-foreground">{label}</label>
        <span className="text-xs text-foreground tabular-nums">
          {Math.round(value)}{unit}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Slider
          value={[value]}
          min={min}
          max={max}
          step={1}
          onValueChange={([next]) => onChange(next ?? min)}
          thumbAriaLabel={label}
          className="flex-1"
        />
      </div>
    </div>
  );
}

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

function ColorPicker({
  value,
  onChange,
  allowNone = false,
}: {
  value: string;
  onChange: (value: string) => void;
  allowNone?: boolean;
}) {
  const [draft, setDraft] = useState(value);
  const [open, setOpen] = useState(false);
  const isNone = value.trim().toLowerCase() === "none" || value.trim() === "";
  const pickerColor = useMemo(() => cssColorToHex(value) ?? "#000000", [value]);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const commit = (next: string) => {
    const clean = stripOpaqueHex(next);
    setDraft(clean);
    onChange(clean);
  };

  const commitDraft = (next: string, final = false) => {
    setDraft(next);
    const trimmed = next.trim();
    if (!trimmed) {
      if (final) setDraft(value);
      return;
    }
    if (trimmed.toLowerCase() === "none") {
      onChange("none");
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
                    className={`grid size-6 place-items-center rounded-[5px] border transition-transform hover:scale-110 ${
                      active
                        ? "border-[#2391FF] ring-2 ring-[#2391FF]/30"
                        : "border-black/10"
                    }`}
                    style={{ backgroundColor: color }}
                    aria-label={`Use ${color}`}
                  >
                    {active ? (
                      <IconCheck
                        className={`size-3 ${
                          isLightColor(color) ? "text-black" : "text-white"
                        }`}
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
              className={`w-full justify-start text-[11px] ${
                isNone
                  ? "border-[#2391FF] text-[#2391FF] hover:text-[#2391FF]"
                  : "text-muted-foreground"
              }`}
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

function PropertyColorField({
  label,
  value,
  onChange,
  allowNone = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  allowNone?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <ColorPicker value={value} onChange={onChange} allowNone={allowNone} />
    </div>
  );
}

function LeftSidebarWithTabs({
  animation,
  title,
  selectedElementId,
  hiddenIds,
  lockedIds,
  onSelectElement,
  onToggleLock,
  onToggleHide,
  onRenameElement,
  onRemoveElement,
  onEditText,
  onEditImageSource,
  onEditPath,
  onEditAttributes,
  onUnhideAll,
  onUnlockAll,
  onAddElement,
  onAddImage,
  onTitleChange,
  onSave,
  onPreviewSvg,
  onUndo,
  onRedo,
}: {
  animation: MotionAnimation | null;
  title?: string;
  selectedElementId: string | null;
  hiddenIds: Set<string>;
  lockedIds: Set<string>;
  onSelectElement: (id: string | null) => void;
  onToggleLock: (node: TreeNode) => void;
  onToggleHide: (node: TreeNode) => void;
  onRenameElement: (node: TreeNode) => void;
  onRemoveElement: (node: TreeNode) => void;
  onEditText: (node: TreeNode) => void;
  onEditImageSource: (node: TreeNode) => void;
  onEditPath: (node: TreeNode) => void;
  onEditAttributes: (node: TreeNode) => void;
  onUnhideAll: () => void;
  onUnlockAll: () => void;
  onAddElement: (type: "rect" | "circle" | "text" | "g") => void;
  onAddImage: (data: File | string) => void;
  onTitleChange?: (next: string) => void;
  onSave: (next: MotionAnimation) => Promise<void>;
  onPreviewSvg?: (svg: string) => void;
  onUndo?: () => void;
  onRedo?: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"elements" | "properties">("elements");
  const treeSelectionRef = useRef<string | null>(null);

  const handleTreeSelection = (id: string | null) => {
    treeSelectionRef.current = id;
    onSelectElement(id);
  };

  // Selecting on the canvas opens Properties; selecting in the tree keeps the
  // tree open so users can keep restructuring groups.
  useEffect(() => {
    if (selectedElementId && selectedElementId !== treeSelectionRef.current) {
      setActiveTab("properties");
    }
    treeSelectionRef.current = null;
  }, [selectedElementId]);

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      {/* Header with title and undo/redo */}
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-sidebar-border px-2">
        <Link to="/home" className="shrink-0">
          <AgentNativeIcon
            aria-hidden="true"
            className="h-3.5 w-6 text-sidebar-accent-foreground"
          />
        </Link>
        <div className="min-w-0 flex-1 leading-none">
          <input
            value={title ?? animation?.title ?? ""}
            onChange={(e) => onTitleChange?.(e.target.value)}
            className="w-full truncate bg-transparent text-base font-semibold text-sidebar-accent-foreground outline-none"
          />
        </div>
        <button
          onClick={onUndo}
          className="grid size-7 shrink-0 place-items-center rounded-md text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          title="Undo"
        >
          <IconArrowBackUp className="size-4" />
        </button>
        <button
          onClick={onRedo}
          className="grid size-7 shrink-0 place-items-center rounded-md text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          title="Redo"
        >
          <IconArrowForwardUp className="size-4" />
        </button>
      </div>

      {/* Elements / Properties segmented control */}
      <div className="shrink-0 border-b border-sidebar-border bg-sidebar p-1.5">
        <ButtonGroup className="w-full">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setActiveTab("elements")}
            aria-pressed={activeTab === "elements"}
            className={`h-8 flex-1 text-[12px] font-medium ${
              activeTab === "elements"
                ? "border-[#2391FF] bg-[#2391FF] text-white hover:bg-[#1f83e6] hover:text-white dark:border-[#2391FF] dark:bg-[#2391FF] dark:hover:bg-[#1f83e6]"
                : "bg-transparent text-sidebar-foreground hover:bg-sidebar-accent dark:bg-transparent"
            }`}
          >
            Elements
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setActiveTab("properties")}
            aria-pressed={activeTab === "properties"}
            className={`h-8 flex-1 text-[12px] font-medium ${
              activeTab === "properties"
                ? "border-[#2391FF] bg-[#2391FF] text-white hover:bg-[#1f83e6] hover:text-white dark:border-[#2391FF] dark:bg-[#2391FF] dark:hover:bg-[#1f83e6]"
                : "bg-transparent text-sidebar-foreground hover:bg-sidebar-accent dark:bg-transparent"
            }`}
          >
            Properties
          </Button>
        </ButtonGroup>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "elements" ? (
          <ElementsRail
            animation={animation}
            {...(title !== undefined && { title })}
            selectedElementId={selectedElementId}
            hiddenIds={hiddenIds}
            lockedIds={lockedIds}
            onSelectElement={handleTreeSelection}
            onToggleLock={onToggleLock}
            onToggleHide={onToggleHide}
            onRenameElement={onRenameElement}
            onRemoveElement={onRemoveElement}
            onEditText={onEditText}
            onEditImageSource={onEditImageSource}
            onEditPath={onEditPath}
            onEditAttributes={onEditAttributes}
            onUnhideAll={onUnhideAll}
            onUnlockAll={onUnlockAll}
            onAddElement={onAddElement}
            onAddImage={onAddImage}
            onSave={onSave}
            {...(onTitleChange && { onTitleChange })}
            {...(onUndo && { onUndo })}
            {...(onRedo && { onRedo })}
            hideHeader={true}
          />
        ) : (
          <PropertiesPanel
            animation={animation}
            selectedElementId={selectedElementId}
            onSave={onSave}
            {...(onPreviewSvg ? { onPreviewSvg } : {})}
            onSelectElement={onSelectElement}
          />
        )}
      </div>
    </div>
  );
}

function ElementsRail({
  animation,
  title,
  selectedElementId,
  hiddenIds,
  lockedIds,
  onSelectElement,
  onToggleLock,
  onToggleHide,
  onRenameElement,
  onRemoveElement,
  onEditText,
  onEditImageSource,
  onEditPath,
  onEditAttributes,
  onUnhideAll,
  onUnlockAll,
  onAddElement,
  onAddImage,
  onTitleChange,
  onUndo,
  onRedo,
  onSave,
  hideHeader,
}: {
  animation: MotionAnimation | null;
  title?: string;
  selectedElementId: string | null;
  hiddenIds: Set<string>;
  lockedIds: Set<string>;
  onSelectElement: (id: string | null) => void;
  onToggleLock: (node: TreeNode) => void;
  onToggleHide: (node: TreeNode) => void;
  onRenameElement: (node: TreeNode) => void;
  onRemoveElement: (node: TreeNode) => void;
  onEditText: (node: TreeNode) => void;
  onEditImageSource: (node: TreeNode) => void;
  onEditPath: (node: TreeNode) => void;
  onEditAttributes: (node: TreeNode) => void;
  onUnhideAll: () => void;
  onUnlockAll: () => void;
  onAddElement: (type: "rect" | "circle" | "text" | "g") => void;
  onAddImage: (data: File | string) => void;
  onTitleChange?: (next: string) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onSave: (next: MotionAnimation) => Promise<void>;
  hideHeader?: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { prompt, dialog: promptDialog } = usePromptDialog();
  const tree = useMemo(() => (animation ? parseElementTree(animation.svg) : null), [animation?.svg]);

  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>(
    selectedElementId ? [selectedElementId] : [],
  );

  // Keep the tree's multi-selection in sync with the primary canvas selection.
  // Additive tree clicks already include the primary id, so they survive this.
  useEffect(() => {
    if (!selectedElementId) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds((prev) =>
      prev.includes(selectedElementId) ? prev : [selectedElementId],
    );
  }, [selectedElementId]);

  const handleSelectNode = useCallback(
    (id: string | null, additive: boolean) => {
      if (!id) {
        setSelectedIds([]);
        onSelectElement(null);
        return;
      }
      if (!additive) {
        setSelectedIds([id]);
        onSelectElement(id);
        return;
      }
      const next = selectedIds.includes(id)
        ? selectedIds.filter((value) => value !== id)
        : [...selectedIds, id];
      setSelectedIds(next);
      onSelectElement(
        next.includes(id) ? id : (next[next.length - 1] ?? null),
      );
    },
    [onSelectElement, selectedIds],
  );

  const toggleCollapse = (key: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const expandAll = () => setCollapsedIds(new Set());
  const collapseAll = () => {
    if (!tree) return;
    const ids = new Set<string>();
    const walk = (n: TreeNode) => {
      if (n.hasChildren) ids.add(n.id || n.path);
      n.children.forEach(walk);
    };
    walk(tree);
    setCollapsedIds(ids);
  };

  // Count total elements in tree
  const totalElements = useMemo(() => {
    if (!tree) return 0;
    let count = 0;
    const walk = (n: TreeNode) => {
      count++;
      n.children.forEach(walk);
    };
    walk(tree);
    return count;
  }, [tree]);

  const allCollapsed = useMemo(() => {
    if (!tree) return false;
    let parents = 0;
    let collapsedParents = 0;
    const walk = (n: TreeNode) => {
      if (n.hasChildren) {
        parents++;
        if (collapsedIds.has(n.id || n.path)) collapsedParents++;
      }
      n.children.forEach(walk);
    };
    walk(tree);
    return parents > 0 && collapsedParents === parents;
  }, [tree, collapsedIds]);

  // Set of targets with animation tracks
  const animatedTargets = useMemo(() => {
    return new Set((animation?.tracks || []).map((t) => t.target));
  }, [animation?.tracks]);

  // Groups that an element can be moved into.
  const groupTargets = useMemo<MoveTarget[]>(() => {
    if (!tree) return [];
    const targets: MoveTarget[] = [];
    const walk = (node: TreeNode, depth: number) => {
      if (node.tag.toLowerCase() === "g" && node.id) {
        targets.push({ id: node.id, label: node.id, depth, path: node.path });
      }
      node.children.forEach((child) => walk(child, depth + 1));
    };
    walk(tree, 0);
    return targets;
  }, [tree]);

  // Reveal a selected element by expanding its ancestors.
  useEffect(() => {
    if (!selectedElementId || !tree) return;
    const trail: string[] = [];
    const find = (node: TreeNode): boolean => {
      const key = node.id || node.path;
      if (node.id === selectedElementId) return true;
      for (const child of node.children) {
        trail.push(key);
        if (find(child)) return true;
        trail.pop();
      }
      return false;
    };
    if (!find(tree) || trail.length === 0) return;
    setCollapsedIds((prev) => {
      let changed = false;
      const next = new Set(prev);
      for (const key of trail) {
        if (next.delete(key)) changed = true;
      }
      return changed ? next : prev;
    });
  }, [selectedElementId, tree]);

  const writeSvg = useCallback(
    async (doc: Document, selectId: string | null) => {
      if (!animation) return;
      const nextSvg = new XMLSerializer().serializeToString(doc.documentElement);
      await onSave({ ...animation, svg: nextSvg });
      onSelectElement(selectId);
    },
    [animation, onSave, onSelectElement],
  );

  const handleGroupElements = useCallback(
    async (nodes: TreeNode[]) => {
      if (!animation || nodes.length === 0) return;
      const doc = new DOMParser().parseFromString(animation.svg, "image/svg+xml");
      const elements = nodes
        .map((node) => (node.path ? getElementByPath(doc, node.path) : null))
        .filter((element): element is Element => Boolean(element));
      if (elements.length === 0) return;

      // Deduplicate and drop descendants so grouping a parent and its child
      // cannot create a cycle.
      const unique = elements.filter(
        (element, index) =>
          elements.indexOf(element) === index &&
          !elements.some(
            (other) => other !== element && other.contains(element),
          ),
      );
      if (unique.some((element) => element === doc.documentElement)) return;

      const anchor = unique[0];
      const parent = anchor?.parentElement;
      if (!anchor || !parent) return;

      const ordered = [...unique].sort((a, b) => {
        if (a === b) return 0;
        return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING
          ? -1
          : 1;
      });

      const group = doc.createElementNS("http://www.w3.org/2000/svg", "g");
      let id = `group-${Math.random().toString(36).slice(2, 6)}`;
      while (doc.getElementById(id)) {
        id = `group-${Math.random().toString(36).slice(2, 6)}`;
      }
      group.setAttribute("id", id);
      parent.insertBefore(group, anchor);
      ordered.forEach((element) => group.appendChild(element));
      await writeSvg(doc, id);
    },
    [animation, writeSvg],
  );

  const handleGroupElement = useCallback(
    (node: TreeNode) => {
      void handleGroupElements([node]);
    },
    [handleGroupElements],
  );

  const handleUngroupElement = useCallback(
    async (node: TreeNode) => {
      if (!animation || !node.path) return;
      const doc = new DOMParser().parseFromString(animation.svg, "image/svg+xml");
      const element = getElementByPath(doc, node.path);
      if (!element || element.nodeName.toLowerCase() !== "g") return;
      const parent = element.parentElement;
      if (!parent) return;
      if (!element.hasChildNodes()) {
        toast.error("This group is empty.");
        return;
      }

      const id = element.getAttribute("id");
      if (id && animation.tracks.some((track) => track.target === id)) {
        toast.error("Remove this group's animation tracks before ungrouping.");
        return;
      }

      const firstChildId =
        element.firstElementChild?.getAttribute("id") ?? null;
      while (element.firstChild) {
        parent.insertBefore(element.firstChild, element);
      }
      parent.removeChild(element);
      await writeSvg(doc, firstChildId);
    },
    [animation, writeSvg],
  );

  const handleMoveElement = useCallback(
    async (node: TreeNode, targetPath: string | null) => {
      if (!animation || !node.path) return;
      if (
        targetPath !== null &&
        (targetPath === node.path || targetPath.startsWith(`${node.path}/`))
      ) {
        return;
      }

      const doc = new DOMParser().parseFromString(animation.svg, "image/svg+xml");
      const element = getElementByPath(doc, node.path);
      const target =
        targetPath === null
          ? doc.documentElement
          : getElementByPath(doc, targetPath);
      if (!element || !target || element === doc.documentElement) return;
      if (
        target !== doc.documentElement &&
        target.nodeName.toLowerCase() !== "g"
      ) {
        return;
      }
      if (element.contains(target)) return;

      target.appendChild(element);
      await writeSvg(doc, node.id || null);
    },
    [animation, writeSvg],
  );

  const selectedNode = useMemo(() => {
    if (!tree || !selectedElementId) return null;
    const find = (node: TreeNode): TreeNode | null => {
      if (node.id === selectedElementId) return node;
      for (const child of node.children) {
        const hit = find(child);
        if (hit) return hit;
      }
      return null;
    };
    return find(tree);
  }, [tree, selectedElementId]);

  const selectedNodes = useMemo(() => {
    if (!tree || selectedIds.length === 0) return [] as TreeNode[];
    const ids = new Set(selectedIds);
    const nodes: TreeNode[] = [];
    const walk = (node: TreeNode) => {
      if (node.id && ids.has(node.id)) nodes.push(node);
      node.children.forEach(walk);
    };
    walk(tree);
    return nodes;
  }, [tree, selectedIds]);

  // Grouping a parent and one of its children together is meaningless; keep
  // only the outermost selected elements.
  const groupableNodes = useMemo(
    () =>
      selectedNodes.filter(
        (node) =>
          !selectedNodes.some(
            (other) =>
              other !== node &&
              Boolean(node.path) &&
              node.path.startsWith(`${other.path}/`),
          ),
      ),
    [selectedNodes],
  );

  const canUngroup =
    selectedNode?.tag.toLowerCase() === "g" && selectedNode.hasChildren;

  const renderNode = (
    node: TreeNode,
    depth: number,
    isLast: boolean,
    ancestorContinues: boolean[],
  ): ReactNode => {
    const nodeKey = node.id || node.path;
    const isCollapsed = collapsedIds.has(nodeKey);
    const isSelected = Boolean(node.id && selectedIds.includes(node.id));
    const isPrimary = selectedElementId === node.id && Boolean(node.id);
    const isLocked = Boolean(node.id && lockedIds.has(node.id));
    const isHidden = Boolean(node.id && hiddenIds.has(node.id));
    const hasTracks = Boolean(node.id && animatedTargets.has(node.id));

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchesSelf =
        node.id.toLowerCase().includes(q) || node.tag.toLowerCase().includes(q);
      const hasMatchingDescendant = (n: TreeNode): boolean => {
        if (n.id.toLowerCase().includes(q) || n.tag.toLowerCase().includes(q))
          return true;
        return n.children.some(hasMatchingDescendant);
      };
      if (!matchesSelf && !node.children.some(hasMatchingDescendant)) {
        return null;
      }
    }

    const childNodes = node.children;
    const moveTargets = node.path
      ? groupTargets.filter(
          (target) =>
            target.path !== node.path &&
            !target.path.startsWith(`${node.path}/`),
        )
      : [];

    return (
      <div key={`${node.tag}-${nodeKey}-${depth}`} className="flex flex-col">
        <ElementRow
          node={node}
          depth={depth}
          isLast={isLast}
          ancestorContinues={ancestorContinues}
          isCollapsed={isCollapsed}
          isSelected={isSelected}
          isPrimary={isPrimary}
          isLocked={isLocked}
          isHidden={isHidden}
          hasTracks={hasTracks}
          onToggleCollapse={toggleCollapse}
          onSelect={handleSelectNode}
          onToggleLock={onToggleLock}
          onToggleHide={onToggleHide}
          onRename={onRenameElement}
          onDelete={onRemoveElement}
          onEditText={onEditText}
          onEditImageSource={onEditImageSource}
          onEditPath={onEditPath}
          onEditAttributes={onEditAttributes}
          moveTargets={moveTargets}
          onGroupElement={(target) => {
            if (isSelected && groupableNodes.length > 1) {
              void handleGroupElements(groupableNodes);
            } else {
              handleGroupElement(target);
            }
          }}
          onUngroupElement={handleUngroupElement}
          onMoveElement={handleMoveElement}
        />
        {!isCollapsed &&
          childNodes.map((child, index) => {
            const childIsLast = index === childNodes.length - 1;
            const nextAncestorContinues = [...ancestorContinues];
            nextAncestorContinues[depth] = !isLast;
            return renderNode(
              child,
              depth + 1,
              childIsLast,
              nextAncestorContinues,
            );
          })}
      </div>
    );
  };

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      {!hideHeader && (
        <div className="flex h-10 shrink-0 items-center gap-2 border-b border-sidebar-border px-2">
          <Link to="/home" className="shrink-0">
            <AgentNativeIcon
              aria-hidden="true"
              className="h-3.5 w-6 text-sidebar-accent-foreground"
            />
          </Link>
          <div className="min-w-0 flex-1 leading-none">
            <input
              value={title ?? animation?.title ?? ""}
              onChange={(e) => onTitleChange?.(e.target.value)}
              className="w-full truncate bg-transparent text-base font-semibold text-sidebar-accent-foreground outline-none"
            />
          </div>
          <button
            onClick={onUndo}
            className="grid size-7 shrink-0 place-items-center rounded-md text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            title="Undo"
          >
            <IconArrowBackUp className="size-4" />
          </button>
          <button
            onClick={onRedo}
            className="grid size-7 shrink-0 place-items-center rounded-md text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            title="Redo"
          >
            <IconArrowForwardUp className="size-4" />
          </button>
        </div>
      )}

      {/* Header bar for Elements list */}
      <div className="flex items-center justify-between border-b border-sidebar-border/40 px-3 py-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/80">
            Elements
          </span>
          {selectedIds.length > 1 ? (
            <span className="rounded-full bg-[#2391FF]/15 px-1.5 py-0.5 text-[10px] font-semibold text-[#2391FF]">
              {selectedIds.length} selected
            </span>
          ) : totalElements > 0 ? (
            <span className="rounded-full bg-sidebar-accent px-1.5 py-0.5 text-[10px] font-semibold text-sidebar-accent-foreground">
              {totalElements}
            </span>
          ) : null}

          {/* Plus icon to add elements or images */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="grid size-6 place-items-center rounded text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                title="Add element or image (+)"
              >
                <IconPlus className="size-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Add Shape
              </div>
              <DropdownMenuItem onClick={() => onAddElement("rect")}>
                <IconSquare className="mr-2 size-4 text-emerald-500" />
                <span>Rectangle</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAddElement("circle")}>
                <IconCircle className="mr-2 size-4 text-violet-500" />
                <span>Circle</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAddElement("text")}>
                <IconLetterT className="mr-2 size-4 text-rose-500" />
                <span>Text</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAddElement("g")}>
                <IconFolderPlus className="mr-2 size-4 text-amber-500" />
                <span>New group</span>
              </DropdownMenuItem>
              {groupableNodes.length > 0 ? (
                <>
                  <div className="my-1 h-px bg-border" />
                  <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Selection
                  </div>
                  <DropdownMenuItem
                    onClick={() => void handleGroupElements(groupableNodes)}
                  >
                    <IconFolderPlus className="mr-2 size-4 text-amber-500" />
                    <span>
                      {groupableNodes.length > 1
                        ? `Group ${groupableNodes.length} selected`
                        : "Group selected"}
                    </span>
                  </DropdownMenuItem>
                  {canUngroup && selectedNode ? (
                    <DropdownMenuItem
                      onClick={() => void handleUngroupElement(selectedNode)}
                    >
                      <IconFolderOpen className="mr-2 size-4 text-amber-500" />
                      <span>Ungroup selected</span>
                    </DropdownMenuItem>
                  ) : null}
                </>
              ) : null}
              <div className="my-1 h-px bg-border" />
              <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Add Image
              </div>
              <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                <IconPhoto className="mr-2 size-4 text-sky-500" />
                <span>Upload image…</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={async () => {
                  const url = await prompt({
                    title: "Add image from URL",
                    label: "Image URL",
                    defaultValue: "https://",
                    placeholder: "https://…",
                    required: true,
                    confirmLabel: "Add image",
                  });
                  if (url && url !== "https://") onAddImage(url.trim());
                }}
              >
                <IconLink className="mr-2 size-4 text-muted-foreground" />
                <span>Image from URL…</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <button
            type="button"
            onClick={() => void handleGroupElements(groupableNodes)}
            disabled={groupableNodes.length === 0}
            className="grid size-6 place-items-center rounded text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-35"
            title={
              groupableNodes.length > 1
                ? `Group ${groupableNodes.length} selected elements`
                : "Group selected element · Cmd/Ctrl-click elements to multi-select"
            }
          >
            <IconFolderPlus className="size-3.5" />
          </button>

          {canUngroup && selectedNode ? (
            <button
              type="button"
              onClick={() => void handleUngroupElement(selectedNode)}
              className="grid size-6 place-items-center rounded text-amber-600 transition-colors hover:bg-amber-500/10 dark:text-amber-400"
              title="Ungroup selected group"
            >
              <IconFolderOpen className="size-3.5" />
            </button>
          ) : null}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onAddImage(file);
              e.target.value = "";
            }}
          />
        </div>
        <div className="flex items-center gap-1">
          {hiddenIds.size > 0 && (
            <button
              onClick={onUnhideAll}
              className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
              title={`Unhide all (${hiddenIds.size} hidden)`}
            >
              <IconEye className="size-3" />
              <span>Unhide all</span>
            </button>
          )}
          {lockedIds.size > 0 && (
            <button
              onClick={onUnlockAll}
              className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-amber-500 hover:bg-amber-500/10 transition-colors"
              title={`Unlock all (${lockedIds.size} locked)`}
            >
              <IconLockOpen className="size-3" />
              <span>Unlock all</span>
            </button>
          )}
          <button
            onClick={allCollapsed ? expandAll : collapseAll}
            className="grid size-6 place-items-center rounded text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
            title={allCollapsed ? "Expand all" : "Collapse all"}
          >
            {allCollapsed ? (
              <IconChevronRight className="size-3.5" />
            ) : (
              <IconChevronDown className="size-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Search filter if there are more than 4 elements */}
      {totalElements > 4 && (
        <div className="border-b border-sidebar-border/40 px-3 py-1.5">
          <div className="relative flex items-center">
            <IconSearch className="pointer-events-none absolute left-2 size-3.5 text-muted-foreground" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter elements…"
              className="h-7 w-full border-sidebar-border bg-sidebar-accent/30 pl-7 pr-6 text-xs text-sidebar-foreground placeholder:text-muted-foreground/60 focus-visible:bg-sidebar"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-1.5 grid size-4 place-items-center rounded text-muted-foreground hover:text-foreground"
              >
                <IconX className="size-3" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Scrollable Elements Tree */}
      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {!animation ? (
          <div className="px-2 py-3 text-xs text-sidebar-foreground/60">
            Select an animation
          </div>
        ) : tree ? (
          renderNode(tree, 0, true, [])
        ) : (
          <div className="px-2 py-3 text-xs text-sidebar-foreground/60">
            No elements
          </div>
        )}
      </div>
      {promptDialog}
    </div>
  );
}

function StudioTopBar({
  center,
  right,
}: {
  center?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <header className="grid h-10 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-border bg-background px-2">
      <div className="flex min-w-0 items-center gap-2 whitespace-nowrap" />
      <div className="flex min-w-0 items-center justify-center">{center}</div>
      <div className="flex items-center justify-end gap-1">
        {right}
        <AgentToggleButton className="size-7" />
      </div>
    </header>
  );
}

function EmptyStudio({
  loading,
  onSample,
}: {
  loading: boolean;
  onSample: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <StudioTopBar />
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="max-w-sm space-y-4 text-center">
          <div className="mx-auto grid size-12 place-items-center rounded-lg bg-muted text-foreground">
            <IconSparkles className="size-5" />
          </div>
          <h1 className="text-lg font-semibold tracking-tight">
            {loading ? "Opening the studio…" : "Start something moving"}
          </h1>
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            Ask the agent to draw and animate an SVG, or load a sample and shape
            it on the timeline. Every change is editable — and exportable as a
            standalone animated SVG.
          </p>
          <Button onClick={onSample}>Load sample animation</Button>
        </div>
      </div>
    </div>
  );
}

function parseSvgSize(svg: string): { w: number; h: number } {
  const vb = svg.match(
    /viewBox\s*=\s*["']\s*[-\d.eE+]+\s+[-\d.eE+]+\s+([\d.eE+]+)\s+([\d.eE+]+)\s*["']/i,
  );
  if (vb) {
    const w = Number(vb[1]);
    const h = Number(vb[2]);
    if (Number.isFinite(w) && w > 0 && Number.isFinite(h) && h > 0) {
      return { w, h };
    }
  }
  const wAttr = svg.match(/\swidth\s*=\s*["'](\d+(?:\.\d+)?)/i);
  const hAttr = svg.match(/\sheight\s*=\s*["'](\d+(?:\.\d+)?)/i);
  const w = wAttr ? Number(wAttr[1]) : 300;
  const h = hAttr ? Number(hAttr[1]) : 150;
  return { w: w > 0 ? w : 300, h: h > 0 ? h : 150 };
}

function StudioWorkspace({
  animation,
  title,
  onSave,
  timelineHeight,
  onTimelineHeightChange,
  onRegisterUndoRedo,
  selectedElementId,
  onSelectElement,
  hiddenIds,
  lockedIds,
}: {
  animation: MotionAnimation;
  title: string;
  onSave: (next: MotionAnimation) => Promise<void>;
  timelineHeight: number;
  onTimelineHeightChange: (height: number) => void;
  onRegisterUndoRedo?: (undo: () => void, redo: () => void) => void;
  selectedElementId?: string | null | undefined;
  onSelectElement?: (id: string | null) => void;
  hiddenIds?: Set<string>;
  lockedIds?: Set<string>;
}) {
  const artboardSize = useMemo(
    () => parseSvgSize(animation.svg ?? ""),
    [animation.svg],
  );
  const [tracks, setTracks] = useState<Track[]>(() =>
    cloneTracks(animation.tracks ?? []),
  );
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [duration, setDuration] = useState(animation.duration);
  const [loop, setLoop] = useState(animation.loop);

  const historyRef = useRef<StudioSnapshot[]>([
    {
      tracks: cloneTracks(animation.tracks ?? []),
      duration: animation.duration,
      loop: animation.loop,
    },
  ]);
  const indexRef = useRef(0);
  const skipRef = useRef(false);
  const lastHistoryAtRef = useRef(0);

  useEffect(() => {
    if (skipRef.current) {
      skipRef.current = false;
      return;
    }
    const current = historyRef.current[indexRef.current];
    const next: StudioSnapshot = {
      tracks: cloneTracks(tracks),
      duration,
      loop,
    };
    if (JSON.stringify(current) === JSON.stringify(next)) return;

    const now = performance.now();
    // Coalesce the flood of updates from one continuous gesture (dragging an
    // element, resizing, scrubbing the duration) into a single undo step.
    if (now - lastHistoryAtRef.current < 500 && indexRef.current > 0) {
      historyRef.current[indexRef.current] = next;
    } else {
      historyRef.current = historyRef.current.slice(0, indexRef.current + 1);
      historyRef.current.push(next);
      indexRef.current = historyRef.current.length - 1;
    }
    lastHistoryAtRef.current = now;
  }, [tracks, duration, loop]);

  const undo = useCallback(() => {
    if (indexRef.current <= 0) return;
    indexRef.current -= 1;
    skipRef.current = true;
    lastHistoryAtRef.current = 0;
    const snapshot = historyRef.current[indexRef.current]!;
    setTracks(cloneTracks(snapshot.tracks));
    setDuration(snapshot.duration);
    setLoop(snapshot.loop);
  }, []);

  const redo = useCallback(() => {
    if (indexRef.current >= historyRef.current.length - 1) return;
    indexRef.current += 1;
    skipRef.current = true;
    lastHistoryAtRef.current = 0;
    const snapshot = historyRef.current[indexRef.current]!;
    setTracks(cloneTracks(snapshot.tracks));
    setDuration(snapshot.duration);
    setLoop(snapshot.loop);
  }, []);

  useEffect(() => {
    onRegisterUndoRedo?.(undo, redo);
  }, [onRegisterUndoRedo, undo, redo]);

  // Adopt edits made elsewhere (the agent or another tab) without remounting
  // the studio, so the playhead, selection and expanded tracks survive
  // auto-saves triggered by local edits.
  const serverRevision = `${animation.id}:${animation.updatedAt ?? ""}`;
  const syncedRevisionRef = useRef(serverRevision);
  const savedTracksRef = useRef(animation.tracks ?? []);
  useEffect(() => {
    if (syncedRevisionRef.current === serverRevision) return;
    syncedRevisionRef.current = serverRevision;
    const incoming = animation.tracks ?? [];
    const incomingJson = JSON.stringify(incoming);
    if (incomingJson === JSON.stringify(tracks)) return;
    // Ignore the echo of our own save, and never clobber edits that have not
    // been saved yet.
    if (
      incomingJson === JSON.stringify(savedTracksRef.current) ||
      JSON.stringify(tracks) !== JSON.stringify(savedTracksRef.current)
    ) {
      return;
    }
    skipRef.current = true;
    setTracks(JSON.parse(JSON.stringify(incoming)) as Track[]);
    setDuration(animation.duration);
    setLoop(animation.loop);
  }, [
    serverRevision,
    animation.tracks,
    animation.duration,
    animation.loop,
    tracks,
  ]);

  const firstRenderRef = useRef(true);
  useEffect(() => {
    if (firstRenderRef.current) {
      firstRenderRef.current = false;
      return;
    }
    const timer = window.setTimeout(() => {
      savedTracksRef.current = tracks;
      void onSave({ ...animation, title, tracks, duration, loop });
    }, 600);
    return () => window.clearTimeout(timer);
  }, [title, tracks, duration, loop]);
  useEffect(() => {
    setMotionEditorActions({
      addProperty: (target, property, initialValue) => {
        setTracks((prev) => {
          if (
            prev.some(
              (track) =>
                track.target === target && track.property === property,
            )
          ) {
            return prev;
          }
          const def = PROPERTY_DEFINITIONS[property];
          const value = initialValue ?? def.default;
          return [
            ...prev,
            {
              target,
              property,
              keyframes: [
                { t: 0, v: value, ease: "ease-in-out" },
                { t: 1, v: value, ease: "ease-in-out" },
              ],
            },
          ];
        });
      },
      removeProperty: (target, property) =>
        setTracks((prev) =>
          prev.filter(
            (track) =>
              !(track.target === target && track.property === property),
          ),
        ),
      setValueAtTime: (target, property, value, at) => {
        setTracks((prev) =>
          prev.map((track) => {
            if (
              !(track.target === target && track.property === property)
            ) {
              return track;
            }
            const index = track.keyframes.findIndex(
              (keyframe) => Math.abs(keyframe.t - at) < 0.005,
            );
            if (index >= 0) {
              return {
                ...track,
                keyframes: track.keyframes.map((keyframe, i) =>
                  i === index ? { ...keyframe, v: value } : keyframe,
                ),
              };
            }
            return {
              ...track,
              keyframes: [
                ...track.keyframes,
                {
                  t: Math.max(0, Math.min(1, at)),
                  v: value,
                  ease: "ease-in-out",
                },
              ].sort((a, b) => a.t - b.t),
            };
          }),
        );
      },
      addKeyframe: (target, property, at) => {
        setTracks((prev) =>
          prev.map((track) => {
            if (
              !(track.target === target && track.property === property)
            ) {
              return track;
            }
            if (
              track.keyframes.some(
                (keyframe) => Math.abs(keyframe.t - at) < 0.005,
              )
            ) {
              return track;
            }
            const value = sampleTrack(track, at);
            return {
              ...track,
              keyframes: [
                ...track.keyframes,
                {
                  t: Math.max(0, Math.min(1, at)),
                  v: value,
                  ease: "ease-in-out",
                },
              ].sort((a, b) => a.t - b.t),
            };
          }),
        );
      },
      removeKeyframe: (target, property, at) => {
        setTracks((prev) =>
          prev.map((track) => {
            if (
              !(track.target === target && track.property === property)
            ) {
              return track;
            }
            if (track.keyframes.length <= 1) return track;
            return {
              ...track,
              keyframes: track.keyframes.filter(
                (keyframe) => Math.abs(keyframe.t - at) >= 0.005,
              ),
            };
          }),
        );
      },
    });
    return () => {
      setMotionEditorActions(null);
      resetMotionEditor();
    };
  }, []);

  const [playing, setPlaying] = useState(true);
  const [time, setTime] = useState(0);
  useEffect(() => {
    publishMotionEditor({ tracks, time, duration });
  }, [tracks, time, duration]);
  const [selection, setSelection] = useState<Selection | null>(null);

  const stageRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const lastRef = useRef<number>(0);
  const timeRef = useRef(0);

  const [selectionBox, setSelectionBox] = useState<ElementBox | null>(null);
  const [artboardBackground, setArtboardBackground] = useState<
    "white" | "checker"
  >("white");
  const [guides, setGuides] = useState<{ x: number | null; y: number | null }>({
    x: null,
    y: null,
  });

  const measureSelection = useCallback(() => {
    const viewer = viewerRef.current;
    const stage = stageRef.current;
    const id = selectedElementId;
    if (!viewer || !stage || !id) {
      setSelectionBox(null);
      return;
    }
    const el = stage.querySelector<Element>(`#${CSS.escape(id)}`);
    const svg = stage.querySelector("svg");
    if (!el || !svg) {
      setSelectionBox(null);
      return;
    }
    const vr = viewer.getBoundingClientRect();
    const er = el.getBoundingClientRect();
    if (er.width < 1 && er.height < 1) {
      setSelectionBox(null);
      return;
    }
    const sr = svg.getBoundingClientRect();
    const vb = svg.viewBox.baseVal;
    const ux = vb && vb.width > 0 && sr.width > 0 ? vb.width / sr.width : 1;
    const uy = vb && vb.height > 0 && sr.height > 0 ? vb.height / sr.height : 1;
    const next: ElementBox = {
      x: er.left - vr.left,
      y: er.top - vr.top,
      w: er.width,
      h: er.height,
      ux: (er.left - sr.left) * ux,
      uy: (er.top - sr.top) * uy,
      uw: er.width * ux,
      uh: er.height * uy,
    };
    setSelectionBox((prev) =>
      prev &&
      Math.abs(prev.x - next.x) < 0.25 &&
      Math.abs(prev.y - next.y) < 0.25 &&
      Math.abs(prev.w - next.w) < 0.25 &&
      Math.abs(prev.h - next.h) < 0.25
        ? prev
        : next,
    );
  }, [selectedElementId]);

  useEffect(() => {
    timeRef.current = time;
  }, [time]);

  useEffect(() => {
    if (!playing) return;
    lastRef.current = performance.now();
    const tick = (now: number) => {
      const dt = now - lastRef.current;
      lastRef.current = now;
      let next = timeRef.current + dt / duration;
      if (next >= 1) {
        if (!loop) {
          timeRef.current = 1;
          setTime(1);
          setPlaying(false);
          return;
        }
        next = next % 1;
      }
      timeRef.current = next;
      setTime(next);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, duration, loop]);

  useEffect(() => {
    if (stageRef.current) applyAt(stageRef.current, tracks, time);
  }, [tracks, time, animation.svg]);

  const togglePlay = () => {
    if (!playing && !loop && timeRef.current >= 1) {
      timeRef.current = 0;
      setTime(0);
    }
    setPlaying((p) => !p);
  };

  const scrub = (t: number) => {
    setPlaying(false);
    const clamped = Math.max(0, Math.min(1, t));
    setTime(clamped);
    timeRef.current = clamped;
  };

  const addKeyframe = (trackIndex: number, at: number = time) => {
    const track = tracks[trackIndex];
    if (!track) return;
    const t = Math.max(0, Math.min(1, at));
    const value = sampleTrack(track, t);
    const keyframes = [
      ...track.keyframes.filter((k) => Math.abs(k.t - t) > 0.001),
      { t, v: value },
    ].sort((a, b) => a.t - b.t);
    setTracks((prev) =>
      prev.map((tr, i) => (i === trackIndex ? { ...tr, keyframes } : tr)),
    );
    setTime(t);
    timeRef.current = t;
    setSelection({
      track: trackIndex,
      keyframe: Math.max(
        0,
        keyframes.findIndex((k) => Math.abs(k.t - t) <= 0.0001),
      ),
    });
  };

  const removeKeyframe = (trackIndex: number, kfIndex: number) => {
    setTracks((prev) =>
      prev.map((tr, i) =>
        i === trackIndex
          ? { ...tr, keyframes: tr.keyframes.filter((_, j) => j !== kfIndex) }
          : tr,
      ),
    );
  };

  const moveKeyframe = (trackIndex: number, kfIndex: number, t: number) => {
    const clamped = Math.max(0, Math.min(1, t));
    setTracks((prev) =>
      prev.map((tr, i) => {
        if (i !== trackIndex) return tr;
        return {
          ...tr,
          keyframes: tr.keyframes.map((k, j) =>
            j === kfIndex ? { ...k, t: clamped } : k,
          ),
        };
      }),
    );
    setTime(clamped);
    timeRef.current = clamped;
  };

  const updateKeyframe = (
    trackIndex: number,
    kfIndex: number,
    patch: { t?: number; v?: number | string; ease?: string },
  ) => {
    setTracks((prev) =>
      prev.map((tr, i) => {
        if (i !== trackIndex) return tr;
        return {
          ...tr,
          keyframes: tr.keyframes.map((k, j) =>
            j === kfIndex ? { ...k, ...patch } : k,
          ),
        };
      }),
    );
    if (patch.t !== undefined) {
      setTime(patch.t);
      timeRef.current = patch.t;
    }
  };

  const [tool, setTool] = useState<"select" | "hand">("select");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const spaceDownTimeRef = useRef(0);
  const hasPannedRef = useRef(false);

  const effectiveTool = isSpacePressed ? "hand" : tool;

  // Keep the selection frame glued to the element while it animates, pans,
  // zooms, or is edited.
  useEffect(() => {
    measureSelection();
  }, [measureSelection, time, zoom, pan.x, pan.y, animation.svg]);

  // The pan/zoom transform transitions for a few frames; re-measure once it
  // has settled so the frame does not sit a few pixels off.
  useEffect(() => {
    const timer = window.setTimeout(measureSelection, 80);
    return () => window.clearTimeout(timer);
  }, [measureSelection, zoom, pan.x, pan.y]);

  useEffect(() => {
    window.addEventListener("resize", measureSelection);
    return () => window.removeEventListener("resize", measureSelection);
  }, [measureSelection]);

  // Pull in any web fonts the artwork references so the canvas preview matches
  // what will render for viewers that have access to Google Fonts.
  useEffect(() => {
    const pattern = /font-family=["']([^"']+)["']/gi;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(animation.svg))) {
      ensureFontLoaded(fontNameFromStack(match[1]));
    }
  }, [animation.svg]);

  const sampleTargetProperty = (
    targetId: string,
    prop: Property,
    t: number,
    fallback: number,
  ): number => {
    const tr = tracks.find(
      (track) => track.target === targetId && track.property === prop,
    );
    if (!tr) return fallback;
    const val = sampleTrack(tr, t);
    return typeof val === "number" ? val : Number(val) || fallback;
  };

  const updateTargetProperty = (targetId: string, prop: Property, val: number) => {
    setTracks((prev) => {
      const trackIndex = prev.findIndex(
        (tr) => tr.target === targetId && tr.property === prop,
      );
      if (trackIndex === -1) {
        const newTrack: Track = {
          target: targetId,
          property: prop,
          keyframes: [
            { t: 0, v: val },
            { t: 1, v: val },
          ],
        };
        return [...prev, newTrack];
      }

      const tr = prev[trackIndex]!;
      const kfIndex = tr.keyframes.findIndex((k) => Math.abs(k.t - time) < 0.02);
      let nextKfs: Keyframe[];
      if (kfIndex !== -1) {
        nextKfs = tr.keyframes.map((k, j) => (j === kfIndex ? { ...k, v: val } : k));
      } else {
        nextKfs = [...tr.keyframes, { t: time, v: val }].sort((a, b) => a.t - b.t);
      }
      return prev.map((track, i) =>
        i === trackIndex ? { ...track, keyframes: nextKfs } : track,
      );
    });
  };

  // Dragging element with mouse on canvas
  const dragTargetRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    initX: number;
    initY: number;
    hasMoved: boolean;
    box: { left: number; top: number; width: number; height: number };
    targetsX: number[];
    targetsY: number[];
    viewerLeft: number;
    viewerTop: number;
    unitsPerPx: number;
  } | null>(null);

  const handleStagePointerDown = (e: React.PointerEvent) => {
    if (effectiveTool === "hand" || e.button !== 0) return;
    const target = (e.target as Element).closest("[id]");
    if (!target || !target.id) {
      onSelectElement?.(null);
      setSelection(null);
      setGuides({ x: null, y: null });
      return;
    }
    const id = target.id;
    if (lockedIds?.has(id)) return;

    onSelectElement?.(id);
    setPlaying(false);
    setGuides({ x: null, y: null });

    const curX = sampleTargetProperty(id, "translateX", time, 0);
    const curY = sampleTargetProperty(id, "translateY", time, 0);

    const viewer = viewerRef.current;
    const stage = stageRef.current;
    const svg = stage?.querySelector("svg");
    if (!viewer || !svg) return;
    const vr = viewer.getBoundingClientRect();
    const er = target.getBoundingClientRect();
    const sr = svg.getBoundingClientRect();
    const ctm = svg.getScreenCTM();
    const unitsPerPx = ctm && ctm.a ? 1 / ctm.a : 1 / zoom;

    // Snap targets: artboard edges/center plus the edges/centers of the other
    // elements, so things can be lined up with the rest of the artwork.
    const targetsX: number[] = [
      sr.left,
      sr.left + sr.width / 2,
      sr.right,
    ];
    const targetsY: number[] = [
      sr.top,
      sr.top + sr.height / 2,
      sr.bottom,
    ];
    svg.querySelectorAll<Element>("[id]").forEach((node) => {
      if (node.closest(`#${CSS.escape(id)}`) || node.contains(target)) return;
      const r = node.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return;
      targetsX.push(r.left, r.left + r.width / 2, r.right);
      targetsY.push(r.top, r.top + r.height / 2, r.bottom);
    });

    dragTargetRef.current = {
      id,
      startX: e.clientX,
      startY: e.clientY,
      initX: curX,
      initY: curY,
      hasMoved: false,
      box: {
        left: er.left,
        top: er.top,
        width: er.width,
        height: er.height,
      },
      targetsX,
      targetsY,
      viewerLeft: vr.left,
      viewerTop: vr.top,
      unitsPerPx,
    };
  };

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const drag = dragTargetRef.current;
      if (!drag) return;
      const screenDx = e.clientX - drag.startX;
      const screenDy = e.clientY - drag.startY;
      if (!drag.hasMoved && Math.hypot(screenDx, screenDy) < 2) return;
      drag.hasMoved = true;

      let snapDx = 0;
      let snapDy = 0;
      let guideX: number | null = null;
      let guideY: number | null = null;

      if (!e.altKey) {
        const left = drag.box.left + screenDx;
        const top = drag.box.top + screenDy;
        const snapX = findSnap(
          [left, left + drag.box.width / 2, left + drag.box.width],
          drag.targetsX,
        );
        const snapY = findSnap(
          [top, top + drag.box.height / 2, top + drag.box.height],
          drag.targetsY,
        );
        if (snapX) {
          snapDx = snapX.delta;
          guideX = snapX.line - drag.viewerLeft;
        }
        if (snapY) {
          snapDy = snapY.delta;
          guideY = snapY.line - drag.viewerTop;
        }
      }

      setGuides({ x: guideX, y: guideY });
      updateTargetProperty(
        drag.id,
        "translateX",
        Math.round(drag.initX + (screenDx + snapDx) * drag.unitsPerPx),
      );
      updateTargetProperty(
        drag.id,
        "translateY",
        Math.round(drag.initY + (screenDy + snapDy) * drag.unitsPerPx),
      );
    };
    const onUp = () => {
      dragTargetRef.current = null;
      setGuides({ x: null, y: null });
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [zoom, time]);

  // Resizing a selection from one of its four corner handles. Scaling is
  // applied through the `scale` track, anchored on the opposite corner via a
  // matching translate offset, so it composes with move/edit like any other
  // animated property.
  const resizeRef = useRef<{
    id: string;
    corner: ResizeCorner;
    box: ElementBox;
    scale0: number;
    tx0: number;
    ty0: number;
    unitsPerPx: number;
  } | null>(null);

  const startResize =
    (corner: ResizeCorner) =>
    (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      const id = selectedElementId;
      const stage = stageRef.current;
      if (!id || !selectionBox || !stage) return;
      const svg = stage.querySelector("svg");
      const ctm = svg?.getScreenCTM();
      setPlaying(false);
      setGuides({ x: null, y: null });
      resizeRef.current = {
        id,
        corner,
        box: selectionBox,
        scale0: sampleTargetProperty(id, "scale", time, 1),
        tx0: sampleTargetProperty(id, "translateX", time, 0),
        ty0: sampleTargetProperty(id, "translateY", time, 0),
        unitsPerPx: ctm && ctm.a ? 1 / ctm.a : 1 / zoom,
      };
    };

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const resize = resizeRef.current;
      const viewer = viewerRef.current;
      if (!resize || !viewer) return;
      const { box, corner, scale0, tx0, ty0, unitsPerPx } = resize;
      const signX = corner === "ne" || corner === "se" ? 1 : -1;
      const signY = corner === "sw" || corner === "se" ? 1 : -1;
      const anchorX = signX > 0 ? box.x : box.x + box.w;
      const anchorY = signY > 0 ? box.y : box.y + box.h;
      const vx = signX * box.w;
      const vy = signY * box.h;
      const denom = vx * vx + vy * vy;
      if (denom <= 0) return;
      const vr = viewer.getBoundingClientRect();
      const px = e.clientX - vr.left - anchorX;
      const py = e.clientY - vr.top - anchorY;
      const ratio = Math.min(20, Math.max(0.05, (px * vx + py * vy) / denom));

      // Keep the opposite corner pinned: the frame scales around its center,
      // so shift that center by (ratio - 1) × (center - anchor).
      const cx = box.x + box.w / 2;
      const cy = box.y + box.h / 2;
      const dx = (ratio - 1) * (cx - anchorX);
      const dy = (ratio - 1) * (cy - anchorY);

      updateTargetProperty(
        resize.id,
        "translateX",
        Math.round(tx0 + dx * unitsPerPx),
      );
      updateTargetProperty(
        resize.id,
        "translateY",
        Math.round(ty0 + dy * unitsPerPx),
      );
      updateTargetProperty(
        resize.id,
        "scale",
        Math.round(scale0 * ratio * 1000) / 1000,
      );
      setGuides({ x: null, y: null });
    };
    const onUp = () => {
      resizeRef.current = null;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [time, zoom]);

  // Panning workspace
  const panStartRef = useRef<{
    startX: number;
    startY: number;
    initPanX: number;
    initPanY: number;
  } | null>(null);

  const handleWorkspacePointerDown = (e: React.PointerEvent) => {
    if (effectiveTool === "hand" || e.button === 1 || isSpacePressed) {
      e.preventDefault();
      panStartRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        initPanX: pan.x,
        initPanY: pan.y,
      };
      hasPannedRef.current = false;
      setIsPanning(true);
      return;
    }

    // Clicking the empty studio background clears the selection (and the
    // keyframe inspector) so there is a proper "nothing selected" state.
    if (e.button !== 0) return;
    const target = e.target as Element;
    if (
      stageRef.current?.contains(target) ||
      target.closest("[data-keep-selection]")
    ) {
      return;
    }
    onSelectElement?.(null);
    setSelection(null);
    setGuides({ x: null, y: null });
  };

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!panStartRef.current) return;
      const dx = e.clientX - panStartRef.current.startX;
      const dy = e.clientY - panStartRef.current.startY;
      if (Math.hypot(dx, dy) > 2) {
        hasPannedRef.current = true;
      }
      setPan({
        x: Math.round(panStartRef.current.initPanX + dx),
        y: Math.round(panStartRef.current.initPanY + dy),
      });
    };
    const onUp = () => {
      panStartRef.current = null;
      setIsPanning(false);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const zoomFactor = -e.deltaY * 0.003;
      setZoom((z) =>
        Math.min(4, Math.max(0.2, Math.round((z + zoomFactor) * 100) / 100)),
      );
    } else if (effectiveTool === "hand" || e.shiftKey) {
      setPan((p) => ({
        x: Math.round(p.x - e.deltaX),
        y: Math.round(p.y - e.deltaY),
      }));
    }
  };

  const selected =
    selection && tracks[selection.track]
      ? (() => {
          const track = tracks[selection.track]!;
          const keyframe = track.keyframes[selection.keyframe];
          return keyframe
            ? { track, keyframe, index: selection.keyframe, selection }
            : null;
        })()
      : null;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.code === "KeyZ" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (e.code === "KeyY" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        redo();
        return;
      }
      if (e.code === "KeyV") {
        setTool("select");
      } else if (e.code === "KeyH") {
        setTool("hand");
      } else if (e.code === "Space") {
        // Let a focused button handle Space natively so playback isn't toggled twice.
        if (target?.tagName === "BUTTON") return;
        e.preventDefault();
        if (!e.repeat) spaceDownTimeRef.current = performance.now();
        setIsSpacePressed(true);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        scrub(timeRef.current - 0.02);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        scrub(timeRef.current + 0.02);
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (selection) {
          e.preventDefault();
          removeKeyframe(selection.track, selection.keyframe);
          setSelection(null);
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.code === "Space") {
        if (target?.tagName === "BUTTON") return;
        setIsSpacePressed(false);
        if (
          performance.now() - spaceDownTimeRef.current < 250 &&
          !hasPannedRef.current
        ) {
          togglePlay();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [selection, loop, playing, undo, redo]);

  const handleExport = (format: ExportFormat) => {
    const result = runExport(
      { ...animation, title, tracks, duration, loop },
      format,
    );
    const blob = new Blob([result.content], { type: result.mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = result.filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${result.filename}`);
  };

  const canvasCursor =
    effectiveTool === "hand"
      ? isPanning
        ? "grabbing"
        : "grab"
      : "default";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <StudioTopBar
        center={
          <div className="flex h-7 items-center gap-0.5 rounded-lg border border-border/80 bg-muted/30 p-0.5">
            <button
              type="button"
              onClick={() => setTool("select")}
              className={`grid size-6 place-items-center rounded-[5px] transition-colors ${
                effectiveTool === "select"
                  ? "bg-[#2391FF] text-white shadow-sm"
                  : "text-muted-foreground hover:bg-accent/70 hover:text-foreground"
              }`}
              title="Select & Move tool (V)"
              aria-label="Select & Move tool"
              aria-pressed={effectiveTool === "select"}
            >
              <IconPointer className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setTool("hand")}
              className={`grid size-6 place-items-center rounded-[5px] transition-colors ${
                effectiveTool === "hand"
                  ? "bg-[#2391FF] text-white shadow-sm"
                  : "text-muted-foreground hover:bg-accent/70 hover:text-foreground"
              }`}
              title="Hand / Pan tool (H or hold Space)"
              aria-label="Hand / Pan tool"
              aria-pressed={effectiveTool === "hand"}
            >
              <IconHandMove className="size-3.5" />
            </button>

            <span aria-hidden="true" className="mx-1 h-3.5 w-px bg-border" />

            {/* Aspect Ratio Controls */}
            <AspectRatioControl animation={animation} onSave={onSave} />

            {/* Artboard background: white or transparent checkerboard */}
            <button
              type="button"
              onClick={() =>
                setArtboardBackground((bg) => (bg === "white" ? "checker" : "white"))
              }
              className="grid size-6 place-items-center rounded-[5px] text-muted-foreground transition-colors hover:bg-accent/70 hover:text-foreground"
              title={`Artboard background: ${
                artboardBackground === "white" ? "White" : "Transparent"
              } (click to switch)`}
              aria-label="Toggle artboard background"
            >
              <span
                className="size-3.5 rounded-[3px] border border-border"
                style={
                  artboardBackground === "white"
                    ? { background: "#ffffff" }
                    : {
                        backgroundImage:
                          "repeating-conic-gradient(#c9c9c9 0% 25%, #ffffff 0% 50%)",
                        backgroundSize: "6px 6px",
                      }
                }
              />
            </button>

            <span aria-hidden="true" className="mx-1 h-3.5 w-px bg-border" />

            {/* Zoom Controls */}
            <button
              type="button"
              onClick={() =>
                setZoom((z) =>
                  Math.max(0.2, Math.round((z - 0.25) * 100) / 100),
                )
              }
              className="grid size-6 place-items-center rounded-[5px] text-muted-foreground transition-colors hover:bg-accent/70 hover:text-foreground"
              title="Zoom out (Ctrl -)"
            >
              <IconZoomOut className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() =>
                setZoom((z) =>
                  Math.min(4, Math.round((z + 0.25) * 100) / 100),
                )
              }
              className="grid size-6 place-items-center rounded-[5px] text-muted-foreground transition-colors hover:bg-accent/70 hover:text-foreground"
              title="Zoom in (Ctrl +)"
            >
              <IconZoomIn className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setZoom(1);
                setPan({ x: 0, y: 0 });
              }}
              className="grid size-6 place-items-center rounded-[5px] text-muted-foreground transition-colors hover:bg-accent/70 hover:text-foreground"
              title={`Reset zoom & center view (currently ${Math.round(zoom * 100)}%)`}
              aria-label="Reset zoom and center view"
            >
              <IconMaximize className="size-3.5" />
            </button>
          </div>
        }
        right={
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  className="h-7 gap-1.5 text-[11px] bg-[#2391FF] text-white hover:bg-[#1f7fe0]"
                >
                  <IconDownload className="size-3.5" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={() => setExportDialogOpen(true)}>
                  SVG for Web (options…)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("svg")}>
                  SVG (animated)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("webcss")}>
                  Web (CSS/HTML)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("js")}>
                  JavaScript
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("lottie")}>
                  Lottie JSON
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />

      {/* Main workspace artboard with pan, zoom, scale x & y, and element drag */}
      <div
        ref={viewerRef}
        className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-muted/30 select-none"
        style={{ cursor: canvasCursor }}
        onPointerDown={handleWorkspacePointerDown}
        onWheel={handleWheel}
      >
        {/* Dynamic canvas grid pattern */}
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            backgroundImage:
              "radial-gradient(circle at center, hsl(var(--border)) 1px, transparent 1px)",
            backgroundSize: `${22 * zoom}px ${22 * zoom}px`,
            backgroundPosition: `${pan.x}px ${pan.y}px`,
          }}
        />

        {/* Artboard Wrapper with Pan & Zoom transform */}
        <div
          style={{
            transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
            transformOrigin: "center center",
            transition: isPanning ? "none" : "transform 0.05s ease-out",
          }}
          className="relative"
        >
          <div
            className="relative overflow-hidden border border-border bg-background shadow-md"
            style={
              artboardBackground === "white"
                ? { backgroundColor: "#ffffff" }
                : {
                    backgroundColor: "#ffffff",
                    backgroundImage:
                      "repeating-conic-gradient(#e3e3e3 0% 25%, #ffffff 0% 50%)",
                    backgroundSize: "18px 18px",
                  }
            }
          >
            <div
              ref={stageRef}
              onPointerDown={handleStagePointerDown}
              className="relative [&>svg]:block [&>svg]:h-auto [&>svg]:w-auto"
              dangerouslySetInnerHTML={{ 
                __html: (() => {
                  // Clean the SVG
                  let cleanSvg = animation.svg
                    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                    .replace(/<script[^>]*>/gi, '')
                    .replace(/<\/script>/gi, '');
                  
                  // Fix zero or missing width/height
                  if (!cleanSvg.match(/\swidth\s*=\s*["'][^"'0][^"']*["']/)) {
                    cleanSvg = cleanSvg.replace(/<svg/, '<svg width="200"');
                  }
                  if (!cleanSvg.match(/\sheight\s*=\s*["'][^"'0][^"']*["']/)) {
                    cleanSvg = cleanSvg.replace(/<svg/, '<svg height="200"');
                  }
                  
                  // Ensure viewBox exists
                  if (!cleanSvg.includes('viewBox')) {
                    const widthMatch = cleanSvg.match(/width\s*=\s*["'](\d+(?:\.\d+)?)/);
                    const heightMatch = cleanSvg.match(/height\s*=\s*["'](\d+(?:\.\d+)?)/);
                    const w = widthMatch ? widthMatch[1] : '200';
                    const h = heightMatch ? heightMatch[1] : '200';
                    cleanSvg = cleanSvg.replace(/<svg/, `<svg viewBox="0 0 ${w} ${h}"`);
                  }
                  
                  return cleanSvg;
                })()
              }}
            />
            {/* Dynamic style for hidden, locked, and selected elements */}
            <style>{`
              ${Array.from(hiddenIds ?? [])
                .map((id) => `#${CSS.escape(id)} { display: none !important; }`)
                .join("\n")}
              ${Array.from(lockedIds ?? [])
                .map(
                  (id) =>
                    `#${CSS.escape(id)} { pointer-events: none !important; user-select: none !important; }`,
                )
                .join("\n")}
              ${
                effectiveTool === "select"
                  ? `
                #stage svg [id]:not([data-locked="true"]),
                div[class*="relative"] svg [id]:not([data-locked="true"]) {
                  cursor: move !important;
                }
              `
                  : ""
              }
            `}</style>
          </div>
        </div>

        {/* Alignment guides shown while dragging (snaps to centers and edges) */}
        {guides.x !== null ? (
          <div
            className="pointer-events-none absolute inset-y-0 z-10 w-px bg-[#2391FF]/70"
            style={{ left: guides.x }}
          />
        ) : null}
        {guides.y !== null ? (
          <div
            className="pointer-events-none absolute inset-x-0 z-10 h-px bg-[#2391FF]/70"
            style={{ top: guides.y }}
          />
        ) : null}

        {/* Selection frame: resize handles, center marker, live position */}
        {selectionBox && effectiveTool === "select" ? (
          <div
            className="pointer-events-none absolute z-20"
            style={{
              left: selectionBox.x,
              top: selectionBox.y,
              width: selectionBox.w,
              height: selectionBox.h,
            }}
          >
            <div className="absolute inset-0 border border-[#2391FF]" />

            <div className="absolute -top-6 left-0 whitespace-nowrap rounded-sm bg-[#2391FF] px-1.5 py-0.5 font-mono text-[10px] leading-none text-white shadow-sm">
              X {Math.round(selectionBox.ux)} · Y{" "}
              {Math.round(selectionBox.uy)} · {Math.round(selectionBox.uw)}×
              {Math.round(selectionBox.uh)}
            </div>

            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="size-2 rounded-full border border-white bg-[#2391FF] shadow-sm" />
            </div>

            {RESIZE_CORNERS.map(({ corner, cursor, left, top }) => (
              <button
                key={corner}
                type="button"
                onPointerDown={startResize(corner)}
                className="pointer-events-auto absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#2391FF] shadow-md transition-transform hover:scale-125"
                style={{ left, top, cursor }}
                title={`Resize from ${corner} corner (keeps aspect ratio)`}
                aria-label={`Resize from ${corner} corner`}
              />
            ))}
          </div>
        ) : null}

        {selected ? (
          <KeyframeInspector
            track={selected.track}
            keyframe={selected.keyframe}
            onChange={(patch) =>
              updateKeyframe(
                selected.selection.track,
                selected.selection.keyframe,
                patch,
              )
            }
            onDelete={() => {
              removeKeyframe(
                selected.selection.track,
                selected.selection.keyframe,
              );
              setSelection(null);
            }}
            onClose={() => setSelection(null)}
          />
        ) : null}
      </div>

      <Timeline
        tracks={tracks}
        time={time}
        selection={selection}
        selectedElementId={selectedElementId}
        duration={duration}
        playing={playing}
        loop={loop}
        height={timelineHeight}
        onHeightChange={onTimelineHeightChange}
        onTogglePlay={togglePlay}
        onToggleLoop={() => setLoop((v) => !v)}
        onDurationChange={setDuration}
        onScrub={scrub}
        onSelect={setSelection}
        onAdd={addKeyframe}
        onRemove={removeKeyframe}
        onMove={moveKeyframe}
      />
      <SvgExportDialog
        open={exportDialogOpen}
        svg={animation.svg ?? ""}
        title={title ?? ""}
        onClose={() => setExportDialogOpen(false)}
        onExport={(format) => {
          handleExport(format);
        }}
      />
    </div>
  );
}

function KeyframeInspector({
  track,
  keyframe,
  onChange,
  onDelete,
  onClose,
}: {
  track: Track;
  keyframe: { t: number; v: number | string; ease?: string };
  onChange: (patch: { t?: number; v?: number | string; ease?: string }) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const meta = PROPERTY_DEFINITIONS[track.property];
  const isColor =
    track.property === "fill" &&
    typeof keyframe.v === "string" &&
    /^#[0-9a-f]{3,8}$/i.test(keyframe.v);
  const easingMissing =
    keyframe.ease &&
    !EASING_OPTIONS.some((option) => option.value === keyframe.ease);

  return (
    <div
      data-keep-selection
      className="absolute right-5 top-5 z-30 w-60 overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-lg"
    >
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-primary" />
          <span className="text-[12px] font-medium">{meta.label}</span>
          <span className="text-[10px] text-muted-foreground">
            #{track.target}
          </span>
        </div>
        <button
          onClick={onClose}
          className="grid size-5 place-items-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          title="Close"
        >
          <IconX className="size-3" />
        </button>
      </div>

      <div className="space-y-3 p-3">
        <label className="block">
          <span className="mb-1 block text-[10px] font-medium text-muted-foreground">
            Time
          </span>
          <div className="flex items-center gap-2">
            <Slider
              value={[Math.round(keyframe.t * 1000)]}
              min={0}
              max={1000}
              step={1}
              onValueChange={([next]) => onChange({ t: (next ?? 0) / 1000 })}
              thumbAriaLabel="Keyframe time"
              className="min-w-0 flex-1"
            />
            <span className="w-9 text-right text-[11px] tabular-nums text-muted-foreground">
              {Math.round(keyframe.t * 100)}%
            </span>
          </div>
        </label>

        <label className="block">
          <span className="mb-1 block text-[10px] font-medium text-muted-foreground">
            Value
          </span>
          {isColor ? (
            <ColorPicker
              value={String(keyframe.v)}
              onChange={(v) => onChange({ v })}
            />
          ) : (
            <Input
              type={meta.kind === "number" ? "number" : "text"}
              step="any"
              value={String(keyframe.v)}
              onChange={(e) =>
                onChange({
                  v: meta.kind === "number" ? Number(e.target.value) : e.target.value,
                })
              }
              className="h-7 text-[11px]"
            />
          )}
        </label>

        <label className="block">
          <span className="mb-1 block text-[10px] font-medium text-muted-foreground">
            Easing out
          </span>
          <Select
            value={keyframe.ease || "linear"}
            onValueChange={(value) =>
              onChange({ ease: value === "linear" ? "" : value })
            }
          >
            <SelectTrigger className="h-7 w-full text-[11px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EASING_OPTIONS.map((option) => (
                <SelectItem
                  key={option.label}
                  value={option.value || "linear"}
                  className="text-[11px]"
                >
                  {option.label}
                </SelectItem>
              ))}
              {easingMissing ? (
                <SelectItem
                  value={keyframe.ease ?? "custom"}
                  className="text-[11px]"
                >
                  Custom
                </SelectItem>
              ) : null}
            </SelectContent>
          </Select>
        </label>

        <button
          onClick={onDelete}
          className="flex w-full items-center justify-center gap-1.5 rounded-md border border-border py-1.5 text-[11px] text-muted-foreground transition-colors hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
        >
          <IconTrash className="size-3" />
          Delete keyframe
        </button>
      </div>
    </div>
  );
}

function Timeline({
  tracks,
  time,
  selection,
  selectedElementId,
  duration,
  playing,
  loop,
  height,
  onHeightChange,
  onTogglePlay,
  onToggleLoop,
  onDurationChange,
  onScrub,
  onSelect,
  onAdd,
  onRemove,
  onMove,
}: {
  tracks: Track[];
  time: number;
  selection: Selection | null;
  selectedElementId?: string | null | undefined;
  duration: number;
  playing: boolean;
  loop: boolean;
  height: number;
  onHeightChange: (height: number) => void;
  onTogglePlay: () => void;
  onToggleLoop: () => void;
  onDurationChange: (duration: number) => void;
  onScrub: (t: number) => void;
  onSelect: (next: Selection | null) => void;
  onAdd: (trackIndex: number, t?: number) => void;
  onRemove: (trackIndex: number, kfIndex: number) => void;
  onMove: (trackIndex: number, kfIndex: number, t: number) => void;
}) {
  const dragRef = useRef<{
    track: number;
    keyframe: number;
    rect: DOMRect;
  } | null>(null);
  const scrubRef = useRef<DOMRect | null>(null);
  const handlersRef = useRef({ onMove, onScrub });
  useEffect(() => {
    handlersRef.current = { onMove, onScrub };
  }, [onMove, onScrub]);

  const [expandedElements, setExpandedElements] = useState<Set<string>>(
    () => new Set(selectedElementId ? [selectedElementId] : []),
  );

  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (dragRef.current) {
        const { rect, track, keyframe } = dragRef.current;
        handlersRef.current.onMove(
          track,
          keyframe,
          (e.clientX - rect.left) / rect.width,
        );
        return;
      }
      if (scrubRef.current) {
        const rect = scrubRef.current;
        handlersRef.current.onScrub((e.clientX - rect.left) / rect.width);
      }
    };
    const up = () => {
      dragRef.current = null;
      scrubRef.current = null;
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, []);

  // Group tracks by target element
  const groupedTracks = useMemo(() => {
    const groups: Record<string, Track[]> = {};
    tracks.forEach((track) => {
      if (!groups[track.target]) groups[track.target] = [];
      groups[track.target]!.push(track);
    });
    return groups;
  }, [tracks]);

  const toggleElement = (target: string) => {
    setExpandedElements((prev) => {
      const next = new Set(prev);
      if (next.has(target)) next.delete(target);
      else next.add(target);
      return next;
    });
  };

  const safeDuration =
    Number.isFinite(duration) && duration > 0 ? duration : 1000;
  const durationSeconds = safeDuration / 1000;
  const currentSeconds = time * durationSeconds;

  const [durationDraft, setDurationDraft] = useState(String(safeDuration / 1000));
  useEffect(() => {
    setDurationDraft(String(safeDuration / 1000));
  }, [safeDuration]);

  const commitDuration = () => {
    const next = Number(durationDraft);
    if (!Number.isFinite(next) || next <= 0) {
      setDurationDraft(String(safeDuration / 1000));
      return;
    }
    const ms = Math.round(next * 1000);
    const clamped = Math.min(60000, Math.max(100, ms));
    setDurationDraft(String(clamped / 1000));
    onDurationChange(clamped);
  };

  // Ruler ticks: denser for short clips, sparser for long ones. Each major
  // tick is subdivided into 5 minor ticks so frame timing is easier to read.
  const tickStep =
    durationSeconds <= 2
      ? 0.25
      : durationSeconds <= 5
        ? 0.5
        : durationSeconds <= 15
          ? 1
          : 2;
  const minorDivisions = tickStep >= 2 ? 2 : 5;
  const markers = useMemo(() => {
    const next: number[] = [];
    for (let sec = 0; sec < durationSeconds - 1e-6; sec += tickStep) {
      next.push(Math.round(sec * 1000) / 1000);
    }
    next.push(Math.round(durationSeconds * 1000) / 1000);
    return next;
  }, [durationSeconds, tickStep]);

  const minorMarkers = useMemo(() => {
    const step = tickStep / minorDivisions;
    const next: number[] = [];
    for (let i = 1; i * step < durationSeconds - 1e-6; i += 1) {
      if (i % minorDivisions === 0) continue;
      next.push(Math.round(i * step * 1000) / 1000);
    }
    return next;
  }, [durationSeconds, tickStep, minorDivisions]);

  const rulerRef = useRef<HTMLDivElement>(null);
  const heightDragRef = useRef<{
    startY: number;
    startHeight: number;
  } | null>(null);

  useEffect(() => {
    const move = (e: PointerEvent) => {
      const drag = heightDragRef.current;
      if (!drag) return;
      const maxHeight = Math.max(320, window.innerHeight - 220);
      const next = Math.min(
        maxHeight,
        Math.max(180, drag.startHeight - (e.clientY - drag.startY)),
      );
      onHeightChange(Math.round(next));
    };
    const up = () => {
      heightDragRef.current = null;
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [onHeightChange]);

  const startRulerScrub = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = rulerRef.current?.getBoundingClientRect();
    if (!rect) return;
    scrubRef.current = rect;
    onSelect(null);
    onScrub((e.clientX - rect.left) / rect.width);
  };

  const startScrub = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    scrubRef.current = rect;
    onSelect(null);
    onScrub((e.clientX - rect.left) / rect.width);
  };

  const keyframeMarker = (
    trackIndex: number,
    kfIndex: number,
    keyframe: Keyframe,
  ) => {
    const active =
      selection?.track === trackIndex && selection.keyframe === kfIndex;
    const property = tracks[trackIndex]?.property;
    const label = property ? PROPERTY_DEFINITIONS[property].label : "Keyframe";
    return (
      <button
        key={`${trackIndex}-${kfIndex}`}
        type="button"
        title={`${label} · ${Math.round(keyframe.t * 100)}% = ${keyframe.v}`}
        onPointerDown={(e) => {
          e.stopPropagation();
          const rect = e.currentTarget.parentElement?.getBoundingClientRect();
          if (!rect) return;
          dragRef.current = {
            track: trackIndex,
            keyframe: kfIndex,
            rect,
          };
          onSelect({ track: trackIndex, keyframe: kfIndex });
          onScrub(keyframe.t);
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          onRemove(trackIndex, kfIndex);
          onSelect(null);
        }}
        className={`absolute top-1/2 z-10 size-3 -translate-x-1/2 -translate-y-1/2 rotate-45 cursor-grab rounded-sm border-2 transition-colors active:cursor-grabbing ${
          active
            ? "border-primary bg-primary scale-125"
            : "border-background bg-blue-400 hover:bg-blue-300"
        }`}
        style={{ left: `${keyframe.t * 100}%` }}
      />
    );
  };

  return (
    <div
      className="-ml-64 flex w-[calc(100%+16rem)] shrink-0 select-none flex-col border-t border-border bg-[#1a1a1a]"
      style={{ height }}
    >
      {/* Drag handle — resize the timeline height */}
      <div
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize timeline"
        onPointerDown={(e) => {
          e.preventDefault();
          heightDragRef.current = { startY: e.clientY, startHeight: height };
        }}
        onDoubleClick={() => onHeightChange(256)}
        className="group relative -mt-px flex h-2 shrink-0 cursor-ns-resize items-center justify-center bg-[#1a1a1a] transition-colors hover:bg-primary/30"
        title="Drag to resize the timeline (double-click to reset)"
      >
        <span className="h-0.5 w-10 rounded-full bg-border transition-colors group-hover:bg-primary" />
      </div>

      {/* Transport — one row for playback, timing, duration and looping */}
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-border/50 bg-[#222] px-3">
        <div className="flex items-center gap-0.5 rounded-md bg-[#2c2c2c] p-0.5">
          <button
            type="button"
            onClick={() => onScrub(0)}
            className="grid size-7 place-items-center rounded text-muted-foreground transition-colors hover:bg-[#3a3a3a] hover:text-foreground"
            title="Back to start"
            aria-label="Back to start"
          >
            <IconPlayerSkipBack className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={onTogglePlay}
            className="grid size-7 place-items-center rounded-md bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
            title={playing ? "Pause (Space)" : "Play (Space)"}
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? (
              <IconPlayerPauseFilled className="size-3.5" />
            ) : (
              <IconPlayerPlayFilled className="size-3.5" />
            )}
          </button>
        </div>

        <div className="flex items-baseline gap-1 rounded-md bg-[#2c2c2c] px-2 py-1 text-[11px] tabular-nums">
          <span className="font-mono text-foreground">
            {formatSeconds(currentSeconds)}
          </span>
          <span className="text-muted-foreground/60">/</span>
          <span className="font-mono text-muted-foreground">
            {formatSeconds(durationSeconds)}
          </span>
        </div>

        <span className="ml-2 hidden min-w-0 flex-1 truncate text-[10px] text-muted-foreground lg:block">
          Drag diamonds to retime · Double-click a track to add a keyframe
        </span>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Input
              type="number"
              min={0.1}
              max={60}
              step={0.1}
              value={durationDraft}
              onChange={(e) => setDurationDraft(e.target.value)}
              onBlur={commitDuration}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
              }}
              className="h-7 w-16 text-[11px]"
              aria-label="Duration in seconds"
            />
            <span className="text-[10px] text-muted-foreground">s</span>
          </div>
          <button
            type="button"
            onClick={onToggleLoop}
            className={`grid size-7 place-items-center rounded-md transition-colors ${
              loop
                ? "bg-primary/20 text-primary"
                : "text-muted-foreground hover:bg-[#3a3a3a] hover:text-foreground"
            }`}
            title={loop ? "Looping" : "Play once"}
            aria-label={loop ? "Disable looping" : "Enable looping"}
            aria-pressed={loop}
          >
            <IconRepeat className="size-3.5" />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {tracks.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            No animation tracks yet — select an element, open Properties → Animate, and add a property.
          </div>
        ) : (
          <>
            {/* Time ruler — also a scrub surface */}
            <div className="sticky top-0 z-30 flex h-9 border-b border-border/50 bg-[#1e1e1e]">
              <div className="w-52 shrink-0 border-r border-border/50" />
              <div
                ref={rulerRef}
                className="relative min-w-0 flex-1 cursor-ew-resize"
                onPointerDown={startRulerScrub}
                aria-hidden="true"
              >
                {minorMarkers.map((sec) => (
                  <span
                    key={`minor-${sec}`}
                    className="absolute bottom-0 h-1 w-px -translate-x-1/2 bg-border/30"
                    style={{ left: `${(sec / durationSeconds) * 100}%` }}
                  />
                ))}
                {markers.map((sec, index) => {
                  const percent = (sec / durationSeconds) * 100;
                  const anchor =
                    index === 0
                      ? ""
                      : index === markers.length - 1
                        ? "-translate-x-full"
                        : "-translate-x-1/2";
                  return (
                    <div
                      key={sec}
                      className="absolute inset-y-0"
                      style={{ left: `${percent}%` }}
                    >
                      <span
                        className={`absolute top-3 whitespace-nowrap font-mono text-[10px] tabular-nums text-muted-foreground ${anchor}`}
                      >
                        {formatMarker(sec)}
                      </span>
                      <span className="absolute bottom-0 h-2 w-px -translate-x-1/2 bg-border/70" />
                    </div>
                  );
                })}
                <div
                  className="pointer-events-none absolute inset-y-0 z-10 w-px bg-primary"
                  style={{ left: `${time * 100}%` }}
                />
                {/* Grabbable playhead head — drag it to move the frame */}
                <div
                  className="group absolute top-0 z-20 -translate-x-1/2 cursor-grab px-2 pb-1.5 pt-0.5 active:cursor-grabbing"
                  style={{ left: `${time * 100}%` }}
                  title={`Playhead · ${formatSeconds(currentSeconds)}`}
                >
                  <div className="size-0 origin-top border-x-[6px] border-t-[9px] border-x-transparent border-t-primary transition-transform group-hover:scale-125" />
                </div>
              </div>
            </div>

            <div className="flex">
              {/* Track names */}
              <div className="w-52 shrink-0 border-r border-border/50 bg-[#1e1e1e]">
                {Object.entries(groupedTracks).map(
                  ([target, elementTracks]) => {
                    const isExpanded = expandedElements.has(target);
                    const isTargetSelected = selectedElementId === target;
                    return (
                      <div key={target}>
                        <button
                          type="button"
                          onClick={() => toggleElement(target)}
                          className={`flex h-9 w-full items-center gap-1.5 border-b border-border/30 px-2.5 text-left transition-colors ${
                            isTargetSelected
                              ? "bg-primary/15 text-primary"
                              : "text-foreground hover:bg-[#252525]"
                          }`}
                          aria-expanded={isExpanded}
                        >
                          {isExpanded ? (
                            <IconChevronDown className="size-3.5 shrink-0" />
                          ) : (
                            <IconChevronRight className="size-3.5 shrink-0" />
                          )}
                          <span className="truncate text-xs font-medium">
                            #{target}
                          </span>
                          <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
                            {elementTracks.length}
                          </span>
                        </button>
                        {isExpanded &&
                          elementTracks.map((track) => {
                            const trackIndex = tracks.indexOf(track);
                            return (
                              <div
                                key={track.property}
                                className="group flex h-8 items-center gap-2 border-b border-border/20 pl-8 pr-1.5"
                              >
                                <span className="size-1.5 shrink-0 rounded-full bg-primary/60" />
                                <span className="truncate text-[11px] text-muted-foreground">
                                  {PROPERTY_DEFINITIONS[track.property].label}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => onAdd(trackIndex)}
                                  className="ml-auto grid size-5 shrink-0 place-items-center rounded text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
                                  title="Add keyframe at playhead"
                                  aria-label={`Add ${PROPERTY_DEFINITIONS[track.property].label} keyframe at playhead`}
                                >
                                  <IconPlus className="size-3" />
                                </button>
                              </div>
                            );
                          })}
                      </div>
                    );
                  },
                )}
              </div>

              {/* Track rows */}
              <div className="relative min-w-0 flex-1">
                <div
                  className="pointer-events-none absolute inset-y-0 z-20 w-px bg-primary"
                  style={{ left: `${time * 100}%` }}
                />
                {Object.entries(groupedTracks).map(
                  ([target, elementTracks]) => {
                    const isExpanded = expandedElements.has(target);
                    return (
                      <div key={target}>
                        <div
                          className="relative h-9 cursor-ew-resize border-b border-border/30 hover:bg-white/5"
                          onPointerDown={startScrub}
                        >
                          {!isExpanded &&
                            elementTracks.flatMap((track) => {
                              const trackIndex = tracks.indexOf(track);
                              return track.keyframes.map((keyframe, kfIndex) =>
                                keyframeMarker(trackIndex, kfIndex, keyframe),
                              );
                            })}
                        </div>
                        {isExpanded &&
                          elementTracks.map((track) => {
                            const trackIndex = tracks.indexOf(track);
                            return (
                              <div
                                key={track.property}
                                className="relative h-8 border-b border-border/20 hover:bg-white/5"
                                onPointerDown={startScrub}
                                onDoubleClick={(e) => {
                                  const rect =
                                    e.currentTarget.getBoundingClientRect();
                                  onAdd(
                                    trackIndex,
                                    (e.clientX - rect.left) / rect.width,
                                  );
                                }}
                              >
                                <div className="absolute inset-x-0 top-1/2 h-px bg-border/30" />
                                {track.keyframes.map((keyframe, kfIndex) =>
                                  keyframeMarker(
                                    trackIndex,
                                    kfIndex,
                                    keyframe,
                                  ),
                                )}
                              </div>
                            );
                          })}
                      </div>
                    );
                  },
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function formatSeconds(seconds: number): string {
  if (!Number.isFinite(seconds)) return "0.00s";
  return `${seconds.toFixed(2)}s`;
}

function formatMarker(seconds: number): string {
  if (!Number.isFinite(seconds)) return "0s";
  return Number.isInteger(seconds)
    ? `${seconds}s`
    : `${seconds.toFixed(2).replace(/0$/, "")}s`;
}

interface AspectRatioPreset {
  id: string;
  label: string;
  ratio: string;
  width: number;
  height: number;
  category: "Video & Display" | "Social" | "Standard";
  description: string;
}

function CanvasRatioShape({
  width,
  height,
  max = 16,
  active = false,
}: {
  width: number;
  height: number;
  max?: number;
  active?: boolean;
}) {
  const ratio = width > 0 && height > 0 ? width / height : 1;
  const shapeWidth = ratio >= 1 ? max : max * ratio;
  const shapeHeight = ratio >= 1 ? max / ratio : max;
  return (
    <span
      aria-hidden="true"
      className={`block shrink-0 rounded-[2px] border transition-colors ${
        active
          ? "border-[#2391FF] bg-[#2391FF]/15"
          : "border-muted-foreground/45 bg-muted-foreground/10"
      }`}
      style={{
        width: `${Math.max(3, Math.round(shapeWidth * 10) / 10)}px`,
        height: `${Math.max(3, Math.round(shapeHeight * 10) / 10)}px`,
      }}
    />
  );
}

function CanvasRatioIcon({
  width,
  height,
  active = false,
}: {
  width: number;
  height: number;
  active?: boolean;
}) {
  return (
    <span
      className={`grid size-7 shrink-0 place-items-center rounded-md border transition-colors ${
        active
          ? "border-[#2391FF]/40 bg-[#2391FF]/10"
          : "border-border/60 bg-muted/30"
      }`}
    >
      <CanvasRatioShape
        width={width}
        height={height}
        max={16}
        active={active}
      />
    </span>
  );
}

function AspectRatioControl({
  animation,
  onSave,
}: {
  animation: MotionAnimation;
  onSave: (next: MotionAnimation) => Promise<void>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [customWidth, setCustomWidth] = useState("");
  const [customHeight, setCustomHeight] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);

  const dimensions = useMemo(
    () => parseSvgDimensions(animation.svg),
    [animation.svg],
  );

  const handlePresetClick = async (preset: AspectRatioPreset) => {
    const nextSvg = resizeSvgCanvas(animation.svg, preset.width, preset.height, true);
    await onSave({ ...animation, svg: nextSvg });
    setIsOpen(false);
    toast.success(`Canvas resized to ${preset.label}`);
  };

  const handleCustomResize = async () => {
    const w = parseInt(customWidth, 10);
    const h = parseInt(customHeight, 10);
    if (isNaN(w) || isNaN(h) || w <= 0 || h <= 0) {
      toast.error("Please enter valid dimensions");
      return;
    }
    const nextSvg = resizeSvgCanvas(animation.svg, w, h, true);
    await onSave({ ...animation, svg: nextSvg });
    setIsOpen(false);
    setShowCustomInput(false);
    setCustomWidth("");
    setCustomHeight("");
    toast.success(`Canvas resized to ${w}×${h}`);
  };

  const groupedPresets = useMemo(() => {
    const groups: Record<string, AspectRatioPreset[]> = {};
    ASPECT_RATIO_PRESETS.forEach((preset) => {
      if (!groups[preset.category]) groups[preset.category] = [];
      groups[preset.category]!.push(preset);
    });
    return groups;
  }, []);

  const customPreviewWidth =
    Number.parseInt(customWidth, 10) || dimensions.width;
  const customPreviewHeight =
    Number.parseInt(customHeight, 10) || dimensions.height;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="grid size-6 place-items-center rounded-[5px] text-muted-foreground transition-colors hover:bg-accent/70 hover:text-foreground data-[state=open]:bg-accent/70 data-[state=open]:text-foreground"
          title={`Canvas ${dimensions.aspectRatio} · ${dimensions.width}×${dimensions.height} — change size`}
          aria-label={`Canvas size ${dimensions.aspectRatio}, ${dimensions.width} by ${dimensions.height}`}
        >
          <CanvasRatioShape
            width={dimensions.width}
            height={dimensions.height}
            max={15}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-2.5">
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">
              Canvas Size
            </h3>
            <button
              type="button"
              onClick={() => {
                setShowCustomInput(!showCustomInput);
                if (!showCustomInput) {
                  setCustomWidth(String(dimensions.width));
                  setCustomHeight(String(dimensions.height));
                }
              }}
              className="text-xs text-primary hover:underline"
            >
              {showCustomInput ? "Show Presets" : "Custom Size"}
            </button>
          </div>

          {showCustomInput ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/20 px-2 py-1">
                <CanvasRatioIcon
                  width={customPreviewWidth}
                  height={customPreviewHeight}
                />
                <div className="min-w-0">
                  <div className="text-xs font-medium text-foreground tabular-nums">
                    {customPreviewWidth} × {customPreviewHeight}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    Custom canvas
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="Width"
                  value={customWidth}
                  onChange={(e) => setCustomWidth(e.target.value)}
                  className="h-8 text-sm"
                />
                <span className="text-muted-foreground">×</span>
                <Input
                  type="number"
                  placeholder="Height"
                  value={customHeight}
                  onChange={(e) => setCustomHeight(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <Button
                size="sm"
                onClick={handleCustomResize}
                className="w-full h-8 text-xs"
              >
                Apply Custom Size
              </Button>
            </div>
          ) : (
            <div className="max-h-[420px] space-y-2 overflow-y-auto pr-0.5">
              {Object.entries(groupedPresets).map(([category, presets]) => (
                <div key={category} className="space-y-1">
                  <h4 className="px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {category}
                  </h4>
                  <div className="space-y-0.5">
                    {presets.map((preset) => {
                      const active =
                        Math.abs(
                          preset.width / preset.height -
                            dimensions.width / dimensions.height,
                        ) < 0.01;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => handlePresetClick(preset)}
                          className={`group flex w-full items-center gap-2 rounded-md px-2 py-1 text-left transition-colors ${
                            active
                              ? "bg-[#2391FF]/5"
                              : "hover:bg-muted/60"
                          }`}
                        >
                          <CanvasRatioIcon
                            width={preset.width}
                            height={preset.height}
                            active={active}
                          />
                          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                            <span
                              className={`text-xs font-medium ${
                                active
                                  ? "text-[#2391FF]"
                                  : "text-foreground group-hover:text-primary"
                              }`}
                            >
                              {preset.label}
                            </span>
                            <span className="truncate text-[10px] text-muted-foreground">
                              {preset.description}
                            </span>
                          </div>
                          <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground tabular-nums">
                            {active ? (
                              <IconCheck className="size-3 text-[#2391FF]" />
                            ) : null}
                            {preset.width}×{preset.height}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

const ASPECT_RATIO_PRESETS: AspectRatioPreset[] = [
  // Video & Display
  {
    id: "16-9",
    label: "16:9 Landscape",
    ratio: "16:9",
    width: 960,
    height: 540,
    category: "Video & Display",
    description: "HD video / YouTube / Screen",
  },
  {
    id: "9-16",
    label: "9:16 Vertical",
    ratio: "9:16",
    width: 540,
    height: 960,
    category: "Video & Display",
    description: "TikTok / Reels / Shorts / Story",
  },
  {
    id: "21-9",
    label: "21:9 Ultrawide",
    ratio: "21:9",
    width: 1050,
    height: 450,
    category: "Video & Display",
    description: "Cinematic ultrawide banner",
  },

  // Social
  {
    id: "1-1",
    label: "1:1 Square",
    ratio: "1:1",
    width: 600,
    height: 600,
    category: "Social",
    description: "Instagram post / Avatar / Icon",
  },
  {
    id: "4-5",
    label: "4:5 Portrait",
    ratio: "4:5",
    width: 640,
    height: 800,
    category: "Social",
    description: "Instagram feed vertical",
  },
  {
    id: "2-1",
    label: "2:1 Banner",
    ratio: "2:1",
    width: 1000,
    height: 500,
    category: "Social",
    description: "Twitter/X header & banner",
  },

  // Standard
  {
    id: "4-3",
    label: "4:3 Classic",
    ratio: "4:3",
    width: 800,
    height: 600,
    category: "Standard",
    description: "Tablet / Classic presentation",
  },
  {
    id: "3-4",
    label: "3:4 Tablet Portrait",
    ratio: "3:4",
    width: 600,
    height: 800,
    category: "Standard",
    description: "iPad & tablet portrait",
  },
  {
    id: "3-2",
    label: "3:2 Photo",
    ratio: "3:2",
    width: 900,
    height: 600,
    category: "Standard",
    description: "Standard 35mm photo",
  },
];

interface SvgDimensions {
  minX: number;
  minY: number;
  width: number;
  height: number;
  aspectRatio: string;
}

function parseSvgDimensions(svg: string): SvgDimensions {
  let minX = 0;
  let minY = 0;
  let width = 600;
  let height = 600;

  try {
    const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
    const svgEl = doc.documentElement;
    if (svgEl) {
      const vb = svgEl.getAttribute("viewBox");
      if (vb) {
        const parts = vb.trim().split(/[\s,]+/).map(Number);
        if (parts.length === 4 && parts.every((p) => !isNaN(p))) {
          minX = parts[0] ?? 0;
          minY = parts[1] ?? 0;
          width = parts[2] ?? 600;
          height = parts[3] ?? 600;
        }
      } else {
        const wAttr = parseFloat(svgEl.getAttribute("width") || "");
        const hAttr = parseFloat(svgEl.getAttribute("height") || "");
        if (!isNaN(wAttr) && wAttr > 0) width = wAttr;
        if (!isNaN(hAttr) && hAttr > 0) height = hAttr;
      }
    }
  } catch {
    const vbMatch = svg.match(
      /viewBox=["']\s*([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s*["']/i,
    );
    if (vbMatch) {
      minX = parseFloat(vbMatch[1] ?? "0") || 0;
      minY = parseFloat(vbMatch[2] ?? "0") || 0;
      width = parseFloat(vbMatch[3] ?? "600") || 600;
      height = parseFloat(vbMatch[4] ?? "600") || 600;
    }
  }

  const ratio = width / (height || 1);
  const diff = (a: number, b: number) => Math.abs(a - b);
  let aspectRatio = "Custom";
  if (diff(ratio, 1) < 0.02) aspectRatio = "1:1";
  else if (diff(ratio, 16 / 9) < 0.03) aspectRatio = "16:9";
  else if (diff(ratio, 9 / 16) < 0.03) aspectRatio = "9:16";
  else if (diff(ratio, 4 / 3) < 0.03) aspectRatio = "4:3";
  else if (diff(ratio, 3 / 4) < 0.03) aspectRatio = "3:4";
  else if (diff(ratio, 4 / 5) < 0.03) aspectRatio = "4:5";
  else if (diff(ratio, 21 / 9) < 0.04) aspectRatio = "21:9";
  else if (diff(ratio, 2 / 1) < 0.03) aspectRatio = "2:1";
  else if (diff(ratio, 3 / 2) < 0.03) aspectRatio = "3:2";

  return { minX, minY, width, height, aspectRatio };
}

function resizeSvgCanvas(
  svg: string,
  newWidth: number,
  newHeight: number,
  centerContent: boolean = true,
): string {
  try {
    const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
    const svgEl = doc.documentElement;
    if (!svgEl) return svg;

    let oldMinX = 0;
    let oldMinY = 0;
    let oldWidth = newWidth;
    let oldHeight = newHeight;

    const vb = svgEl.getAttribute("viewBox");
    if (vb) {
      const parts = vb.trim().split(/[\s,]+/).map(Number);
      if (parts.length === 4 && parts.every((p) => !isNaN(p))) {
        oldMinX = parts[0] ?? 0;
        oldMinY = parts[1] ?? 0;
        oldWidth = parts[2] ?? newWidth;
        oldHeight = parts[3] ?? newHeight;
      }
    } else {
      const wAttr = parseFloat(svgEl.getAttribute("width") || "");
      const hAttr = parseFloat(svgEl.getAttribute("height") || "");
      if (!isNaN(wAttr) && wAttr > 0) oldWidth = wAttr;
      if (!isNaN(hAttr) && hAttr > 0) oldHeight = hAttr;
    }

    let nextMinX = oldMinX;
    let nextMinY = oldMinY;

    if (centerContent) {
      nextMinX = Math.round(oldMinX - (newWidth - oldWidth) / 2);
      nextMinY = Math.round(oldMinY - (newHeight - oldHeight) / 2);
    }

    svgEl.setAttribute("viewBox", `${nextMinX} ${nextMinY} ${newWidth} ${newHeight}`);
    svgEl.setAttribute("width", String(newWidth));
    svgEl.setAttribute("height", String(newHeight));

    return new XMLSerializer().serializeToString(svgEl);
  } catch (err) {
    console.error("Failed to resize SVG canvas:", err);
    return svg;
  }
}
