import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import { Link, useSearchParams } from "react-router";
import { createPortal } from "react-dom";
import * as ContextMenuPrimitive from "@radix-ui/react-context-menu";
import { callAction, useSession } from "@agent-native/core/client/hooks";
import { AgentToggleButton } from "@agent-native/toolkit/app/chat";
import { AgentNativeIcon } from "@agent-native/toolkit/app/shared/AgentNativeIcon";
import {
  IconAdjustmentsHorizontalFilled,
  IconArrowBackUp,
  IconArrowForwardUp,
  IconArrowUp,
  IconArrowDown,
  IconArrowBarToUp,
  IconArrowBarToDown,
  IconBrush,
  IconCheck,
  IconCheckFilled,
  IconChevronDown,
  IconChevronDownFilled,
  IconChevronRight,
  IconChevronRightFilled,
  IconCircleFilled,
  IconDiamond,
  IconDiamondFilled,
  IconDownloadFilled,
  IconEditFilled,
  IconEyeFilled,
  IconEyeOff,
  IconFocusCentered,
  IconFolderFilled,
  IconFolderOpenFilled,
  IconFrame,
  IconHandStop,
  IconHandGrab,
  IconHelpCircle,
  IconLetterT,
  IconLinkFilled,
  IconLockFilled,
  IconLockOpen,
  IconLine,
  IconMagnet,
  IconMagnetFilled,
  IconMaximize,
  IconOvalFilled,
  IconPencilFilled,
  IconPhotoFilled,
  IconPlayerPauseFilled,
  IconPlayerPlayFilled,
  IconPlayerSkipBackFilled,
  IconPlus,
  IconPlusFilled,
  IconPointerFilled,
  IconRectangleFilled,
  IconRepeat,
  IconScaleFilled,
  IconSearchFilled,
  IconShape,
  IconSparklesFilled,
  IconSquareFilled,
  IconStarFilled,
  IconTransformFilled,
  IconTriangleFilled,
  IconTriangleSquareCircle,
  IconTrashFilled,
  IconVector,
  IconVectorBezier,
  IconX,
  IconZoomIn,
  IconZoomOut,
} from "@tabler/icons-react";
import { HexAlphaColorPicker } from "react-colorful";
import { toast } from "sonner";
import { MousePointer2, Hand, PenTool, Edit, Scale } from "lucide-react";
import { Frame, Palette, Grid2x2 } from "lucide-react";
import { Anchor } from "lucide-react";
import { SvgExportDialog } from "../components/SvgExportDialog";
import {
  AssetLibraryPopover,
  type AssetInsert,
} from "../components/AssetLibraryPopover";
// polygon-clipping is loaded dynamically inside handleBooleanOp, not as a
// static import: a missing node_modules entry must not crash the whole
// studio route at load time (it did — 'Cannot find module' on dev start
// when the package had not been installed yet). If the dynamic import
// fails, the handler tells the user to run pnpm install and restart dev.
import {
  askAgentAboutColor,
  askAgentAboutElement,
  askAgentAboutElements,
} from "../lib/agent-element-context";
import { ColorPicker } from "@/components/ui/color-picker";
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
  hoverEffectsCss,
  PROPERTY_DEFINITIONS,
  PROPERTY_GROUPS,
  sampleTrack,
  type HoverEffect,
  type Keyframe,
  type MotionAnimation,
  type Property,
  type Track,
} from "../../lib/motion";
import { runExport, type ExportFormat, type ExportRenderOptions } from "../../lib/export";
import { exportRaster, type RasterExportKind, type RasterExportOptions } from "../../lib/raster-export";
import { sanitizeSvg } from "../../lib/sanitize";
import {
  importLocalProject,
  isServerScratchpadEnabled,
  saveLocalProject,
  syncProjectToServerDebounced,
  useLocalProject,
  useLocalProjects,
} from "../lib/local-projects";
import { clearLastChatThread, readLastChatThread } from "../lib/chat-home-thread";
import {
  getProjectChatThread,
  isProjectChatThreadAlive,
  openProjectChatThread,
  readActiveSidebarThread,
  removeProjectChatThread,
  setProjectChatThread,
} from "../lib/project-chats";
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
  { value: "hold", label: "Hold (step)" },
];

/** Parse a cubic-bezier easing string, or null for named/linear/hold. */
function parseCubicBezier(ease?: string): [number, number, number, number] | null {
  if (!ease) return null;
  const m = ease.match(/cubic-bezier\(([^)]+)\)/);
  if (!m?.[1]) return null;
  const parts = m[1].split(",").map((n) => parseFloat(n.trim()));
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return null;
  return parts as [number, number, number, number];
}

/** Motion-preserving cubic equivalent of a named easing, for conversion to
    a hand-editable bezier. Linear maps to (0,0,1,1); its handles sit on the
    keyframes until the numeric fields move them away. */
function cubicBezierForEase(ease?: string): [number, number, number, number] {
  const parsed = parseCubicBezier(ease);
  if (parsed) return parsed;
  if (ease === "ease-in") return [0.42, 0, 1, 1];
  if (ease === "ease-out") return [0, 0, 0.58, 1];
  if (ease === "ease-in-out") return [0.42, 0, 0.58, 1];
  return [0, 0, 1, 1];
}

function formatCubicBezier(c: [number, number, number, number]): string {
  return `cubic-bezier(${c.map((n) => Math.round(n * 100) / 100).join(",")})`;
}

const FPS_OPTIONS = [24, 25, 30, 60] as const;
const DEFAULT_FPS = 30;
const FPS_STORAGE_KEY = "motion-studio-fps";
const TIMELINE_SNAP_STORAGE_KEY = "motion-studio-timeline-snap";
/** Smallest timeline window, as a fraction of the whole clip (0.5%). */
const MIN_TIMELINE_SPAN = 0.005;

/** Timeline readout: total seconds plus milliseconds (e.g. 80.123s). */
function formatSecondsMs(seconds: number): string {
  if (!Number.isFinite(seconds)) return "0.000s";
  return `${Math.max(0, seconds).toFixed(3)}s`;
}

/** One frame expressed in the timeline's normalized 0..1 time. */
function frameStepNormalized(durationMs: number, fps: number): number {
  const frames = Math.max(1, Math.round((durationMs / 1000) * fps));
  return 1 / frames;
}

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

const SVG_NS = "http://www.w3.org/2000/svg";
const SHAPE_FILL = "#2391FF";
const SHAPE_STROKE = "#2391FF";

/** Elements the studio can create without the agent. */
type AddableElement =
  | "rect"
  | "roundRect"
  | "circle"
  | "ellipse"
  | "triangle"
  | "star"
  | "line"
  | "text"
  | "g";

/** Star/polygon points for an n-pointed star centred on (cx, cy). */
function starPoints(
  cx: number,
  cy: number,
  outer: number,
  inner: number,
  points = 5,
): string {
  const coords: string[] = [];
  for (let i = 0; i < points * 2; i += 1) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = (Math.PI / points) * i - Math.PI / 2;
    coords.push(
      `${(cx + radius * Math.cos(angle)).toFixed(2)},${(
        cy +
        radius * Math.sin(angle)
      ).toFixed(2)}`,
    );
  }
  return coords.join(" ");
}

interface Selection {
  track: number;
  keyframe: number;
}

interface StudioSnapshot {
  tracks: Track[];
  duration: number;
  loop: boolean;
  /** The artwork itself — without this, undo could only rewind keyframes, never a delete, node edit, or group change. */
  svg: string;
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
  // Sidebar width is user-resizable (drag its right edge): the old fixed
  // w-64 (256px) was the other half of the hidden-names problem — no
  // matter how the tree was laid out, the user could not give it more
  // room. Persisted so it survives reloads; double-click the edge to
  // reset to 256px.
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    if (typeof window === "undefined") return 256;
    const saved = Number(window.localStorage.getItem("motion-studio-sidebar-width"));
    return Number.isFinite(saved) && saved >= 200 && saved <= 480 ? saved : 256;
  });
  const undoRef = useRef<() => void>(() => {});
  const redoRef = useRef<() => void>(() => {});
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const { prompt, dialog: promptDialog } = usePromptDialog();
  const [params, setParams] = useSearchParams();
  const { projects: animations, isLoading: listLoading } = useLocalProjects();

  const selectedId = params.get("id") ?? animations[0]?.id ?? null;
  const localProject = useLocalProject(selectedId);
  const animation = localProject;

  // callAction("get-animation") hits /_agent-native/*, which 401s without a
  // session — only import from the server scratchpad while signed in.
  const { status: sessionStatus } = useSession();

  // The agent writes new projects to the server scratchpad. When it navigates
  // to an id we do not have in the browser yet, pull it in once.
  const [importingFromServer, setImportingFromServer] = useState(false);
  useEffect(() => {
    if (
      sessionStatus !== "authenticated" ||
      !isServerScratchpadEnabled() ||
      !selectedId ||
      localProject ||
      listLoading
    ) {
      setImportingFromServer(false);
      return;
    }
    let cancelled = false;
    setImportingFromServer(true);
    void (async () => {
      try {
        const data: any = await callAction("get-animation", { id: selectedId });
        const serverAnimation = data?.animation as MotionAnimation | null;
        if (!cancelled && serverAnimation?.id) {
          importLocalProject(serverAnimation);
        }
      } catch {
        // Nothing to import; the empty state below handles it.
      } finally {
        if (!cancelled) setImportingFromServer(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId, localProject, listLoading, sessionStatus]);

  // Mirror the open project to the server when it opens, so the agent can
  // load it. The mirror otherwise only runs on save, so a project that was
  // never saved since the server mirror was switched on had no server row
  // at all — the agent's get-animation came back empty and it asked which
  // animation to update. Authenticated only: the mirror call 401s without
  // a session, and signed-out visitors cannot use the agent anyway.
  useEffect(() => {
    if (sessionStatus !== "authenticated" || !selectedId) return;
    void syncProjectToServerDebounced(selectedId, 0);
  }, [selectedId, sessionStatus]);

  // The agent edits the server copy of the open project, but the studio
  // only reads localStorage — the import above bails once the project is
  // local, so an agent edit (e.g. "make the ball green") never reached the
  // canvas until a reload. Re-read the server copy while the studio is
  // open: importLocalProject only applies it when the server copy is newer
  // than the local one, so local edits are never overwritten.
  //
  // Guard: a refresh must never land while the user is editing. The
  // stored copy is older than the server copy after every sync, so a
  // refresh mid-drag would replace the canvas with the pre-edit server
  // version and the manual change would look unsaved. Skip the refresh
  // until 3s after the last interaction, so the 600ms autosave lands first.
  const refreshingFromServerRef = useRef(false);
  const lastInteractionRef = useRef(0);
  useEffect(() => {
    const markInteraction = () => {
      lastInteractionRef.current = Date.now();
    };
    window.addEventListener("pointerdown", markInteraction);
    window.addEventListener("keydown", markInteraction);
    window.addEventListener("input", markInteraction);
    return () => {
      window.removeEventListener("pointerdown", markInteraction);
      window.removeEventListener("keydown", markInteraction);
      window.removeEventListener("input", markInteraction);
    };
  }, []);
  useEffect(() => {
    if (
      sessionStatus !== "authenticated" ||
      !isServerScratchpadEnabled() ||
      !selectedId ||
      !localProject
    ) {
      return;
    }
    let cancelled = false;
    const refresh = async () => {
      if (cancelled || refreshingFromServerRef.current) return;
      if (Date.now() - lastInteractionRef.current < 3000) return;
      refreshingFromServerRef.current = true;
      try {
        const data: any = await callAction("get-animation", { id: selectedId });
        const serverAnimation = data?.animation as MotionAnimation | null;
        if (!cancelled && serverAnimation?.id) {
          importLocalProject(serverAnimation);
        }
      } catch {
        // A failed refresh leaves the local copy on screen; the next tick retries.
      } finally {
        refreshingFromServerRef.current = false;
      }
    };
    void refresh();
    const timer = window.setInterval(refresh, 5000);
    window.addEventListener("agent-chat:threads-updated", refresh);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener("agent-chat:threads-updated", refresh);
    };
  }, [selectedId, localProject, sessionStatus]);

  // Per-project agent chats: each project remembers the thread that built
  // it, so reopening a project reopens its conversation. The sidebar only
  // holds one active thread, so we switch its pointer when the project
  // changes and record whichever thread is active under this project.
  // The switch is guarded for 3s so the recorder below does not save the
  // stale thread we are switching away from under the new project.
  const projectChatSwitchUntilRef = useRef(0);
  const prevSelectedIdRef = useRef<string | null>(null);
  useEffect(() => {
    const prevId = prevSelectedIdRef.current;
    prevSelectedIdRef.current = selectedId;
    if (!selectedId) return;
    // Handoff: the home composer just built this project in its thread.
    // If this project has no chat yet, point the sidebar at the handoff
    // thread and record it — do not wait for the sidebar pointer to catch
    // up (it usually still shows the previous project when the studio
    // mounts). Every other way into the studio (templates, uploads, New
    // project, project cards) clears the handoff first, so a handoff here
    // can only mean the home composer just built this project — or the
    // same agent run just built another one in the same thread.
    const handoffThreadId = readLastChatThread();
    if (handoffThreadId && !getProjectChatThread(selectedId)) {
      setProjectChatThread(selectedId, handoffThreadId);
      projectChatSwitchUntilRef.current = Date.now() + 3000;
      openProjectChatThread(handoffThreadId);
      // The sidebar panel is lazy-loaded; replay once in case it was not
      // listening yet. Duplicate opens of the same thread are ignored.
      const handoffRetryTimer = window.setTimeout(
        () => openProjectChatThread(handoffThreadId),
        500,
      );
      return () => window.clearTimeout(handoffRetryTimer);
    }
    // Save the thread we are leaving under the project we are leaving.
    if (prevId && prevId !== selectedId) {
      const leavingThreadId = readActiveSidebarThread();
      if (leavingThreadId) setProjectChatThread(prevId, leavingThreadId);
    }
    // Restore this project's thread, if it has one and it is not open.
    // A mapped thread can be dead on the server (never persisted, deleted,
    // or lost in a dev-storage reset) — opening it just 404s and shows an
    // empty chat, so check first and forget dead mappings instead.
    const mapped = getProjectChatThread(selectedId);
    if (mapped && mapped !== readActiveSidebarThread()) {
      projectChatSwitchUntilRef.current = Date.now() + 3000;
      let cancelled = false;
      let retryTimer: number | undefined;
      void (async () => {
        if (!(await isProjectChatThreadAlive(mapped))) {
          if (!cancelled) removeProjectChatThread(selectedId);
          return;
        }
        if (cancelled) return;
        // Refresh the guard now that the switch is actually happening —
        // the liveness check above can take longer than the 3s guard.
        projectChatSwitchUntilRef.current = Date.now() + 3000;
        openProjectChatThread(mapped);
        // The sidebar panel is lazy-loaded; replay once in case it was not
        // listening yet. Duplicate opens of the same thread are ignored.
        retryTimer = window.setTimeout(
          () => openProjectChatThread(mapped),
          500,
        );
      })();
      return () => {
        cancelled = true;
        if (retryTimer) window.clearTimeout(retryTimer);
      };
    }
  }, [selectedId]);

  // Record the active thread under the open project: a new chat started in
  // the sidebar, a thread the agent just opened, or the handoff thread all
  // become this project's chat within a couple of seconds.
  useEffect(() => {
    if (!selectedId) return;
    const record = () => {
      const active = readActiveSidebarThread();
      // A handoff is a one-time message: once the sidebar is showing it
      // and this project is mapped to it, forget it. Left alone it lives
      // 10 minutes and would claim every project opened after it.
      const handoff = readLastChatThread();
      if (
        handoff &&
        active === handoff &&
        getProjectChatThread(selectedId) === handoff
      ) {
        clearLastChatThread();
      }
      if (Date.now() < projectChatSwitchUntilRef.current) return;
      if (!active) return;
      if (getProjectChatThread(selectedId) === active) return;
      setProjectChatThread(selectedId, active);
    };
    record();
    const timer = window.setInterval(record, 2000);
    window.addEventListener("agent-chat:threads-updated", record);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("agent-chat:threads-updated", record);
    };
  }, [selectedId]);

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

    // Ensure every element has a stable id so it can be selected and edited
    // in the Properties panel (unnamed elements like background rects otherwise
    // can't be targeted).
    const doc = new DOMParser().parseFromString(animation.svg, "image/svg+xml");
    let changed = false;
    const walk = (node: Element) => {
      if (node.nodeName.toLowerCase() === "svg") {
        // skip root
      } else if (node.nodeType === 1) {
        if (!node.getAttribute("id")) {
          node.setAttribute(
            "id",
            `${node.nodeName.toLowerCase()}-${Math.random().toString(36).substring(2, 6)}`,
          );
          changed = true;
        }
      }
      Array.from(node.children).forEach(walk);
    };
    walk(doc.documentElement);
    if (changed) {
      const nextSvg = new XMLSerializer().serializeToString(doc.documentElement);
      void saveAnimation({ ...animation, svg: nextSvg });
    }
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
  // A single dispatch can be missed if the sidebar's listener is not
  // attached yet when the studio first mounts (slow chunk load), leaving
  // the studio with no side agent and no visible way back to it — so
  // dispatch on mount and retry twice. Opening an already-open panel is
  // a no-op, so the retries are harmless.
  useEffect(() => {
    const openAgentPanel = () =>
      window.dispatchEvent(new CustomEvent("agent-panel:open"));
    openAgentPanel();
    const retry400 = window.setTimeout(openAgentPanel, 400);
    const retry1500 = window.setTimeout(openAgentPanel, 1500);
    return () => {
      window.clearTimeout(retry400);
      window.clearTimeout(retry1500);
    };
  }, []);

  const createSample = async () => {
    try {
      const res = saveLocalProject({
        title: "Bouncing ball",
        svg: SAMPLE_SVG,
        tracks: SAMPLE_TRACKS,
        duration: 1600,
        loop: true,
      });
      if (res.id) {
        void syncProjectToServerDebounced(res.id, 0);
        select(res.id);
      }
    } catch (err) {
      console.error("Failed to create the sample project", err);
      toast.error("Couldn't create the sample project. Try again.");
    }
  };

  const saveAnimation = async (next: MotionAnimation): Promise<boolean> => {
    try {
      const saved = saveLocalProject({
        id: next.id,
        title: next.title,
        svg: next.svg,
        tracks: next.tracks,
        hover: next.hover,
        duration: next.duration,
        loop: next.loop,
      });
      syncProjectToServerDebounced(saved.id);
      return true;
    } catch (err) {
      console.error("Failed to save animation", err);
      toast.error("Couldn't save your changes. Try again.");
      return false;
    }
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

  const handleImportSvg = async (svgText: string) => {
    if (!animation) return;
    const nextSvg = mergeSvgIntoArtboard(animation.svg, svgText);
    if (!nextSvg) {
      toast.error("Could not import that SVG — check it is a valid <svg> file.");
      return;
    }
    await saveAnimation({ ...animation, svg: nextSvg });
    toast.success("SVG imported");
  };

  const handleAddElement = async (type: AddableElement) => {
    if (!animation) return;
    const doc = new DOMParser().parseFromString(animation.svg, "image/svg+xml");
    const svgEl = doc.documentElement;
    const vb = svgEl.getAttribute("viewBox")?.split(/\s+/).map(Number) || [0, 0, 200, 200];
    const vbX = vb[0] ?? 0;
    const vbY = vb[1] ?? 0;
    const vbWidth = vb[2] || 200;
    const vbHeight = vb[3] || 200;
    const cx = vbX + vbWidth / 2;
    const cy = vbY + vbHeight / 2;
    // Scale the new shape with the artboard so it looks right on any canvas.
    const size = Math.max(24, Math.round(Math.min(vbWidth, vbHeight) * 0.34));
    const half = size / 2;
    const round = (value: number) => Math.round(value * 100) / 100;

    const id = `${type === "roundRect" ? "rect" : type}-${Math.random()
      .toString(36)
      .substring(2, 6)}`;
    const create = (tag: string) => doc.createElementNS(SVG_NS, tag);

    let newEl: Element;
    switch (type) {
      case "rect":
      case "roundRect": {
        newEl = create("rect");
        newEl.setAttribute("x", String(round(cx - half)));
        newEl.setAttribute("y", String(round(cy - half)));
        newEl.setAttribute("width", String(size));
        newEl.setAttribute("height", String(size));
        if (type === "roundRect") {
          newEl.setAttribute("rx", String(Math.round(size * 0.18)));
        }
        newEl.setAttribute("fill", SHAPE_FILL);
        break;
      }
      case "ellipse": {
        newEl = create("ellipse");
        newEl.setAttribute("cx", String(round(cx)));
        newEl.setAttribute("cy", String(round(cy)));
        newEl.setAttribute("rx", String(round(half)));
        newEl.setAttribute("ry", String(round(half * 0.72)));
        newEl.setAttribute("fill", SHAPE_FILL);
        break;
      }
      case "triangle": {
        newEl = create("polygon");
        newEl.setAttribute(
          "points",
          `${round(cx)},${round(cy - half)} ${round(cx + half)},${round(
            cy + half,
          )} ${round(cx - half)},${round(cy + half)}`,
        );
        newEl.setAttribute("fill", SHAPE_FILL);
        break;
      }
      case "star": {
        newEl = create("polygon");
        newEl.setAttribute(
          "points",
          starPoints(cx, cy, half, half * 0.42),
        );
        newEl.setAttribute("fill", SHAPE_FILL);
        break;
      }
      case "line": {
        newEl = create("line");
        newEl.setAttribute("x1", String(round(cx - half)));
        newEl.setAttribute("y1", String(round(cy - half)));
        newEl.setAttribute("x2", String(round(cx + half)));
        newEl.setAttribute("y2", String(round(cy + half)));
        newEl.setAttribute("stroke", SHAPE_STROKE);
        newEl.setAttribute("stroke-width", String(Math.max(2, Math.round(size / 16))));
        newEl.setAttribute("stroke-linecap", "round");
        newEl.setAttribute("fill", "none");
        break;
      }
      case "text": {
        newEl = create("text");
        newEl.setAttribute("x", String(round(cx)));
        newEl.setAttribute("y", String(round(cy)));
        newEl.setAttribute("text-anchor", "middle");
        newEl.setAttribute("dominant-baseline", "middle");
        newEl.setAttribute("fill", "#171717");
        newEl.setAttribute(
          "font-size",
          String(Math.max(12, Math.round(Math.min(vbWidth, vbHeight) * 0.1))),
        );
        newEl.setAttribute(
          "font-family",
          '"Inter", "Inter Variable", ui-sans-serif, system-ui, sans-serif',
        );
        newEl.setAttribute("font-weight", "600");
        newEl.textContent = "Text";
        break;
      }
      default: {
        newEl = create("g");
        break;
      }
    }

    newEl.setAttribute("id", id);

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

  /**
   * Insert a built-in or My Assets library asset. The asset markup is
   * drawn on its own viewBox grid (built-ins are 100 x 100); it is wrapped
   * in a <g> scaled to the same centre size as a new shape, so it lands
   * at a sensible size on any artboard and is selected, ready to drag or
   * animate. Ids inside the asset are remapped on collision, the same way
   * the SVG import remaps them, so a gradient or mask id cannot clash
   * with one already on the canvas.
   */
  const handleAddAsset = async (asset: AssetInsert) => {
    if (!animation) return;
    const doc = new DOMParser().parseFromString(animation.svg, "image/svg+xml");
    const svgEl = doc.documentElement;
    const vb = svgEl.getAttribute("viewBox")?.split(/\s+/).map(Number) || [0, 0, 200, 200];
    const vbX = vb[0] ?? 0;
    const vbY = vb[1] ?? 0;
    const vbWidth = vb[2] || 200;
    const vbHeight = vb[3] || 200;
    const cx = vbX + vbWidth / 2;
    const cy = vbY + vbHeight / 2;
    const size = Math.max(24, Math.round(Math.min(vbWidth, vbHeight) * 0.34));
    const assetW = asset.vbW > 0 ? asset.vbW : 100;
    const assetH = asset.vbH > 0 ? asset.vbH : 100;
    const scale = size / Math.max(assetW, assetH);
    const round = (value: number) => Math.round(value * 100) / 100;
    const id = `${asset.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "asset"}-${Math.random()
      .toString(36)
      .substring(2, 6)}`;
    const group = doc.createElementNS(SVG_NS, "g");
    group.setAttribute("id", id);
    group.setAttribute(
      "transform",
      `translate(${round(cx - (assetW * scale) / 2)} ${round(cy - (assetH * scale) / 2)}) scale(${round(scale)})`,
    );
    const assetDoc = new DOMParser().parseFromString(
      `<svg xmlns="${SVG_NS}" viewBox="0 0 ${assetW} ${assetH}">${asset.svg}</svg>`,
      "image/svg+xml",
    );
    const assetRoot = assetDoc.documentElement;
    if (!assetRoot || assetRoot.nodeName.toLowerCase() !== "svg") return;
    const existingIds = new Set<string>();
    doc.querySelectorAll("[id]").forEach((el) => {
      const existing = el.getAttribute("id");
      if (existing) existingIds.add(existing);
    });
    const idMap = new Map<string, string>();
    assetRoot.querySelectorAll("[id]").forEach((el) => {
      const oldId = el.getAttribute("id");
      if (!oldId) return;
      if (existingIds.has(oldId) || idMap.has(oldId)) {
        let next = `${oldId}-asset`;
        let n = 2;
        while (existingIds.has(next) || Array.from(idMap.values()).includes(next)) {
          next = `${oldId}-asset-${n++}`;
        }
        idMap.set(oldId, next);
        el.setAttribute("id", next);
      } else {
        existingIds.add(oldId);
      }
    });
    if (idMap.size > 0) {
      assetRoot.querySelectorAll("*").forEach((el) => {
        Array.from(el.attributes).forEach((attr) => {
          let v = attr.value;
          idMap.forEach((next, oldId) => {
            v = v.split(`url(#${oldId})`).join(`url(#${next})`);
            if (attr.name === "href" || attr.name === "xlink:href") {
              v = v.split(`#${oldId}`).join(`#${next}`);
            }
          });
          if (v !== attr.value) el.setAttribute(attr.name, v);
        });
      });
    }
    Array.from(assetRoot.children).forEach((child) => {
      group.appendChild(doc.importNode(child, true));
    });
    const selected = selectedElementId
      ? doc.getElementById(selectedElementId)
      : null;
    const host =
      selected && selected.nodeName.toLowerCase() === "g" ? selected : svgEl;
    host.appendChild(group);
    const nextSvg = new XMLSerializer().serializeToString(svgEl);
    await saveAnimation({ ...animation, svg: nextSvg });
    setSelectedElementId(id);
  };

  /**
   * Commit a freehand path drawn with the pen tool. Points are artboard units;
   * the pen closes the path when the user clicks the first point again.
   */
  const handleAddPath = async (
    points: Array<{ x: number; y: number; outX?: number; outY?: number; inX?: number; inY?: number }>,
    closed: boolean,
  ) => {
    if (!animation || points.length < 2) return;
    const doc = new DOMParser().parseFromString(animation.svg, "image/svg+xml");
    const svgEl = doc.documentElement;
    const round = (value: number) => Math.round(value * 100) / 100;
    // Bezier segments where the pen was click-dragged, straight lines otherwise.
    let d = `M ${round(points[0]!.x)} ${round(points[0]!.y)}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1]!;
      const cur = points[i]!;
      if (prev.outX !== undefined || cur.inX !== undefined) {
        d += ` C ${round(prev.outX ?? prev.x)} ${round(prev.outY ?? prev.y)} ${round(cur.inX ?? cur.x)} ${round(cur.inY ?? cur.y)} ${round(cur.x)} ${round(cur.y)}`;
      } else {
        d += ` L ${round(cur.x)} ${round(cur.y)}`;
      }
    }
    if (closed) d += " Z";

    const id = `path-${Math.random().toString(36).substring(2, 6)}`;
    const pathEl = doc.createElementNS(SVG_NS, "path");
    pathEl.setAttribute("id", id);
    pathEl.setAttribute("d", d);
    if (closed) {
      pathEl.setAttribute("fill", SHAPE_FILL);
    } else {
      pathEl.setAttribute("fill", "none");
      pathEl.setAttribute("stroke", SHAPE_STROKE);
      // Pen lines were 3, then 2, then 1 units; 0.5 is thinner and matches
      // the preview. Still artwork units, so it scales with zoom.
      pathEl.setAttribute("stroke-width", "0.5");
      pathEl.setAttribute("stroke-linecap", "round");
      pathEl.setAttribute("stroke-linejoin", "round");
    }

    const selected = selectedElementId
      ? doc.getElementById(selectedElementId)
      : null;
    const host =
      selected && selected.nodeName.toLowerCase() === "g" ? selected : svgEl;
    host.appendChild(pathEl);
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
      const vbWidth = vb[2] || 200;
      const vbHeight = vb[3] || 200;
      const maxW = vbWidth * 0.55;
      const maxH = vbHeight * 0.55;
      const aspect = naturalW / naturalH || 1;
      let width = Math.round(maxW);
      let height = Math.round(width / aspect);
      if (height > maxH) {
        height = Math.round(maxH);
        width = Math.round(height * aspect);
      }
      width = Math.max(1, width);
      height = Math.max(1, height);
      const cx = Math.round((vb[0] ?? 0) + vbWidth / 2 - width / 2);
      const cy = Math.round((vb[1] ?? 0) + vbHeight / 2 - height / 2);

      const id = `image-${Math.random().toString(36).substring(2, 6)}`;
      const imageEl = doc.createElementNS("http://www.w3.org/2000/svg", "image");
      imageEl.setAttribute("id", id);
      imageEl.setAttribute("href", href);
      imageEl.setAttribute("x", String(cx));
      imageEl.setAttribute("y", String(cy));
      imageEl.setAttribute("width", String(width));
      imageEl.setAttribute("height", String(height));
      imageEl.setAttribute("preserveAspectRatio", "xMidYMid meet");

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
        className="relative flex shrink-0 flex-col border-r border-sidebar-border"
        style={{ paddingBottom: timelineHeight, width: sidebarWidth }}
      >
        {/* Drag handle: resize the sidebar, double-click to reset. */}
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize sidebar"
          title="Drag to resize sidebar · double-click to reset"
          style={{ height: `calc(100% - ${timelineHeight}px)` }}
          className="absolute right-0 top-0 z-10 w-1.5 cursor-col-resize touch-none transition-colors hover:bg-[#2391FF]/50 active:bg-[#2391FF]"
          onPointerDown={(e) => e.currentTarget.setPointerCapture(e.pointerId)}
          onPointerMove={(e) => {
            if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
            const left = e.currentTarget.parentElement?.getBoundingClientRect().left ?? 0;
            setSidebarWidth(Math.min(480, Math.max(200, Math.round(e.clientX - left))));
          }}
          onPointerUp={(e) => {
            const width = e.currentTarget.parentElement?.getBoundingClientRect().width;
            if (width) window.localStorage.setItem("motion-studio-sidebar-width", String(Math.round(width)));
          }}
          onDoubleClick={() => {
            setSidebarWidth(256);
            window.localStorage.removeItem("motion-studio-sidebar-width");
          }}
        />
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
          onImportSvg={handleImportSvg}
          onTitleChange={setTitle}
          onSave={saveAnimation}
          onPreviewSvg={setPreviewSvg}
          onUndo={() => undoRef.current?.()}
          onRedo={() => redoRef.current?.()}
          canUndo={canUndo}
          canRedo={canRedo}
          sidebarWidth={sidebarWidth}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        {!selectedId ? (
          <EmptyStudio
            loading={listLoading}
            onSample={createSample}
          />
        ) : importingFromServer && !animation ? (
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
            sidebarWidth={sidebarWidth}
            onRegisterUndoRedo={(u, r) => {
              undoRef.current = u;
              redoRef.current = r;
            }}
            onHistoryChange={(nextCanUndo, nextCanRedo) => {
              setCanUndo(nextCanUndo);
              setCanRedo(nextCanRedo);
            }}
            selectedElementId={selectedElementId}
            onSelectElement={setSelectedElementId}
            hiddenIds={hiddenIds}
            lockedIds={lockedIds}
            onAddImage={handleAddImage}
            onAddElement={handleAddElement}
            onAddAsset={handleAddAsset}
            onAddPath={handleAddPath}
            onRenameElement={handleRenameElement}
            onRemoveElement={handleRemoveElement}
            onEditText={handleEditText}
            onEditImageSource={handleEditImageSource}
            onEditPath={handleEditPath}
            onEditAttributes={handleEditAttributes}
            onToggleLock={handleToggleLock}
            onToggleHide={handleToggleHide}
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

/** Map every id-bearing node in a parsed tree, so a multi-selection of ids
 * can be resolved back to the tag/path/label the agent context needs. */
function collectTreeNodesById(root: TreeNode | null): Map<string, TreeNode> {
  const byId = new Map<string, TreeNode>();
  if (!root) return byId;
  const walk = (node: TreeNode) => {
    if (node.id) byId.set(node.id, node);
    node.children.forEach(walk);
  };
  walk(root);
  return byId;
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

// Icons are rendered inside a small tinted chip in the row (see ElementRow),
// so the type is readable at a glance instead of a row of solid-colour
// blobs: one colour family per type, icon in the same family, chip in a
// 10% tint of it. `bg` must stay a literal Tailwind class per branch —
// a dynamically built class name would never be generated.
function getElementIcon(tag: string, isExpanded: boolean) {
  const t = tag.toLowerCase();
  switch (t) {
    case "svg":
      return { Icon: IconFrame, color: "text-blue-500 dark:text-blue-400", bg: "bg-blue-500/10" };
    case "g":
      return {
        Icon: isExpanded ? IconFolderOpenFilled : IconFolderFilled,
        color: "text-amber-500 dark:text-amber-400",
        bg: "bg-amber-500/10",
      };
    case "image":
    case "img":
      return { Icon: IconPhotoFilled, color: "text-sky-500 dark:text-sky-400", bg: "bg-sky-500/10" };
    case "use":
      return { Icon: IconLinkFilled, color: "text-cyan-500 dark:text-cyan-400", bg: "bg-cyan-500/10" };
    case "rect":
    case "foreignobject":
      return { Icon: IconSquareFilled, color: "text-emerald-500 dark:text-emerald-400", bg: "bg-emerald-500/10" };
    case "circle":
    case "ellipse":
      return { Icon: IconCircleFilled, color: "text-violet-500 dark:text-violet-400", bg: "bg-violet-500/10" };
    case "path":
    case "polygon":
    case "polyline":
    case "line":
      return { Icon: IconVector, color: "text-indigo-500 dark:text-indigo-400", bg: "bg-indigo-500/10" };
    case "text":
    case "tspan":
      return { Icon: IconLetterT, color: "text-rose-500 dark:text-rose-400", bg: "bg-rose-500/10" };
    default:
      return { Icon: IconShape, color: "text-muted-foreground", bg: "bg-sidebar-accent" };
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

function parsePointsAttr(value: string): { x: number; y: number }[] {
  const nums = value
    .trim()
    .split(/[\s,]+/)
    .filter(Boolean)
    .map(Number);
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i + 1 < nums.length; i += 2) {
    const x = nums[i];
    const y = nums[i + 1];
    if (x !== undefined && y !== undefined && Number.isFinite(x) && Number.isFinite(y)) {
      pts.push({ x, y });
    }
  }
  return pts;
}

// Tree indent, kept small and capped: at 16px/level a group nested 8 deep
// ate 136px of a 256px sidebar before the name even started, so deep
// element names were truncated to nothing. Compact density pass: 10px/
// level, 4px base, capped at 6 levels (max 64px of indent). Deeper nodes
// still render under their parent, just without further sideways drift.
// TreeLines and ElementRow must both use treeIndentX() so the guide rails
// line up with the chevron at every depth.
const TREE_INDENT = 10;
const TREE_BASE = 4;
const TREE_MAX_DEPTH = 6;
const treeIndentX = (depth: number) =>
  TREE_BASE + Math.min(depth, TREE_MAX_DEPTH) * TREE_INDENT;

type PathSegment = { cmd: string; nums: number[] };

const PATH_ARITY: Record<string, number> = {
  M: 2,
  L: 2,
  H: 1,
  V: 1,
  C: 6,
  S: 4,
  Q: 4,
  T: 2,
  A: 7,
  Z: 0,
};

/**
 * Split a path `d` into segments, preserving command order and every
 * numeric parameter (including arc flags and curve control points).
 * The old parser only read M/L pairs, so dragging a curved path rewrote
 * it as straight lines and destroyed the curves. This parser keeps them.
 */
function parsePathSegments(d: string): PathSegment[] {
  const tokens =
    d.match(/[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?/g) ?? [];
  const segments: PathSegment[] = [];
  let cmd = "";
  let nums: number[] = [];
  const flush = () => {
    // Only push a segment that actually collected numbers: after a moveto
    // flushes on arity, its implicit lineto command is pending with an
    // empty buffer, and pushing it would invent a phantom (0, 0) node.
    if (!cmd || nums.length === 0) return;
    segments.push({ cmd, nums });
    nums = [];
  };
  for (const token of tokens) {
    if (/[a-zA-Z]/.test(token)) {
      flush();
      cmd = token;
      if (cmd.toUpperCase() === "Z") {
        segments.push({ cmd: "Z", nums: [] });
        cmd = "";
      }
      continue;
    }
    if (!cmd) continue;
    nums.push(Number(token));
    const arity = PATH_ARITY[cmd.toUpperCase()] ?? 0;
    if (arity > 0 && nums.length >= arity) {
      // A moveto's extra pairs are implicit linetos, per the SVG spec.
      const outCmd = cmd;
      flush();
      cmd =
        outCmd === "M" ? "L" : outCmd === "m" ? "l" : outCmd;
    }
  }
  flush();
  return segments;
}

/** Every editable point of a path, in segment order: endpoints plus curve
 * control points. Coordinates are resolved to absolute values, so relative
 * commands still show their nodes in the right place on canvas. */
function pathPointsFromSegments(
  segments: PathSegment[],
): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  let curX = 0;
  let curY = 0;
  let startX = 0;
  let startY = 0;
  const abs = (cmd: string, i: number, base: number, nums: number[]) =>
    (cmd === cmd.toLowerCase() ? base : 0) + (nums[i] ?? 0);
  for (const seg of segments) {
    const cmd = seg.cmd;
    const upper = cmd.toUpperCase();
    const n = seg.nums;
    if (upper === "Z") {
      curX = startX;
      curY = startY;
      continue;
    }
    if (upper === "M") {
      curX = abs(cmd, 0, curX, n);
      curY = abs(cmd, 1, curY, n);
      startX = curX;
      startY = curY;
      pts.push({ x: curX, y: curY });
    } else if (upper === "L" || upper === "T") {
      curX = abs(cmd, 0, curX, n);
      curY = abs(cmd, 1, curY, n);
      pts.push({ x: curX, y: curY });
    } else if (upper === "H") {
      curX = abs(cmd, 0, curX, n);
      pts.push({ x: curX, y: curY });
    } else if (upper === "V") {
      curY = abs(cmd, 0, curY, n);
      pts.push({ x: curX, y: curY });
    } else if (upper === "C") {
      pts.push(
        { x: abs(cmd, 0, curX, n), y: abs(cmd, 1, curY, n) },
        { x: abs(cmd, 2, curX, n), y: abs(cmd, 3, curY, n) },
        { x: abs(cmd, 4, curX, n), y: abs(cmd, 5, curY, n) },
      );
      curX = abs(cmd, 4, curX, n);
      curY = abs(cmd, 5, curY, n);
    } else if (upper === "S") {
      pts.push(
        { x: abs(cmd, 0, curX, n), y: abs(cmd, 1, curY, n) },
        { x: abs(cmd, 2, curX, n), y: abs(cmd, 3, curY, n) },
      );
      curX = abs(cmd, 2, curX, n);
      curY = abs(cmd, 3, curY, n);
    } else if (upper === "Q") {
      pts.push(
        { x: abs(cmd, 0, curX, n), y: abs(cmd, 1, curY, n) },
        { x: abs(cmd, 2, curX, n), y: abs(cmd, 3, curY, n) },
      );
      curX = abs(cmd, 2, curX, n);
      curY = abs(cmd, 3, curY, n);
    } else if (upper === "A") {
      curX = abs(cmd, 5, curX, n);
      curY = abs(cmd, 6, curY, n);
      pts.push({ x: curX, y: curY });
    }
  }
  return pts;
}

function parsePathPoints(d: string): { x: number; y: number }[] {
  return pathPointsFromSegments(parsePathSegments(d));
}

/**
 * Rewrite a path with new node positions, keeping every original command
 * and every non-position parameter (arc radii/flags, etc.). Output is
 * absolute and H/V become L, which is geometrically identical. Returns
 * null when the point count does not match, so a bad edit never corrupts
 * the path — the caller must then leave `d` unchanged.
 */
function serializePathWithPoints(
  segments: PathSegment[],
  pts: Array<{ x: number; y: number }>,
): string | null {
  const r = (v: number) => Math.round(v * 100) / 100;
  let idx = 0;
  const next = () => pts[idx++]!;
  const out: string[] = [];
  for (const seg of segments) {
    const upper = seg.cmd.toUpperCase();
    if (upper === "Z") {
      out.push("Z");
      continue;
    }
    const n = [...seg.nums];
    if (upper === "M" || upper === "L" || upper === "T") {
      const p = next();
      if (!p) return null;
      n[0] = r(p.x);
      n[1] = r(p.y);
      out.push(`${upper} ${n.join(" ")}`);
    } else if (upper === "H" || upper === "V") {
      const p = next();
      if (!p) return null;
      out.push(`L ${r(p.x)} ${r(p.y)}`);
    } else if (upper === "C") {
      const a = next();
      const b = next();
      const c = next();
      if (!a || !b || !c) return null;
      n[0] = r(a.x);
      n[1] = r(a.y);
      n[2] = r(b.x);
      n[3] = r(b.y);
      n[4] = r(c.x);
      n[5] = r(c.y);
      out.push(`C ${n.join(" ")}`);
    } else if (upper === "S" || upper === "Q") {
      const a = next();
      const b = next();
      if (!a || !b) return null;
      n[0] = r(a.x);
      n[1] = r(a.y);
      n[2] = r(b.x);
      n[3] = r(b.y);
      out.push(`${upper} ${n.join(" ")}`);
    } else if (upper === "A") {
      const p = next();
      if (!p) return null;
      n[5] = r(p.x);
      n[6] = r(p.y);
      out.push(`A ${n.join(" ")}`);
    } else {
      out.push(`${upper} ${n.join(" ")}`);
    }
  }
  if (idx !== pts.length) return null;
  return out.join(" ");
}

function bezierHandleInfo(segments: PathSegment[], pts: Array<{ x: number; y: number }>) {
  const lines: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
  const controlIndices = new Set<number>();
  const opposite = new Map<number, number>();
  const anchorOfControl = new Map<number, number>();
  const smoothCandidates = new Set<number>();
  const incomingC = new Map<number, number>();
  const outgoingC = new Map<number, number>();
  let idx = 0;
  let cur: { x: number; y: number } | null = null;
  let start: { x: number; y: number } | null = null;
  const at = (i: number) => pts[i];
  for (const seg of segments) {
    const upper = seg.cmd.toUpperCase();
    if (upper === "Z") { cur = start; continue; }
    if (upper === "M") { const p = at(idx++); if (!p) break; cur = p; start = p; }
    else if (upper === "L" || upper === "H" || upper === "V" || upper === "T" || upper === "A") { const p = at(idx++); if (!p) break; cur = p; }
    else if (upper === "C") {
      const c1 = at(idx); const c2 = at(idx + 1); const end = at(idx + 2);
      if (!c1 || !c2 || !end) break;
      if (cur) lines.push({ x1: cur.x, y1: cur.y, x2: c1.x, y2: c1.y });
      lines.push({ x1: c2.x, y1: c2.y, x2: end.x, y2: end.y });
      controlIndices.add(idx); controlIndices.add(idx + 1);
      outgoingC.set(idx - 1, idx); incomingC.set(idx + 2, idx + 1);
      anchorOfControl.set(idx, idx - 1); anchorOfControl.set(idx + 1, idx + 2);
      cur = end; idx += 3;
    } else if (upper === "S") {
      const c = at(idx); const end = at(idx + 1); if (!c || !end) break;
      lines.push({ x1: c.x, y1: c.y, x2: end.x, y2: end.y });
      controlIndices.add(idx); anchorOfControl.set(idx, idx + 1); cur = end; idx += 2;
    } else if (upper === "Q") {
      const c = at(idx); const end = at(idx + 1); if (!c || !end) break;
      if (cur) lines.push({ x1: cur.x, y1: cur.y, x2: c.x, y2: c.y });
      lines.push({ x1: c.x, y1: c.y, x2: end.x, y2: end.y });
      controlIndices.add(idx); anchorOfControl.set(idx, idx + 1); cur = end; idx += 2;
    }
  }
  for (const [anchor, incoming] of incomingC) {
    const outgoing = outgoingC.get(anchor);
    if (outgoing === undefined) continue;
    smoothCandidates.add(anchor);
    opposite.set(incoming, outgoing); opposite.set(outgoing, incoming);
  }
  return { lines, controlIndices, opposite, anchorOfControl, smoothCandidates };
}

function mergeSvgIntoArtboard(currentSvg: string, importedText: string): string | null {
  try {
    const curDoc = new DOMParser().parseFromString(currentSvg, "image/svg+xml");
    const impDoc = new DOMParser().parseFromString(importedText, "image/svg+xml");
    const curRoot = curDoc.documentElement;
    const impRoot = impDoc.documentElement;
    if (!curRoot || curRoot.nodeName.toLowerCase() !== "svg") return null;
    if (!impRoot || impRoot.nodeName.toLowerCase() !== "svg") return null;
    // Sanitise: no scripts, no foreignObject (it can carry HTML/scripts),
    // no event-handler attributes, no javascript: hrefs, no <style> (inline
    // SVG style can leak into the page).
    impDoc.querySelectorAll("script, foreignObject, style").forEach((n) => n.remove());
    impDoc.querySelectorAll("*").forEach((el) => {
      Array.from(el.attributes).forEach((attr) => {
        if (attr.name.toLowerCase().startsWith("on")) el.removeAttribute(attr.name);
        if ((attr.name === "href" || attr.name === "xlink:href") && attr.value.trim().toLowerCase().startsWith("javascript:")) el.removeAttribute(attr.name);
      });
    });
    // Remap ids that collide with the current document, and update references.
    const existingIds = new Set<string>();
    curDoc.querySelectorAll("[id]").forEach((el) => { const id = el.getAttribute("id"); if (id) existingIds.add(id); });
    const idMap = new Map<string, string>();
    impDoc.querySelectorAll("[id]").forEach((el) => {
      const oldId = el.getAttribute("id");
      if (!oldId) return;
      if (existingIds.has(oldId) || idMap.has(oldId)) {
        let next = `${oldId}-import`;
        let n = 2;
        while (existingIds.has(next) || Array.from(idMap.values()).includes(next)) { next = `${oldId}-import-${n++}`; }
        idMap.set(oldId, next);
        el.setAttribute("id", next);
      } else {
        existingIds.add(oldId);
      }
    });
    if (idMap.size > 0) {
      impDoc.querySelectorAll("*").forEach((el) => {
        Array.from(el.attributes).forEach((attr) => {
          let v = attr.value;
          idMap.forEach((next, oldId) => {
            v = v.split(`url(#${oldId})`).join(`url(#${next})`);
            if (attr.name === "href" || attr.name === "xlink:href") v = v.split(`#${oldId}`).join(`#${next}`);
          });
          if (v !== attr.value) el.setAttribute(attr.name, v);
        });
      });
    }
    // Copy imported defs (gradients, filters, markers) into the current defs.
    const impDefs = impRoot.querySelector("defs");
    if (impDefs && impDefs.children.length > 0) {
      let curDefs = curRoot.querySelector("defs");
      if (!curDefs) {
        curDefs = curDoc.createElementNS("http://www.w3.org/2000/svg", "defs");
        curRoot.insertBefore(curDefs, curRoot.firstChild);
      }
      Array.from(impDefs.children).forEach((child) => { curDefs!.appendChild(curDoc.importNode(child, true)); });
    }
    // Fit the imported artwork into the current artboard: scale down only
    // if it is larger, then centre it. Small artwork keeps its size.
    const parseVb = (s: string | null) => {
      const parts = (s || "").split(/[\s,]+/).map(Number);
      return parts.length === 4 && parts.every(Number.isFinite) ? parts : null;
    };
    const curVb = parseVb(curRoot.getAttribute("viewBox")) || [0, 0, 200, 200];
    const impVb = parseVb(impRoot.getAttribute("viewBox"));
    const children = Array.from(impRoot.children).filter((c) => c.nodeName.toLowerCase() !== "defs");
    if (children.length === 0) return null;
    let host: Element = curRoot;
    if (impVb) {
      const scale = Math.min(1, curVb[2]! / impVb[2]!, curVb[3]! / impVb[3]!);
      const tx = curVb[0]! + (curVb[2]! - impVb[2]! * scale) / 2 - impVb[0]! * scale;
      const ty = curVb[1]! + (curVb[3]! - impVb[3]! * scale) / 2 - impVb[1]! * scale;
      if (scale !== 1 || tx !== 0 || ty !== 0) {
        const g = curDoc.createElementNS("http://www.w3.org/2000/svg", "g");
        g.setAttribute("transform", `translate(${Math.round(tx * 100) / 100} ${Math.round(ty * 100) / 100}) scale(${Math.round(scale * 100) / 100})`);
        curRoot.appendChild(g);
        host = g;
      }
    }
    children.forEach((child) => { host.appendChild(curDoc.importNode(child, true)); });
    return new XMLSerializer().serializeToString(curRoot);
  } catch {
    return null;
  }
}

function ElementThumb({
  src,
  Icon,
}: {
  src?: string | undefined;
  Icon: ComponentType<{ className?: string }>;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  if (!src || failedSrc === src) {
    return <Icon className="size-3.5" />;
  }
  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      onError={() => setFailedSrc(src)}
      className="size-3.5 rounded-[2px] border border-border/60 object-cover"
    />
  );
}

function TreeLines({
  depth,
  // Kept in the props so callers don't change; the elbow connectors that
  // used it are gone, so it is intentionally unused here.
  isLast: _isLast,
  ancestorContinues,
}: {
  depth: number;
  isLast: boolean;
  ancestorContinues: boolean[];
}) {
  if (depth === 0) return null;

  // Guide rails, done properly this time: one vertical rail per ancestor,
  // at that ancestor's own chevron centre, drawn only while that ancestor
  // still has siblings below it. The previous loop paired rail X for
  // level N with the continuation flag for level N+1, so rails sat one
  // indent left of the chevron they were supposed to line up with —
  // another reason the old tree looked off. ancestorContinues[a] is the
  // continuation flag for the ancestor at depth a (renderNode sets
  // nextAncestorContinues[depth] = !isLast for each node's children),
  // so the loop below is direct: rail for depth a iff it continues.
  // Chevron is 16px wide, so its centre is 8px into the row's indent.
  const railX = (level: number) => treeIndentX(level) + 8;

  return (
    <div
      className="pointer-events-none absolute inset-0 select-none"
      aria-hidden="true"
    >
      {Array.from({ length: depth }).map((_, level) => {
        if (!ancestorContinues[level]) return null;
        return (
          <span
            key={level}
            className="absolute top-0 bottom-0 w-px bg-sidebar-foreground/15"
            style={{ left: railX(level) }}
          />
        );
      })}
    </div>
  );
}

function ElementContextMenuItems({
  node,
  isLocked,
  isHidden,
  moveTargets,
  askAiCount = 1,
  onAskAi,
  onRename,
  onDelete,
  onEditText,
  onEditImageSource,
  onEditPath,
  onEditAttributes,
  onGroupElement,
  onUngroupElement,
  onMoveElement,
  onBringToFront,
  onBringForward,
  onSendBackward,
  onSendToBack,
  onToggleLock,
  onToggleHide,
}: {
  node: TreeNode;
  isLocked: boolean;
  isHidden: boolean;
  moveTargets: MoveTarget[];
  /** How many selected elements "Ask AI" will tag (1 = just this one). */
  askAiCount?: number | undefined;
  onAskAi: (node: TreeNode) => void;
  onRename: (node: TreeNode) => void;
  onDelete: (node: TreeNode) => void;
  onEditText: (node: TreeNode) => void;
  onEditImageSource: (node: TreeNode) => void;
  onEditPath: (node: TreeNode) => void;
  onEditAttributes: (node: TreeNode) => void;
  onGroupElement: (node: TreeNode) => void;
  onUngroupElement: (node: TreeNode) => void;
  onMoveElement: (node: TreeNode, targetPath: string | null) => void;
  onBringToFront: (node: TreeNode) => void;
  onBringForward: (node: TreeNode) => void;
  onSendBackward: (node: TreeNode) => void;
  onSendToBack: (node: TreeNode) => void;
  onToggleLock: (node: TreeNode) => void;
  onToggleHide: (node: TreeNode) => void;
}) {
  const isGroup = node.tag.toLowerCase() === "g";
  return (
    <>
          {/* Hand the element to the agent: it lands as a context chip in the
              composer so the user can just describe the change they want. */}
          <ContextMenuPrimitive.Item
            className="flex cursor-pointer items-center justify-between gap-2 rounded px-2 py-1.5 text-[12px] outline-none hover:bg-accent"
            onSelect={() => onAskAi(node)}
          >
            <span className="flex items-center gap-2">
              <IconSparklesFilled className="size-3.5 text-[#2391FF]" />
              <span>
                Ask AI{askAiCount > 1 ? ` (${askAiCount})` : ""}
              </span>
            </span>
            <span className="text-[10px] text-muted-foreground">
              {askAiCount > 1 ? `${askAiCount} elements` : "tag element"}
            </span>
          </ContextMenuPrimitive.Item>

          <div className="my-1 h-px bg-border" />

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
              <IconPhotoFilled className="size-3.5 text-sky-500" />
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
            <IconAdjustmentsHorizontalFilled className="size-3.5 text-primary" />
            <span>Edit Attribute...</span>
          </ContextMenuPrimitive.Item>

          {node.path ? (
            <>
              <div className="my-1 h-px bg-border" />
              <ContextMenuPrimitive.Sub>
                <ContextMenuPrimitive.SubTrigger className="flex cursor-pointer items-center justify-between rounded px-2 py-1.5 text-[12px] outline-none hover:bg-accent">
                  <span className="flex items-center gap-2">
                    <IconTransformFilled className="size-3.5 text-primary" />
                    <span>Arrange</span>
                  </span>
                  <IconChevronRight className="size-3.5 text-muted-foreground" />
                </ContextMenuPrimitive.SubTrigger>
                <ContextMenuPrimitive.Portal>
                  <ContextMenuPrimitive.SubContent className="z-50 min-w-[190px] rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md">
                    <ContextMenuPrimitive.Item
                      className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-[12px] outline-none hover:bg-accent"
                      onSelect={() => onBringToFront(node)}
                    >
                      <IconArrowBarToUp className="size-3.5 text-blue-500" />
                      <span>Bring to Front</span>
                    </ContextMenuPrimitive.Item>
                    <ContextMenuPrimitive.Item
                      className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-[12px] outline-none hover:bg-accent"
                      onSelect={() => onBringForward(node)}
                    >
                      <IconArrowUp className="size-3.5 text-blue-400" />
                      <span>Bring Forward</span>
                    </ContextMenuPrimitive.Item>
                    <ContextMenuPrimitive.Item
                      className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-[12px] outline-none hover:bg-accent"
                      onSelect={() => onSendBackward(node)}
                    >
                      <IconArrowDown className="size-3.5 text-orange-400" />
                      <span>Send Backward</span>
                    </ContextMenuPrimitive.Item>
                    <ContextMenuPrimitive.Item
                      className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-[12px] outline-none hover:bg-accent"
                      onSelect={() => onSendToBack(node)}
                    >
                      <IconArrowBarToDown className="size-3.5 text-orange-500" />
                      <span>Send to Back</span>
                    </ContextMenuPrimitive.Item>
                  </ContextMenuPrimitive.SubContent>
                </ContextMenuPrimitive.Portal>
              </ContextMenuPrimitive.Sub>
              <div className="my-1 h-px bg-border" />
              <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Structure
              </div>
              <ContextMenuPrimitive.Item
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-[12px] outline-none hover:bg-accent"
                onSelect={() => onGroupElement(node)}
              >
                <IconFolderFilled className="size-3.5 text-amber-500" />
                <span>Group</span>
              </ContextMenuPrimitive.Item>
              {isGroup && node.hasChildren ? (
                <ContextMenuPrimitive.Item
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-[12px] outline-none hover:bg-accent"
                  onSelect={() => onUngroupElement(node)}
                >
                  <IconFolderOpenFilled className="size-3.5 text-amber-500" />
                  <span>Ungroup</span>
                </ContextMenuPrimitive.Item>
              ) : null}
              {moveTargets.length > 0 ? (
                <ContextMenuPrimitive.Sub>
                  <ContextMenuPrimitive.SubTrigger className="flex cursor-pointer items-center justify-between rounded px-2 py-1.5 text-[12px] outline-none hover:bg-accent">
                    <span className="flex items-center gap-2">
                      <IconFolderFilled className="size-3.5 text-muted-foreground" />
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
                          <IconFolderFilled className="size-3.5 text-amber-500" />
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
            {isLocked ? <IconLockFilled className="size-3.5 text-amber-500" /> : <IconLockOpen className="size-3.5 text-muted-foreground" />}
          </ContextMenuPrimitive.Item>

          <ContextMenuPrimitive.Item
            className="flex cursor-pointer items-center justify-between rounded px-2 py-1.5 text-[12px] outline-none hover:bg-accent"
            onSelect={() => onToggleHide(node)}
          >
            <span>{isHidden ? "Show Element" : "Hide Element"}</span>
            {isHidden ? <IconEyeOff className="size-3.5 text-muted-foreground" /> : <IconEyeFilled className="size-3.5 text-muted-foreground" />}
          </ContextMenuPrimitive.Item>

          <div className="my-1 h-px bg-border" />

          <ContextMenuPrimitive.Item
            className="cursor-pointer rounded px-2 py-1.5 text-[12px] text-destructive outline-none hover:bg-destructive/10"
            onSelect={() => onDelete(node)}
          >
            Delete Element
          </ContextMenuPrimitive.Item>
    </>
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
  imageSrc,
  askAiCount,
  onToggleCollapse,
  onSelect,
  onSelectNode,
  onToggleLock,
  onToggleHide,
  onRename,
  onDelete,
  onEditText,
  onEditImageSource,
  onEditPath,
  onEditAttributes,
  onAskAi,
  moveTargets,
  onGroupElement,
  onUngroupElement,
  onMoveElement,
  onBringToFront,
  onBringForward,
  onSendBackward,
  onSendToBack,
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
  imageSrc?: string | undefined;
  askAiCount?: number | undefined;
  onToggleCollapse: (key: string) => void;
  onSelect: (id: string | null, additive: boolean) => void;
  /**
   * Tap-to-select for any row, including elements that have no id yet.
   * When present, ElementRow prefers this over onSelect so an id-less
   * element can be given an id and selected without clicking it on canvas.
   */
  onSelectNode?: (node: TreeNode, additive: boolean) => void;
  onToggleLock: (node: TreeNode) => void;
  onToggleHide: (node: TreeNode) => void;
  onRename: (node: TreeNode) => void;
  onDelete: (node: TreeNode) => void;
  onEditText: (node: TreeNode) => void;
  onEditImageSource: (node: TreeNode) => void;
  onEditPath: (node: TreeNode) => void;
  onEditAttributes: (node: TreeNode) => void;
  onAskAi: (node: TreeNode) => void;
  moveTargets: MoveTarget[];
  onGroupElement: (node: TreeNode) => void;
  onUngroupElement: (node: TreeNode) => void;
  onMoveElement: (node: TreeNode, targetPath: string | null) => void;
  onBringToFront: (node: TreeNode) => void;
  onBringForward: (node: TreeNode) => void;
  onSendBackward: (node: TreeNode) => void;
  onSendToBack: (node: TreeNode) => void;
}) {
  const { Icon, color, bg } = getElementIcon(node.tag, !isCollapsed);
  const nodeKey = node.id || node.path;
  const label = getElementLabel(node);
  const isGroup = node.tag.toLowerCase() === "g";
  const alwaysShowActions = isLocked || isHidden;

  return (
    <ContextMenuPrimitive.Root>
      <ContextMenuPrimitive.Trigger asChild>
        <div
          className={`group relative flex h-6 cursor-pointer select-none items-center rounded-[5px] pr-1 text-[12px] transition-colors ${
            // Rows had no cursor-pointer before, so hovering a clickable
            // row still showed the plain arrow — part of why the tree
            // felt dead. Selection now also gets the blue left bar on
            // every selected row, not just the primary one, so a
            // multi-selection actually reads as selected.
            isSelected
              ? "bg-[#2391FF]/10 font-medium text-sidebar-accent-foreground shadow-[inset_2px_0_0_#2391FF]"
              : "text-sidebar-foreground hover:bg-sidebar-accent"
          } ${isHidden ? "opacity-55" : ""}`}
          style={{ paddingLeft: treeIndentX(depth) }}
          title={`${label} · ${node.tag}`}
          onClick={(event) => {
            // Tapping a row in Elements selects it on canvas, even if the
            // element has no id yet and the cursor never touches the canvas.
            if (onSelectNode) {
              onSelectNode(node, event.metaKey || event.ctrlKey);
              return;
            }
            if (!node.id) {
              return;
            }
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
              className="mr-1 grid size-4 shrink-0 cursor-pointer place-items-center rounded-sm text-sidebar-foreground/60 transition-colors hover:bg-sidebar-foreground/10 hover:text-sidebar-foreground"
              title={isCollapsed ? "Expand" : "Collapse"}
            >
              {isCollapsed ? (
                <IconChevronRightFilled className="size-3" />
              ) : (
                <IconChevronDownFilled className="size-3" />
              )}
            </button>
          ) : (
            <span className="mr-1 size-4 shrink-0" />
          )}

          {/* Element-type icon, in its tinted chip (see getElementIcon).
              Compact density: 16px chevron, 18px chip, 4px gap — the
              spacer for childless rows matches the chevron, so icons
              stay aligned. */}
          <span
            className={`mr-1 grid size-[18px] shrink-0 place-items-center rounded-[5px] ${bg} ${color} ${
              // The primary selection (the one the Properties panel shows)
              // still gets its own marker now that every selected row has
              // the blue left bar: a blue ring around its type chip.
              isPrimary ? "ring-1 ring-[#2391FF]/50" : ""
            }`}
          >
            <ElementThumb src={imageSrc} Icon={Icon} />
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
            <span className="ml-1 shrink-0 text-[10px] tabular-nums text-sidebar-foreground/40">
              {node.children.length}
            </span>
          ) : null}

          {hasTracks ? (
            <span
              className="ml-1 size-1.5 shrink-0 rounded-full bg-[#2391FF]"
              title="Animated"
            />
          ) : null}

          {node.id ? (
            // Previously these buttons were opacity-0 but still in layout,
            // so every row permanently lost ~44px of name width to invisible
            // lock/hide buttons. Now they are out of layout until hover
            // (or always shown when locked/hidden), giving the name the
            // full row width when you are just reading the tree.
            <div
              className={`ml-auto shrink-0 items-center gap-0.5 pl-1 ${
                alwaysShowActions
                  ? "flex"
                  : "hidden group-hover:flex group-focus-within:flex"
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
                  <IconLockFilled className="size-3" />
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
                  <IconEyeFilled className="size-3" />
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
          <ElementContextMenuItems
            node={node}
            isLocked={isLocked}
            isHidden={isHidden}
            moveTargets={moveTargets}
            askAiCount={askAiCount}
            onAskAi={onAskAi}
            onRename={onRename}
            onDelete={onDelete}
            onEditText={onEditText}
            onEditImageSource={onEditImageSource}
            onEditPath={onEditPath}
            onEditAttributes={onEditAttributes}
            onGroupElement={onGroupElement}
            onUngroupElement={onUngroupElement}
            onMoveElement={onMoveElement}
            onBringToFront={onBringToFront}
            onBringForward={onBringForward}
            onSendBackward={onSendBackward}
            onSendToBack={onSendToBack}
            onToggleLock={onToggleLock}
            onToggleHide={onToggleHide}
          />
        </ContextMenuPrimitive.Content>
      </ContextMenuPrimitive.Portal>
    </ContextMenuPrimitive.Root>
  );
}

// Memoised row: the Elements tree re-renders on every sidebar state change,
// but a row only needs to update when its own node/flags change. Arrays
// (ancestorContinues, moveTargets) are compared by content, not identity,
// because renderNode builds fresh arrays each pass.
const MemoElementRow = memo(ElementRow, (prev, next) =>
  prev.node === next.node &&
  prev.depth === next.depth &&
  prev.isLast === next.isLast &&
  prev.ancestorContinues.join(",") === next.ancestorContinues.join(",") &&
  prev.isCollapsed === next.isCollapsed &&
  prev.isSelected === next.isSelected &&
  prev.isPrimary === next.isPrimary &&
  prev.isLocked === next.isLocked &&
  prev.isHidden === next.isHidden &&
  prev.hasTracks === next.hasTracks &&
  prev.imageSrc === next.imageSrc &&
  prev.askAiCount === next.askAiCount &&
  prev.moveTargets.length === next.moveTargets.length &&
  prev.moveTargets.every((t, i) => t.path === next.moveTargets[i]?.path) &&
  prev.onToggleCollapse === next.onToggleCollapse &&
  prev.onSelect === next.onSelect &&
  prev.onSelectNode === next.onSelectNode &&
  prev.onToggleLock === next.onToggleLock &&
  prev.onToggleHide === next.onToggleHide &&
  prev.onRename === next.onRename &&
  prev.onDelete === next.onDelete &&
  prev.onEditText === next.onEditText &&
  prev.onEditImageSource === next.onEditImageSource &&
  prev.onEditPath === next.onEditPath &&
  prev.onEditAttributes === next.onEditAttributes &&
  prev.onAskAi === next.onAskAi &&
  prev.onGroupElement === next.onGroupElement &&
  prev.onUngroupElement === next.onUngroupElement &&
  prev.onMoveElement === next.onMoveElement &&
  prev.onBringToFront === next.onBringToFront &&
  prev.onBringForward === next.onBringForward &&
  prev.onSendBackward === next.onSendBackward &&
  prev.onSendToBack === next.onSendToBack,
);

function PropertiesPanel({
  animation,
  selectedElementId,
  onSave,
  onPreviewSvg,
  onSelectElement,
}: {
  animation: MotionAnimation | null;
  selectedElementId: string | null;
  onSave: (next: MotionAnimation) => Promise<boolean>;
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
      "attributes",
      "hover",
    ])
  );
  const [localAttributes, setLocalAttributes] = useState<Record<string, string>>({});
  const [localTextContent, setLocalTextContent] = useState("");
  const saveTimeoutRef = useRef<number | null>(null);
  const draftSvgRef = useRef<string>("");
  const pendingSvgRef = useRef<string | null>(null);
  const imageFileInputRef = useRef<HTMLInputElement>(null);
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
      void Promise.resolve(onSave({ ...latest, svg })).catch((err) => {
        console.error("Failed to save animation", err);
        toast.error("Couldn't save your changes. Try again.");
      });
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

  // Like applySvgUpdate, but for edits that touch the whole document
  // (gradients, markers and filters live in <defs>, not on the element).
  const applyDocUpdate = useCallback(
    (mutator: (doc: Document, el: Element) => void) => {
      const latest = latestAnimationRef.current;
      if (!latest || !selectedElementId) return;
      const source = draftSvgRef.current || latest.svg;
      const doc = new DOMParser().parseFromString(source, "image/svg+xml");
      const el = doc.getElementById(selectedElementId);
      if (!el) return;
      mutator(doc, el);
      const nextSvg = new XMLSerializer().serializeToString(doc.documentElement);
      draftSvgRef.current = nextSvg;
      pendingSvgRef.current = nextSvg;
      onPreviewSvg?.(nextSvg);
      scheduleSave();
    },
    [selectedElementId, onPreviewSvg, scheduleSave],
  );

  const ensureDefs = (doc: Document): Element => {
    const root = doc.documentElement;
    let defs = root.querySelector("defs");
    if (!defs) {
      defs = doc.createElementNS("http://www.w3.org/2000/svg", "defs");
      root.insertBefore(defs, root.firstChild);
    }
    return defs;
  };

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

  // Hover effect for the selected element, if one is set.
  const currentHover: HoverEffect | null =
    selectedElementId ? (animation?.hover?.[selectedElementId] ?? null) : null;

  // Hover effects live on the animation object (keyed by element id),
  // not in the SVG string, so they are saved through onSave directly —
  // the panel's scheduleSave only writes the svg. The ref is updated
  // here too, or a later attribute save would drop the hover change.
  const saveHover = useCallback(
    (next: HoverEffect | null) => {
      const latest = latestAnimationRef.current;
      if (!latest || !selectedElementId) return;
      const nextHover = { ...(latest.hover ?? {}) };
      if (next) nextHover[selectedElementId] = next;
      else delete nextHover[selectedElementId];
      const updated: MotionAnimation = { ...latest, hover: nextHover };
      latestAnimationRef.current = updated;
      void Promise.resolve(onSave(updated)).catch((err) => {
        console.error("Failed to save animation", err);
        toast.error("Couldn't save your changes. Try again.");
      });
    },
    [selectedElementId, onSave],
  );

  // Switching effect keeps the previous duration and, where the setting
  // means the same thing, the previous value; otherwise a sensible default.
  const hoverEffectWithDefaults = (
    effect: HoverEffect["effect"],
    prev: HoverEffect | null,
  ): HoverEffect => {
    const next: HoverEffect = { effect, durationMs: prev?.durationMs ?? 250 };
    if (effect === "scale")
      next.amount = prev?.effect === "scale" ? (prev.amount ?? 1.15) : 1.15;
    if (effect === "rotate")
      next.amount = prev?.effect === "rotate" ? (prev.amount ?? 15) : 15;
    if (effect === "lift")
      next.amount = prev?.effect === "lift" ? (prev.amount ?? -10) : -10;
    if (effect === "bounce")
      next.amount = prev?.effect === "bounce" ? (prev.amount ?? 12) : 12;
    if (effect === "color" || effect === "glow")
      next.color = prev?.color ?? "#2391FF";
    return next;
  };

  // Gradient state for the selected element, read from the document's defs.
  const gradientInfo = useMemo(() => {
    if (!animation?.svg || !selectedElementId) return null;
    try {
      const doc = new DOMParser().parseFromString(animation.svg, "image/svg+xml");
      const el = doc.getElementById(selectedElementId);
      if (!el) return null;
      const fill = el.getAttribute("fill") || "";
      const m = /^url\(#([^)]+)\)$/.exec(fill.trim());
      if (!m) return null;
      const grad = doc.getElementById(m[1]!);
      if (!grad) return null;
      const tag = grad.tagName.toLowerCase();
      if (tag !== "lineargradient" && tag !== "radialgradient") return null;
      const stops = Array.from(grad.querySelectorAll("stop")).map((s) => ({
        offset: s.getAttribute("offset") || "0%",
        color: s.getAttribute("stop-color") || "#000000",
      }));
      if (stops.length === 0) return null;
      let angle = 90;
      if (tag === "lineargradient") {
        const x1 = parseFloat(grad.getAttribute("x1") || "0");
        const y1 = parseFloat(grad.getAttribute("y1") || "0");
        const x2 = parseFloat(grad.getAttribute("x2") || "1");
        const y2 = parseFloat(grad.getAttribute("y2") || "0");
        angle = Math.round(((Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI + 360) % 360);
      }
      return { id: m[1]!, type: tag, stops, angle };
    } catch {
      return null;
    }
  }, [animation?.svg, selectedElementId]);

  const updateGradient = (type: "solid" | "lineargradient" | "radialgradient", stops: Array<{ color: string }>, angle = 90) => {
    if (type === "solid") {
      const color = stops[0]?.color || "#000000";
      updateAttribute("fill", color);
      return;
    }
    const start = stops[0]?.color || "#2391FF";
    const end = stops[1]?.color || "#ffffff";
    const existingId = gradientInfo?.id;
    const gradId = existingId && gradientInfo?.type === type ? existingId : `grad-${Math.random().toString(36).substring(2, 6)}`;
    applyDocUpdate((doc, el) => {
      const defs = ensureDefs(doc);
      const existingGrad = doc.getElementById(gradId);
      let grad: Element;
      if (!existingGrad || existingGrad.tagName.toLowerCase() !== type) {
        grad = doc.createElementNS("http://www.w3.org/2000/svg", type);
        grad.setAttribute("id", gradId);
        defs.appendChild(grad);
      } else {
        grad = existingGrad;
      }
      if (type === "lineargradient") {
        const rad = (angle * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        grad.setAttribute("x1", String(Math.round((0.5 - 0.5 * cos) * 100) / 100));
        grad.setAttribute("y1", String(Math.round((0.5 - 0.5 * sin) * 100) / 100));
        grad.setAttribute("x2", String(Math.round((0.5 + 0.5 * cos) * 100) / 100));
        grad.setAttribute("y2", String(Math.round((0.5 + 0.5 * sin) * 100) / 100));
      } else {
        grad.setAttribute("cx", "0.5");
        grad.setAttribute("cy", "0.5");
        grad.setAttribute("r", "0.5");
      }
      while (grad.firstChild) grad.removeChild(grad.firstChild);
      const mkStop = (offset: string, color: string) => {
        const s = doc.createElementNS("http://www.w3.org/2000/svg", "stop");
        s.setAttribute("offset", offset);
        s.setAttribute("stop-color", color);
        return s;
      };
      grad.appendChild(mkStop("0%", start));
      grad.appendChild(mkStop("100%", end));
      el.setAttribute("fill", `url(#${gradId})`);
    });
    setLocalAttributes((prev) => ({ ...prev, fill: `url(#${gradId})` }));
  };

  // Pattern fill: a <pattern> def tiled over the element. The pattern type
  // is stored on the def as data-pattern-type so it can be read back.
  const patternInfo = useMemo(() => {
    if (!animation?.svg || !selectedElementId) return null;
    try {
      const doc = new DOMParser().parseFromString(animation.svg, "image/svg+xml");
      const el = doc.getElementById(selectedElementId);
      if (!el) return null;
      const m = /^url\(#([^)]+)\)$/.exec((el.getAttribute("fill") || "").trim());
      if (!m) return null;
      const pat = doc.getElementById(m[1]!);
      if (!pat || pat.tagName.toLowerCase() !== "pattern") return null;
      const children = Array.from(pat.children);
      const bg = children[0]?.getAttribute("fill") || "#ffffff";
      const fgEl = children[1];
      const fg = fgEl?.getAttribute("fill") || fgEl?.getAttribute("stroke") || "#2391FF";
      const size = parseFloat(pat.getAttribute("width") || "20") || 20;
      return { id: m[1]!, type: pat.getAttribute("data-pattern-type") || "dots", bg, fg, size };
    } catch {
      return null;
    }
  }, [animation?.svg, selectedElementId]);

  const updatePattern = (type: "dots" | "stripes" | "checker" | "grid", fg: string, bg: string, size: number) => {
    const patId = patternInfo?.id || `pattern-${Math.random().toString(36).substring(2, 6)}`;
    applyDocUpdate((doc, el) => {
      const defs = ensureDefs(doc);
      const existingPat = doc.getElementById(patId);
      let pat: Element;
      if (!existingPat || existingPat.tagName.toLowerCase() !== "pattern") {
        pat = doc.createElementNS("http://www.w3.org/2000/svg", "pattern");
        pat.setAttribute("id", patId);
        defs.appendChild(pat);
      } else {
        pat = existingPat;
      }
      pat.setAttribute("patternUnits", "userSpaceOnUse");
      pat.setAttribute("width", String(size));
      pat.setAttribute("height", String(size));
      pat.setAttribute("data-pattern-type", type);
      while (pat.firstChild) pat.removeChild(pat.firstChild);
      const rect = (x: number, y: number, w: number, h: number, fill: string) => {
        const r = doc.createElementNS("http://www.w3.org/2000/svg", "rect");
        r.setAttribute("x", String(x)); r.setAttribute("y", String(y));
        r.setAttribute("width", String(w)); r.setAttribute("height", String(h));
        r.setAttribute("fill", fill);
        return r;
      };
      pat.appendChild(rect(0, 0, size, size, bg));
      if (type === "dots") {
        const c = doc.createElementNS("http://www.w3.org/2000/svg", "circle");
        c.setAttribute("cx", String(size / 2)); c.setAttribute("cy", String(size / 2));
        c.setAttribute("r", String(Math.max(1, size * 0.18))); c.setAttribute("fill", fg);
        pat.appendChild(c);
      } else if (type === "stripes") {
        pat.appendChild(rect(0, 0, size * 0.35, size, fg));
      } else if (type === "checker") {
        pat.appendChild(rect(0, 0, size / 2, size / 2, fg));
        pat.appendChild(rect(size / 2, size / 2, size / 2, size / 2, fg));
      } else {
        const p = doc.createElementNS("http://www.w3.org/2000/svg", "path");
        p.setAttribute("d", `M ${size} 0 V ${size} M 0 ${size} H ${size}`);
        p.setAttribute("fill", "none"); p.setAttribute("stroke", fg); p.setAttribute("stroke-width", "1");
        pat.appendChild(p);
      }
      el.setAttribute("fill", `url(#${patId})`);
    });
    setLocalAttributes((prev) => ({ ...prev, fill: `url(#${patId})` }));
  };

  // Marker (arrowhead/dot) for stroke ends, created in defs on demand.
  const updateMarker = (position: "start" | "end", kind: "none" | "arrow" | "dot") => {
    const attr = position === "start" ? "marker-start" : "marker-end";
    if (kind === "none") {
      updateAttribute(attr, "");
      return;
    }
    const markerId = `marker-${kind}-${position}`;
    applyDocUpdate((doc, el) => {
      const defs = ensureDefs(doc);
      const existingMarker = doc.getElementById(markerId);
      if (!existingMarker) {
        const marker = doc.createElementNS("http://www.w3.org/2000/svg", "marker");
        marker.setAttribute("id", markerId);
        marker.setAttribute("markerWidth", "10");
        marker.setAttribute("markerHeight", "10");
        marker.setAttribute("refX", position === "start" ? "1" : "9");
        marker.setAttribute("refY", "3");
        marker.setAttribute("orient", "auto");
        const shape = doc.createElementNS("http://www.w3.org/2000/svg", kind === "arrow" ? "path" : "circle");
        if (kind === "arrow") {
          shape.setAttribute("d", position === "start" ? "M9,0 L9,6 L0,3 z" : "M0,0 L0,6 L9,3 z");
        } else {
          shape.setAttribute("cx", "3");
          shape.setAttribute("cy", "3");
          shape.setAttribute("r", "3");
        }
        shape.setAttribute("fill", "context-stroke");
        marker.appendChild(shape);
        defs.appendChild(marker);
      }
      el.setAttribute(attr, `url(#${markerId})`);
    });
    setLocalAttributes((prev) => ({ ...prev, [attr]: `url(#${markerId})` }));
  };

  const filterInfo = useMemo(() => {
    if (!animation?.svg || !selectedElementId) return null;
    try {
      const doc = new DOMParser().parseFromString(animation.svg, "image/svg+xml");
      const el = doc.getElementById(selectedElementId);
      if (!el) return null;
      const m = /^url\(#([^)]+)\)$/.exec((el.getAttribute("filter") || "").trim());
      if (!m) return null;
      const filter = doc.getElementById(m[1]!);
      if (!filter) return null;
      const first = filter.firstElementChild?.tagName.toLowerCase();
      if (first === "fegaussianblur") return "Blur";
      if (first === "fedropshadow") return "Drop shadow";
      return null;
    } catch {
      return null;
    }
  }, [animation?.svg, selectedElementId]);

  // Colours already used in this file, for the colour picker's Document palette.
  const documentColors = useMemo(() => {
    if (!animation?.svg) return [];
    try {
      const doc = new DOMParser().parseFromString(animation.svg, "image/svg+xml");
      const found: string[] = [];
      doc.querySelectorAll("*").forEach((el) => {
        ["fill", "stroke", "stop-color"].forEach((attr) => {
          const v = el.getAttribute(attr);
          if (v && /^#[0-9a-f]{3,8}$/i.test(v.trim()) && !found.some((c) => c.toLowerCase() === v.trim().toLowerCase())) found.push(v.trim());
        });
      });
      return found.slice(0, 12);
    } catch {
      return [];
    }
  }, [animation?.svg]);

  const updateFilter = (kind: "none" | "blur" | "shadow", blur = 4) => {
    if (kind === "none") {
      updateAttribute("filter", "");
      return;
    }
    const safeId = (selectedElementId || "el").replace(/[^a-zA-Z0-9_-]/g, "_");
    const filterId = `filter-${safeId}`;
    applyDocUpdate((doc, el) => {
      const defs = ensureDefs(doc);
      const existingFilter = doc.getElementById(filterId);
      const filter = existingFilter ?? doc.createElementNS("http://www.w3.org/2000/svg", "filter");
      if (!existingFilter) {
        filter.setAttribute("id", filterId);
        filter.setAttribute("x", "-20%");
        filter.setAttribute("y", "-20%");
        filter.setAttribute("width", "140%");
        filter.setAttribute("height", "140%");
        defs.appendChild(filter);
      }
      while (filter.firstChild) filter.removeChild(filter.firstChild);
      const prim = doc.createElementNS("http://www.w3.org/2000/svg", kind === "blur" ? "feGaussianBlur" : "feDropShadow");
      if (kind === "blur") {
        prim.setAttribute("stdDeviation", String(blur));
      } else {
        prim.setAttribute("dx", "0");
        prim.setAttribute("dy", "4");
        prim.setAttribute("stdDeviation", String(blur));
        prim.setAttribute("flood-color", "#000000");
        prim.setAttribute("flood-opacity", "0.25");
      }
      filter.appendChild(prim);
      el.setAttribute("filter", `url(#${filterId})`);
    });
    setLocalAttributes((prev) => ({ ...prev, filter: `url(#${filterId})` }));
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
          <IconAdjustmentsHorizontalFilled className="size-8 text-muted-foreground" />
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
          icon={<IconSparklesFilled className="size-4" />}
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
          {(() => {
            const tag = selectedElement.tag;
            const supportsSize =
              tag !== "text" &&
              tag !== "tspan" &&
              tag !== "path" &&
              tag !== "polygon" &&
              tag !== "polyline" &&
              tag !== "line" &&
              tag !== "g" &&
              tag !== "svg";
            const isCircle = tag === "circle";
            const isEllipse = tag === "ellipse";
            const sizeAttr = (axis: "w" | "h") => {
              if (isCircle) return "r";
              if (isEllipse) return axis === "w" ? "rx" : "ry";
              return axis === "w" ? "width" : "height";
            };
            const sizeValue = (axis: "w" | "h") => {
              if (isCircle) {
                const r = parseFloat(attrs.r || "0") || 0;
                return String(Math.round(r * 2));
              }
              if (isEllipse) {
                const r = parseFloat(
                  (axis === "w" ? attrs.rx : attrs.ry) || "0",
                ) || 0;
                return String(Math.round(r * 2));
              }
              return attrs[axis === "w" ? "width" : "height"] || "0";
            };
            const setSize = (axis: "w" | "h", value: string) => {
              if (isCircle) {
                updateAttribute("r", String((parseFloat(value) || 0) / 2));
                return;
              }
              if (isEllipse) {
                updateAttribute(
                  axis === "w" ? "rx" : "ry",
                  String((parseFloat(value) || 0) / 2),
                );
                return;
              }
              updateAttribute(axis === "w" ? "width" : "height", value);
            };
            return (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <PropertyFieldWithUnit
                    label="X"
                    value={attrs.x || attrs.cx || "0"}
                    unit="x"
                    onChange={(v) => {
                      const attr =
                        isCircle || isEllipse ? "cx" : "x";
                      updateAttribute(attr, v);
                    }}
                  />
                  <PropertyFieldWithUnit
                    label="Y"
                    value={attrs.y || attrs.cy || "0"}
                    unit="y"
                    onChange={(v) => {
                      const attr =
                        isCircle || isEllipse ? "cy" : "y";
                      updateAttribute(attr, v);
                    }}
                  />
                </div>
                {supportsSize ? (
                  <div className="grid grid-cols-2 gap-2">
                    <PropertyFieldWithUnit
                      label="W"
                      value={sizeValue("w")}
                      unit="w"
                      onChange={(v) => setSize("w", v)}
                    />
                    <PropertyFieldWithUnit
                      label="H"
                      value={sizeValue("h")}
                      unit="h"
                      onChange={(v) => setSize("h", v)}
                    />
                  </div>
                ) : null}
                {(selectedElement.tag === "text" ||
                  selectedElement.tag === "tspan") && (
                  <PropertyField
                    label="Content"
                    value={textContent}
                    onChange={(v) => updateTextContent(v)}
                    multiline
                  />
                )}
              </>
            );
          })()}
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

        {/* Image Section */}
        {selectedElement.tag === "image" && (
          <PropertySection
            title="Image"
            icon={<IconPhotoFilled className="size-4" />}
            isExpanded={expanded.has("link")}
            onToggle={() => toggleSection("link")}
          >
            <div className="space-y-3">
              <div
                className="grid h-24 place-items-center overflow-hidden rounded-md border border-border"
                style={{
                  backgroundImage:
                    "repeating-conic-gradient(#d4d4d4 0% 25%, #ffffff 0% 50%)",
                  backgroundSize: "14px 14px",
                }}
              >
                {attrs.href || attrs["xlink:href"] ? (
                  <img
                    src={attrs.href || attrs["xlink:href"]}
                    alt="Selected image preview"
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <span className="text-[11px] text-muted-foreground">
                    No image source
                  </span>
                )}
              </div>

              <PropertyField
                label="Image URL or data URI"
                value={attrs.href || attrs["xlink:href"] || ""}
                onChange={(v) => updateAttribute("href", v)}
                placeholder="https://…"
              />

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 flex-1 gap-1.5 text-xs"
                  onClick={() => imageFileInputRef.current?.click()}
                >
                  <IconPhotoFilled className="size-3.5 text-sky-500" />
                  Replace image…
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1.5 text-xs text-muted-foreground"
                  onClick={() =>
                    window.open(
                      attrs.href || attrs["xlink:href"],
                      "_blank",
                      "noopener,noreferrer",
                    )
                  }
                  disabled={!attrs.href && !attrs["xlink:href"]}
                  title="Open image in a new tab"
                >
                  <IconLinkFilled className="size-3.5" />
                  Open
                </Button>
                <input
                  ref={imageFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      const href = event.target?.result;
                      if (typeof href !== "string") return;
                      updateAttribute("href", href);
                      const probe = new Image();
                      probe.onload = () => {
                        const ratio =
                          probe.width && probe.height
                            ? probe.width / probe.height
                            : 1;
                        const boxW = parseFloat(attrs.width || "100") || 100;
                        updateAttribute(
                          "height",
                          String(Math.max(1, Math.round(boxW / ratio))),
                        );
                      };
                      probe.src = href;
                    };
                    reader.readAsDataURL(file);
                  }}
                />
              </div>

              <PropertyMenuSelect
                label="Fit"
                value={
                  (attrs.preserveAspectRatio || "").includes("slice")
                    ? "cover"
                    : (attrs.preserveAspectRatio || "").includes("none")
                      ? "stretch"
                      : "contain"
                }
                options={[
                  { value: "contain", label: "Contain (keep ratio)" },
                  { value: "cover", label: "Cover (crop to box)" },
                  { value: "stretch", label: "Stretch to box" },
                ]}
                onChange={(v) =>
                  updateAttribute(
                    "preserveAspectRatio",
                    v === "cover"
                      ? "xMidYMid slice"
                      : v === "stretch"
                        ? "none"
                        : "xMidYMid meet",
                  )
                }
              />

              <p className="text-[10px] leading-relaxed text-muted-foreground">
                Tip: drop an image file onto the canvas, or paste one from the
                clipboard, to add it as an element.
              </p>
            </div>
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
              label="Order"
              value={
                attrs["paint-order"] === "stroke fill markers"
                  ? "Stroke, Fill, Markers"
                  : attrs["paint-order"] === "fill markers stroke"
                    ? "Fill, Markers, Stroke"
                    : "Fill, Stroke, Markers"
              }
              options={["Fill, Stroke, Markers", "Stroke, Fill, Markers", "Fill, Markers, Stroke"]}
              onChange={(v) =>
                updateAttribute(
                  "paint-order",
                  v === "Stroke, Fill, Markers"
                    ? "stroke fill markers"
                    : v === "Fill, Markers, Stroke"
                      ? "fill markers stroke"
                      : "fill stroke markers",
                )
              }
            />
            <div className="flex items-center gap-2">
              <PropertySelect
                label="Blending"
                value={(() => {
                  const mode = /mix-blend-mode\s*:\s*([^;]+)/.exec(attrs.style || "")?.[1]?.trim();
                  const byMode: Record<string, string> = {
                    multiply: "Multiply",
                    screen: "Screen",
                    overlay: "Overlay",
                    darken: "Darken",
                    lighten: "Lighten",
                    "color-dodge": "Color Dodge",
                    "color-burn": "Color Burn",
                  };
                  return mode ? (byMode[mode] ?? "Normal") : "Normal";
                })()}
                options={["Normal", "Multiply", "Screen", "Overlay", "Darken", "Lighten", "Color Dodge", "Color Burn"]}
                onChange={(v) => {
                  const byLabel: Record<string, string> = {
                    Multiply: "multiply",
                    Screen: "screen",
                    Overlay: "overlay",
                    Darken: "darken",
                    Lighten: "lighten",
                    "Color Dodge": "color-dodge",
                    "Color Burn": "color-burn",
                  };
                  const currentStyle = (attrs.style || "").trim();
                  const withoutBlend = currentStyle
                    .replace(/\s*;?\s*mix-blend-mode\s*:\s*[^;]+\s*;?/g, "")
                    .replace(/^;+|;+$/g, "")
                    .trim();
                  const mode = byLabel[v];
                  updateAttribute(
                    "style",
                    mode
                      ? [withoutBlend, `mix-blend-mode: ${mode}`].filter(Boolean).join("; ")
                      : withoutBlend,
                  );
                }}
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
                documentColors={documentColors}
              />
              <PropertyColorField
                label="Stroke"
                value={attrs.stroke || "none"}
                onChange={(v) => updateAttribute("stroke", v)}
                allowNone
                documentColors={documentColors}
              />
            </div>
            <PropertySelect
              label="Fill type"
              value={patternInfo ? "Pattern" : gradientInfo ? (gradientInfo.type === "lineargradient" ? "Linear gradient" : "Radial gradient") : "Solid"}
              options={["Solid", "Linear gradient", "Radial gradient", "Pattern"]}
              onChange={(v) => {
                if (v === "Solid") {
                  updateGradient("solid", [{ color: gradientInfo?.stops[0]?.color || (attrs.fill && !attrs.fill.startsWith("url(") ? attrs.fill : "#000000") }]);
                } else if (v === "Linear gradient") {
                  updateGradient("lineargradient", [{ color: attrs.fill && !attrs.fill.startsWith("url(") ? attrs.fill : "#2391FF" }, { color: "#ffffff" }], gradientInfo?.angle ?? 90);
                } else if (v === "Radial gradient") {
                  updateGradient("radialgradient", [{ color: attrs.fill && !attrs.fill.startsWith("url(") ? attrs.fill : "#2391FF" }, { color: "#ffffff" }]);
                } else {
                  updatePattern("dots", "#2391FF", "#ffffff", 20);
                }
              }}
            />
            {patternInfo ? (
              <div className="space-y-3">
                <PropertySelect
                  label="Pattern"
                  value={patternInfo.type === "dots" ? "Dots" : patternInfo.type === "stripes" ? "Stripes" : patternInfo.type === "checker" ? "Checker" : "Grid"}
                  options={["Dots", "Stripes", "Checker", "Grid"]}
                  onChange={(v) => updatePattern(v === "Dots" ? "dots" : v === "Stripes" ? "stripes" : v === "Checker" ? "checker" : "grid", patternInfo.fg, patternInfo.bg, patternInfo.size)}
                />
                <div className="grid grid-cols-2 gap-2">
                  <PropertyColorField label="Pattern colour" value={patternInfo.fg} onChange={(v) => updatePattern(patternInfo.type as "dots" | "stripes" | "checker" | "grid", v, patternInfo.bg, patternInfo.size)} />
                  <PropertyColorField label="Pattern background" value={patternInfo.bg} onChange={(v) => updatePattern(patternInfo.type as "dots" | "stripes" | "checker" | "grid", patternInfo.fg, v, patternInfo.size)} />
                </div>
                <PropertySlider label="Pattern size" value={patternInfo.size} onChange={(v) => updatePattern(patternInfo.type as "dots" | "stripes" | "checker" | "grid", patternInfo.fg, patternInfo.bg, v)} min={8} max={80} unit="px" />
              </div>
            ) : null}
            {gradientInfo ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <PropertyColorField
                    label="Gradient start"
                    value={gradientInfo.stops[0]?.color || "#2391FF"}
                    onChange={(v) => updateGradient(gradientInfo.type as "lineargradient" | "radialgradient", [{ color: v }, { color: gradientInfo.stops[1]?.color || "#ffffff" }], gradientInfo.angle)}
                  />
                  <PropertyColorField
                    label="Gradient end"
                    value={gradientInfo.stops[1]?.color || "#ffffff"}
                    onChange={(v) => updateGradient(gradientInfo.type as "lineargradient" | "radialgradient", [{ color: gradientInfo.stops[0]?.color || "#2391FF" }, { color: v }], gradientInfo.angle)}
                  />
                </div>
                {gradientInfo.type === "lineargradient" ? (
                  <PropertySlider
                    label="Gradient angle"
                    value={gradientInfo.angle}
                    onChange={(v) => updateGradient("lineargradient", [{ color: gradientInfo.stops[0]?.color || "#2391FF" }, { color: gradientInfo.stops[1]?.color || "#ffffff" }], v)}
                    min={0}
                    max={360}
                    unit="°"
                  />
                ) : null}
              </div>
            ) : null}
            <PropertyFieldWithUnit
              label="Stroke Width"
              value={attrs["stroke-width"] || "1"}
              unit="px"
              onChange={(v) => updateAttribute("stroke-width", v)}
            />
            <div className="grid grid-cols-2 gap-2">
              <PropertySelect
                label="Dash"
                value={
                  !attrs["stroke-dasharray"] ? "None"
                    : attrs["stroke-dasharray"] === "6 4" ? "Dashed"
                    : attrs["stroke-dasharray"] === "0.1 5" ? "Dotted"
                    : attrs["stroke-dasharray"] === "10 4 2 4" ? "Dash-dot"
                    : "Custom"
                }
                options={["None", "Dashed", "Dotted", "Dash-dot", "Custom"]}
                onChange={(v) => {
                  if (v === "None") updateAttribute("stroke-dasharray", "");
                  else if (v === "Dashed") updateAttribute("stroke-dasharray", "6 4");
                  else if (v === "Dotted") updateAttribute("stroke-dasharray", "0.1 5");
                  else if (v === "Dash-dot") updateAttribute("stroke-dasharray", "10 4 2 4");
                }}
              />
              <PropertySelect
                label="Cap"
                value={attrs["stroke-linecap"] || "butt"}
                options={["butt", "round", "square"]}
                onChange={(v) => updateAttribute("stroke-linecap", v)}
              />
              <PropertySelect
                label="Join"
                value={attrs["stroke-linejoin"] || "miter"}
                options={["miter", "round", "bevel"]}
                onChange={(v) => updateAttribute("stroke-linejoin", v)}
              />
              <PropertyField
                label="Miter limit"
                value={attrs["stroke-miterlimit"] || "4"}
                onChange={(v) => updateAttribute("stroke-miterlimit", v)}
              />
            </div>
            {attrs["stroke-dasharray"] && !["6 4", "0.1 5", "10 4 2 4"].includes(attrs["stroke-dasharray"]) ? (
              <PropertyField
                label="Custom dash pattern"
                value={attrs["stroke-dasharray"]}
                onChange={(v) => updateAttribute("stroke-dasharray", v)}
                placeholder="e.g. 8 3 2 3"
              />
            ) : null}
            <div className="grid grid-cols-2 gap-2">
              <PropertySelect
                label="Start marker"
                value={attrs["marker-start"] === "url(#marker-arrow-start)" ? "Arrow" : attrs["marker-start"] === "url(#marker-dot-start)" ? "Dot" : "None"}
                options={["None", "Arrow", "Dot"]}
                onChange={(v) => updateMarker("start", v === "Arrow" ? "arrow" : v === "Dot" ? "dot" : "none")}
              />
              <PropertySelect
                label="End marker"
                value={attrs["marker-end"] === "url(#marker-arrow-end)" ? "Arrow" : attrs["marker-end"] === "url(#marker-dot-end)" ? "Dot" : "None"}
                options={["None", "Arrow", "Dot"]}
                onChange={(v) => updateMarker("end", v === "Arrow" ? "arrow" : v === "Dot" ? "dot" : "none")}
              />
            </div>
          </div>
        </PropertySection>

        {/* Filters: blur and drop-shadow, written as real <filter> defs */}
        <PropertySection
          title="Filters"
          icon={<IconAdjustmentsHorizontalFilled className="size-4" />}
          isExpanded={expanded.has("filters")}
          onToggle={() => toggleSection("filters")}
        >
          <div className="space-y-3">
            <PropertySelect
              label="Filter"
              value={filterInfo ?? "None"}
              options={["None", "Blur", "Drop shadow"]}
              onChange={(v) => {
                if (v === "None") updateFilter("none");
                else if (v === "Blur") updateFilter("blur", 4);
                else updateFilter("shadow", 4);
              }}
            />
            <p className="text-[10px] leading-relaxed text-muted-foreground">
              Blur and drop shadow are stored as a filter in the file's defs and applied to this element.
            </p>
          </div>
        </PropertySection>

        {/* Generic attributes: edit anything not covered above */}
        <PropertySection
          title="Attributes"
          icon={<IconAdjustmentsHorizontalFilled className="size-4" />}
          isExpanded={expanded.has("attributes")}
          onToggle={() => toggleSection("attributes")}
        >
          <div className="space-y-2">
            {Object.keys(attrs)
              .sort()
              .map((name) => (
                <PropertyField
                  key={name}
                  label={name}
                  value={attrs[name] ?? ""}
                  onChange={(v) => updateAttribute(name, v)}
                />
              ))}
            {Object.keys(attrs).length === 0 ? (
              <p className="text-xs text-muted-foreground">No attributes.</p>
            ) : null}
          </div>
        </PropertySection>

        {/* Hover Section: this element animates when the pointer is over it */}
        <PropertySection
          title="Hover"
          icon={<IconPointerFilled className="size-4" />}
          isExpanded={expanded.has("hover")}
          onToggle={() => toggleSection("hover")}
        >
          <div className="space-y-3">
            <PropertySelect
              label="Effect"
              value={
                !currentHover
                  ? "None"
                  : currentHover.effect === "scale"
                    ? "Grow"
                    : currentHover.effect === "color"
                      ? "Colour"
                      : currentHover.effect === "rotate"
                        ? "Spin"
                        : currentHover.effect === "bounce"
                          ? "Bounce"
                          : currentHover.effect === "glow"
                            ? "Glow"
                            : "Lift"
              }
              options={["None", "Grow", "Colour", "Spin", "Bounce", "Glow", "Lift"]}
              onChange={(v) => {
                if (v === "None") {
                  saveHover(null);
                  return;
                }
                const effect =
                  v === "Grow"
                    ? "scale"
                    : v === "Colour"
                      ? "color"
                      : v === "Spin"
                        ? "rotate"
                        : v === "Bounce"
                          ? "bounce"
                          : v === "Glow"
                            ? "glow"
                            : "lift";
                saveHover(hoverEffectWithDefaults(effect, currentHover));
              }}
            />
            {currentHover ? (
              <PropertySlider
                label="Duration"
                value={currentHover.durationMs ?? 250}
                onChange={(v) => saveHover({ ...currentHover, durationMs: v })}
                min={100}
                max={1000}
                unit="ms"
              />
            ) : null}
            {currentHover?.effect === "scale" ? (
              <PropertySlider
                label="Grow to"
                value={Math.round((currentHover.amount ?? 1.15) * 100)}
                onChange={(v) => saveHover({ ...currentHover, amount: v / 100 })}
                min={105}
                max={150}
                unit="%"
              />
            ) : null}
            {currentHover?.effect === "rotate" ? (
              <PropertySlider
                label="Turn"
                value={currentHover.amount ?? 15}
                onChange={(v) => saveHover({ ...currentHover, amount: v })}
                min={-180}
                max={180}
                unit="°"
              />
            ) : null}
            {currentHover?.effect === "lift" || currentHover?.effect === "bounce" ? (
              <PropertySlider
                label={currentHover.effect === "lift" ? "Lift by" : "Bounce height"}
                value={Math.abs(
                  currentHover.amount ?? (currentHover.effect === "lift" ? -10 : 12),
                )}
                onChange={(v) =>
                  saveHover({
                    ...currentHover,
                    amount: currentHover.effect === "lift" ? -v : v,
                  })
                }
                min={2}
                max={40}
                unit="px"
              />
            ) : null}
            {currentHover?.effect === "color" ? (
              <PropertyColorField
                label="Hover colour"
                value={currentHover.color ?? "#2391FF"}
                onChange={(v) => saveHover({ ...currentHover, color: v })}
                documentColors={documentColors}
              />
            ) : null}
            {currentHover?.effect === "glow" ? (
              <PropertyColorField
                label="Glow colour"
                value={currentHover.color ?? "#2391FF"}
                onChange={(v) => saveHover({ ...currentHover, color: v })}
                documentColors={documentColors}
              />
            ) : null}
            <p className="text-[10px] leading-relaxed text-muted-foreground">
              Plays when the pointer hovers this element — on the canvas and in the exported SVG.
            </p>
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
            <IconTrashFilled className="size-3" />
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
              <IconSearchFilled className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
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
                        <IconCheckFilled className="size-3.5 shrink-0" />
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

function PropertyColorField({
  label,
  value,
  onChange,
  allowNone = false,
  documentColors,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  allowNone?: boolean;
  documentColors?: string[];
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <ColorPicker value={value} onChange={onChange} allowNone={allowNone} documentColors={documentColors} />
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
  onImportSvg,
  onTitleChange,
  onSave,
  onPreviewSvg,
  onUndo,
  onRedo,
  canUndo = true,
  canRedo = true,
  sidebarWidth = 256,
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
  onAddElement: (type: AddableElement) => void;
  onAddImage: (data: File | string) => void;
  onImportSvg?: (svgText: string) => void;
  onTitleChange?: (next: string) => void;
  onSave: (next: MotionAnimation) => Promise<boolean>;
  onPreviewSvg?: (svg: string) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  /** Width of the resizable sidebar, used to collapse the tab labels. */
  sidebarWidth?: number;
}) {
  const [activeTab, setActiveTab] = useState<"elements" | "properties" | "keyframe">("elements");
  // Below 320px the three labels (especially "Properties") no longer fit
  // next to an icon in three equal buttons, so the tabs collapse to icons
  // only. The icon still carries the tab name as its title and aria-label.
  const compactTabs = sidebarWidth < 320;
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

  // Tapping a timeline diamond opens the Keyframe tab, so the editor is
  // visible immediately instead of hiding behind the current tab.
  useEffect(() => {
    const openKeyframeTab = () => setActiveTab("keyframe");
    window.addEventListener("keyframe-editor:open", openKeyframeTab);
    return () => window.removeEventListener("keyframe-editor:open", openKeyframeTab);
  }, []);

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      {/* Header with title and undo/redo */}
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-sidebar-border px-2">
        {/* Home button. This used to be a bare 24x14 icon with no label,
            no hover state and no tooltip, so clicking anywhere near the
            top-left corner — but not exactly on those 14 pixels — did
            nothing, and nothing told you it was the way home. It is now
            a full 32px button with a hover background and a Home tooltip,
            so the whole corner target goes to /home. */}
        <Link
          to="/home"
          title="Home"
          aria-label="Go home"
          className="grid size-8 shrink-0 place-items-center rounded-md text-sidebar-accent-foreground transition-colors hover:bg-sidebar-accent"
        >
          <AgentNativeIcon aria-hidden="true" className="h-3.5 w-6" />
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
          disabled={!canUndo}
          className="relative group grid size-7 shrink-0 place-items-center rounded-md text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-35"
          aria-label={canUndo ? "Undo" : "Nothing to undo"}
        >
          <IconArrowBackUp className="size-[18px]" strokeWidth={2.5} />
          <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-1.5 py-0.5 text-[11px] font-medium text-background opacity-0 shadow transition-opacity group-hover:opacity-100">Undo</span>
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="relative group grid size-7 shrink-0 place-items-center rounded-md text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-35"
          aria-label={canRedo ? "Redo" : "Nothing to redo"}
        >
          <IconArrowForwardUp className="size-[18px]" strokeWidth={2.5} />
          <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-1.5 py-0.5 text-[11px] font-medium text-background opacity-0 shadow transition-opacity group-hover:opacity-100">Redo</span>
        </button>
      </div>

      {/* Elements / Properties / Keyframe segmented control */}
      <div className="shrink-0 border-b border-sidebar-border bg-sidebar p-1.5">
        <ButtonGroup className="w-full">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setActiveTab("elements")}
            aria-pressed={activeTab === "elements"}
            aria-label="Elements"
            title="Elements"
            className={`h-8 flex-1 gap-1.5 px-2 text-[12px] font-medium ${
              activeTab === "elements"
                ? "border-[#2391FF] bg-[#2391FF] text-white hover:bg-[#1f83e6] hover:text-white dark:border-[#2391FF] dark:bg-[#2391FF] dark:hover:bg-[#1f83e6]"
                : "bg-transparent text-sidebar-foreground hover:bg-sidebar-accent dark:bg-transparent"
            }`}
          >
            <IconFolderFilled className="size-4 shrink-0" />
            {compactTabs ? null : "Elements"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setActiveTab("properties")}
            aria-pressed={activeTab === "properties"}
            aria-label="Properties"
            title="Properties"
            className={`h-8 flex-1 gap-1.5 px-2 text-[12px] font-medium ${
              activeTab === "properties"
                ? "border-[#2391FF] bg-[#2391FF] text-white hover:bg-[#1f83e6] hover:text-white dark:border-[#2391FF] dark:bg-[#2391FF] dark:hover:bg-[#1f83e6]"
                : "bg-transparent text-sidebar-foreground hover:bg-sidebar-accent dark:bg-transparent"
            }`}
          >
            <IconAdjustmentsHorizontalFilled className="size-4 shrink-0" />
            {compactTabs ? null : "Properties"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setActiveTab("keyframe")}
            aria-pressed={activeTab === "keyframe"}
            aria-label="Keyframe"
            title="Keyframe"
            className={`h-8 flex-1 gap-1.5 px-2 text-[12px] font-medium ${
              activeTab === "keyframe"
                ? "border-[#2391FF] bg-[#2391FF] text-white hover:bg-[#1f83e6] hover:text-white dark:border-[#2391FF] dark:bg-[#2391FF] dark:hover:bg-[#1f83e6]"
                : "bg-transparent text-sidebar-foreground hover:bg-sidebar-accent dark:bg-transparent"
            }`}
          >
            <IconDiamondFilled className="size-4 shrink-0" />
            {compactTabs ? null : "Keyframe"}
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
            {...(onImportSvg ? { onImportSvg } : {})}
            onSave={onSave}
            {...(onTitleChange && { onTitleChange })}
            {...(onUndo && { onUndo })}
            {...(onRedo && { onRedo })}
            canUndo={canUndo}
            canRedo={canRedo}
            hideHeader={true}
          />
        ) : activeTab === "properties" ? (
          <PropertiesPanel
            animation={animation}
            selectedElementId={selectedElementId}
            onSave={onSave}
            {...(onPreviewSvg ? { onPreviewSvg } : {})}
            onSelectElement={onSelectElement}
          />
        ) : (
          <div className="flex h-full flex-col overflow-y-auto">
            <p className="shrink-0 px-3 py-2 text-[11px] text-muted-foreground">
              Tap a diamond in the timeline to edit that keyframe.
            </p>
            {/* Keyframe editor slot: the timeline's KeyframeInspector renders
                here (via a portal from StudioWorkspace) instead of floating
                over the canvas, so editing a keyframe never covers the
                artwork. When no keyframe is selected this tab just shows the
                hint above. */}
            <div id="keyframe-inspector-slot" className="min-h-0 flex-1" />
          </div>
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
  onImportSvg,
  onTitleChange,
  onUndo,
  onRedo,
  canUndo = true,
  canRedo = true,
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
  onAddElement: (type: AddableElement) => void;
  onAddImage: (data: File | string) => void;
  onImportSvg?: (svgText: string) => void;
  onTitleChange?: (next: string) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onSave: (next: MotionAnimation) => Promise<boolean>;
  hideHeader?: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const svgFileInputRef = useRef<HTMLInputElement>(null);
  const { prompt, dialog: promptDialog } = usePromptDialog();
  const tree = useMemo(() => (animation ? parseElementTree(animation.svg) : null), [animation?.svg]);

  // Read-only list of defs (gradients, patterns, filters, markers, masks,
  // clips) for the Definitions help popover. These rows are deliberately
  // NOT selectable: defs are invisible, and selecting them would break
  // canvas selection and measurement, which was the reason they were
  // hidden from the tree in the first place.
  const defsList = useMemo(() => {
    if (!animation?.svg) return [] as Array<{ id: string; tag: string }>;
    try {
      const doc = new DOMParser().parseFromString(animation.svg, "image/svg+xml");
      const defs = doc.documentElement.querySelector("defs");
      if (!defs) return [];
      return Array.from(defs.children).map((el) => ({ id: el.getAttribute("id") || `<${el.tagName.toLowerCase()}>`, tag: el.tagName.toLowerCase() }));
    } catch {
      return [];
    }
  }, [animation?.svg]);

  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [defsHelpOpen, setDefsHelpOpen] = useState(false);
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

  const toggleCollapse = useCallback((key: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  /**
   * "Ask AI" on an element tags it in the agent composer. The context chip
   * carries the element's markup and its existing tracks, so the user only has
   * to type what they want changed. Selecting the element first also points the
   * agent's screen context at the same shape.
   *
   * When the right-clicked element is part of a multi-selection, every
   * selected id is tagged, with the right-clicked one first, so one prompt can
   * refer to all of them at once.
   */
  const handleAskAi = (node: TreeNode) => {
    if (!animation) return;
    const context = {
      projectId: animation.id,
      projectTitle: title || animation.title,
      svg: animation.svg,
      tracks: animation.tracks,
    };
    const isMulti =
      Boolean(node.id) &&
      selectedIds.length > 1 &&
      selectedIds.includes(node.id);

    if (!isMulti) {
      if (node.id) handleSelectNode(node.id, false);
      askAgentAboutElement({
        element: { tag: node.tag, id: node.id, path: node.path },
        label: getElementLabel(node),
        ...context,
      });
      return;
    }

    // Set the primary selection to the right-clicked element without
    // collapsing the multi-selection (the sync effect keeps it as long as
    // the primary id is a member).
    onSelectElement(node.id);
    const byId = collectTreeNodesById(tree);
    const others = selectedIds
      .filter((id) => id !== node.id)
      .map((id) => byId.get(id))
      .filter((item): item is TreeNode => Boolean(item));
    askAgentAboutElements({
      elements: [node, ...others].map((item) => ({
        element: { tag: item.tag, id: item.id, path: item.path },
        label: getElementLabel(item),
      })),
      ...context,
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
    // Root excluded, like totalElements/allCollapsed: it is not a row.
    tree.children.forEach(walk);
    setCollapsedIds(ids);
  };

  // Count total elements in tree
  // Counts visible rows only: the svg root is no longer rendered (see
  // the tree scroll area below), so it must not inflate the count.
  const totalElements = useMemo(() => {
    if (!tree) return 0;
    let count = 0;
    const walk = (n: TreeNode) => {
      count++;
      n.children.forEach(walk);
    };
    tree.children.forEach(walk);
    return count;
  }, [tree]);

  // Same root exclusion as totalElements: the svg root is not a
  // collapsible row anymore, so counting it would make "all collapsed"
  // permanently false.
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
    tree.children.forEach(walk);
    return parents > 0 && collapsedParents === parents;
  }, [tree, collapsedIds]);

  // Set of targets with animation tracks
  const animatedTargets = useMemo(() => {
    return new Set((animation?.tracks || []).map((t) => t.target));
  }, [animation?.tracks]);

  // Image elements get a real thumbnail in the tree when their source resolves.
  const imageSources = useMemo(() => {
    const sources = new Map<string, string>();
    if (!animation?.svg) return sources;
    try {
      const doc = new DOMParser().parseFromString(animation.svg, "image/svg+xml");
      doc.querySelectorAll("image").forEach((el) => {
        const id = el.getAttribute("id");
        const href =
          el.getAttribute("href") || el.getAttribute("xlink:href") || "";
        if (id && href) sources.set(id, href);
      });
    } catch {
      // Malformed SVG: fall back to the generic photo icon.
    }
    return sources;
  }, [animation?.svg]);

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

  // Guard against double-taps assigning two different ids to the same row
  // before the first save has re-rendered the tree.
  const assigningIdsRef = useRef(new Set<string>());

  /**
   * Tap-to-select for any Elements row, without touching the canvas element.
   *
   * Selection everywhere else in the studio is id-based, so an element with
   * no id cannot be selected as-is. Tapping it assigns it a stable id
   * (same `${tag}-xxxx` pattern as newly added elements), saves the SVG,
   * and then selects that id — which draws the canvas selection frame and
   * keeps the Elements panel open. The artboard root (path "") is not an
   * editable element, so tapping it does nothing.
   */
  const handleSelectTreeNode = useCallback(
    (node: TreeNode, additive: boolean) => {
      if (node.id) {
        handleSelectNode(node.id, additive);
        return;
      }
      if (!node.path || !animation) return;
      if (assigningIdsRef.current.has(node.path)) return;
      assigningIdsRef.current.add(node.path);
      void (async () => {
        try {
          const doc = new DOMParser().parseFromString(
            animation.svg,
            "image/svg+xml",
          );
          const element = getElementByPath(doc, node.path);
          if (!element || element === doc.documentElement) return;
          const base = node.tag.toLowerCase() || "element";
          let newId = `${base}-${Math.random().toString(36).slice(2, 6)}`;
          while (doc.getElementById(newId)) {
            newId = `${base}-${Math.random().toString(36).slice(2, 6)}`;
          }
          element.setAttribute("id", newId);
          if (additive) {
            setSelectedIds((prev) =>
              prev.includes(newId) ? prev : [...prev, newId],
            );
          } else {
            setSelectedIds([newId]);
          }
          await writeSvg(doc, newId);
        } finally {
          assigningIdsRef.current.delete(node.path);
        }
      })();
    },
    [animation, handleSelectNode, writeSvg],
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

  // Convert to component: keep the selected element as the master (still
  // editable in the tree) and create a <use> instance referencing it, so
  // editing the master updates every instance. Duplicate the instance
  // (Cmd/Ctrl+D on canvas) to place more copies, then drag each one away.
  const handleConvertToComponent = useCallback(
    async (node: TreeNode) => {
      if (!animation || !node.path || !node.id) {
        toast.error("Tap the row first to give this element an id, then convert it.");
        return;
      }
      if (node.tag.toLowerCase() === "use") {
        toast.error("That element is already an instance.");
        return;
      }
      if (animation.tracks.some((track) => track.target === node.id)) {
        toast.error("Remove this element's animation tracks before converting it.");
        return;
      }
      const doc = new DOMParser().parseFromString(animation.svg, "image/svg+xml");
      const element = getElementByPath(doc, node.path);
      if (!element || element === doc.documentElement) return;
      const parent = element.parentElement;
      if (!parent) return;
      const useEl = doc.createElementNS(SVG_NS, "use");
      let useId = `use-${Math.random().toString(36).slice(2, 6)}`;
      while (doc.getElementById(useId)) useId = `use-${Math.random().toString(36).slice(2, 6)}`;
      useEl.setAttribute("id", useId);
      useEl.setAttribute("href", `#${node.id}`);
      parent.insertBefore(useEl, element.nextSibling);
      await writeSvg(doc, useId);
      toast.success("Component created — the instance is selected, drag it away from the master");
    },
    [animation, writeSvg],
  );

  // Mask / clip: the first selected element is the shape, the rest are
  // targets. The shape's geometry is cloned into a <mask> (filled white,
  // so it reveals) or <clipPath> in defs, targets get mask/clip-path, and
  // the original shape is hidden so it doesn't draw on top of the result.
  const handleMaskOrClip = useCallback(
    async (kind: "mask" | "clip") => {
      if (!animation || selectedIds.length < 2) {
        toast.error("Select a shape first, then the elements to mask or clip (Cmd/Ctrl-click to multi-select)." );
        return;
      }
      const doc = new DOMParser().parseFromString(animation.svg, "image/svg+xml");
      const shapeEl = doc.getElementById(selectedIds[0]!);
      if (!shapeEl) return;
      const targets = selectedIds.slice(1).map((id) => doc.getElementById(id)).filter((el): el is HTMLElement => Boolean(el));
      if (targets.length === 0) return;
      let defs = doc.documentElement.querySelector("defs");
      if (!defs) {
        defs = doc.createElementNS(SVG_NS, "defs");
        doc.documentElement.insertBefore(defs, doc.documentElement.firstChild);
      }
      const defId = `${kind}-${Math.random().toString(36).slice(2, 6)}`;
      const defEl = doc.createElementNS(SVG_NS, kind === "mask" ? "mask" : "clipPath");
      defEl.setAttribute("id", defId);
      if (kind === "mask") {
        defEl.setAttribute("maskUnits", "userSpaceOnUse");
        defEl.setAttribute("x", "0");
        defEl.setAttribute("y", "0");
        defEl.setAttribute("width", "100%");
        defEl.setAttribute("height", "100%");
      }
      const clone = shapeEl.cloneNode(true) as Element;
      clone.removeAttribute("id");
      if (kind === "mask") {
        clone.setAttribute("fill", "#ffffff");
        clone.setAttribute("stroke", "none");
      }
      defEl.appendChild(clone);
      defs.appendChild(defEl);
      targets.forEach((t) => t.setAttribute(kind === "mask" ? "mask" : "clip-path", `url(#${defId})`));
      await writeSvg(doc, selectedIds[1]!);
      // Hide the original shape via the sidebar's hide toggle, using its tree node.
      // Note: selectedNodes is declared below this callback, so it must NOT
      // appear in this callback's dependency array — evaluating the deps
      // during render would crash with a TDZ error (same class of bug as
      // the earlier multiSelection crash). Walk the tree instead, which is
      // declared above.
      let shapeNode: TreeNode | undefined;
      const walk = (node: TreeNode) => {
        if (node.id === selectedIds[0]) { shapeNode = node; return; }
        node.children.forEach(walk);
      };
      if (tree) walk(tree);
      if (shapeNode && !hiddenIds.has(selectedIds[0]!)) onToggleHide(shapeNode);
      toast.success(kind === "mask" ? "Mask applied" : "Clip applied");
    },
    [animation, selectedIds, tree, writeSvg, onToggleHide, hiddenIds],
  );

  const handleClearMaskClip = useCallback(async () => {
    if (!animation || selectedIds.length === 0) return;
    const doc = new DOMParser().parseFromString(animation.svg, "image/svg+xml");
    selectedIds.forEach((id) => {
      const el = doc.getElementById(id);
      if (el) { el.removeAttribute("mask"); el.removeAttribute("clip-path"); }
    });
    await writeSvg(doc, selectedIds[0]!);
    toast.success("Mask / clip cleared");
  }, [animation, selectedIds, writeSvg]);

  // Convert a basic shape to an equivalent <path>, keeping its id, fill,
  // stroke and other attributes, so the Node tool can reshape it.
  const handleConvertToPath = useCallback(async (node: TreeNode) => {
    if (!animation || !node.path || !node.id) return;
    const doc = new DOMParser().parseFromString(animation.svg, "image/svg+xml");
    const el = getElementByPath(doc, node.path);
    if (!el) return;
    const tag = el.nodeName.toLowerCase();
    const num = (attr: string, fallback = 0) => parseFloat(el.getAttribute(attr) || "") || fallback;
    const round2 = (v: number) => Math.round(v * 100) / 100;
    let d = "";
    if (tag === "rect") {
      const x = num("x"), y = num("y"), w = num("width"), h = num("height");
      const rx = Math.min(num("rx", Math.min(num("rx"), w / 2)), h / 2);
      const ry = num("ry") ? Math.min(num("ry"), h / 2) : rx;
      if (rx > 0 || ry > 0) {
        d = `M ${round2(x + rx)} ${round2(y)} H ${round2(x + w - rx)} A ${round2(rx)} ${round2(ry)} 0 0 1 ${round2(x + w)} ${round2(y + ry)} V ${round2(y + h - ry)} A ${round2(rx)} ${round2(ry)} 0 0 1 ${round2(x + w - rx)} ${round2(y + h)} H ${round2(x + rx)} A ${round2(rx)} ${round2(ry)} 0 0 1 ${round2(x)} ${round2(y + h - ry)} V ${round2(y + ry)} A ${round2(rx)} ${round2(ry)} 0 0 1 ${round2(x + rx)} ${round2(y)} Z`;
      } else {
        d = `M ${round2(x)} ${round2(y)} H ${round2(x + w)} V ${round2(y + h)} H ${round2(x)} Z`;
      }
    } else if (tag === "circle") {
      const cx = num("cx"), cy = num("cy"), r = num("r");
      d = `M ${round2(cx - r)} ${round2(cy)} A ${round2(r)} ${round2(r)} 0 1 0 ${round2(cx + r)} ${round2(cy)} A ${round2(r)} ${round2(r)} 0 1 0 ${round2(cx - r)} ${round2(cy)} Z`;
    } else if (tag === "ellipse") {
      const cx = num("cx"), cy = num("cy"), rx = num("rx"), ry = num("ry");
      d = `M ${round2(cx - rx)} ${round2(cy)} A ${round2(rx)} ${round2(ry)} 0 1 0 ${round2(cx + rx)} ${round2(cy)} A ${round2(rx)} ${round2(ry)} 0 1 0 ${round2(cx - rx)} ${round2(cy)} Z`;
    } else if (tag === "polygon" || tag === "polyline") {
      const pts = (el.getAttribute("points") || "").trim().split(/[\s,]+/).map(Number).filter((n) => Number.isFinite(n));
      if (pts.length < 4) { toast.error("That shape has too few points to convert."); return; }
      d = `M ${round2(pts[0]!)} ${round2(pts[1]!)}`;
      for (let i = 2; i + 1 < pts.length; i += 2) d += ` L ${round2(pts[i]!)} ${round2(pts[i + 1]!)}`;
      if (tag === "polygon") d += " Z";
    } else if (tag === "line") {
      d = `M ${round2(num("x1"))} ${round2(num("y1"))} L ${round2(num("x2"))} ${round2(num("y2"))}`;
    } else {
      toast.error(`Cannot convert <${tag}> to a path — text and images have no outline to convert.`);
      return;
    }
    const path = doc.createElementNS(SVG_NS, "path");
    Array.from(el.attributes).forEach((attr) => {
      if (["x", "y", "width", "height", "rx", "ry", "cx", "cy", "r", "points", "x1", "y1", "x2", "y2"].includes(attr.name)) return;
      path.setAttribute(attr.name, attr.value);
    });
    path.setAttribute("d", d);
    el.parentElement?.replaceChild(path, el);
    await writeSvg(doc, node.id);
    toast.success("Converted to path");
  }, [animation, writeSvg]);

  // Simplify a straight-line path: drop points that lie on the line
  // between their neighbours (within 0.5 user units). Curved paths are
  // left alone, because flattening them would change the shape.
  const handleSimplifyPath = useCallback(async (node: TreeNode) => {
    if (!animation || !node.path) return;
    const doc = new DOMParser().parseFromString(animation.svg, "image/svg+xml");
    const el = getElementByPath(doc, node.path);
    if (!el || el.nodeName.toLowerCase() !== "path") return;
    const d = el.getAttribute("d") || "";
    // Any curve/arc command (C, Q, S, T, A) means the path is not
    // straight-line only; flattening it would change the shape.
    if (/[CQSTA]/i.test(d.replace(/\d/g, ""))) { toast.error("Simplify only works on straight-line paths for now."); return; }
    const tokens = d.match(/[MLHVZ]|-?\d*\.?\d+/gi) || [];
    const pts: Array<{ x: number; y: number }> = [];
    let closed = false;
    let i = 0;
    let cx = 0, cy = 0;
    while (i < tokens.length) {
      const tok = tokens[i++]!;
      if (tok === "M" || tok === "L") { cx = Number(tokens[i++]!); cy = Number(tokens[i++]!); pts.push({ x: cx, y: cy }); }
      else if (tok === "H") { cx = Number(tokens[i++]!); pts.push({ x: cx, y: cy }); }
      else if (tok === "V") { cy = Number(tokens[i++]!); pts.push({ x: cx, y: cy }); }
      else if (tok === "Z") { closed = true; }
      else { i++; }
    }
    if (pts.length < 3) { toast.error("Nothing to simplify in that path."); return; }
    const distToLine = (p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }) => {
      const dx = b.x - a.x, dy = b.y - a.y;
      const len = Math.hypot(dx, dy);
      if (len === 0) return Math.hypot(p.x - a.x, p.y - a.y);
      return Math.abs((p.x - a.x) * dy - (p.y - a.y) * dx) / len;
    };
    const kept = pts.filter((p, idx) => idx === 0 || idx === pts.length - 1 || distToLine(p, pts[idx - 1]!, pts[idx + 1]!) > 0.5);
    if (kept.length === pts.length) { toast.error("That path is already simplified."); return; }
    const nextD = `M ${kept[0]!.x} ${kept[0]!.y}` + kept.slice(1).map((p) => ` L ${p.x} ${p.y}`).join("") + (closed ? " Z" : "");
    el.setAttribute("d", nextD);
    await writeSvg(doc, node.id || null);
    toast.success(`Simplified ${pts.length} points to ${kept.length}`);
  }, [animation, writeSvg]);

  // Boolean path operations, via polygon-clipping. Curves are flattened
  // by sampling the path with getPointAtLength (the browser's own path
  // geometry), so the result is an approximation whose fidelity depends
  // on the sampling step — fine for filled shapes, not for hairline detail.
  // Both inputs must be closed paths; the second element is consumed.
  const handleBooleanOp = useCallback(async (op: "union" | "subtract" | "intersect") => {
    if (!animation || selectedIds.length < 2) { toast.error("Select two closed paths, first = base, second = operand."); return; }
    const doc = new DOMParser().parseFromString(animation.svg, "image/svg+xml");
    const baseEl = doc.getElementById(selectedIds[0]!);
    const otherEl = doc.getElementById(selectedIds[1]!);
    if (!baseEl || !otherEl || baseEl.nodeName.toLowerCase() !== "path" || otherEl.nodeName.toLowerCase() !== "path") { toast.error("Boolean operations need two <path> elements — convert shapes to paths first."); return; }
    const flatten = (d: string): Array<Array<[number, number]>> | null => {
      if (!/Z/i.test(d)) return null;
      const probe = document.createElementNS(SVG_NS, "path");
      probe.setAttribute("d", d);
      let total = 0;
      try { total = probe.getTotalLength(); } catch { return null; }
      if (!total) return null;
      const step = Math.max(2, total / 512);
      const pts: Array<[number, number]> = [];
      for (let len = 0; len < total; len += step) { const p = probe.getPointAtLength(len); pts.push([Math.round(p.x * 100) / 100, Math.round(p.y * 100) / 100]); }
      const end = probe.getPointAtLength(total);
      pts.push([Math.round(end.x * 100) / 100, Math.round(end.y * 100) / 100]);
      return [pts];
    };
    const basePoly = flatten(baseEl.getAttribute("d") || "");
    const otherPoly = flatten(otherEl.getAttribute("d") || "");
    if (!basePoly || !otherPoly) { toast.error("Both paths must be closed (end with Z)."); return; }
    let result: Array<Array<Array<[number, number]>>>;
    try {
      const clipping = await import("polygon-clipping").catch(() => null);
      if (!clipping) { toast.error("polygon-clipping is not installed — run pnpm install, then restart the dev server."); return; }
      result = op === "union" ? clipping.union(basePoly, otherPoly) : op === "subtract" ? clipping.difference(basePoly, otherPoly) : clipping.intersection(basePoly, otherPoly);
    } catch { toast.error("That boolean operation failed on these shapes."); return; }
    if (!result || result.length === 0) { toast.error("That operation produced an empty shape — nothing changed."); return; }
    const round2 = (v: number) => Math.round(v * 100) / 100;
    const d = result.map((polygon) => polygon.map((ring) => {
      if (ring.length === 0) return "";
      return `M ${round2(ring[0]![0])} ${round2(ring[0]![1])}` + ring.slice(1).map((pt) => ` L ${round2(pt[0])} ${round2(pt[1])}`).join("") + " Z";
    }).filter(Boolean).join(" ")).join(" ");
    baseEl.setAttribute("d", d);
    baseEl.setAttribute("fill-rule", "evenodd");
    otherEl.remove();
    await writeSvg(doc, selectedIds[0]!);
    toast.success(op === "union" ? "Union applied" : op === "subtract" ? "Subtract applied" : "Intersect applied");
  }, [animation, selectedIds, writeSvg]);

  // PNG tracing (silhouette only): load an image, threshold its alpha
  // channel, and follow the outer boundary of the first solid region
  // with Moore boundary tracing. Multi-colour artwork and interior
  // holes are NOT traced — the result is the outer silhouette as one
  // path, simplified to keep the point count manageable.
  const tracePngInputRef = useRef<HTMLInputElement>(null);
  const handleTracePngFile = useCallback(async (file: File) => {
    if (!animation) return;
    try {
      const url = URL.createObjectURL(file);
      const img = new Image();
      await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = () => reject(new Error("load")); img.src = url; });
      URL.revokeObjectURL(url);
      const maxDim = 256;
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, w, h);
      const data = ctx.getImageData(0, 0, w, h).data;
      const on = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && data[(y * w + x) * 4 + 3]! > 128;
      let startX = -1, startY = -1;
      outer: for (let y = 0; y < h; y++) { for (let x = 0; x < w; x++) { if (on(x, y)) { startX = x; startY = y; break outer; } } }
      if (startX < 0) { toast.error("No solid pixels found in that image."); return; }
      // Moore boundary tracing, 8 neighbours, clockwise from the backtrack direction.
      const dirs = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]] as const;
      const pts: Array<[number, number]> = [[startX, startY]];
      let cx = startX, cy = startY, backDir = 4; // came from the west
      for (let step = 0; step < w * h * 4; step++) {
        let moved = false;
        for (let k = 0; k < 8; k++) {
          const dirIdx = (backDir + 1 + k) % 8;
          const nx = cx + dirs[dirIdx]![0], ny = cy + dirs[dirIdx]![1];
          if (on(nx, ny)) {
            cx = nx; cy = ny; backDir = (dirIdx + 4) % 8;
            if (cx === startX && cy === startY) { moved = false; break; }
            pts.push([cx, cy]); moved = true; break;
          }
        }
        if (!moved) break;
        if (cx === startX && cy === startY) break;
      }
      if (pts.length < 4) { toast.error("Could not trace a boundary in that image."); return; }
      // Simplify: drop points within 1.5px of the line between neighbours.
      const kept: Array<[number, number]> = [];
      for (let i = 0; i < pts.length; i++) {
        const prev = pts[(i - 1 + pts.length) % pts.length]!;
        const cur = pts[i]!;
        const next = pts[(i + 1) % pts.length]!;
        const dx = next[0] - prev[0], dy = next[1] - prev[1];
        const len = Math.hypot(dx, dy) || 1;
        const dist = Math.abs((cur[0] - prev[0]) * dy - (cur[1] - prev[1]) * dx) / len;
        if (dist > 1.5 || kept.length === 0) kept.push(cur);
      }
      // Fit the traced silhouette into the artboard, centred, scaled down only.
      const doc = new DOMParser().parseFromString(animation.svg, "image/svg+xml");
      const root = doc.documentElement;
      const vb = (root.getAttribute("viewBox") || "0 0 200 200").split(/[\s,]+/).map(Number);
      const vbW = vb[2] || 200, vbH = vb[3] || 200, vbX = vb[0] || 0, vbY = vb[1] || 0;
      const fit = Math.min(1, vbW / w, vbH / h);
      const ox = vbX + (vbW - w * fit) / 2, oy = vbY + (vbH - h * fit) / 2;
      const round2 = (v: number) => Math.round(v * 100) / 100;
      const d = kept.map((pt, i) => `${i === 0 ? "M" : "L"} ${round2(ox + pt[0] * fit)} ${round2(oy + pt[1] * fit)}`).join(" ") + " Z";
      const path = doc.createElementNS(SVG_NS, "path");
      let id = `trace-${Math.random().toString(36).slice(2, 6)}`;
      while (doc.getElementById(id)) id = `trace-${Math.random().toString(36).slice(2, 6)}`;
      path.setAttribute("id", id);
      path.setAttribute("d", d);
      path.setAttribute("fill", "#000000");
      root.appendChild(path);
      await writeSvg(doc, id);
      toast.success(`Traced silhouette (${kept.length} points)`);
    } catch {
      toast.error("Could not trace that image.");
    }
  }, [animation, writeSvg]);

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

  const handleBringToFront = useCallback(
    async (node: TreeNode) => {
      if (!animation || !node.path) return;
      const doc = new DOMParser().parseFromString(animation.svg, "image/svg+xml");
      const element = getElementByPath(doc, node.path);
      if (!element || element === doc.documentElement) return;
      
      const parent = element.parentElement;
      if (!parent) return;
      
      // Move to last position in parent
      parent.appendChild(element);
      await writeSvg(doc, node.id || null);
      toast.success("Brought to front");
    },
    [animation, writeSvg],
  );

  const handleSendToBack = useCallback(
    async (node: TreeNode) => {
      if (!animation || !node.path) return;
      const doc = new DOMParser().parseFromString(animation.svg, "image/svg+xml");
      const element = getElementByPath(doc, node.path);
      if (!element || element === doc.documentElement) return;
      
      const parent = element.parentElement;
      if (!parent) return;
      
      // Move to first position in parent (after any <defs>, <style>, etc.)
      const firstPaintChild = Array.from(parent.children).find((child) => 
        !IGNORED_TAGS.has(child.nodeName.toLowerCase()) && 
        child.nodeName.toLowerCase() !== "defs"
      );
      
      if (firstPaintChild) {
        parent.insertBefore(element, firstPaintChild);
      } else {
        parent.prepend(element);
      }
      await writeSvg(doc, node.id || null);
      toast.success("Sent to back");
    },
    [animation, writeSvg],
  );

  const handleBringForward = useCallback(
    async (node: TreeNode) => {
      if (!animation || !node.path) return;
      const doc = new DOMParser().parseFromString(animation.svg, "image/svg+xml");
      const element = getElementByPath(doc, node.path);
      if (!element || element === doc.documentElement) return;
      
      const parent = element.parentElement;
      if (!parent) return;
      
      const siblings = getTreeChildren(parent);
      const currentIndex = siblings.indexOf(element);
      
      if (currentIndex === -1 || currentIndex === siblings.length - 1) return; // Already at top
      
      // Swap with next sibling
      const nextSibling = siblings[currentIndex + 1];
      if (nextSibling && nextSibling.nextSibling) {
        parent.insertBefore(element, nextSibling.nextSibling);
      } else if (nextSibling) {
        parent.appendChild(element);
      }
      
      await writeSvg(doc, node.id || null);
    },
    [animation, writeSvg],
  );

  const handleSendBackward = useCallback(
    async (node: TreeNode) => {
      if (!animation || !node.path) return;
      const doc = new DOMParser().parseFromString(animation.svg, "image/svg+xml");
      const element = getElementByPath(doc, node.path);
      if (!element || element === doc.documentElement) return;
      
      const parent = element.parentElement;
      if (!parent) return;
      
      const siblings = getTreeChildren(parent);
      const currentIndex = siblings.indexOf(element);
      
      if (currentIndex <= 0) return; // Already at bottom
      
      // Swap with previous sibling
      const prevSibling = siblings[currentIndex - 1];
      if (prevSibling) {
        parent.insertBefore(element, prevSibling);
      }
      
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
        <MemoElementRow
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
          imageSrc={node.id ? imageSources.get(node.id) : undefined}
          askAiCount={
            isSelected && selectedIds.length > 1 ? selectedIds.length : 1
          }
          onToggleCollapse={toggleCollapse}
          onSelect={handleSelectNode}
          onSelectNode={handleSelectTreeNode}
          onToggleLock={onToggleLock}
          onToggleHide={onToggleHide}
          onRename={onRenameElement}
          onDelete={onRemoveElement}
          onEditText={onEditText}
          onEditImageSource={onEditImageSource}
          onEditPath={onEditPath}
          onEditAttributes={onEditAttributes}
          onAskAi={handleAskAi}
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
          onBringToFront={handleBringToFront}
          onBringForward={handleBringForward}
          onSendBackward={handleSendBackward}
          onSendToBack={handleSendToBack}
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
          {/* Same Home button as the tabbed sidebar header: a full 32px
              target with a tooltip, not a bare 24x14 icon. */}
          <Link
            to="/home"
            title="Home"
            aria-label="Go home"
            className="grid size-8 shrink-0 place-items-center rounded-md text-sidebar-accent-foreground transition-colors hover:bg-sidebar-accent"
          >
            <AgentNativeIcon aria-hidden="true" className="h-3.5 w-6" />
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
            disabled={!canUndo}
            className="relative group grid size-7 shrink-0 place-items-center rounded-md text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-35"
            aria-label={canUndo ? "Undo" : "Nothing to undo"}
          >
            <IconArrowBackUp className="size-[18px]" strokeWidth={2.5} />
            <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-1.5 py-0.5 text-[11px] font-medium text-background opacity-0 shadow transition-opacity group-hover:opacity-100">Undo</span>
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="relative group grid size-7 shrink-0 place-items-center rounded-md text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-35"
            aria-label={canRedo ? "Redo" : "Nothing to redo"}
          >
            <IconArrowForwardUp className="size-[18px]" strokeWidth={2.5} />
            <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-1.5 py-0.5 text-[11px] font-medium text-background opacity-0 shadow transition-opacity group-hover:opacity-100">Redo</span>
          </button>
        </div>
      )}

      {/* Header bar for Elements list — compact, like the rows below it. */}
      <div className="flex items-center justify-between border-b border-sidebar-border/40 px-2 py-1.5">
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
                <IconPlusFilled className="size-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Add Shape
              </div>
              <DropdownMenuItem onClick={() => onAddElement("rect")}>
                <IconSquareFilled className="mr-2 size-4 text-emerald-500" />
                <span>Rectangle</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAddElement("roundRect")}>
                <IconRectangleFilled className="mr-2 size-4 text-emerald-500" />
                <span>Rounded rectangle</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAddElement("circle")}>
                <IconCircleFilled className="mr-2 size-4 text-violet-500" />
                <span>Circle</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAddElement("ellipse")}>
                <IconOvalFilled className="mr-2 size-4 text-violet-500" />
                <span>Ellipse</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAddElement("triangle")}>
                <IconTriangleFilled className="mr-2 size-4 text-amber-500" />
                <span>Triangle</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAddElement("star")}>
                <IconStarFilled className="mr-2 size-4 text-yellow-500" />
                <span>Star</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAddElement("line")}>
                <IconLine className="mr-2 size-4 text-indigo-500" />
                <span>Line</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAddElement("text")}>
                <IconLetterT className="mr-2 size-4 text-rose-500" />
                <span>Text</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAddElement("g")}>
                <IconFolderFilled className="mr-2 size-4 text-amber-500" />
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
                    <IconFolderFilled className="mr-2 size-4 text-amber-500" />
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
                      <IconFolderOpenFilled className="mr-2 size-4 text-amber-500" />
                      <span>Ungroup selected</span>
                    </DropdownMenuItem>
                  ) : null}
                  {selectedNode && selectedNode.id ? (
                    <DropdownMenuItem
                      onClick={() => void handleConvertToComponent(selectedNode)}
                    >
                      <IconTransformFilled className="mr-2 size-4 text-[#2391FF]" />
                      <span>Convert selected to component</span>
                    </DropdownMenuItem>
                  ) : null}
                  {selectedIds.length >= 2 ? (
                    <>
                      <DropdownMenuItem onClick={() => void handleMaskOrClip("mask")}>
                        <IconEyeFilled className="mr-2 size-4 text-violet-500" />
                        <span>Mask with first selected</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => void handleMaskOrClip("clip")}>
                        <IconEyeFilled className="mr-2 size-4 text-violet-500" />
                        <span>Clip with first selected</span>
                      </DropdownMenuItem>
                    </>
                  ) : null}
                  {selectedIds.length >= 1 ? (
                    <DropdownMenuItem onClick={() => void handleClearMaskClip()}>
                      <IconEyeOff className="mr-2 size-4 text-muted-foreground" />
                      <span>Clear mask / clip</span>
                    </DropdownMenuItem>
                  ) : null}
                  {selectedNode && selectedNode.id && ["rect", "circle", "ellipse", "polygon", "polyline", "line"].includes(selectedNode.tag.toLowerCase()) ? (
                    <DropdownMenuItem onClick={() => void handleConvertToPath(selectedNode)}>
                      <PenTool className="mr-2 size-4 text-[#2391FF]" />
                      <span>Convert to path</span>
                    </DropdownMenuItem>
                  ) : null}
                  {selectedNode && selectedNode.tag.toLowerCase() === "path" ? (
                    <DropdownMenuItem onClick={() => void handleSimplifyPath(selectedNode)}>
                      <IconTransformFilled className="mr-2 size-4 text-[#2391FF]" />
                      <span>Simplify path</span>
                    </DropdownMenuItem>
                  ) : null}
                  {selectedIds.length >= 2 ? (
                    <>
                      <DropdownMenuItem onClick={() => void handleBooleanOp("union")}>
                        <IconSquareFilled className="mr-2 size-4 text-emerald-500" />
                        <span>Union paths</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => void handleBooleanOp("subtract")}>
                        <IconSquareFilled className="mr-2 size-4 text-red-500" />
                        <span>Subtract second from first</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => void handleBooleanOp("intersect")}>
                        <IconSquareFilled className="mr-2 size-4 text-amber-500" />
                        <span>Intersect paths</span>
                      </DropdownMenuItem>
                    </>
                  ) : null}
                </>
              ) : null}
              <div className="my-1 h-px bg-border" />
              <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Add Image
              </div>
              <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                <IconPhotoFilled className="mr-2 size-4 text-sky-500" />
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
                <IconLinkFilled className="mr-2 size-4 text-muted-foreground" />
                <span>Image from URL…</span>
              </DropdownMenuItem>
              <div className="my-1 h-px bg-border" />
              <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Import SVG
              </div>
              <DropdownMenuItem onClick={() => svgFileInputRef.current?.click()}>
                <IconDownloadFilled className="mr-2 size-4 text-[#2391FF]" />
                <span>Import SVG file…</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => tracePngInputRef.current?.click()}>
                <IconPhotoFilled className="mr-2 size-4 text-[#2391FF]" />
                <span>Trace PNG to path…</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={async () => {
                  const text = await prompt({
                    title: "Paste SVG markup",
                    label: "SVG markup",
                    multiline: true,
                    placeholder: "<svg …>…</svg>",
                    required: true,
                    confirmLabel: "Import",
                  });
                  if (text) onImportSvg?.(text);
                }}
              >
                <IconEditFilled className="mr-2 size-4 text-[#2391FF]" />
                <span>Paste SVG markup…</span>
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
            <IconFolderFilled className="size-3.5" />
          </button>

          {canUngroup && selectedNode ? (
            <button
              type="button"
              onClick={() => void handleUngroupElement(selectedNode)}
              className="grid size-6 place-items-center rounded text-amber-600 transition-colors hover:bg-amber-500/10 dark:text-amber-400"
              title="Ungroup selected group"
            >
              <IconFolderOpenFilled className="size-3.5" />
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
          <input
            ref={tracePngInputRef}
            type="file"
            accept="image/png,image/*"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) await handleTracePngFile(file);
              e.target.value = "";
            }}
          />
          <input
            ref={svgFileInputRef}
            type="file"
            accept=".svg,image/svg+xml"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) onImportSvg?.(await file.text());
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
              <IconEyeFilled className="size-3" />
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
          <Popover open={defsHelpOpen} onOpenChange={setDefsHelpOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="grid size-6 place-items-center rounded text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                aria-label="About definitions"
                title="About definitions"
              >
                <IconHelpCircle className="size-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" sideOffset={6} className="w-[320px] p-0">
              <div className="border-b border-border/60 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Definitions ({defsList.length}) — not selectable
              </div>
              {defsList.length > 0 ? (
                <div className="max-h-56 overflow-y-auto py-1">
                  {defsList.map((def) => (
                    <div
                      key={`${def.tag}-${def.id}`}
                      className="flex items-center gap-2 px-3 py-1"
                    >
                      <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                        {def.tag}
                      </span>
                      <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-foreground/80">
                        {def.id}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="px-3 py-2 text-[11px] text-muted-foreground">
                  No definitions in this animation.
                </p>
              )}
              <p className="border-t border-border/60 px-3 py-2 text-[10px] leading-relaxed text-muted-foreground">
                Gradients, patterns, filters, markers, masks and clips live
                here. They are edited from the Properties panel, not selected
                on canvas.
              </p>
            </PopoverContent>
          </Popover>

          <button
            onClick={allCollapsed ? expandAll : collapseAll}
            className="grid size-6 place-items-center rounded text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
            title={allCollapsed ? "Expand all" : "Collapse all"}
          >
            {allCollapsed ? (
              <IconChevronRightFilled className="size-3.5" />
            ) : (
              <IconChevronDownFilled className="size-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Search filter if there are more than 4 elements */}
      {totalElements > 4 && (
        <div className="border-b border-sidebar-border/40 px-2 py-1">
          <div className="relative flex items-center">
            <IconSearchFilled className="pointer-events-none absolute left-2 size-3.5 text-muted-foreground" />
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

      {/* Scrollable Elements Tree. The svg root ("Artboard") row is not
          rendered: it cost a full row plus one indent level for every
          element, and it is not an element the user edits. Top-level
          elements render at depth 0 instead, which also makes the guide
          rails line up with real ancestors only. */}
      <div className="min-h-0 flex-1 overflow-y-auto px-1 py-1">
        {!animation ? (
          <div className="px-2 py-3 text-xs text-sidebar-foreground/60">
            Select an animation
          </div>
        ) : tree ? (
          tree.children.map((child, index) =>
            renderNode(child, 0, index === tree.children.length - 1, []),
          )
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

function AgentColorMention({
  hideWhenInjected = false,
}: {
  hideWhenInjected?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [injected, setInjected] = useState(false);
  // All hooks must run before any early return (Rules of Hooks): the
  // return-null below used to sit between useState calls, so re-adding a
  // caller with hideWhenInjected would have thrown "Rendered fewer hooks
  // than expected" and unmounted the route.
  const [mode, setMode] = useState<"solid" | "gradient">("solid");
  const [solidColor, setSolidColor] = useState("#2391FF");
  const [fromColor, setFromColor] = useState("#2391FF");
  const [toColor, setToColor] = useState("#000000");
  const [editingStop, setEditingStop] = useState<"from" | "to">("from");
  const [angle, setAngle] = useState(90);
  const [hasPicked, setHasPicked] = useState(false);
  useEffect(() => {
    if (!hideWhenInjected) return;
    const onInjected = () => setInjected(true);
    window.addEventListener("composer-color-injected", onInjected);
    return () => window.removeEventListener("composer-color-injected", onInjected);
  }, [hideWhenInjected]);
  if (hideWhenInjected && injected) return null;

  const toSixDigit = (value: string) => {
    const clean = value.trim();
    if (!/^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(clean)) return "#2391FF";
    return clean.slice(0, 7);
  };
  const currentColor =
    mode === "solid" ? solidColor : editingStop === "from" ? fromColor : toColor;
  const code =
    mode === "solid"
      ? toSixDigit(solidColor)
      : `linear-gradient(${angle}deg, ${toSixDigit(fromColor)}, ${toSixDigit(toColor)})`;
  const buttonBackground =
    mode === "solid" ? toSixDigit(solidColor) : code;

  const setCurrentColor = (next: string) => {
    const clean = toSixDigit(next);
    if (mode === "solid") {
      setSolidColor(clean);
    } else if (editingStop === "from") {
      setFromColor(clean);
    } else {
      setToColor(clean);
    }
    setHasPicked(true);
  };

  const handleAdd = () => {
    askAgentAboutColor(code);
    setOpen(false);
    setHasPicked(false);
  };

  const presets = [
    "#000000",
    "#ffffff",
    "#ef4444",
    "#f59e0b",
    "#22c55e",
    "#0ea5e9",
    "#2391FF",
    "#8b5cf6",
    "#ec4899",
  ];

  return (
    <div className="relative group shrink-0">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-7 rounded-full p-1"
            aria-label="Mention a colour in the agent prompt"
            title="Mention a colour"
          >
            <span
              className="block size-full rounded-full border border-border"
              style={{ background: buttonBackground }}
            />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" sideOffset={6} className="w-[280px] p-3">
          <div className="space-y-3">
            <div className="flex gap-1">
              <Button
                type="button"
                size="sm"
                variant={mode === "solid" ? "default" : "outline"}
                className="h-7 flex-1 text-[12px]"
                onClick={() => setMode("solid")}
              >
                Solid
              </Button>
              <Button
                type="button"
                size="sm"
                variant={mode === "gradient" ? "default" : "outline"}
                className="h-7 flex-1 text-[12px]"
                onClick={() => setMode("gradient")}
              >
                Gradient
              </Button>
            </div>

            {mode === "gradient" ? (
              <div className="flex gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant={editingStop === "from" ? "default" : "outline"}
                  className="h-7 flex-1 text-[12px]"
                  onClick={() => setEditingStop("from")}
                >
                  <span
                    className="mr-1.5 inline-block size-3 rounded-[2px] border border-border"
                    style={{ backgroundColor: toSixDigit(fromColor) }}
                  />
                  From
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={editingStop === "to" ? "default" : "outline"}
                  className="h-7 flex-1 text-[12px]"
                  onClick={() => setEditingStop("to")}
                >
                  <span
                    className="mr-1.5 inline-block size-3 rounded-[2px] border border-border"
                    style={{ backgroundColor: toSixDigit(toColor) }}
                  />
                  To
                </Button>
              </div>
            ) : null}

            <div className="motion-color-picker">
              <HexAlphaColorPicker
                color={toSixDigit(currentColor)}
                onChange={setCurrentColor}
              />
            </div>

            <label className="block space-y-1">
              <span className="block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Hex
              </span>
              <Input
                value={toSixDigit(currentColor)}
                onChange={(event) => {
                  const next = event.target.value.trim();
                  if (/^#?[0-9a-fA-F]{6}$/.test(next)) {
                    setCurrentColor(next.startsWith("#") ? next : `#${next}`);
                  }
                }}
                className="h-7 font-mono text-[11px]"
                placeholder="#2391FF"
                spellCheck={false}
              />
            </label>

            <div className="flex flex-wrap gap-1.5">
              {presets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setCurrentColor(preset)}
                  className="grid size-6 place-items-center rounded-[5px] border border-black/10 transition-transform hover:scale-110"
                  style={{ backgroundColor: preset }}
                  aria-label={`Use ${preset}`}
                />
              ))}
            </div>

            {mode === "gradient" ? (
              <div className="space-y-1.5">
                <span className="block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Direction
                </span>
                <div className="flex items-center gap-1.5">
                  {[0, 45, 90, 180].map((deg) => (
                    <Button
                      key={deg}
                      type="button"
                      size="sm"
                      variant={angle === deg ? "default" : "outline"}
                      className="h-7 flex-1 text-[12px]"
                      onClick={() => {
                        setAngle(deg);
                        setHasPicked(true);
                      }}
                    >
                      {deg}°
                    </Button>
                  ))}
                  <Input
                    type="number"
                    min={0}
                    max={360}
                    value={angle}
                    onChange={(event) => {
                      const next = Number(event.target.value);
                      if (Number.isFinite(next)) {
                        setAngle(Math.max(0, Math.min(360, Math.round(next))));
                        setHasPicked(true);
                      }
                    }}
                    className="h-7 w-16 font-mono text-[11px]"
                    aria-label="Gradient angle in degrees"
                  />
                </div>
                <div
                  className="h-6 rounded-md border border-border"
                  style={{ background: code }}
                />
              </div>
            ) : null}

            <div className="min-w-0 break-all rounded-md bg-muted px-2 py-1.5 font-mono text-[11px]">
              {code}
            </div>

            {hasPicked ? (
              <Button
                type="button"
                size="sm"
                className="h-8 w-full bg-[#2391FF] text-white hover:bg-[#1f7fe0]"
                onClick={handleAdd}
              >
                Add colour
              </Button>
            ) : null}
          </div>
        </PopoverContent>
      </Popover>
      <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-1.5 py-0.5 text-[11px] font-medium text-background opacity-0 shadow transition-opacity group-hover:opacity-100">Mention a colour</span>
    </div>
  );
}

function ComposerMentionStyler() {
  useEffect(() => {
    const codes = new Set<string>();
    const styleChip = (chip: HTMLElement, code: string) => {
      if (chip.getAttribute("data-motion-color-circle") === code) return;
      chip.setAttribute("data-motion-color-circle", code);
      chip.setAttribute("title", code);
      chip.style.background = code;
      chip.style.setProperty("width", "20px", "important");
      chip.style.setProperty("height", "20px", "important");
      chip.style.setProperty("min-width", "20px", "important");
      chip.style.setProperty("max-width", "20px", "important");
      chip.style.setProperty("min-height", "20px", "important");
      chip.style.setProperty("max-height", "20px", "important");
      chip.style.setProperty("align-self", "center", "important");
      chip.style.setProperty("flex-shrink", "0", "important");
      chip.style.borderRadius = "9999px";
      chip.style.padding = "0";
      chip.style.display = "inline-flex";
      chip.style.alignItems = "center";
      chip.style.justifyContent = "center";
      chip.style.overflow = "hidden";
      chip.style.verticalAlign = "middle";
      chip.style.border = "1px solid rgba(0,0,0,0.12)";
      chip.style.color = "transparent";
      chip.style.fontSize = "0";
      chip.querySelectorAll("*").forEach((child) => {
        const el = child as HTMLElement;
        el.style.opacity = "0";
        el.style.fontSize = "0";
      });
    };
    const tryStyle = () => {
      if (codes.size === 0) return;
      const all = Array.from(document.querySelectorAll<HTMLElement>("*"));
      for (const code of codes) {
        const matches = all.filter((el) => {
          if (el.getAttribute("data-motion-color-circle") === code) return false;
          const text = (el.textContent || "").trim();
          if (
            !(
              text === code ||
              (text.includes(code) && text.length < code.length + 12)
            )
          )
            return false;
          // Skip wrappers: style only the deepest chip, not an ancestor
          // that merely contains it. With an otherwise empty prompt the
          // wrapper's text is identical to the chip's, which previously
          // stretched the input tall.
          const descendants = el.querySelectorAll("*");
          for (const d of Array.from(descendants)) {
            if ((d.textContent || "").trim() === code) return false;
          }
          return true;
        });
        const depth = (el: HTMLElement) => {
          let n = 0;
          let p: HTMLElement | null = el;
          while (p.parentElement) {
            n++;
            p = p.parentElement;
          }
          return n;
        };
        matches.sort(
          (a, b) =>
            depth(b) - depth(a) ||
            (a.textContent || "").length - (b.textContent || "").length,
        );
        const chip = matches[0];
        if (chip) styleChip(chip, code);
      }
    };
    const onMentioned = (e: Event) => {
      const code = (e as CustomEvent<string>).detail;
      if (typeof code === "string" && code) {
        codes.add(code);
        setTimeout(tryStyle, 50);
        setTimeout(tryStyle, 300);
        setTimeout(tryStyle, 1000);
      }
    };
    window.addEventListener("motion-color-mentioned", onMentioned as EventListener);
    const observer = new MutationObserver(tryStyle);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => {
      window.removeEventListener("motion-color-mentioned", onMentioned as EventListener);
      observer.disconnect();
    };
  }, []);
  return null;
}

function ComposerColorInjector() {
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  useEffect(() => {
    let container: HTMLDivElement | null = null;
    let disposed = false;
    const findModelButton = (): HTMLElement | null => {
      const all = Array.from(
        document.querySelectorAll<HTMLElement>("button"),
      );
      const labelled = all.find(
        (b) =>
          /model/i.test(b.getAttribute("aria-label") || "") ||
          /model/i.test(b.getAttribute("title") || ""),
      );
      if (labelled) return labelled;
      const composer = document.querySelector(
        ".agentkit-composer, .agent-kit-chat-footer-stack",
      );
      const scope = composer
        ? Array.from(composer.querySelectorAll<HTMLElement>("button"))
        : all;
      const textModel = scope.find((b) => /model/i.test(b.textContent || ""));
      if (textModel) return textModel;
      const menuButtons = scope.filter(
        (b) =>
          b.getAttribute("aria-haspopup") === "menu" ||
          b.getAttribute("aria-haspopup") === "true",
      );
      return (
        menuButtons.find(
          (b) =>
            !/send|voice|attach|upload|plus/i.test(
              `${b.getAttribute("aria-label") || ""} ${b.getAttribute("title") || ""} ${b.textContent || ""}`,
            ),
        ) || null
      );
    };
    const tryInject = () => {
      if (disposed) return;
      if (container && container.isConnected) return;
      const modelButton = findModelButton();
      let anchorParent: HTMLElement | null = null;
      let anchor: HTMLElement | null = null;
      if (modelButton && modelButton.parentElement) {
        anchorParent = modelButton.parentElement;
        anchor = modelButton;
      } else {
        // Bottom-plane fallback: if the model button cannot be found, do
        // not leave the colour button in the top bar. Put it at the left
        // end of the composer's bottom toolbar instead, so it is always
        // in the text input's bottom plane, left of the other controls.
        const composer = document.querySelector(
          ".agentkit-composer, .agent-kit-chat-footer-stack",
        );
        const footerButtons = composer
          ? Array.from(composer.querySelectorAll<HTMLElement>("button"))
          : [];
        const firstButton = footerButtons[0];
        if (firstButton && firstButton.parentElement) {
          anchorParent = firstButton.parentElement;
          anchor = firstButton;
        }
      }
      if (!anchorParent || !anchor) return;
      container = document.createElement("div");
      container.style.display = "contents";
      container.setAttribute("data-motion-color-inject", "true");
      anchorParent.insertBefore(container, anchor);
      setPortalTarget(container);
      window.dispatchEvent(new CustomEvent("composer-color-injected"));
    };
    tryInject();
    const observer = new MutationObserver(() => {
      if (container && !container.isConnected) {
        container = null;
        setPortalTarget(null);
      }
      tryInject();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      disposed = true;
      observer.disconnect();
      if (container) container.remove();
    };
  }, []);
  if (!portalTarget) return null;
  return createPortal(<AgentColorMention />, portalTarget);
}

function StudioTopBar({
  center,
  right,
}: {
  center?: ReactNode;
  right?: ReactNode;
}) {
  // Old layout was grid-cols-[1fr_auto_1fr] with a justify-center centre
  // column and no overflow handling. Once the tool row + the right-hand
  // buttons (Motion path / Stagger / Export) grew wider than the canvas
  // column — easy after widening the sidebar, or on a narrow window —
  // the centred content overflowed both sides, so the leftmost tools
  // slid off the left edge of the header and could not be scrolled back.
  // New layout: the tool row is a horizontally scrollable strip that is
  // centred when it fits (mx-auto + w-max) and scrolls from the left when
  // it doesn't, and the right-hand buttons are shrink-0 so they are never
  // the ones pushed out. The scrollbar itself is hidden; the strip still
  // scrolls with a trackpad / shift-wheel.
  return (
    <header className="flex h-10 min-w-0 shrink-0 items-center gap-2 overflow-hidden border-b border-border bg-background px-2">
      <div className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="mx-auto flex w-max items-center gap-2 px-1">{center}</div>
      </div>
      <div className="flex shrink-0 items-center justify-end gap-1">
        {right}
        <div className="relative group shrink-0">
          {/* showWhenOpen: the toolkit button vanishes once the panel is
              open, which in the studio left no visible agent control at
              all. Keep it visible (with its active state) so the panel
              can always be toggled back from the studio header. */}
          <AgentToggleButton className="size-7" showWhenOpen />
          <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-1.5 py-0.5 text-[11px] font-medium text-background opacity-0 shadow transition-opacity group-hover:opacity-100">Agent</span>
        </div>
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
            <IconSparklesFilled className="size-5" />
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
  sidebarWidth = 256,
  onRegisterUndoRedo,
  onHistoryChange,
  selectedElementId,
  onSelectElement,
  hiddenIds,
  lockedIds,
  onAddImage,
  onAddElement,
  onAddAsset,
  onAddPath,
  onRenameElement,
  onRemoveElement,
  onEditText,
  onEditImageSource,
  onEditPath,
  onEditAttributes,
  onToggleLock,
  onToggleHide,
}: {
  animation: MotionAnimation;
  title: string;
  onSave: (next: MotionAnimation) => Promise<boolean>;
  timelineHeight: number;
  onTimelineHeightChange: (height: number) => void;
  /** Width of the resizable left sidebar, so the timeline can extend under
      it by exactly that amount instead of a hardcoded 256px. */
  sidebarWidth?: number;
  onRegisterUndoRedo?: (undo: () => void, redo: () => void) => void;
  /** Fired whenever undo/redo availability changes, so the sidebar buttons can fade out. */
  onHistoryChange?: (canUndo: boolean, canRedo: boolean) => void;
  selectedElementId?: string | null | undefined;
  onSelectElement?: (id: string | null) => void;
  hiddenIds?: Set<string>;
  lockedIds?: Set<string>;
  onAddImage?: (data: File | string) => void;
  onAddElement?: (type: AddableElement) => void;
  onAddAsset?: (asset: AssetInsert) => void;
  onAddPath?: (points: Array<{ x: number; y: number }>, closed: boolean) => void;
  onRenameElement?: (node: TreeNode) => void;
  onRemoveElement?: (node: TreeNode) => void;
  onEditText?: (node: TreeNode) => void;
  onEditImageSource?: (node: TreeNode) => void;
  onEditPath?: (node: TreeNode) => void;
  onEditAttributes?: (node: TreeNode) => void;
  onToggleLock?: (node: TreeNode) => void;
  onToggleHide?: (node: TreeNode) => void;
}) {
  const artboardSize = useMemo(
    () => parseSvgSize(animation.svg ?? ""),
    [animation.svg],
  );
  const [tracks, setTracks] = useState<Track[]>(() =>
    cloneTracks(animation.tracks ?? []),
  );
  // Fresh-tracks ref for keyboard copy/paste/step handlers, whose effect
  // only re-registers on selection changes — reading tracks state directly
  // there could copy a stale value after an inspector edit.
  const tracksRef = useRef<Track[]>(tracks);
  useEffect(() => {
    tracksRef.current = tracks;
  }, [tracks]);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [duration, setDuration] = useState(animation.duration);
  const [loop, setLoop] = useState(animation.loop);
  // Declared here, before handleAlign and the selection-sync effect that
  // both read it — declaring it lower caused a TDZ crash at render time,
  // because the sync effect's dependency array is evaluated during render.
  const [multiSelection, setMultiSelection] = useState<string[]>([]);
  // Right-clicked canvas element for the canvas context menu. This is the
  // same TreeNode the Elements tree builds (same path format), so the
  // shared ElementContextMenuItems component below renders the exact same
  // menu the tree row shows, with the same actions.
  const [canvasMenuNode, setCanvasMenuNode] = useState<TreeNode | null>(null);
  const canvasTree = useMemo(
    () => parseElementTree(animation.svg ?? ""),
    [animation.svg],
  );
  const canvasMoveTargets = useMemo<MoveTarget[]>(() => {
    if (!canvasTree) return [];
    const targets: MoveTarget[] = [];
    const walk = (node: TreeNode, depth: number) => {
      if (node.tag.toLowerCase() === "g" && node.id) {
        targets.push({ id: node.id, label: node.id, depth, path: node.path });
      }
      node.children.forEach((child) => walk(child, depth + 1));
    };
    walk(canvasTree, 0);
    return targets;
  }, [canvasTree]);
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const imageDragDepthRef = useRef(0);
  const { prompt, dialog: imagePromptDialog } = usePromptDialog();

  const insertImageFile = useCallback(
    (file: File | null | undefined) => {
      if (!file || !onAddImage || !file.type.startsWith("image/")) return false;
      onAddImage(file);
      return true;
    },
    [onAddImage],
  );

  const handleDuplicate = async () => {
    if (!animation || !selectedElementId) return;
    const doc = new DOMParser().parseFromString(animation.svg, "image/svg+xml");
    const el = doc.getElementById(selectedElementId);
    if (!el || el === doc.documentElement) {
      toast.error("Cannot duplicate the artboard");
      return;
    }
    
    // Clone the element
    const clone = el.cloneNode(true) as Element;
    
    // Generate new ID for the clone
    const oldId = selectedElementId;
    const match = oldId.match(/^(.+?)(-\d+)?$/);
    const base = match ? match[1] : oldId;
    const newId = `${base}-${Math.random().toString(36).substring(2, 6)}`;
    clone.setAttribute("id", newId);
    
    // Recursively update IDs of children to avoid duplicates
    const updateChildIds = (node: Element) => {
      Array.from(node.children).forEach((child) => {
        const childId = child.getAttribute("id");
        if (childId) {
          child.setAttribute("id", `${childId}-${Math.random().toString(36).substring(2, 6)}`);
        }
        updateChildIds(child);
      });
    };
    updateChildIds(clone);
    
    // Offset position slightly so it's visible
    const offsetAttributes = [
      { x: "x", y: "y" }, // rect, image, text
      { x: "cx", y: "cy" }, // circle, ellipse
      { x: "x1", y: "y1" }, // line (first point)
      { x: "x2", y: "y2" }, // line (second point)
    ];
    
    for (const { x, y } of offsetAttributes) {
      const xVal = clone.getAttribute(x);
      const yVal = clone.getAttribute(y);
      if (xVal) clone.setAttribute(x, String(Number(xVal) + 10));
      if (yVal) clone.setAttribute(y, String(Number(yVal) + 10));
    }
    
    // Handle polygon/polyline points
    const points = clone.getAttribute("points");
    if (points) {
      const offsetPoints = points.split(/[\s,]+/).map((val, i) => {
        const num = Number(val);
        return Number.isFinite(num) ? num + 10 : val;
      }).join(" ");
      clone.setAttribute("points", offsetPoints);
    }
    
    // Handle path data
    const d = clone.getAttribute("d");
    if (d) {
      // Simple offset: add 10 to all coordinates (works for M and L commands)
      const offsetD = d.replace(/([-+]?\d+\.?\d*)/g, (match) => {
        const num = parseFloat(match);
        return Number.isFinite(num) ? String(num + 10) : match;
      });
      clone.setAttribute("d", offsetD);
    }
    
    // Insert the clone after the original
    el.parentNode?.insertBefore(clone, el.nextSibling);
    
    const nextSvg = new XMLSerializer().serializeToString(doc.documentElement);
    
    // Clone tracks too
    const nextTracks = [
      ...tracks,
      ...tracks.filter(t => t.target === oldId).map(t => ({
        ...t,
        target: newId,
        keyframes: [...t.keyframes]
      }))
    ];
    
    await onSave({ ...animation, title, svg: nextSvg, tracks: nextTracks, duration, loop });
    onSelectElement?.(newId);
    toast.success(`Duplicated #${oldId}`);
  };

  // Canvas context-menu actions: the same actions the Elements tree menu
  // offers, implemented here because the tree's handlers live in
  // ElementsRail (a sibling, not an ancestor of the canvas). They operate
  // on animation.svg by path, exactly like the tree handlers, so an
  // id-less element works here too.
  const canvasWriteSvg = async (doc: Document, selectId: string | null) => {
    const nextSvg = new XMLSerializer().serializeToString(doc.documentElement);
    await onSave({ ...animation, title, svg: nextSvg });
    onSelectElement?.(selectId);
  };

  const handleCanvasAskAi = (node: TreeNode) => {
    const context = {
      projectId: animation.id,
      projectTitle: title || animation.title,
      svg: animation.svg,
      tracks: animation.tracks,
    };
    const isMulti =
      Boolean(node.id) &&
      multiSelection.length > 1 &&
      multiSelection.includes(node.id);

    if (!isMulti) {
      if (node.id) onSelectElement?.(node.id);
      askAgentAboutElement({
        element: { tag: node.tag, id: node.id, path: node.path },
        label: getElementLabel(node),
        ...context,
      });
      return;
    }

    // Keep the multi-selection intact and make the right-clicked element the
    // primary one; it leads the tag order so it gets the visible chip.
    onSelectElement?.(node.id);
    const byId = collectTreeNodesById(canvasTree);
    const others = multiSelection
      .filter((id) => id !== node.id)
      .map((id) => byId.get(id))
      .filter((item): item is TreeNode => Boolean(item));
    askAgentAboutElements({
      elements: [node, ...others].map((item) => ({
        element: { tag: item.tag, id: item.id, path: item.path },
        label: getElementLabel(item),
      })),
      ...context,
    });
  };

  const handleCanvasGroup = async (node: TreeNode) => {
    if (!animation || !node.path) return;
    const doc = new DOMParser().parseFromString(animation.svg, "image/svg+xml");
    // Group the multi-selection when the right-clicked element is part of
    // it (matching the tree menu), otherwise just this element.
    const ids =
      node.id && multiSelection.length > 1 && multiSelection.includes(node.id)
        ? multiSelection
        : null;
    // getElementById returns HTMLElement | null, getElementByPath returns
    // Element | null. Normalize to (Element | null)[] first, so one filter
    // with `el is Element` is a valid predicate and narrows away null.
    // Filtering each branch separately left the union un-narrowed, which
    // is what produced the indexOf/contains/compareDocumentPosition errors.
    const rawElements: (Element | null)[] = ids
      ? ids.map((id) => doc.getElementById(id))
      : [getElementByPath(doc, node.path)];
    const elements = rawElements.filter((el): el is Element => Boolean(el));
    const unique = elements.filter(
      (element, index) =>
        elements.indexOf(element) === index &&
        !elements.some(
          (other) => other !== element && other.contains(element),
        ),
    );
    if (unique.length === 0) return;
    const anchor = unique[0]!;
    if (anchor === doc.documentElement) return;
    const parent = anchor.parentElement;
    if (!parent) return;
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
    await canvasWriteSvg(doc, id);
  };

  const handleCanvasUngroup = async (node: TreeNode) => {
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
    await canvasWriteSvg(doc, firstChildId);
  };

  const handleCanvasMove = async (
    node: TreeNode,
    targetPath: string | null,
  ) => {
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
    await canvasWriteSvg(doc, node.id || null);
  };

  const handleCanvasBring = async (
    node: TreeNode,
    kind: "front" | "forward" | "backward" | "back",
  ) => {
    if (!animation || !node.path) return;
    const doc = new DOMParser().parseFromString(animation.svg, "image/svg+xml");
    const element = getElementByPath(doc, node.path);
    if (!element || element === doc.documentElement) return;
    const parent = element.parentElement;
    if (!parent) return;
    if (kind === "front") {
      parent.appendChild(element);
      await canvasWriteSvg(doc, node.id || null);
      toast.success("Brought to front");
      return;
    }
    if (kind === "back") {
      const firstPaintChild = Array.from(parent.children).find(
        (child) =>
          !IGNORED_TAGS.has(child.nodeName.toLowerCase()) &&
          child.nodeName.toLowerCase() !== "defs",
      );
      if (firstPaintChild) {
        parent.insertBefore(element, firstPaintChild);
      } else {
        parent.prepend(element);
      }
      await canvasWriteSvg(doc, node.id || null);
      toast.success("Sent to back");
      return;
    }
    const siblings = getTreeChildren(parent);
    const currentIndex = siblings.indexOf(element);
    if (kind === "forward") {
      if (currentIndex === -1 || currentIndex === siblings.length - 1) return;
      const nextSibling = siblings[currentIndex + 1];
      if (nextSibling && nextSibling.nextSibling) {
        parent.insertBefore(element, nextSibling.nextSibling);
      } else if (nextSibling) {
        parent.appendChild(element);
      }
    } else {
      if (currentIndex <= 0) return;
      const prevSibling = siblings[currentIndex - 1];
      if (prevSibling) {
        parent.insertBefore(element, prevSibling);
      }
    }
    await canvasWriteSvg(doc, node.id || null);
  };

  // Right-click on an artwork element: build the tree node for the exact
  // element under the cursor (by walking up to the svg root and recording
  // each level's index among visible tree children — the same path
  // parseElementTree builds), select it, and let the Radix menu below
  // open for it. Right-clicking empty artboard, the artboard root, or a
  // defs/mask/clip element clears the node, so no stale menu appears.
  const handleStageContextMenu = (e: React.MouseEvent) => {
    const stage = stageRef.current;
    if (!stage) {
      setCanvasMenuNode(null);
      return;
    }
    const svg = stage.querySelector("svg");
    if (!svg) {
      setCanvasMenuNode(null);
      return;
    }
    const rawTarget = e.target as Element | null;
    if (
      !rawTarget ||
      !svg.contains(rawTarget) ||
      rawTarget === svg ||
      rawTarget.closest("defs, mask, clipPath")
    ) {
      setCanvasMenuNode(null);
      return;
    }
    const parts: number[] = [];
    let cur: Element | null = rawTarget;
    while (cur && cur !== svg) {
      // Explicit annotation: without it TS infers parent from cur, and cur
      // is reassigned to parent at the end of the loop, a circular
      // inference that surfaces as TS7022 (implicit any).
      const parent: Element | null = cur.parentElement;
      if (!parent) {
        setCanvasMenuNode(null);
        return;
      }
      const siblings = getTreeChildren(parent);
      const idx = siblings.indexOf(cur);
      if (idx === -1) {
        setCanvasMenuNode(null);
        return;
      }
      parts.unshift(idx);
      cur = parent;
    }
    if (cur !== svg) {
      setCanvasMenuNode(null);
      return;
    }
    const node: TreeNode = {
      tag: rawTarget.tagName.toLowerCase(),
      id: rawTarget.getAttribute("id") || "",
      path: parts.join("/"),
      hasChildren: getTreeChildren(rawTarget).length > 0,
      children: [],
    };
    setCanvasMenuNode(node);
    if (node.id) {
      onSelectElement?.(node.id);
      // Right-clicking a member of the multi-selection keeps the whole
      // selection alive (so "Ask AI" can tag every member); right-clicking
      // anything else, or starting fresh, selects just that element.
      setMultiSelection((prev) =>
        prev.includes(node.id) ? prev : [node.id],
      );
    }
  };

  const handleAlign = async (type: "left" | "center-h" | "right" | "top" | "middle" | "bottom") => {
    if (multiSelection.length < 2 || !animation) return;
    
    const doc = new DOMParser().parseFromString(animation.svg, "image/svg+xml");
    const svg = stageRef.current?.querySelector("svg");
    if (!svg) return;
    // Bounding boxes are in screen pixels, but translateX/Y are in SVG user
    // units — at any zoom other than 100% the raw pixel delta is wrong by
    // the zoom factor, so convert it with the same factor drag uses.
    const ctm = svg.getScreenCTM();
    const unitsPerPx = ctm && ctm.a ? 1 / ctm.a : 1;
    
    // Get bounding boxes for all selected elements
    const boxes: Array<{ id: string; bbox: DOMRect; el: Element }> = [];
    for (const id of multiSelection) {
      const el = doc.getElementById(id);
      const domEl = svg.querySelector(`#${CSS.escape(id)}`);
      if (el && domEl) {
        boxes.push({ id, bbox: domEl.getBoundingClientRect(), el });
      }
    }
    
    if (boxes.length < 2) return;
    
    // Calculate reference position based on alignment type
    let refValue = 0;
    if (type === "left") {
      refValue = Math.min(...boxes.map(b => b.bbox.left));
    } else if (type === "center-h") {
      const leftmost = Math.min(...boxes.map(b => b.bbox.left));
      const rightmost = Math.max(...boxes.map(b => b.bbox.right));
      refValue = (leftmost + rightmost) / 2;
    } else if (type === "right") {
      refValue = Math.max(...boxes.map(b => b.bbox.right));
    } else if (type === "top") {
      refValue = Math.min(...boxes.map(b => b.bbox.top));
    } else if (type === "middle") {
      const topmost = Math.min(...boxes.map(b => b.bbox.top));
      const bottommost = Math.max(...boxes.map(b => b.bbox.bottom));
      refValue = (topmost + bottommost) / 2;
    } else if (type === "bottom") {
      refValue = Math.max(...boxes.map(b => b.bbox.bottom));
    }
    
    // Apply alignment by updating translateX or translateY
    const isHorizontal = ["left", "center-h", "right"].includes(type);
    const property: Property = isHorizontal ? "translateX" : "translateY";
    
    for (const { id, bbox } of boxes) {
      const current = isHorizontal 
        ? (type === "left" ? bbox.left : type === "right" ? bbox.right : (bbox.left + bbox.right) / 2)
        : (type === "top" ? bbox.top : type === "bottom" ? bbox.bottom : (bbox.top + bbox.bottom) / 2);
      
      const delta = (refValue - current) * unitsPerPx;
      
      // Get current translateX/Y value or default to 0. `time` is already
      // normalised 0-1 (the tick adds dt / duration), so it is the keyframe
      // time directly - dividing by duration again sampled the wrong keyframe.
      const existingTrack = tracks.find(t => t.target === id && t.property === property);
      const currentValue = existingTrack 
        ? sampleTrack(existingTrack, time)
        : 0;
      const newValue = (typeof currentValue === "number" ? currentValue : 0) + delta;
      
      // Update the track or create a new one
      const trackIndex = tracks.findIndex(t => t.target === id && t.property === property);
      if (trackIndex >= 0) {
        // Update existing track's value at current time
        setTracks(prev => prev.map((t, i) => {
          if (i !== trackIndex) return t;
          const kfIndex = t.keyframes.findIndex(kf => Math.abs(kf.t - time) < 0.005);
          if (kfIndex >= 0) {
            return {
              ...t,
              keyframes: t.keyframes.map((kf, ki) => 
                ki === kfIndex ? { ...kf, v: newValue } : kf
              )
            };
          } else {
            return {
              ...t,
              keyframes: [...t.keyframes, { t: time, v: newValue, ease: "ease-in-out" }].sort((a, b) => a.t - b.t)
            };
          }
        }));
      } else {
        // Create new track
        setTracks(prev => [...prev, {
          target: id,
          property,
          keyframes: [
            { t: 0, v: newValue, ease: "ease-in-out" },
            { t: 1, v: newValue, ease: "ease-in-out" },
          ]
        }]);
      }
    }
    
    toast.success(`Aligned ${multiSelection.length} elements`);
  };

  const handleDistribute = async (direction: "horizontal" | "vertical") => {
    if (multiSelection.length < 3 || !animation) return;
    
    const doc = new DOMParser().parseFromString(animation.svg, "image/svg+xml");
    const svg = stageRef.current?.querySelector("svg");
    if (!svg) return;
    // Same screen-pixel to user-unit conversion as handleAlign.
    const ctm = svg.getScreenCTM();
    const unitsPerPx = ctm && ctm.a ? 1 / ctm.a : 1;
    
    // Get bounding boxes for all selected elements
    const boxes: Array<{ id: string; bbox: DOMRect; el: Element }> = [];
    for (const id of multiSelection) {
      const el = doc.getElementById(id);
      const domEl = svg.querySelector(`#${CSS.escape(id)}`);
      if (el && domEl) {
        boxes.push({ id, bbox: domEl.getBoundingClientRect(), el });
      }
    }
    
    if (boxes.length < 3) return;
    
    // Sort by position
    const isHorizontal = direction === "horizontal";
    boxes.sort((a, b) => {
      const aPos = isHorizontal ? a.bbox.left : a.bbox.top;
      const bPos = isHorizontal ? b.bbox.left : b.bbox.top;
      return aPos - bPos;
    });
    
    const first = boxes[0]!.bbox;
    const last = boxes[boxes.length - 1]!.bbox;
    const totalSpace = isHorizontal 
      ? (last.right - first.left)
      : (last.bottom - first.top);
    const totalElementSize = boxes.reduce((sum, b) => 
      sum + (isHorizontal ? b.bbox.width : b.bbox.height), 0
    );
    const gap = (totalSpace - totalElementSize) / (boxes.length - 1);
    
    // Calculate target positions
    let currentPos = isHorizontal ? first.left : first.top;
    const property: Property = isHorizontal ? "translateX" : "translateY";
    
    for (let i = 0; i < boxes.length; i++) {
      const { id, bbox } = boxes[i]!;
      const currentCenter = isHorizontal 
        ? bbox.left + bbox.width / 2
        : bbox.top + bbox.height / 2;
      const targetCenter = isHorizontal
        ? currentPos + bbox.width / 2
        : currentPos + bbox.height / 2;
      const delta = (targetCenter - currentCenter) * unitsPerPx;
      
      // Update track (`time` is already normalised 0-1, see handleAlign)
      const existingTrack = tracks.find(t => t.target === id && t.property === property);
      const currentValue = existingTrack 
        ? sampleTrack(existingTrack, time)
        : 0;
      const newValue = (typeof currentValue === "number" ? currentValue : 0) + delta;
      
      const trackIndex = tracks.findIndex(t => t.target === id && t.property === property);
      if (trackIndex >= 0) {
        setTracks(prev => prev.map((t, idx) => {
          if (idx !== trackIndex) return t;
          const kfIndex = t.keyframes.findIndex(kf => Math.abs(kf.t - time) < 0.005);
          if (kfIndex >= 0) {
            return {
              ...t,
              keyframes: t.keyframes.map((kf, ki) => 
                ki === kfIndex ? { ...kf, v: newValue } : kf
              )
            };
          } else {
            return {
              ...t,
              keyframes: [...t.keyframes, { t: time, v: newValue, ease: "ease-in-out" }].sort((a, b) => a.t - b.t)
            };
          }
        }));
      } else {
        setTracks(prev => [...prev, {
          target: id,
          property,
          keyframes: [
            { t: 0, v: newValue, ease: "ease-in-out" },
            { t: 1, v: newValue, ease: "ease-in-out" },
          ]
        }]);
      }
      
      currentPos += (isHorizontal ? bbox.width : bbox.height) + gap;
    }
    
    toast.success(`Distributed ${multiSelection.length} elements`);
  };

  // Sync multi-selection with single selection, without clobbering a
  // multi-selection that already contains the primary id (canvas
  // Shift/Cmd-clicks and Elements-panel additive clicks both set the
  // primary to a member of their multi-selection). Only a primary id
  // outside the current multi-selection resets it to a single selection.
  useEffect(() => {
    // Guard the empty case: setMultiSelection([]) creates a new array
    // identity on every call, and multiSelection is in this effect's
    // deps, so calling it unconditionally when nothing is selected
    // re-ran this effect forever (React: "Maximum update depth
    // exceeded" at motion.tsx:6158, which then also surfaced at the
    // playback tick and the autosave store update). Only clear when
    // there is actually something to clear.
    if (!selectedElementId) {
      if (multiSelection.length > 0) setMultiSelection([]);
    } else if (!multiSelection.includes(selectedElementId)) {
      setMultiSelection([selectedElementId]);
    }
  }, [selectedElementId, multiSelection]);

  const handleImageDragEnter = (e: React.DragEvent) => {
    if (!onAddImage) return;
    if (!Array.from(e.dataTransfer.types).includes("Files")) return;
    e.preventDefault();
    imageDragDepthRef.current += 1;
    setIsDraggingImage(true);
  };

  const handleImageDragOver = (e: React.DragEvent) => {
    if (!onAddImage) return;
    if (!Array.from(e.dataTransfer.types).includes("Files")) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleImageDragLeave = () => {
    imageDragDepthRef.current = Math.max(0, imageDragDepthRef.current - 1);
    if (imageDragDepthRef.current === 0) setIsDraggingImage(false);
  };

  const handleImageDrop = (e: React.DragEvent) => {
    if (!onAddImage) return;
    e.preventDefault();
    imageDragDepthRef.current = 0;
    setIsDraggingImage(false);
    const file = Array.from(e.dataTransfer.files).find((f) =>
      f.type.startsWith("image/"),
    );
    if (file) insertImageFile(file);
  };

  // Paste an image straight onto the artboard (e.g. a screenshot).
  useEffect(() => {
    if (!onAddImage) return;
    const onPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      // Pasting SVG markup (e.g. copied from Figma or another editor)
      // imports it as vectors, not as an image.
      const text = e.clipboardData?.getData("text")?.trim() ?? "";
      if (text.startsWith("<svg") && animation) {
        const nextSvg = mergeSvgIntoArtboard(animation.svg, text);
        if (nextSvg) {
          e.preventDefault();
          void onSave({ ...animation, svg: nextSvg });
          toast.success("SVG pasted");
          return;
        }
      }
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (!item.type.startsWith("image/")) continue;
        const file = item.getAsFile();
        if (file && insertImageFile(file)) {
          e.preventDefault();
          return;
        }
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [insertImageFile, onAddImage, animation, onSave]);

  // Undo history is capped: each snapshot holds a full SVG string, so an
  // uncapped history grows without bound over a long session.
  const MAX_HISTORY = 100;
  const historyRef = useRef<StudioSnapshot[]>([
    {
      tracks: cloneTracks(animation.tracks ?? []),
      duration: animation.duration,
      loop: animation.loop,
      svg: animation.svg ?? "",
    },
  ]);
  const indexRef = useRef(0);
  const skipRef = useRef(false);
  const lastHistoryAtRef = useRef(0);

  // Notify the sidebar about undo/redo availability. History lives in refs,
  // so without this the buttons would have no way to know when to fade.
  const onHistoryChangeRef = useRef(onHistoryChange);
  onHistoryChangeRef.current = onHistoryChange;
  const lastNotifiedRef = useRef<{
    canUndo: boolean;
    canRedo: boolean;
  } | null>(null);
  const notifyHistory = useCallback(() => {
    const canUndo = indexRef.current > 0;
    const canRedo = indexRef.current < historyRef.current.length - 1;
    const last = lastNotifiedRef.current;
    if (last && last.canUndo === canUndo && last.canRedo === canRedo) return;
    lastNotifiedRef.current = { canUndo, canRedo };
    onHistoryChangeRef.current?.(canUndo, canRedo);
  }, []);

  // Fast snapshot equality: the old code JSON.stringified the whole
  // snapshot (full SVG string included) on every tracks change, which is
  // exactly the kind of work that runs during a drag. Comparing the svg
  // string directly and walking keyframes is the same check, far cheaper.
  const snapshotsEqual = (a: StudioSnapshot | undefined, b: StudioSnapshot): boolean => {
    if (!a) return false;
    if (a.svg !== b.svg || a.duration !== b.duration || a.loop !== b.loop) return false;
    if (a.tracks.length !== b.tracks.length) return false;
    for (let i = 0; i < a.tracks.length; i++) {
      const ta = a.tracks[i]!;
      const tb = b.tracks[i]!;
      if (ta.target !== tb.target || ta.property !== tb.property) return false;
      if (ta.keyframes.length !== tb.keyframes.length) return false;
      for (let j = 0; j < ta.keyframes.length; j++) {
        const ka = ta.keyframes[j]!;
        const kb = tb.keyframes[j]!;
        if (ka.t !== kb.t || ka.v !== kb.v || ka.ease !== kb.ease) return false;
      }
    }
    return true;
  };
  // True when the only difference is keyframe times/values on the same
  // tracks — the signature of a continuous drag (element drag changes v,
  // keyframe drag changes t), not a distinct edit. Adding/removing a
  // keyframe, changing an easing, or editing the SVG fails this check
  // and becomes its own undo step.
  const isValueOnlyChange = (a: StudioSnapshot | undefined, b: StudioSnapshot): boolean => {
    if (!a) return false;
    if (a.svg !== b.svg || a.duration !== b.duration || a.loop !== b.loop) return false;
    if (a.tracks.length !== b.tracks.length) return false;
    for (let i = 0; i < a.tracks.length; i++) {
      const ta = a.tracks[i]!;
      const tb = b.tracks[i]!;
      if (ta.target !== tb.target || ta.property !== tb.property) return false;
      if (ta.keyframes.length !== tb.keyframes.length) return false;
      for (let j = 0; j < ta.keyframes.length; j++) {
        const ka = ta.keyframes[j]!;
        const kb = tb.keyframes[j]!;
        if (ka.ease !== kb.ease) return false;
      }
    }
    return true;
  };
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
      svg: animation.svg ?? "",
    };
    if (snapshotsEqual(current, next)) return;

    const now = performance.now();
    // Coalesce only a continuous gesture, and only within 500ms: a drag
    // changes values on the same tracks in a flood of updates, and that
    // flood should be one undo step. A structural change (delete, add a
    // keyframe, group, rename) is a new step even if it lands within
    // 500ms of the last one — the old time-only rule merged those.
    if (
      now - lastHistoryAtRef.current < 500 &&
      indexRef.current > 0 &&
      isValueOnlyChange(current, next)
    ) {
      historyRef.current[indexRef.current] = next;
    } else {
      historyRef.current = historyRef.current.slice(0, indexRef.current + 1);
      historyRef.current.push(next);
      if (historyRef.current.length > MAX_HISTORY) {
        historyRef.current = historyRef.current.slice(historyRef.current.length - MAX_HISTORY);
      }
      indexRef.current = historyRef.current.length - 1;
    }
    lastHistoryAtRef.current = now;
    notifyHistory();
    // animation.svg is a dependency so artwork edits (delete, node edits,
    // properties, group/arrange) become undo steps too, not just tracks.
  }, [tracks, duration, loop, animation.svg, notifyHistory]);

  const undo = useCallback(() => {
    if (indexRef.current <= 0) return;
    indexRef.current -= 1;
    skipRef.current = true;
    lastHistoryAtRef.current = 0;
    const snapshot = historyRef.current[indexRef.current]!;
    setTracks(cloneTracks(snapshot.tracks));
    setDuration(snapshot.duration);
    setLoop(snapshot.loop);
    // Restore the artwork too, otherwise undoing a delete would leave the
    // element gone while only rewinding its keyframes.
    void onSave({
      ...animation,
      svg: snapshot.svg,
      tracks: cloneTracks(snapshot.tracks),
      duration: snapshot.duration,
      loop: snapshot.loop,
    });
    notifyHistory();
  }, [notifyHistory, animation, onSave]);

  const redo = useCallback(() => {
    if (indexRef.current >= historyRef.current.length - 1) return;
    indexRef.current += 1;
    skipRef.current = true;
    lastHistoryAtRef.current = 0;
    const snapshot = historyRef.current[indexRef.current]!;
    setTracks(cloneTracks(snapshot.tracks));
    setDuration(snapshot.duration);
    setLoop(snapshot.loop);
    void onSave({
      ...animation,
      svg: snapshot.svg,
      tracks: cloneTracks(snapshot.tracks),
      duration: snapshot.duration,
      loop: snapshot.loop,
    });
    notifyHistory();
  }, [notifyHistory, animation, onSave]);

  useEffect(() => {
    onRegisterUndoRedo?.(undo, redo);
    notifyHistory();
  }, [onRegisterUndoRedo, undo, redo, notifyHistory]);

  // Adopt edits made elsewhere (the agent or another tab) without remounting
  // the studio, so the playhead, selection and expanded tracks survive
  // auto-saves triggered by local edits.
  const serverRevision = `${animation.id}:${animation.updatedAt ?? ""}`;
  const syncedRevisionRef = useRef(serverRevision);
  const savedTracksRef = useRef(animation.tracks ?? []);
  // The autosave timer below reads the animation through this ref, so a
  // later-firing timer never overwrites newer artwork with a stale copy —
  // the same pattern PropertiesPanel uses for its own latestAnimationRef.
  const latestAnimationRef = useRef(animation);
  useEffect(() => {
    latestAnimationRef.current = animation;
  }, [animation]);
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
      const latest = latestAnimationRef.current;
      void onSave({ ...latest, title, tracks, duration, loop });
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
  // The active keyframe (shown in the inspector) and the full set the user
  // has selected with Shift/Cmd-click. Keeping both means group edits can
  // move/delete every diamond while the inspector still edits one keyframe.
  const [selectedKeyframes, setSelectedKeyframes] = useState<Selection[]>([]);
  // Mirror the selection in a ref so rapid Shift-clicks always compose
  // against the latest list, even before React has re-rendered.
  const selectedKeyframesRef = useRef<Selection[]>([]);
  selectedKeyframesRef.current = selectedKeyframes;
  const [fps, setFps] = useState<number>(DEFAULT_FPS);
  const [snapEnabled, setSnapEnabled] = useState(true);

  // Read UI-only timeline preferences after mount so SSR and the first
  // client render agree; persist them for the next project too.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedFps = Number(window.localStorage.getItem(FPS_STORAGE_KEY));
    if ((FPS_OPTIONS as readonly number[]).includes(storedFps)) {
      setFps(storedFps);
    }
    const storedSnap = window.localStorage.getItem(
      TIMELINE_SNAP_STORAGE_KEY,
    );
    if (storedSnap === "false") setSnapEnabled(false);
  }, []);
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(FPS_STORAGE_KEY, String(fps));
    }
  }, [fps]);
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        TIMELINE_SNAP_STORAGE_KEY,
        String(snapEnabled),
      );
    }
  }, [snapEnabled]);

  const clearKeyframeSelection = useCallback(() => {
    selectedKeyframesRef.current = [];
    setSelection(null);
    setSelectedKeyframes([]);
  }, []);

  const selectKeyframe = useCallback(
    (next: Selection | null, additive = false) => {
      if (!next) {
        clearKeyframeSelection();
        return;
      }
      if (!additive) {
        selectedKeyframesRef.current = [next];
        setSelection(next);
        setSelectedKeyframes([next]);
        return;
      }
      const current = selectedKeyframesRef.current;
      const exists = current.some(
        (item) =>
          item.track === next.track && item.keyframe === next.keyframe,
      );
      const nextList = exists
        ? current.filter(
            (item) =>
              item.track !== next.track || item.keyframe !== next.keyframe,
          )
        : [...current, next];
      selectedKeyframesRef.current = nextList;
      setSelectedKeyframes(nextList);
      setSelection(
        exists ? (nextList[nextList.length - 1] ?? null) : next,
      );
    },
    [clearKeyframeSelection],
  );

  /** Make a keyframe the inspector target without collapsing a multi-select. */
  const activateKeyframe = useCallback((next: Selection) => {
    setSelection(next);
  }, []);

  // Undo, the agent, or a panel edit can replace the tracks underneath the
  // timeline. Drop any selected keyframe that no longer exists instead of
  // letting a stale index point at a different keyframe.
  useEffect(() => {
    setSelectedKeyframes((prev) => {
      const next = prev.filter((item) => {
        const track = tracks[item.track];
        return (
          track &&
          item.keyframe >= 0 &&
          item.keyframe < track.keyframes.length
        );
      });
      return next.length === prev.length ? prev : next;
    });
    setSelection((prev) => {
      if (!prev) return prev;
      const track = tracks[prev.track];
      return track &&
        prev.keyframe >= 0 &&
        prev.keyframe < track.keyframes.length
        ? prev
        : null;
    });
  }, [tracks]);

  // Left-sidebar Keyframe tab slot for the keyframe editor: the sidebar
  // is a sibling component and the slot only exists while the Keyframe tab
  // is open, so a MutationObserver re-finds it whenever tabs switch. The
  // inspector is portalled into it instead of floating over the canvas.
  // It stays owned here, so its handlers and live track data are
  // unchanged — only where it renders moves. Setting the same node again
  // is a React bailout, so the observer's frequent callbacks stay cheap.
  const [keyframeSlot, setKeyframeSlot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const findSlot = () =>
      setKeyframeSlot(document.getElementById("keyframe-inspector-slot"));
    findSlot();
    const observer = new MutationObserver(findSlot);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  // Tapping a timeline diamond switches the sidebar to the Keyframe tab.
  useEffect(() => {
    if (selection) window.dispatchEvent(new Event("keyframe-editor:open"));
  }, [selection]);

  const stageRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const lastRef = useRef<number>(0);
  const timeRef = useRef(0);

  const [selectionBox, setSelectionBox] = useState<ElementBox | null>(null);
  const [artboardBackground, setArtboardBackground] = useState<
    "white" | "checker" | "custom"
  >("white");
  const [artboardBgColor, setArtboardBgColor] = useState("#ffffff");
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

  const addKeyframe = (
    trackIndex: number,
    at: number = time,
    suppliedValue?: number | string,
  ) => {
    const track = tracks[trackIndex];
    if (!track) return;
    const t = Math.max(0, Math.min(1, at));
    const value =
      suppliedValue !== undefined ? suppliedValue : sampleTrack(track, t);
    const keyframes = [
      ...track.keyframes.filter((k) => Math.abs(k.t - t) > 0.001),
      { t, v: value },
    ].sort((a, b) => a.t - b.t);
    setTracks((prev) =>
      prev.map((tr, i) => (i === trackIndex ? { ...tr, keyframes } : tr)),
    );
    setTime(t);
    timeRef.current = t;
    selectKeyframe({
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
    setSelectedKeyframes((prev) =>
      prev.filter(
        (item) =>
          item.track !== trackIndex || item.keyframe !== kfIndex,
      ),
    );
    setSelection((prev) =>
      prev?.track === trackIndex && prev.keyframe === kfIndex
        ? null
        : prev,
    );
  };

  const keyframeTargets = useCallback(() => {
    const current = selectedKeyframesRef.current;
    if (current.length > 0) return current;
    return selection ? [selection] : [];
  }, [selection]);

  const removeSelectedKeyframes = useCallback(() => {
    const targets = keyframeTargets();
    if (targets.length === 0) return;
    setTracks((prev) =>
      prev.map((tr, i) => {
        const indices = new Set(
          targets
            .filter((item) => item.track === i)
            .map((item) => item.keyframe),
        );
        if (indices.size === 0) return tr;
        return {
          ...tr,
          keyframes: tr.keyframes.filter((_, j) => !indices.has(j)),
        };
      }),
    );
    clearKeyframeSelection();
  }, [clearKeyframeSelection, keyframeTargets]);

  /**
   * Move a set of keyframes by absolute times. The timeline sends every
   * selected diamond on each pointer move; the tracks are not re-sorted
   * during the drag, so marker/keyframe indices stay stable. The engine
   * samples keyframes by time, not array order.
   */
  const moveKeyframes = useCallback(
    (moves: Array<{ track: number; keyframe: number; t: number }>) => {
      if (moves.length === 0) return;
      setTracks((prev) => {
        let changed = false;
        const next = prev.map((tr) => ({
          ...tr,
          keyframes: [...tr.keyframes],
        }));
        for (const move of moves) {
          const track = next[move.track];
          const keyframe = track?.keyframes[move.keyframe];
          if (!track || !keyframe) continue;
          const t = Math.max(0, Math.min(1, move.t));
          if (t === keyframe.t) continue;
          track.keyframes[move.keyframe] = { ...keyframe, t };
          changed = true;
        }
        return changed ? next : prev;
      });
    },
    [],
  );

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

  // Pro keyframe workflow: multi-keyframe copy/paste and prev/next stepping.
  // The clipboard is internal (not the system clipboard), so pasting a
  // keyframe never triggers the canvas SVG/image paste path. Relative timing
  // between copied keyframes is preserved, and each one returns to its own
  // target/property track when that track still exists.
  interface CopiedKeyframe {
    target: string;
    property: Property;
    dt: number;
    v: number | string;
    ease?: string;
  }
  const copiedKeyframesRef = useRef<{
    anchorT: number;
    items: CopiedKeyframe[];
  } | null>(null);
  const [hasCopiedKeyframe, setHasCopiedKeyframe] = useState(false);

  const copyKeyframe = useCallback(() => {
    const targets = keyframeTargets();
    if (targets.length === 0) return;
    const items: Array<CopiedKeyframe & { t: number }> = [];
    for (const target of targets) {
      const track = tracksRef.current[target.track];
      const keyframe = track?.keyframes[target.keyframe];
      if (!track || !keyframe) continue;
      items.push({
        target: track.target,
        property: track.property,
        t: keyframe.t,
        dt: 0,
        v: keyframe.v,
        ...(keyframe.ease ? { ease: keyframe.ease } : {}),
      });
    }
    if (items.length === 0) return;
    const anchorT = items.reduce(
      (min, item) => Math.min(min, item.t),
      1,
    );
    copiedKeyframesRef.current = {
      anchorT,
      items: items.map(({ t, ...item }) => ({
        ...item,
        dt: t - anchorT,
      })),
    };
    setHasCopiedKeyframe(true);
    toast.success(
      items.length === 1
        ? "Keyframe copied"
        : `${items.length} keyframes copied`,
    );
  }, [keyframeTargets]);

  const pasteKeyframe = useCallback(() => {
    const clipboard = copiedKeyframesRef.current;
    if (!clipboard || clipboard.items.length === 0) return;
    const base = Math.max(0, Math.min(1, timeRef.current));
    const updates = new Map<number, Keyframe[]>();
    for (const item of clipboard.items) {
      let trackIndex = tracksRef.current.findIndex(
        (track) =>
          track.target === item.target && track.property === item.property,
      );
      if (trackIndex === -1 && clipboard.items.length === 1 && selection) {
        trackIndex = selection.track;
      }
      if (trackIndex === -1) continue;
      const track = tracksRef.current[trackIndex];
      if (!track) continue;
      const t = Math.max(0, Math.min(1, base + item.dt));
      const list = updates.get(trackIndex) ?? [...track.keyframes];
      const next = list.filter((keyframe) => Math.abs(keyframe.t - t) > 0.001);
      next.push({
        t,
        v: item.v,
        ...(item.ease ? { ease: item.ease } : {}),
      });
      next.sort((a, b) => a.t - b.t);
      updates.set(trackIndex, next);
    }
    if (updates.size === 0) return;
    setTracks((prev) =>
      prev.map((track, i) =>
        updates.has(i)
          ? { ...track, keyframes: updates.get(i)! }
          : track,
      ),
    );
    if (selection) {
      const activeTrack = updates.get(selection.track);
      if (activeTrack) {
        const index = activeTrack.findIndex(
          (keyframe) => Math.abs(keyframe.t - base) <= 0.001,
        );
        if (index >= 0) {
          selectKeyframe({ track: selection.track, keyframe: index });
        }
      }
    }
    setTime(base);
    timeRef.current = base;
  }, [selectKeyframe, selection]);

  const stepKeyframe = (dir: -1 | 1) => {
    if (!selection) return;
    const track = tracksRef.current[selection.track];
    if (!track) return;
    // Step in time order, not raw index order: dragging a keyframe past
    // another does not re-sort the track's keyframe array.
    const order = track.keyframes
      .map((k, i) => ({ t: k.t, i }))
      .sort((a, b) => a.t - b.t);
    const pos = order.findIndex((o) => o.i === selection.keyframe);
    const next = order[pos + dir];
    if (pos === -1 || !next) return;
    selectKeyframe({ track: selection.track, keyframe: next.i });
    scrub(next.t);
  };

  // Keyboard group / ungroup / flip / centre-selection, implemented here
  // (canvas selection lives in this component) rather than in ElementsRail.
  const groupCanvasSelection = useCallback(() => {
    if (!animation) return;
    const ids = multiSelection.length > 0 ? multiSelection : selectedElementId ? [selectedElementId] : [];
    if (ids.length === 0) return;
    const doc = new DOMParser().parseFromString(animation.svg, "image/svg+xml");
    const elements = ids.map((id) => doc.getElementById(id)).filter((el): el is HTMLElement => Boolean(el));
    if (elements.length === 0) return;
    const parent = elements[0]!.parentElement;
    if (!parent || !elements.every((el) => el.parentElement === parent)) {
      toast.error("Group only works for elements with the same parent.");
      return;
    }
    const group = doc.createElementNS(SVG_NS, "g");
    let id = `group-${Math.random().toString(36).slice(2, 6)}`;
    while (doc.getElementById(id)) id = `group-${Math.random().toString(36).slice(2, 6)}`;
    group.setAttribute("id", id);
    parent.insertBefore(group, elements[0]!);
    elements.forEach((el) => group.appendChild(el));
    const nextSvg = new XMLSerializer().serializeToString(doc.documentElement);
    void onSave({ ...animation, svg: nextSvg });
    onSelectElement?.(id);
    setMultiSelection([id]);
  }, [animation, multiSelection, selectedElementId, onSave, onSelectElement]);

  const ungroupCanvasSelection = useCallback(() => {
    if (!animation || !selectedElementId) return;
    const doc = new DOMParser().parseFromString(animation.svg, "image/svg+xml");
    const element = doc.getElementById(selectedElementId);
    if (!element || element.nodeName.toLowerCase() !== "g" || !element.hasChildNodes()) return;
    const parent = element.parentElement;
    if (!parent) return;
    const firstChildId = element.firstElementChild?.getAttribute("id") ?? null;
    while (element.firstChild) parent.insertBefore(element.firstChild, element);
    parent.removeChild(element);
    const nextSvg = new XMLSerializer().serializeToString(doc.documentElement);
    void onSave({ ...animation, svg: nextSvg });
    if (firstChildId) onSelectElement?.(firstChildId);
  }, [animation, selectedElementId, onSave, onSelectElement]);

  const flipCanvasSelection = useCallback((axis: "x" | "y") => {
    if (!selectedElementId) return;
    const prop: Property = axis === "x" ? "scaleX" : "scaleY";
    const current = sampleTargetProperty(selectedElementId, prop, time, 1);
    updateTargetProperty(selectedElementId, prop, -current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedElementId, time, tracks]);

  // Motion path: the selected element moves along a path element that is
  // also in the canvas multi-selection. Path shape is sampled with the
  // browser's getPointAtLength, and the result is written as ordinary
  // translateX/translateY tracks (relative to the path's start), so it
  // previews, graphs and exports like any other animation.
  const animateAlongPath = useCallback(() => {
    if (!animation || !selectedElementId) { toast.error("Select an element, then Shift-click a path."); return; }
    const pathId = multiSelection.find((id) => id !== selectedElementId);
    if (!pathId) { toast.error("Shift-click a path element to use as the motion path."); return; }
    const doc = new DOMParser().parseFromString(animation.svg, "image/svg+xml");
    const pathEl = doc.getElementById(pathId);
    if (!pathEl || pathEl.nodeName.toLowerCase() !== "path") { toast.error("The second selection must be a <path>."); return; }
    const d = pathEl.getAttribute("d") || "";
    if (!d) return;
    const probe = document.createElementNS(SVG_NS, "path");
    probe.setAttribute("d", d);
    let total = 0;
    try { total = probe.getTotalLength(); } catch { toast.error("That path could not be measured."); return; }
    if (!total) { toast.error("That path has no length."); return; }
    const start = probe.getPointAtLength(0);
    const times = [0, 0.25, 0.5, 0.75, 1];
    const xs = times.map((t) => Math.round((probe.getPointAtLength(t * total).x - start.x) * 100) / 100);
    const ys = times.map((t) => Math.round((probe.getPointAtLength(t * total).y - start.y) * 100) / 100);
    setTracks((prev) => {
      const without = prev.filter((tr) => !(tr.target === selectedElementId && (tr.property === "translateX" || tr.property === "translateY")));
      return [...without, { target: selectedElementId, property: "translateX", keyframes: times.map((t, i) => ({ t, v: xs[i]! })) }, { target: selectedElementId, property: "translateY", keyframes: times.map((t, i) => ({ t, v: ys[i]! })) }];
    });
    toast.success("Motion path applied — the element now follows the path");
  }, [animation, selectedElementId, multiSelection]);

  // Stagger: shift each selected element's keyframes later by its index
  // times a delay, so a shared animation ripples through the selection
  // instead of playing in unison.
  const staggerCanvasSelection = useCallback(async () => {
    const ids = multiSelection.length > 0 ? multiSelection : selectedElementId ? [selectedElementId] : [];
    if (ids.length < 2) { toast.error("Select at least two elements to stagger."); return; }
    const answer = await prompt({ title: "Stagger", label: "Delay between elements (seconds)", defaultValue: "0.1", placeholder: "0.1", required: true, confirmLabel: "Stagger" });
    const delaySec = parseFloat(answer || "");
    if (!Number.isFinite(delaySec) || delaySec <= 0) return;
    const delayNorm = delaySec / (duration / 1000);
    setTracks((prev) => prev.map((tr) => {
      const idx = ids.indexOf(tr.target);
      if (idx <= 0) return tr;
      return { ...tr, keyframes: tr.keyframes.map((k) => ({ ...k, t: Math.min(1, k.t + idx * delayNorm) })) };
    }));
    toast.success(`Staggered ${ids.length} elements by ${delaySec}s each`);
  }, [multiSelection, selectedElementId, duration, prompt]);

  const centreCanvasSelection = useCallback(() => {
    const box = selectionBox;
    const viewer = viewerRef.current;
    if (!box || !viewer) return;
    const rect = viewer.getBoundingClientRect();
    const dx = rect.width / 2 - (box.x + box.w / 2);
    const dy = rect.height / 2 - (box.y + box.h / 2);
    setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
  }, [selectionBox]);

  // Resize is not a separate tool anymore: Select & Move (transform) shows
  // the corner handles, so dragging a corner resizes and dragging the body
  // moves, with no mode switch in between.
  const [tool, setTool] = useState<"transform" | "hand" | "pen" | "node">("transform");
  // Auto-keyframe: the explicit answer to "dragging mints a track".
  // ON (default, old behaviour): canvas drag/resize writes the track at
  // the playhead, creating a timed move when the playhead is mid-clip.
  // OFF (Pose): canvas drag/resize moves the element's static pose — a
  // new track is flat, an existing track's keyframes all take the dragged
  // value — so it never silently adds a timed move. Drag/resize effects
  // read this through the ref, because their closures do not re-register
  // when the toggle changes.
  const [autoKeyframe, setAutoKeyframe] = useState(true);
  const autoKeyframeRef = useRef(true);
  autoKeyframeRef.current = autoKeyframe;
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  // Zoom range for tiny tweaks and for overview: the old 0.2x–4x range
  // and fixed 0.25 steps meant zooming to a single node took forever
  // (additive steps shrink in relative terms as zoom grows) and zooming
  // out to a whole large artboard stopped at 20%. 5%–6400% with
  // multiplicative steps fixes both: every step is a fixed percentage,
  // so it feels the same at 0.1x and at 32x.
  const MIN_ZOOM = 0.05;
  const MAX_ZOOM = 64;
  // Zoom, optionally anchored at a cursor point: the point under the
  // cursor stays under the cursor. The old wheel zoom scaled about the
  // centre, so the detail you were aiming at flew away as you zoomed
  // in. With no cursor given (buttons, keyboard) it zooms about the
  // centre, i.e. pan is left alone.
  const zoomAt = (nextRaw: number, clientX?: number, clientY?: number) => {
    const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(nextRaw * 100) / 100));
    if (clientX === undefined || clientY === undefined) {
      setZoom(next);
      return;
    }
    const viewer = viewerRef.current;
    if (!viewer) {
      setZoom(next);
      return;
    }
    const rect = viewer.getBoundingClientRect();
    const sx = clientX - rect.left - rect.width / 2;
    const sy = clientY - rect.top - rect.height / 2;
    const ratio = next / (zoom || 1);
    setZoom(next);
    setPan((prev) => ({
      x: Math.round(sx - (sx - prev.x) * ratio),
      y: Math.round(sy - (sy - prev.y) * ratio),
    }));
  };
  // Node-overlay sizing, in screen pixels: the overlay SVG lives inside
  // the CSS scale(zoom) wrapper, so a 1-unit stroke is zoom px on screen
  // — at the fitted zoom of ~3x, the old 1.5-unit strokes were ~4.5px and
  // the r=3 dots were ~18px across. Dividing by zoom keeps handles at a
  // constant screen size (1px lines, 6px dots) at any zoom, like Figma.
  const nodeU = 1 / (zoom || 1);

  // Fit the artboard to the viewer on open. At a fixed zoom of 1 a
  // 200x200 artboard sits tiny in a ~1000px viewer, which is why opening
  // a canvas looked zoomed out. Fit so the artboard fills 85% of the
  // smaller viewer dimension, clamped to 0.5x–3x (wheel zoom still goes
  // 0.2x–4x). Pan stays 0,0: the viewer flex-centres the artboard and
  // the transform origin is its centre, so 0,0 is already centred.
  // This runs once per project open only — StudioWorkspace is keyed by
  // animation.id — never on edits, or every SVG change would yank the
  // user's manual zoom back. The Reset view button reuses it too.
  const fitView = useCallback(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    const rect = viewer.getBoundingClientRect();
    const w = artboardSize.w || 200;
    const h = artboardSize.h || 200;
    if (rect.width <= 0 || rect.height <= 0 || w <= 0 || h <= 0) return;
    const fit = Math.min(rect.width / w, rect.height / h) * 0.85;
    setZoom(Math.min(3, Math.max(0.5, Math.round(fit * 100) / 100)));
    setPan({ x: 0, y: 0 });
  }, [artboardSize]);
  const fittedRef = useRef(false);
  useEffect(() => {
    if (fittedRef.current) return;
    fittedRef.current = true;
    fitView();
  }, [fitView]);
  const [showGrid, setShowGrid] = useState(false);
  const [gridSize, setGridSize] = useState(20);
  const [snapToGrid, setSnapToGrid] = useState(false);

  // Snap a value to the grid
  const snapValue = useCallback((value: number) => {
    if (!snapToGrid || !showGrid) return value;
    return Math.round(value / gridSize) * gridSize;
  }, [snapToGrid, showGrid, gridSize]);
  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const spaceDownTimeRef = useRef(0);
  const hasPannedRef = useRef(false);

  const effectiveTool = isSpacePressed ? "hand" : tool;

  // Pen tool state. A point may carry bezier handles from a click-drag:
  // out = outgoing handle of this anchor, in = incoming handle (mirrored
  // from out for a smooth anchor, so a dragged curve stays smooth).
  type PenPoint = { x: number; y: number; outX?: number | undefined; outY?: number | undefined; inX?: number | undefined; inY?: number | undefined };
  const [penPoints, setPenPoints] = useState<PenPoint[]>([]);
  const [penHover, setPenHover] = useState<{ x: number; y: number } | null>(null);
  const penPointsRef = useRef<PenPoint[]>([]);
  const penDragRef = useRef<{ index: number; startX: number; startY: number } | null>(null);
  useEffect(() => {
    penPointsRef.current = penPoints;
  }, [penPoints]);
  const penStartPointRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (tool !== "pen") {
      if (penPointsRef.current.length > 0) {
        setPenPoints([]);
        setPenHover(null);
      }
    }
  }, [tool]);

  useEffect(() => {
    setPenPoints([]);
    setPenHover(null);
  }, [animation?.id]);

  const cancelPen = useCallback(() => {
    setPenPoints([]);
    setPenHover(null);
  }, []);

  // Build the pen preview / final path: a segment is a cubic bezier when
  // either side carries a handle, otherwise a straight line.
  const penPathD = (pts: PenPoint[], closed: boolean) => {
    if (pts.length === 0) return "";
    const r = (v: number) => Math.round(v * 100) / 100;
    let d = `M ${r(pts[0]!.x)} ${r(pts[0]!.y)}`;
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1]!;
      const cur = pts[i]!;
      if (prev.outX !== undefined || cur.inX !== undefined) {
        const c1x = prev.outX ?? prev.x;
        const c1y = prev.outY ?? prev.y;
        const c2x = cur.inX ?? cur.x;
        const c2y = cur.inY ?? cur.y;
        d += ` C ${r(c1x)} ${r(c1y)} ${r(c2x)} ${r(c2y)} ${r(cur.x)} ${r(cur.y)}`;
      } else {
        d += ` L ${r(cur.x)} ${r(cur.y)}`;
      }
    }
    if (closed) d += " Z";
    return d;
  };

  // Click-drag in pen mode: while the pointer is down, moving it pulls
  // the new anchor's outgoing handle (and mirrors its incoming handle,
  // so the curve through that anchor stays smooth).
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const drag = penDragRef.current;
      if (!drag) return;
      const svg = stageRef.current?.querySelector("svg");
      if (!svg) return;
      const pt = svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const ctm = svg.getScreenCTM();
      const user = ctm ? pt.matrixTransform(ctm.inverse()) : null;
      if (!user) return;
      setPenPoints((prev) =>
        prev.map((p, i) => {
          if (i !== drag.index) return p;
          const outX = user.x;
          const outY = user.y;
          // Mirror for smooth anchors (not the first point, which has no incoming side).
          const inX = i > 0 ? 2 * p.x - outX : undefined;
          const inY = i > 0 ? 2 * p.y - outY : undefined;
          return { ...p, outX, outY, inX, inY };
        }),
      );
    };
    const onUp = () => { penDragRef.current = null; };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, []);

  const finishPen = useCallback(
    (closed: boolean) => {
      const pts = penPointsRef.current;
      if (pts.length >= 2 && onAddPath) {
        void onAddPath(pts.slice(), closed);
      }
      setPenPoints([]);
      setPenHover(null);
      setTool("transform");
    },
    [onAddPath],
  );

  // Node tool state: editable anchor points for the selected element.
  // Works for path/polygon/polyline/line, plus rect, image, circle,
  // ellipse and text — previously most shapes showed no nodes at all.
  const [nodePoints, setNodePoints] = useState<Array<{ x: number; y: number }>>([]);
  const [nodeClosed, setNodeClosed] = useState(false);
  const [nodeTag, setNodeTag] = useState("");
  // Anchor indices whose two C handles are mirrored (smooth) rather than
  // independent (corner). Only anchors with both an incoming and an
  // outgoing C control can be smooth; see bezierHandleInfo.
  const [nodeSmooth, setNodeSmooth] = useState<Set<number>>(new Set());
  const nodeSmoothForRef = useRef<string | null>(null);
  const nodeDragRef = useRef<{
    index: number;
    startX: number;
    startY: number;
    initX: number;
    initY: number;
    initPoints: Array<{ x: number; y: number }>;
    unitsPerPx: number;
    mirror?: { anchorIndex: number; oppositeIndex: number } | null;
  } | null>(null);
  // Live readout while a node is being dragged: the dragged point's
  // position and delta, plus the x/y it snapped to (if any) — so the
  // movement can be checked by eye instead of guessed.
  const [nodeDragInfo, setNodeDragInfo] = useState<{
    index: number;
    x: number;
    y: number;
    dx: number;
    dy: number;
  } | null>(null);
  const [nodeGuides, setNodeGuides] = useState<{ x?: number; y?: number }>({});

  useEffect(() => {
    if (nodeSmoothForRef.current !== selectedElementId) {
      nodeSmoothForRef.current = selectedElementId ?? null;
      setNodeSmooth(new Set());
    }
    if (!selectedElementId || !animation?.svg) {
      setNodePoints([]);
      return;
    }
    const doc = new DOMParser().parseFromString(animation.svg, "image/svg+xml");
    const el = doc.getElementById(selectedElementId);
    if (!el) {
      setNodePoints([]);
      return;
    }
    const tag = el.tagName.toLowerCase();
    setNodeTag(tag);
    if (tag === "polygon" || tag === "polyline") {
      setNodePoints(parsePointsAttr(el.getAttribute("points") || ""));
      setNodeClosed(tag === "polygon");
    } else if (tag === "line") {
      setNodePoints([
        {
          x: Number(el.getAttribute("x1") || 0),
          y: Number(el.getAttribute("y1") || 0),
        },
        {
          x: Number(el.getAttribute("x2") || 0),
          y: Number(el.getAttribute("y2") || 0),
        },
      ]);
      setNodeClosed(false);
    } else if (tag === "path") {
      const d = el.getAttribute("d") || "";
      setNodePoints(parsePathPoints(d));
      setNodeClosed(/z/i.test(d));
    } else if (tag === "rect" || tag === "image") {
      // Four corners: dragging one resizes the box from the opposite corner.
      const x = Number(el.getAttribute("x") || 0);
      const y = Number(el.getAttribute("y") || 0);
      const w = Number(el.getAttribute("width") || 0);
      const h = Number(el.getAttribute("height") || 0);
      setNodePoints([
        { x, y },
        { x: x + w, y },
        { x: x + w, y: y + h },
        { x, y: y + h },
      ]);
      setNodeClosed(false);
    } else if (tag === "circle") {
      const cx = Number(el.getAttribute("cx") || 0);
      const cy = Number(el.getAttribute("cy") || 0);
      const radius = Number(el.getAttribute("r") || 0);
      // Centre moves it, edge point resizes it.
      setNodePoints([
        { x: cx, y: cy },
        { x: cx + radius, y: cy },
      ]);
      setNodeClosed(false);
    } else if (tag === "ellipse") {
      const cx = Number(el.getAttribute("cx") || 0);
      const cy = Number(el.getAttribute("cy") || 0);
      const rx = Number(el.getAttribute("rx") || 0);
      const ry = Number(el.getAttribute("ry") || 0);
      setNodePoints([
        { x: cx, y: cy },
        { x: cx + rx, y: cy },
        { x: cx, y: cy + ry },
      ]);
      setNodeClosed(false);
    } else if (tag === "text") {
      setNodePoints([
        {
          x: Number(el.getAttribute("x") || 0),
          y: Number(el.getAttribute("y") || 0),
        },
      ]);
      setNodeClosed(false);
    } else {
      setNodePoints([]);
    }
  }, [selectedElementId, animation?.svg]);

  const commitNodePoints = useCallback(
    (pts: Array<{ x: number; y: number }>, closed: boolean) => {
      if (!animation || !selectedElementId) return;
      const doc = new DOMParser().parseFromString(animation.svg, "image/svg+xml");
      const el = doc.getElementById(selectedElementId);
      if (!el) return;
      const tag = el.tagName.toLowerCase();
      const r = (v: number) => Math.round(v * 100) / 100;
      if (tag === "polygon" || tag === "polyline") {
        el.setAttribute(
          "points",
          pts.map((p) => `${r(p.x)},${r(p.y)}`).join(" "),
        );
      } else if (tag === "line") {
        const a = pts[0];
        const b = pts[1];
        if (!a || !b) return;
        el.setAttribute("x1", String(r(a.x)));
        el.setAttribute("y1", String(r(a.y)));
        el.setAttribute("x2", String(r(b.x)));
        el.setAttribute("y2", String(r(b.y)));
      } else if (tag === "path") {
        // Rewrite only the edited coordinates, keeping curves, arcs and
        // the original commands intact. If the point count ever mismatches,
        // leave the path untouched rather than corrupting it.
        const segments = parsePathSegments(el.getAttribute("d") || "");
        const nextD = serializePathWithPoints(segments, pts);
        if (nextD === null) return;
        el.setAttribute(
          "d",
          closed && !/z/i.test(nextD) ? `${nextD} Z` : nextD,
        );
      } else if (tag === "rect" || tag === "image") {
        if (pts.length < 4) return;
        const xs = pts.map((p) => p.x);
        const ys = pts.map((p) => p.y);
        const minX = Math.min(...xs);
        const minY = Math.min(...ys);
        el.setAttribute("x", String(r(minX)));
        el.setAttribute("y", String(r(minY)));
        el.setAttribute("width", String(r(Math.max(1, Math.max(...xs) - minX))));
        el.setAttribute("height", String(r(Math.max(1, Math.max(...ys) - minY))));
      } else if (tag === "circle") {
        const center = pts[0];
        const edge = pts[1];
        if (!center || !edge) return;
        el.setAttribute("cx", String(r(center.x)));
        el.setAttribute("cy", String(r(center.y)));
        el.setAttribute(
          "r",
          String(r(Math.max(1, Math.hypot(edge.x - center.x, edge.y - center.y)))),
        );
      } else if (tag === "ellipse") {
        const center = pts[0];
        const right = pts[1];
        const bottom = pts[2];
        if (!center || !right || !bottom) return;
        el.setAttribute("cx", String(r(center.x)));
        el.setAttribute("cy", String(r(center.y)));
        el.setAttribute("rx", String(r(Math.max(1, Math.abs(right.x - center.x)))));
        el.setAttribute("ry", String(r(Math.max(1, Math.abs(bottom.y - center.y)))));
      } else if (tag === "text") {
        const p = pts[0];
        if (!p) return;
        el.setAttribute("x", String(r(p.x)));
        el.setAttribute("y", String(r(p.y)));
      }
      const nextSvg = new XMLSerializer().serializeToString(doc.documentElement);
      void onSave({ ...animation, svg: nextSvg });
    },
    [animation, selectedElementId, onSave],
  );

  // Bezier handle geometry for the current path, recomputed when its points change.
  const nodeBezier = useMemo(() => {
    if (nodeTag !== "path" || nodePoints.length === 0 || !animation?.svg || !selectedElementId) return null;
    try {
      const doc = new DOMParser().parseFromString(animation.svg, "image/svg+xml");
      const el = doc.getElementById(selectedElementId);
      if (!el) return null;
      return bezierHandleInfo(parsePathSegments(el.getAttribute("d") || ""), nodePoints);
    } catch {
      return null;
    }
  }, [nodeTag, nodePoints, animation?.svg, selectedElementId]);

  // Artboard bounds for the node overlay, so the drag guides can span the
  // whole canvas. Same parse as the overlay viewBox below.
  const nodeViewBox = useMemo(() => {
    const vb = (animation?.svg ?? "").match(
      /viewBox\s*=\s*["']\s*([-\d.eE+]+)\s+([-\d.eE+]+)\s+([\d.eE+]+)\s+([\d.eE+]+)\s*["']/i,
    );
    return vb
      ? { x: Number(vb[1]), y: Number(vb[2]), w: Number(vb[3]), h: Number(vb[4]) }
      : { x: 0, y: 0, w: 200, h: 200 };
  }, [animation?.svg]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const drag = nodeDragRef.current;
      if (!drag) return;
      const svg = stageRef.current?.querySelector("svg");
      if (!svg) return;
      const ctm = svg.getScreenCTM();
      const unitsPerPx = ctm && ctm.a ? 1 / ctm.a : drag.unitsPerPx;
      const dx = (e.clientX - drag.startX) * unitsPerPx;
      const dy = (e.clientY - drag.startY) * unitsPerPx;
      // Snap the dragged point to a nearby node's x or y (5 screen px),
      // so it lines up exactly; the readout and guides below show it.
      const initPt = drag.initPoints[drag.index];
      const snapTol = 5 * unitsPerPx;
      let snapX = initPt ? initPt.x + dx : 0;
      let snapY = initPt ? initPt.y + dy : 0;
      const guides: { x?: number; y?: number } = {};
      for (let k = 0; k < drag.initPoints.length; k++) {
        if (k === drag.index) continue;
        if (drag.mirror && k === drag.mirror.oppositeIndex) continue;
        const q = drag.initPoints[k];
        if (!q) continue;
        if (guides.x === undefined && Math.abs(q.x - snapX) < snapTol) {
          snapX = q.x;
          guides.x = q.x;
        }
        if (guides.y === undefined && Math.abs(q.y - snapY) < snapTol) {
          snapY = q.y;
          guides.y = q.y;
        }
      }
      setNodeGuides(guides);
      if (initPt) {
        setNodeDragInfo({
          index: drag.index,
          x: snapX,
          y: snapY,
          dx: snapX - initPt.x,
          dy: snapY - initPt.y,
        });
      }
      // Dragging a circle/ellipse centre moves the whole shape, so its
      // edge points must move with it — otherwise moving the centre would
      // silently change the radius instead.
      const moveAll =
        (nodeTag === "circle" || nodeTag === "ellipse") && drag.index === 0;
      setNodePoints((prev) => {
        const next = prev.map((p, i) => {
          if (!moveAll && i !== drag.index) return p;
          if (i === drag.index) return { x: snapX, y: snapY };
          const init = drag.initPoints[i] ?? p;
          return { x: init.x + dx, y: init.y + dy };
        });
        // Smooth anchor: mirror the opposite handle around the anchor so
        // the curve stays smooth through it while one handle is dragged.
        if (drag.mirror) {
          const anchor = drag.initPoints[drag.mirror.anchorIndex];
          const dragged = next[drag.index];
          if (anchor && dragged) {
            next[drag.mirror.oppositeIndex] = {
              x: 2 * anchor.x - dragged.x,
              y: 2 * anchor.y - dragged.y,
            };
          }
        }
        return next;
      });
    };
    const onUp = () => {
      const drag = nodeDragRef.current;
      if (drag) {
        // Commit on release using the latest nodePoints.
        setNodePoints((prev) => {
          commitNodePoints(prev, nodeClosed);
          return prev;
        });
      }
      setNodeDragInfo(null);
      setNodeGuides({});
      nodeDragRef.current = null;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [nodeClosed, nodeTag, commitNodePoints]);

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
        // New track, mid-clip, auto-keyframe on: a timed move, not a flat
        // one — the element sits at its base value at 0 and 1 and at the
        // dragged value at the playhead. At the ends (or in Pose mode) a
        // flat track is the right constant pose.
        const base = prop === "scale" || prop === "scaleX" || prop === "scaleY" ? 1 : 0;
        const keyframes: Keyframe[] =
          autoKeyframeRef.current && time > 0.02 && time < 0.98
            ? [
                { t: 0, v: base },
                { t: time, v: val },
                { t: 1, v: base },
              ]
            : [
                { t: 0, v: val },
                { t: 1, v: val },
              ];
        const newTrack: Track = {
          target: targetId,
          property: prop,
          keyframes,
        };
        return [...prev, newTrack];
      }

      const tr = prev[trackIndex]!;
      // Pose mode: the dragged value is the element's static pose, so
      // every keyframe takes it. Animate mode keeps the old behaviour:
      // update the keyframe at the playhead, or add one there.
      if (!autoKeyframeRef.current) {
        return prev.map((track, i) =>
          i === trackIndex
            ? { ...track, keyframes: track.keyframes.map((k) => ({ ...k, v: val })) }
            : track,
        );
      }
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

  // Click-through selection. A plain click takes the front-most element under
  // the cursor; clicking again in the same spot walks one step further down
  // the stack (and wraps back to the front), so an element hidden under
  // another can always be reached without hunting through the layer list.
  // Alt/Option reverses the walk: the first click takes the back-most
  // element and each further click moves towards the front. The stack is
  // recomputed on every click and only reused while the point stays within
  // a few pixels, so moving the cursor always starts again at the front.
  const clickStackRef = useRef<{
    x: number;
    y: number;
    key: string;
    index: number;
    id: string;
  } | null>(null);

  // Switching tools is a fresh intent: the next click starts at the front.
  useEffect(() => {
    clickStackRef.current = null;
  }, [tool]);

  /** Selectable ids under a screen point, front-most (top of z-order) first. */
  const stackAtPoint = useCallback(
    (clientX: number, clientY: number, svg: Element): string[] => {
      const ids: string[] = [];
      const seen = new Set<string>();
      // elementsFromPoint is the whole hit stack in paint order: the element
      // the browser would have given us as event.target, plus everything
      // painted under it at that pixel.
      for (const el of document.elementsFromPoint(clientX, clientY)) {
        if (!(el instanceof Element) || !svg.contains(el)) continue;
        if (el.closest("defs, mask, clipPath, symbol")) continue;
        // Nearest id'd ancestor-or-self: exactly what a single click used to
        // select, which also makes containing groups reachable on a later
        // click instead of being skipped over. The <svg> root itself counts
        // too — exports often carry id="Layer_1" there, and a click on the
        // bare artboard selected it before this change.
        let cur: Element | null = el;
        let id: string | null = null;
        while (cur) {
          const candidate = cur.getAttribute("id");
          if (candidate) {
            id = candidate;
            break;
          }
          if (cur === svg) break;
          cur = cur.parentElement;
        }
        if (!id || seen.has(id)) continue;
        seen.add(id);
        // Hidden elements cannot be hit anyway; locked ones must stay out of
        // the walk so a click never lands on something the user can't move.
        if (hiddenIds?.has(id) || lockedIds?.has(id)) continue;
        ids.push(id);
      }
      return ids;
    },
    [hiddenIds, lockedIds],
  );

  const handleStagePointerDown = (e: React.PointerEvent) => {
    if (effectiveTool === "hand" || e.button !== 0) return;

    if (tool === "node") {
      const target = (e.target as Element).closest("[id]");
      if (target && target.id) {
        onSelectElement?.(target.id);
        setPlaying(false);
      } else {
        onSelectElement?.(null);
        clearKeyframeSelection();
        setGuides({ x: null, y: null });
      }
      return;
    }

    if (tool === "pen") {
      e.preventDefault();
      e.stopPropagation();
      const svg = stageRef.current?.querySelector("svg");
      if (!svg) return;
      const pt = svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const ctm = svg.getScreenCTM();
      const user = ctm ? pt.matrixTransform(ctm.inverse()) : null;
      if (!user) return;
      const point = { x: snapValue(user.x), y: snapValue(user.y) };
      const points = penPointsRef.current;
      // Clicking near the first point closes the path. The old threshold
      // compared a user-unit distance to a screen-pixel width (width/40),
      // so on a 200-wide artboard at 3x zoom it closed from ~45 screen
      // px away — easy to close by accident. Now it is 12 screen px:
      // ctm.a is screen px per user unit, so 12 / ctm.a is that distance
      // in user units.
      const first = points[0];
      const closeThreshold = 12 / (ctm?.a || zoom || 1);
      if (
        first &&
        points.length >= 3 &&
        Math.hypot(first.x - point.x, first.y - point.y) < closeThreshold
      ) {
        finishPen(true);
        return;
      }
      // Start a bezier drag: if the pointer moves before release, this
      // anchor's handles are pulled out (see the pen drag effect); a plain
      // click leaves it as a straight corner point.
      penDragRef.current = { index: penPointsRef.current.length, startX: e.clientX, startY: e.clientY };
      setPenPoints((prev) => [...prev, point]);
      return;
    }
    const svg = stageRef.current?.querySelector("svg") ?? null;
    const stack = svg ? stackAtPoint(e.clientX, e.clientY, svg) : [];
    if (stack.length === 0) {
      clickStackRef.current = null;
      onSelectElement?.(null);
      setMultiSelection([]);
      clearKeyframeSelection();
      setGuides({ x: null, y: null });
      return;
    }

    // Shift/Cmd-click adds to (or removes from) the multi-selection used by
    // Align/Distribute, instead of replacing it. It only changes selection,
    // it does not start a drag. Modifier-clicks always take the front-most
    // element so the click-through walk does not affect them.
    if (e.shiftKey || e.metaKey || e.ctrlKey) {
      const topId = stack[0]!;
      setPlaying(false);
      setGuides({ x: null, y: null });
      if (multiSelection.includes(topId)) {
        const next = multiSelection.filter((value) => value !== topId);
        setMultiSelection(next);
        onSelectElement?.(next.length ? next[next.length - 1]! : null);
      } else {
        setMultiSelection((prev) => [...prev, topId]);
        onSelectElement?.(topId);
      }
      return;
    }

    // Front-to-back by default; Alt walks back-to-front instead.
    const ordered = e.altKey ? [...stack].reverse() : stack;
    const key = ordered.join("\u0001");
    const prevClick = clickStackRef.current;
    const sameSpot =
      prevClick !== null &&
      Math.hypot(prevClick.x - e.clientX, prevClick.y - e.clientY) <= 6;
    // Only continue the walk if this exact spot last produced the element
    // that is still selected. Selecting something else in the meantime (a
    // layer row, Escape, the agent) restarts at the front instead of
    // resuming halfway down a stack the user has forgotten about.
    const continuing =
      prevClick !== null &&
      sameSpot &&
      prevClick.key === key &&
      prevClick.id === selectedElementId;
    const index = continuing
      ? (prevClick.index + 1) % ordered.length
      : 0;
    const id = ordered[index]!;
    clickStackRef.current = {
      x: e.clientX,
      y: e.clientY,
      key,
      index,
      id,
    };
    const target = svg?.querySelector<Element>(`#${CSS.escape(id)}`) ?? null;
    if (!target) return;

    onSelectElement?.(id);
    setMultiSelection([id]);
    setPlaying(false);
    setGuides({ x: null, y: null });

    const curX = sampleTargetProperty(id, "translateX", time, 0);
    const curY = sampleTargetProperty(id, "translateY", time, 0);

    const viewer = viewerRef.current;
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
      
      // Update selection box in real-time during drag
      measureSelection();
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
  }, [zoom, time, measureSelection]);

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
      
      // Update selection box in real-time during resize
      measureSelection();
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
  }, [time, zoom, measureSelection]);

  // Panning workspace
  const panStartRef = useRef<{
    startX: number;
    startY: number;
    initPanX: number;
    initPanY: number;
  } | null>(null);

  const handleWorkspacePointerDown = (e: React.PointerEvent) => {
    if (tool === "pen") return;
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
    clearKeyframeSelection();
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

  // Wheel zoom/pan is bound as a native non-passive listener below. React
  // registers `onWheel` as a passive root listener, so preventDefault() in a
  // React handler only logs "Unable to preventDefault inside passive event
  // listener invocation" and the surrounding page scrolls under the canvas.
  const handleWheel = (e: WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      zoomAt(zoom * Math.exp(-e.deltaY * 0.002), e.clientX, e.clientY);
      return;
    }
    if (effectiveTool === "hand" || e.shiftKey) {
      e.preventDefault();
      setPan((p) => ({
        x: Math.round(p.x - e.deltaX),
        y: Math.round(p.y - e.deltaY),
      }));
      return;
    }
    // Plain wheel scrolls to zoom in/out, anchored at the cursor.
    e.preventDefault();
    zoomAt(zoom * Math.exp(-e.deltaY * 0.0015), e.clientX, e.clientY);
  };
  // Latest-handler ref keeps the listener attached once across renders while
  // still seeing the current zoom and tool on every event.
  const wheelHandlerRef = useRef(handleWheel);
  useEffect(() => {
    wheelHandlerRef.current = handleWheel;
  });
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    const onWheel = (event: WheelEvent) => wheelHandlerRef.current(event);
    viewer.addEventListener("wheel", onWheel, { passive: false });
    return () => viewer.removeEventListener("wheel", onWheel);
  }, []);

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
          target.isContentEditable ||
          // Radix selects (fps and property pickers) own their arrow keys.
          target.closest?.(
            '[role="combobox"], [role="listbox"], [role="option"]',
          ))
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
      if (e.code === "KeyD" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleDuplicate();
        return;
      }
      if (e.code === "KeyG" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (e.shiftKey) ungroupCanvasSelection();
        else groupCanvasSelection();
        return;
      }
      if (e.code === "KeyH" && (e.metaKey || e.ctrlKey) && e.shiftKey) {
        e.preventDefault();
        flipCanvasSelection("x");
        return;
      }
      if (e.code === "KeyV" && (e.metaKey || e.ctrlKey) && e.shiftKey) {
        e.preventDefault();
        flipCanvasSelection("y");
        return;
      }
      if (
        e.code === "KeyC" &&
        (e.metaKey || e.ctrlKey) &&
        (selection || selectedKeyframes.length > 0)
      ) {
        e.preventDefault();
        copyKeyframe();
        return;
      }
      if (
        e.code === "KeyV" &&
        (e.metaKey || e.ctrlKey) &&
        !e.shiftKey &&
        copiedKeyframesRef.current
      ) {
        // preventDefault also stops the browser paste event, so the canvas
        // SVG/image paste path does not fire on top of the keyframe paste.
        e.preventDefault();
        pasteKeyframe();
        return;
      }
      if (e.code === "BracketLeft" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        stepKeyframe(-1);
        return;
      }
      if (e.code === "BracketRight" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        stepKeyframe(1);
        return;
      }
      if (e.code === "KeyF" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        centreCanvasSelection();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.code === "Equal") {
        e.preventDefault();
        setZoom((z) => Math.min(MAX_ZOOM, Math.round(z * 1.25 * 100) / 100));
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.code === "Minus") {
        e.preventDefault();
        setZoom((z) => Math.max(MIN_ZOOM, Math.round((z / 1.25) * 100) / 100));
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.code === "Digit0") {
        e.preventDefault();
        fitView();
        return;
      }
      if (e.code === "Quote" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setShowGrid(v => !v);
        return;
      }
      if (e.code === "Semicolon" && (e.metaKey || e.ctrlKey) && e.shiftKey) {
        e.preventDefault();
        setSnapToGrid(v => !v);
        return;
      }
      if (e.code === "KeyP") {
        setTool("pen");
        return;
      }
      if (tool === "pen") {
        if (e.key === "Enter") {
          e.preventDefault();
          finishPen(false);
          return;
        }
        if (e.key === "Escape") {
          e.preventDefault();
          cancelPen();
          return;
        }
        if (e.key === "Backspace") {
          e.preventDefault();
          setPenPoints((prev) => prev.slice(0, -1));
          return;
        }
      }
      if (e.code === "KeyV") {
        setTool("transform");
      } else if (e.code === "KeyH") {
        setTool("hand");
      } else if (e.code === "KeyN") {
        setTool("node");
      } else if (e.code === "KeyR") {
        // R used to switch to the old Resize tool; it now just selects
        // Select & Move, which carries the resize handles.
        setTool("transform");
      } else if (e.code === "Space") {
        // Let a focused button handle Space natively so playback isn't toggled twice.
        if (target?.tagName === "BUTTON") return;
        e.preventDefault();
        if (!e.repeat) spaceDownTimeRef.current = performance.now();
        setIsSpacePressed(true);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        const direction = e.key === "ArrowLeft" ? -1 : 1;
        // One frame per press (Shift = ten), so the playhead lands on the
        // same timecode grid the timeline snaps keyframes to.
        const step =
          frameStepNormalized(duration, fps) * (e.shiftKey ? 10 : 1);
        scrub(timeRef.current + direction * step);
      } else if (e.key === "Home") {
        e.preventDefault();
        scrub(0);
      } else if (e.key === "End") {
        e.preventDefault();
        scrub(1);
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (selection || selectedKeyframes.length > 0) {
          e.preventDefault();
          removeSelectedKeyframes();
        }
      } else if (e.key === "Escape") {
        if (selection || selectedKeyframes.length > 0) {
          e.preventDefault();
          clearKeyframeSelection();
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
  }, [
    selection,
    selectedKeyframes,
    fps,
    duration,
    loop,
    playing,
    undo,
    redo,
    groupCanvasSelection,
    ungroupCanvasSelection,
    flipCanvasSelection,
    centreCanvasSelection,
    fitView,
    copyKeyframe,
    pasteKeyframe,
    removeSelectedKeyframes,
    clearKeyframeSelection,
  ]);

  const handleExport = (format: ExportFormat, options?: ExportRenderOptions) => {
    const result = runExport(
      { ...animation, title, tracks, duration, loop },
      format,
      options,
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

  const handleExportRaster = async (kind: RasterExportKind, options: RasterExportOptions) => {
    const result = await exportRaster(
      { ...animation, title, tracks, duration, loop },
      kind,
      options,
    );
    const url = URL.createObjectURL(result.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = result.filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${result.filename}`);
  };

  // Custom cursor styles - only for precision tools
  const toolCursorStyle = effectiveTool === "pen" 
    ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 20 20'%3E%3Cpath d='M15 2 L18 5 L8 15 L5 15 L5 12 Z M13 4 L16 7' fill='%23fff' stroke='%232391FF' stroke-width='1.5' stroke-linejoin='round'/%3E%3Ccircle cx='5.5' cy='14.5' r='1' fill='%232391FF'/%3E%3C/svg%3E") 5 15, crosshair`
    : effectiveTool === "node"
    ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28'%3E%3Cline x1='14' y1='4' x2='14' y2='24' stroke='%23ffffff' stroke-width='3' stroke-linecap='round'/%3E%3Cline x1='4' y1='14' x2='24' y2='14' stroke='%23ffffff' stroke-width='3' stroke-linecap='round'/%3E%3Cline x1='14' y1='4' x2='14' y2='24' stroke='%23000000' stroke-width='1.5' stroke-linecap='round'/%3E%3Cline x1='4' y1='14' x2='24' y2='14' stroke='%23000000' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E") 14 14, crosshair`
    : effectiveTool === "hand"
    ? isPanning ? "grabbing" : "grab"
    : "default";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ComposerColorInjector />
      <ComposerMentionStyler />
      <StudioTopBar
        center={
          <div className="flex h-8 items-center gap-2">
            {/* Tools, collapsed to one button + menu: the old Select / Node /
                Hand buttons (plus the separate Pen toggle further along)
                were four header slots for one choice. The button shows the
                active tool; the menu holds the rest. Keyboard shortcuts
                (V / N / H / P) still switch directly, unchanged. */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="relative group flex size-8 items-center justify-center gap-0.5 rounded-md text-[#2391FF] transition-colors hover:bg-accent"
                  aria-label="Tools"
                >
                  {tool === "transform" ? (
                    <MousePointer2 className="size-5" strokeWidth={2.5} />
                  ) : tool === "node" ? (
                    <Anchor className="size-5" strokeWidth={2.5} />
                  ) : tool === "hand" ? (
                    <Hand className="size-5" strokeWidth={2.5} />
                  ) : (
                    <PenTool className="size-5" strokeWidth={2.5} />
                  )}
                  <IconChevronDown className="size-3 text-muted-foreground" />
                  <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-1.5 py-0.5 text-[11px] font-medium text-background opacity-0 shadow transition-opacity group-hover:opacity-100">Tools</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Tools
                </div>
                <DropdownMenuItem onClick={() => setTool("transform")}>
                  <MousePointer2 className="mr-2 size-4" />
                  <span>Select, Move &amp; Resize</span>
                  <span className="ml-auto text-[10px] text-muted-foreground">V</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTool("node")}>
                  <Anchor className="mr-2 size-4" />
                  <span>Node</span>
                  <span className="ml-auto text-[10px] text-muted-foreground">N</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTool("hand")}>
                  <Hand className="mr-2 size-4" />
                  <span>Hand / Pan</span>
                  <span className="ml-auto text-[10px] text-muted-foreground">H</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTool("pen")}>
                  <PenTool className="mr-2 size-4" />
                  <span>Pen</span>
                  <span className="ml-auto text-[10px] text-muted-foreground">P</span>
                </DropdownMenuItem>
                {/* Click-through is invisible otherwise: nothing on screen
                    says a second click reaches the element underneath. */}
                <div className="mt-1 border-t border-border px-2 pb-1 pt-2 text-[10px] leading-relaxed text-muted-foreground">
                  Click again to select the element underneath ·{" "}
                  <span className="font-medium">⌥ click</span> to start from the
                  back
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Auto-keyframe toggle: ON = canvas drag/resize writes the
                track at the playhead (timed move); OFF = Pose, drag/resize
                moves the static pose. aria-pressed so the state is visible
                to assistive tech, not just by colour. */}
            <button
              type="button"
              aria-pressed={autoKeyframe}
              aria-label={autoKeyframe ? "Auto-keyframe on: canvas drags create keyframes at the playhead" : "Auto-keyframe off: canvas drags move the static pose"}
              title={autoKeyframe ? "Auto-keyframe on — drags create keyframes at the playhead" : "Pose mode — drags move the static pose, no timed move"}
              onClick={() => setAutoKeyframe((v) => !v)}
              className={`flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2 text-[11px] font-medium transition-colors ${autoKeyframe ? "bg-[#2391FF]/10 text-[#2391FF]" : "text-muted-foreground hover:text-foreground"}`}
            >
              <IconDiamondFilled className="size-3.5" />
              {autoKeyframe ? "Auto-keyframe" : "Pose"}
            </button>

            <span aria-hidden="true" className="mx-2 h-5 w-px bg-border" />

            {/* Asset library popup: wider card, search on top, grouped
                built-in assets below, plus the user's own My Assets. This
                replaces the old narrow w-48 Add shape dropdown; Text,
                New group and Draw with pen live in the popup footer. */}
            <AssetLibraryPopover
              onAddAsset={(asset) => onAddAsset?.(asset)}
              onAddText={() => onAddElement?.("text")}
              onAddGroup={() => onAddElement?.("g")}
              onDrawPen={() => setTool("pen")}
            />

            {/* Align tools dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="relative group grid size-6 place-items-center rounded-[5px] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Align tools"
                  disabled={multiSelection.length < 2}
                >
                  <IconFocusCentered className="size-5" strokeWidth={2.25} />
                  <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-1.5 py-0.5 text-[11px] font-medium text-background opacity-0 shadow transition-opacity group-hover:opacity-100">Align</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Align
                </div>
                <DropdownMenuItem onClick={() => handleAlign("left")}>
                  <span className="mr-2 inline-flex size-4 items-center justify-center text-[10px]">←|</span>
                  <span>Align Left</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAlign("center-h")}>
                  <span className="mr-2 inline-flex size-4 items-center justify-center text-[10px]">|·|</span>
                  <span>Align Center</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAlign("right")}>
                  <span className="mr-2 inline-flex size-4 items-center justify-center text-[10px]">|→</span>
                  <span>Align Right</span>
                </DropdownMenuItem>
                <div className="my-1 h-px bg-border" />
                <DropdownMenuItem onClick={() => handleAlign("top")}>
                  <span className="mr-2 inline-flex size-4 items-center justify-center text-[10px]">↑¯</span>
                  <span>Align Top</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAlign("middle")}>
                  <span className="mr-2 inline-flex size-4 items-center justify-center text-[10px]">⎯·⎯</span>
                  <span>Align Middle</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAlign("bottom")}>
                  <span className="mr-2 inline-flex size-4 items-center justify-center text-[10px]">_↓</span>
                  <span>Align Bottom</span>
                </DropdownMenuItem>
                <div className="my-1 h-px bg-border" />
                <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Distribute
                </div>
                <DropdownMenuItem onClick={() => handleDistribute("horizontal")}>
                  <span className="mr-2 inline-flex size-4 items-center justify-center text-[10px]">⟷</span>
                  <span>Horizontal</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDistribute("vertical")}>
                  <span className="mr-2 inline-flex size-4 items-center justify-center text-[10px]">⇅</span>
                  <span>Vertical</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <span aria-hidden="true" className="mx-2 h-5 w-px bg-border" />

            {/* Grid toggle */}
            <button
              type="button"
              onClick={() => setShowGrid(!showGrid)}
              className={`relative group grid size-8 place-items-center transition-colors ${
                showGrid
                  ? "text-[#2391FF]"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              aria-label="Toggle grid"
              aria-pressed={showGrid}
            >
              <Grid2x2 className="size-5" strokeWidth={2.5} />
              <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-1.5 py-0.5 text-[11px] font-medium text-background opacity-0 shadow transition-opacity group-hover:opacity-100">Grid</span>
            </button>

            {/* Snap to grid toggle */}
            {showGrid ? (
              <button
                type="button"
                onClick={() => setSnapToGrid(!snapToGrid)}
                className={`relative group grid size-6 place-items-center rounded transition-colors ${
                  snapToGrid
                    ? "bg-[#2391FF]/20 text-[#2391FF]"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
                aria-label="Snap to grid"
                aria-pressed={snapToGrid}
              >
                <IconLinkFilled className="size-4" />
                <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-1.5 py-0.5 text-[11px] font-medium text-background opacity-0 shadow transition-opacity group-hover:opacity-100">Snap grid</span>
              </button>
            ) : null}

            {/* Grid size dropdown */}
            {showGrid ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="relative group h-6 rounded-[5px] bg-muted px-2 text-[10px] font-medium transition-colors hover:bg-muted/80"
                  >
                    {gridSize}px
                    <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-1.5 py-0.5 text-[11px] font-medium text-background opacity-0 shadow transition-opacity group-hover:opacity-100">Grid size</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuRadioGroup value={String(gridSize)} onValueChange={(v) => setGridSize(Number(v))}>
                    <DropdownMenuRadioItem value="10">10px</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="20">20px</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="50">50px</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="100">100px</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}

            {/* Pen lives in the Tools menu above now, not as a second button. */}

            {/* Aspect Ratio Controls */}
            <AspectRatioControl animation={animation} onSave={onSave} />

            {/* Artboard background: white, checker, or custom color */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() =>
                  setArtboardBackground((bg) =>
                    bg === "checker" ? "white" : "checker",
                  )
                }
                className="relative group grid size-8 place-items-center rounded text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Toggle artboard background"
              >
                <Grid2x2 className="size-5" strokeWidth={2.5} />
                <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-1.5 py-0.5 text-[11px] font-medium text-background opacity-0 shadow transition-opacity group-hover:opacity-100">Background</span>
              </button>
              <ColorPicker
                variant="swatch"
                label="Background color"
                value={artboardBgColor}
                onChange={(v) => {
                  setArtboardBgColor(v);
                  setArtboardBackground("custom");
                }}
              />
            </div>

            <span aria-hidden="true" className="mx-2 h-5 w-px bg-border" />

            {/* Zoom Controls: multiplicative steps (Shift = fine step),
                so a click feels the same at 0.1x and at 32x, plus a
                live percentage readout — click it to reset the view. */}
            <button
              type="button"
              onClick={(e) =>
                setZoom((z) =>
                  Math.max(MIN_ZOOM, Math.round((z / (e.shiftKey ? 1.1 : 1.25)) * 100) / 100),
                )
              }
              className="relative group grid size-6 place-items-center rounded-[5px] text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Zoom out, Shift for a fine step"
            >
              <IconZoomOut className="size-5" strokeWidth={2.5} />
              <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-1.5 py-0.5 text-[11px] font-medium text-background opacity-0 shadow transition-opacity group-hover:opacity-100">Zoom out</span>
            </button>
            <button
              type="button"
              onClick={(e) =>
                setZoom((z) =>
                  Math.min(MAX_ZOOM, Math.round((z * (e.shiftKey ? 1.1 : 1.25)) * 100) / 100),
                )
              }
              className="relative group grid size-6 place-items-center rounded-[5px] text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Zoom in, Shift for a fine step"
            >
              <IconZoomIn className="size-5" strokeWidth={2.5} />
              <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-1.5 py-0.5 text-[11px] font-medium text-background opacity-0 shadow transition-opacity group-hover:opacity-100">Zoom in</span>
            </button>
            <button
              type="button"
              onClick={fitView}
              className="relative group grid h-6 min-w-10 shrink-0 place-items-center rounded-[5px] px-1 font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground"
              aria-label={`Zoom ${Math.round(zoom * 100)} percent, click to reset view`}
            >
              {Math.round(zoom * 100)}%
              <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-1.5 py-0.5 font-sans text-[11px] font-medium text-background opacity-0 shadow transition-opacity group-hover:opacity-100">Reset view</span>
            </button>
            <button
              type="button"
              // Reset means back to the fitted view, not zoom 1 — zoom 1
              // is exactly the zoomed-out view opening a canvas used to
              // show, so resetting to it would undo the fit.
              onClick={fitView}
              className="relative group grid size-6 place-items-center rounded-[5px] text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Reset zoom and center view"
            >
              <IconFocusCentered className="size-5" strokeWidth={2.25} />
              <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-1.5 py-0.5 text-[11px] font-medium text-background opacity-0 shadow transition-opacity group-hover:opacity-100">Reset view</span>
            </button>
          </div>
        }
        right={
          <>
            {/* Motion path + Stagger, collapsed to one menu: they were two
                text buttons eating right-header width for two occasional
                actions. Export stays a standalone primary button. */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="h-8 gap-1 text-[12px]" title="Animate along a path, or stagger the selection">
                  Animate
                  <IconChevronDown className="size-3.5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={animateAlongPath}>
                  <span className="flex flex-col">
                    <span>Motion path</span>
                    <span className="text-[11px] text-muted-foreground">Select an element, then Shift-click a path</span>
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => void staggerCanvasSelection()}>
                  <span className="flex flex-col">
                    <span>Stagger</span>
                    <span className="text-[11px] text-muted-foreground">Shift the selected elements&apos; keyframes apart</span>
                  </span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              size="sm"
              className="h-8 gap-1.5 text-[12px] bg-[#2391FF] text-white hover:bg-[#1f7fe0]"
              onClick={() => setExportDialogOpen(true)}
            >
              <IconDownloadFilled className="size-4" />
              Export
            </Button>
          </>
        }
      />

      {/* Main workspace artboard with pan, zoom, scale x & y, and element drag */}
      <div
        ref={viewerRef}
        className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-muted/30 select-none"
        style={{ cursor: toolCursorStyle }}
        onPointerDown={handleWorkspacePointerDown}
        onDragEnter={handleImageDragEnter}
        onDragOver={handleImageDragOver}
        onDragLeave={handleImageDragLeave}
        onDrop={handleImageDrop}
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

        {isDraggingImage ? (
          <div className="pointer-events-none absolute inset-3 z-30 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#2391FF] bg-[#2391FF]/5 text-[#2391FF]">
            <IconPhotoFilled className="size-7" />
            <span className="text-[13px] font-medium">
              Drop an image to add it as an element
            </span>
          </div>
        ) : null}

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
              artboardBackground === "checker"
                ? {
                    backgroundColor: "#ffffff",
                    backgroundImage:
                      "repeating-conic-gradient(#e3e3e3 0% 25%, #ffffff 0% 50%)",
                    backgroundSize: "18px 18px",
                  }
                : artboardBackground === "custom"
                ? { backgroundColor: artboardBgColor }
                : { backgroundColor: "#ffffff" }
            }
          >
            <ContextMenuPrimitive.Root>
              <ContextMenuPrimitive.Trigger asChild>
            <div
              ref={stageRef}
              onPointerDown={handleStagePointerDown}
              onContextMenu={handleStageContextMenu}
              onPointerMove={(e) => {
                if (tool !== "pen") return;
                const svg = stageRef.current?.querySelector("svg");
                if (!svg) return;
                const pt = svg.createSVGPoint();
                pt.x = e.clientX;
                pt.y = e.clientY;
                const ctm = svg.getScreenCTM();
                const user = ctm ? pt.matrixTransform(ctm.inverse()) : null;
                if (user) setPenHover({ x: user.x, y: user.y });
              }}
              onPointerLeave={() => setPenHover(null)}
              className="relative [&>svg]:block [&>svg]:h-auto [&>svg]:w-auto"
              dangerouslySetInnerHTML={{ 
                __html: (() => {
                  // One shared sanitiser (lib/sanitize.ts) for stage and
                  // exports — the old script-only regex left on* handlers,
                  // javascript: hrefs and foreignObject in place.
                  let cleanSvg = sanitizeSvg(animation.svg ?? "");
                  
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

                  // Hover effects: the preview animates on hover exactly
                  // like the export does. Injected after sanitising, so
                  // it never gets saved into the artwork itself.
                  const hoverCss = hoverEffectsCss(animation.hover);
                  if (hoverCss) {
                    cleanSvg = cleanSvg.replace("</svg>", `<style>${hoverCss}</style></svg>`);
                  }

                  return cleanSvg;
                })()
              }}
            />
              </ContextMenuPrimitive.Trigger>
              {canvasMenuNode ? (
                <ContextMenuPrimitive.Portal>
                  <ContextMenuPrimitive.Content className="z-50 min-w-[190px] rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-80">
                    <ElementContextMenuItems
                      node={canvasMenuNode}
                      isLocked={Boolean(canvasMenuNode.id && lockedIds?.has(canvasMenuNode.id))}
                      isHidden={Boolean(canvasMenuNode.id && hiddenIds?.has(canvasMenuNode.id))}
                      askAiCount={
                        canvasMenuNode.id &&
                        multiSelection.length > 1 &&
                        multiSelection.includes(canvasMenuNode.id)
                          ? multiSelection.length
                          : 1
                      }
                      moveTargets={
                        canvasMenuNode.path
                          ? canvasMoveTargets.filter(
                              (target) =>
                                target.path !== canvasMenuNode.path &&
                                !target.path.startsWith(`${canvasMenuNode.path}/`),
                            )
                          : []
                      }
                      onAskAi={handleCanvasAskAi}
                      onRename={(node) => onRenameElement?.(node)}
                      onDelete={(node) => onRemoveElement?.(node)}
                      onEditText={(node) => onEditText?.(node)}
                      onEditImageSource={(node) => onEditImageSource?.(node)}
                      onEditPath={(node) => onEditPath?.(node)}
                      onEditAttributes={(node) => onEditAttributes?.(node)}
                      onGroupElement={(node) => void handleCanvasGroup(node)}
                      onUngroupElement={(node) => void handleCanvasUngroup(node)}
                      onMoveElement={(node, targetPath) =>
                        void handleCanvasMove(node, targetPath)
                      }
                      onBringToFront={(node) => void handleCanvasBring(node, "front")}
                      onBringForward={(node) => void handleCanvasBring(node, "forward")}
                      onSendBackward={(node) => void handleCanvasBring(node, "backward")}
                      onSendToBack={(node) => void handleCanvasBring(node, "back")}
                      onToggleLock={(node) => onToggleLock?.(node)}
                      onToggleHide={(node) => onToggleHide?.(node)}
                    />
                  </ContextMenuPrimitive.Content>
                </ContextMenuPrimitive.Portal>
              ) : null}
            </ContextMenuPrimitive.Root>
            {/* Grid overlay */}
            {showGrid ? (
              <svg
                className="pointer-events-none absolute inset-0 z-10"
                width="100%"
                height="100%"
                preserveAspectRatio="none"
                viewBox={(() => {
                  const vb = (animation.svg ?? "")
                    .match(/viewBox\s*=\s*["']\s*([-\d.eE+]+)\s+([-\d.eE+]+)\s+([\d.eE+]+)\s+([\d.eE+]+)\s*["']/i);
                  return vb
                    ? `${vb[1]} ${vb[2]} ${vb[3]} ${vb[4]}`
                    : "0 0 200 200";
                })()}
              >
                <defs>
                  <pattern
                    id="grid-pattern"
                    x="0"
                    y="0"
                    width={gridSize}
                    height={gridSize}
                    patternUnits="userSpaceOnUse"
                  >
                    <path
                      d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`}
                      fill="none"
                      stroke="#2391FF"
                      strokeWidth="0.5"
                      opacity="0.3"
                    />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid-pattern)" />
              </svg>
            ) : null}
            {tool === "pen" ? (
              <svg
                className="pointer-events-none absolute inset-0 z-20"
                width="100%"
                height="100%"
                preserveAspectRatio="none"
                viewBox={(() => {
                  const vb = (animation.svg ?? "")
                    .match(/viewBox\s*=\s*["']\s*([-\d.eE+]+)\s+([-\d.eE+]+)\s+([\d.eE+]+)\s+([\d.eE+]+)\s*["']/i);
                  return vb
                    ? `${vb[1]} ${vb[2]} ${vb[3]} ${vb[4]}`
                    : "0 0 200 200";
                })()}
              >
                {/* Faint fill preview once a shape can close, so you see
                    the filled shape before you commit it — not just a line. */}
                {penPoints.length >= 3 ? (
                  <path
                    d={penPathD(penPoints, true)}
                    fill="#2391FF"
                    fill-opacity="0.07"
                    stroke="none"
                    className="pointer-events-none"
                  />
                ) : null}
                {penPoints.length > 0 ? (
                  <path
                    d={penPathD(penPoints, false)}
                    fill="none"
                    stroke="#2391FF"
                    // 0.5 units, in artwork units — not screen-constant like
                    // the handle dots. So it stays thin, and it still gets
                    // thinner on screen when you zoom out and thicker
                    // when you zoom in, exactly like the finished path.
                    stroke-width="0.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    opacity="0.9"
                  />
                ) : null}
                {penPoints.flatMap((p, i) => {
                  const els: React.ReactNode[] = [];
                  if (p.outX !== undefined && p.outY !== undefined) {
                    els.push(<line key={`o${i}`} x1={p.x} y1={p.y} x2={p.outX} y2={p.outY} stroke="#2391FF" stroke-width={nodeU} vector-effect="non-scaling-stroke" opacity="0.8" />);
                    els.push(<rect key={`od${i}`} x={p.outX - 3 * nodeU} y={p.outY - 3 * nodeU} width={6 * nodeU} height={6 * nodeU} transform={`rotate(45 ${p.outX} ${p.outY})`} fill="#2391FF" stroke="#ffffff" stroke-width={nodeU} vector-effect="non-scaling-stroke" />);
                  }
                  if (p.inX !== undefined && p.inY !== undefined) {
                    els.push(<line key={`i${i}`} x1={p.x} y1={p.y} x2={p.inX} y2={p.inY} stroke="#2391FF" stroke-width={nodeU} vector-effect="non-scaling-stroke" opacity="0.8" />);
                    els.push(<rect key={`id${i}`} x={p.inX - 3 * nodeU} y={p.inY - 3 * nodeU} width={6 * nodeU} height={6 * nodeU} transform={`rotate(45 ${p.inX} ${p.inY})`} fill="#2391FF" stroke="#ffffff" stroke-width={nodeU} vector-effect="non-scaling-stroke" />);
                  }
                  return els;
                })}
                {/* Dashed ring around the first point once closing is
                    possible — the close target was previously just a
                    slightly bigger dot, easy to miss. */}
                {penPoints.length >= 3 && penPoints[0] ? (
                  <circle
                    cx={penPoints[0]!.x}
                    cy={penPoints[0]!.y}
                    r={7 * nodeU}
                    fill="none"
                    stroke="#2391FF"
                    stroke-width={nodeU}
                    stroke-dasharray={`${2 * nodeU} ${2 * nodeU}`}
                    vector-effect="non-scaling-stroke"
                    opacity="0.7"
                    className="pointer-events-none"
                  />
                ) : null}
                {penPoints.map((p, i) => (
                  <circle
                    key={i}
                    cx={p.x}
                    cy={p.y}
                    r={i === 0 || i === penPoints.length - 1 ? 3.5 * nodeU : 3 * nodeU}
                    fill={i === 0 || i === penPoints.length - 1 ? "#2391FF" : "#ffffff"}
                    stroke="#2391FF"
                    stroke-width={nodeU}
                    vector-effect="non-scaling-stroke"
                  />
                ))}
                {penHover && penPoints.length > 0 ? (
                  <line
                    x1={penPoints[penPoints.length - 1]!.x}
                    y1={penPoints[penPoints.length - 1]!.y}
                    x2={penHover.x}
                    y2={penHover.y}
                    stroke="#2391FF"
                    stroke-width={nodeU}
                    stroke-dasharray={`${3 * nodeU} ${2 * nodeU}`}
                    vector-effect="non-scaling-stroke"
                    opacity="0.7"
                  />
                ) : null}
                {penHover && penPoints.length === 0 ? (
                  <circle
                    cx={penHover.x}
                    cy={penHover.y}
                    r={2.5 * nodeU}
                    fill="#2391FF"
                    opacity="0.7"
                  />
                ) : null}
              </svg>
            ) : null}
            {tool === "node" && nodePoints.length > 0 ? (
              <svg
                className="pointer-events-none absolute inset-0 z-20"
                width="100%"
                height="100%"
                preserveAspectRatio="none"
                viewBox={`${nodeViewBox.x} ${nodeViewBox.y} ${nodeViewBox.w} ${nodeViewBox.h}`}
              >
                {nodeBezier ? (
                  nodeBezier.lines.map((l, li) => (
                    <line
                      key={li}
                      x1={l.x1}
                      y1={l.y1}
                      x2={l.x2}
                      y2={l.y2}
                      stroke="#2391FF"
                      stroke-width={nodeU}
                      vector-effect="non-scaling-stroke"
                      opacity="0.8"
                    />
                  ))
                ) : (
                  <polyline
                    points={nodePoints.map((p) => `${p.x},${p.y}`).join(" ")}
                    fill="none"
                    stroke="#2391FF"
                    stroke-width={nodeU}
                    stroke-dasharray={`${4 * nodeU} ${3 * nodeU}`}
                    vector-effect="non-scaling-stroke"
                    opacity="0.7"
                  />
                )}
                {nodePoints.map((p, i) => (
                  <g key={i}>
                    {/* Invisible, larger grab area so the small visible dot stays easy to grab. */}
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={9 * nodeU}
                      fill="transparent"
                      className="pointer-events-auto cursor-grab"
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        const svg = stageRef.current?.querySelector("svg");
                        const ctm = svg?.getScreenCTM();
                        const unitsPerPx = ctm && ctm.a ? 1 / ctm.a : 1;
                        // Smooth anchor: dragging one handle mirrors the opposite.
                        let mirror: { anchorIndex: number; oppositeIndex: number } | null = null;
                        if (nodeBezier && nodeBezier.controlIndices.has(i)) {
                          const anchorIndex = nodeBezier.anchorOfControl.get(i);
                          const oppositeIndex = nodeBezier.opposite.get(i);
                          if (anchorIndex !== undefined && oppositeIndex !== undefined && nodeSmooth.has(anchorIndex)) {
                            mirror = { anchorIndex, oppositeIndex };
                          }
                        }
                        nodeDragRef.current = {
                          index: i,
                          startX: e.clientX,
                          startY: e.clientY,
                          initX: p.x,
                          initY: p.y,
                          initPoints: nodePoints,
                          unitsPerPx,
                          mirror,
                        };
                        setPlaying(false);
                      }}
                      onDoubleClick={(e) => {
                        // Double-click an anchor with both C handles to toggle
                        // smooth (mirrored) vs corner (independent) handles.
                        e.stopPropagation();
                        if (!nodeBezier || nodeBezier.controlIndices.has(i)) return;
                        if (!nodeBezier.smoothCandidates.has(i)) return;
                        const nextSmooth = new Set(nodeSmooth);
                        let nextPoints = nodePoints;
                        if (nextSmooth.has(i)) {
                          nextSmooth.delete(i);
                        } else {
                          nextSmooth.add(i);
                          // Mirror the outgoing handle around the anchor at once,
                          // so the curve visibly becomes smooth, not just on the next drag.
                          const anchor = nodePoints[i];
                          const inIdx = nodeBezier.controlIndices.has(i - 1) && nodeBezier.anchorOfControl.get(i - 1) === i ? i - 1 : undefined;
                          const outIdx = nodeBezier.controlIndices.has(i + 1) && nodeBezier.anchorOfControl.get(i + 1) === i ? i + 1 : undefined;
                          const inPt = inIdx !== undefined ? nodePoints[inIdx] : undefined;
                          if (anchor && inPt && outIdx !== undefined) {
                            nextPoints = nodePoints.map((pt, pi) =>
                              pi === outIdx ? { x: 2 * anchor.x - inPt.x, y: 2 * anchor.y - inPt.y } : pt,
                            );
                          }
                        }
                        setNodeSmooth(nextSmooth);
                        if (nextPoints !== nodePoints) {
                          setNodePoints(nextPoints);
                          commitNodePoints(nextPoints, nodeClosed);
                        }
                      }}
                    />
                    {nodeBezier?.controlIndices.has(i) ? (
                      <rect
                        x={p.x - 2.5 * nodeU}
                        y={p.y - 2.5 * nodeU}
                        width={5 * nodeU}
                        height={5 * nodeU}
                        transform={`rotate(45 ${p.x} ${p.y})`}
                        fill="#ffffff"
                        stroke="#2391FF"
                        stroke-width={nodeU}
                        vector-effect="non-scaling-stroke"
                        className="pointer-events-none"
                      />
                    ) : (
                      <g className="pointer-events-none">
                        {/* Slim plus for anchors, replacing the filled
                            circles: a white halo plus underneath so the
                            1px blue cross stays visible on any artwork,
                            then the blue cross itself. The invisible 9px
                            grab circle above still does the dragging, so
                            a slim symbol stays easy to grab. Smooth and
                            first anchors get a tiny centre dot, the old
                            filled-blue distinction, in plus form. */}
                        <line
                          x1={p.x - 4 * nodeU}
                          y1={p.y}
                          x2={p.x + 4 * nodeU}
                          y2={p.y}
                          stroke="#ffffff"
                          stroke-width={2 * nodeU}
                          stroke-linecap="round"
                          vector-effect="non-scaling-stroke"
                          opacity="0.9"
                        />
                        <line
                          x1={p.x}
                          y1={p.y - 4 * nodeU}
                          x2={p.x}
                          y2={p.y + 4 * nodeU}
                          stroke="#ffffff"
                          stroke-width={2 * nodeU}
                          stroke-linecap="round"
                          vector-effect="non-scaling-stroke"
                          opacity="0.9"
                        />
                        <line
                          x1={p.x - 4 * nodeU}
                          y1={p.y}
                          x2={p.x + 4 * nodeU}
                          y2={p.y}
                          stroke="#2391FF"
                          stroke-width={nodeU}
                          stroke-linecap="round"
                          vector-effect="non-scaling-stroke"
                        />
                        <line
                          x1={p.x}
                          y1={p.y - 4 * nodeU}
                          x2={p.x}
                          y2={p.y + 4 * nodeU}
                          stroke="#2391FF"
                          stroke-width={nodeU}
                          stroke-linecap="round"
                          vector-effect="non-scaling-stroke"
                        />
                        {i === 0 || nodeSmooth.has(i) ? (
                          <circle cx={p.x} cy={p.y} r={1.2 * nodeU} fill="#2391FF" />
                        ) : null}
                      </g>
                    )}
                  </g>
                ))}
                {/* While a node is dragged: a dashed crosshair through it
                    spanning the whole artboard, solid lines where it
                    snapped to another node's x/y, and a live readout of
                    its position, delta, and (for a bezier handle) its
                    length and angle from its anchor. All thin and
                    screen-constant, like the rest of the node chrome. */}
                {nodeDragInfo ? (
                  <g className="pointer-events-none">
                    <line x1={nodeViewBox.x} y1={nodeDragInfo.y} x2={nodeViewBox.x + nodeViewBox.w} y2={nodeDragInfo.y} stroke="#2391FF" stroke-width={nodeU} stroke-dasharray={`${3 * nodeU} ${3 * nodeU}`} vector-effect="non-scaling-stroke" opacity="0.45" />
                    <line x1={nodeDragInfo.x} y1={nodeViewBox.y} x2={nodeDragInfo.x} y2={nodeViewBox.y + nodeViewBox.h} stroke="#2391FF" stroke-width={nodeU} stroke-dasharray={`${3 * nodeU} ${3 * nodeU}`} vector-effect="non-scaling-stroke" opacity="0.45" />
                    {nodeGuides.x !== undefined ? (
                      <line x1={nodeGuides.x} y1={nodeViewBox.y} x2={nodeGuides.x} y2={nodeViewBox.y + nodeViewBox.h} stroke="#2391FF" stroke-width={nodeU} vector-effect="non-scaling-stroke" opacity="0.9" />
                    ) : null}
                    {nodeGuides.y !== undefined ? (
                      <line x1={nodeViewBox.x} y1={nodeGuides.y} x2={nodeViewBox.x + nodeViewBox.w} y2={nodeGuides.y} stroke="#2391FF" stroke-width={nodeU} vector-effect="non-scaling-stroke" opacity="0.9" />
                    ) : null}
                    {(() => {
                      const fmt = (v: number) => (Math.round(v * 10) / 10).toFixed(1);
                      const lines = [
                        `x ${fmt(nodeDragInfo.x)}  y ${fmt(nodeDragInfo.y)}`,
                        `dx ${nodeDragInfo.dx >= 0 ? "+" : ""}${fmt(nodeDragInfo.dx)}  dy ${nodeDragInfo.dy >= 0 ? "+" : ""}${fmt(nodeDragInfo.dy)}`,
                      ];
                      const anchorIdx = nodeBezier?.anchorOfControl.get(nodeDragInfo.index);
                      if (anchorIdx !== undefined) {
                        const anchor = nodePoints[anchorIdx];
                        if (anchor) {
                          const len = Math.hypot(nodeDragInfo.x - anchor.x, nodeDragInfo.y - anchor.y);
                          const ang = (Math.atan2(nodeDragInfo.y - anchor.y, nodeDragInfo.x - anchor.x) * 180) / Math.PI;
                          lines.push(`len ${fmt(len)}  ∠ ${fmt(ang)}°`);
                        }
                      }
                      const fs = 11 * nodeU;
                      const lh = 14 * nodeU;
                      const pad = 6 * nodeU;
                      const w = Math.max(...lines.map((s) => s.length)) * 6.6 * nodeU + pad * 2;
                      const h = lines.length * lh + pad * 2;
                      let lx = nodeDragInfo.x + 14 * nodeU;
                      let ly = nodeDragInfo.y - 14 * nodeU - h;
                      if (lx + w > nodeViewBox.x + nodeViewBox.w) lx = nodeDragInfo.x - 14 * nodeU - w;
                      if (ly < nodeViewBox.y) ly = nodeDragInfo.y + 14 * nodeU;
                      return (
                        <g>
                          <rect x={lx} y={ly} width={w} height={h} rx={4 * nodeU} fill="#111827" fill-opacity="0.92" stroke="#2391FF" stroke-width={nodeU} vector-effect="non-scaling-stroke" />
                          {lines.map((s, li) => (
                            <text key={li} x={lx + pad} y={ly + pad + fs + li * lh} font-size={fs} font-family="monospace" fill="#ffffff">{s}</text>
                          ))}
                        </g>
                      );
                    })()}
                  </g>
                ) : null}
              </svg>
            ) : null}
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
                effectiveTool === "transform"
                  ? `
                #stage svg [id]:not([data-locked="true"]),
                div[class*="relative"] svg [id]:not([data-locked="true"]) {
                  cursor: default !important;
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
        {selectionBox &&
        (effectiveTool === "transform" || effectiveTool === "node") ? (
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

            {effectiveTool === "transform"
              ? RESIZE_CORNERS.map(({ corner, cursor, left, top }) => (
                  <button
                    key={corner}
                    type="button"
                    onPointerDown={startResize(corner)}
                    className="pointer-events-auto absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#2391FF] shadow-md transition-transform hover:scale-125"
                    style={{ left, top, cursor }}
                    title={`Resize from ${corner} corner (keeps aspect ratio)`}
                    aria-label={`Resize from ${corner} corner`}
                  />
                ))
              : null}
          </div>
        ) : null}

        {selected && keyframeSlot
          ? createPortal(
              <KeyframeInspector
                docked
                track={selected.track}
                keyframe={selected.keyframe}
                time={time}
                duration={duration}
                fps={fps}
                onChange={(patch) =>
                  updateKeyframe(
                    selected.selection.track,
                    selected.selection.keyframe,
                    patch,
                  )
                }
                onTrackKeyframeChange={(kfIndex, patch) =>
                  updateKeyframe(selected.selection.track, kfIndex, patch)
                }
                onTrackKeyframeAdd={(t, v) =>
                  addKeyframe(selected.selection.track, t, v)
                }
                onPrev={() => stepKeyframe(-1)}
                onNext={() => stepKeyframe(1)}
                onCopy={copyKeyframe}
                onPaste={pasteKeyframe}
                canPaste={hasCopiedKeyframe}
                selectedCount={selectedKeyframes.length}
                onDelete={removeSelectedKeyframes}
                onClose={clearKeyframeSelection}
              />,
              keyframeSlot,
            )
          : null}
      </div>

      {/* Pen hint, after the canvas ends: not overlaid on the canvas at
          all, no background, no pill, no shadow — just small muted text
          with two small text buttons. It sits in normal flow between
          the canvas and the timeline, so it never covers art. */}
      {tool === "pen" ? (
        <div className="flex shrink-0 items-center justify-center gap-3 px-2 py-1 text-[11px] text-muted-foreground">
          {penPoints.length === 0 ? (
            <span>Click to place a point · drag for a curve</span>
          ) : (
            <>
              <span>
                {penPoints.length} point{penPoints.length === 1 ? "" : "s"} · click to add · drag for a curve
                {penPoints.length >= 3 ? " · click the ring to close" : ""}
              </span>
              <button
                type="button"
                onClick={() => finishPen(false)}
                className="font-medium text-[#2391FF] hover:underline"
              >
                Finish (Enter)
              </button>
              <button
                type="button"
                onClick={() => cancelPen()}
                className="hover:underline"
              >
                Cancel (Esc)
              </button>
            </>
          )}
        </div>
      ) : null}

      <Timeline
        tracks={tracks}
        time={time}
        selection={selection}
        selectedKeyframes={selectedKeyframes}
        selectedElementId={selectedElementId}
        duration={duration}
        playing={playing}
        loop={loop}
        fps={fps}
        snapEnabled={snapEnabled}
        height={timelineHeight}
        sidebarWidth={sidebarWidth}
        onHeightChange={onTimelineHeightChange}
        onTogglePlay={togglePlay}
        onToggleLoop={() => setLoop((v) => !v)}
        onDurationChange={setDuration}
        onFpsChange={setFps}
        onSnapChange={setSnapEnabled}
        onScrub={scrub}
        onSelectKeyframe={selectKeyframe}
        onActivateKeyframe={activateKeyframe}
        onAdd={addKeyframe}
        onRemove={removeKeyframe}
        onMoveMany={moveKeyframes}
      />
      <SvgExportDialog
        open={exportDialogOpen}
        svg={animation.svg ?? ""}
        title={title ?? ""}
        duration={duration}
        tracks={tracks}
        loop={loop}
        onClose={() => setExportDialogOpen(false)}
        onExport={(format, options) => {
          handleExport(format, options);
        }}
        onExportRaster={(kind, options) => handleExportRaster(kind, options)}
      />
      {imagePromptDialog}
    </div>
  );
}

function GraphEditor({
  track,
  time,
  onKeyframeChange,
  onKeyframeAdd,
}: {
  track: Track;
  time?: number | undefined;
  onKeyframeChange: (kfIndex: number, patch: { t?: number; v?: number; ease?: string }) => void;
  onKeyframeAdd?: ((t: number, v: number) => void) | undefined;
}) {
  const W = 240;
  const H = 120;
  const PAD = 12;
  // Numeric keyframes with their original track indices, so handle and point
  // drags update the right keyframe even if a track mixes value types.
  const numeric = track.keyframes
    .map((k, index) => ({ ...k, index }))
    .filter((k) => typeof k.v === "number") as Array<{ t: number; v: number; ease?: string; index: number }>;
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{ index: number; min: number; max: number } | null>(null);
  const handleDragRef = useRef<{
    leftIndex: number;
    handle: 0 | 1;
    cubic: [number, number, number, number];
    aT: number;
    aV: number;
    bT: number;
    bV: number;
    min: number;
    max: number;
  } | null>(null);
  if (numeric.length < 2) {
    return <p className="text-[11px] text-muted-foreground">Add at least two numeric keyframes to see the curve.</p>;
  }
  const values = numeric.map((k) => k.v);
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (min === max) { min -= 1; max += 1; }
  const pad = (max - min) * 0.15;
  min -= pad;
  max += pad;
  const x = (t: number) => PAD + t * (W - PAD * 2);
  const y = (v: number) => PAD + (1 - (v - min) / (max - min)) * (H - PAD * 2);
  // Sampled curve, so easing shapes (not just straight lines between
  // diamonds) are visible in the graph.
  const curve: string[] = [];
  for (let i = 0; i <= 60; i++) {
    const t = i / 60;
    const v = sampleTrack(track, t);
    if (typeof v !== "number") continue;
    curve.push(`${i === 0 ? "M" : "L"} ${x(t).toFixed(1)} ${y(v).toFixed(1)}`);
  }
  const startDrag = (e: React.PointerEvent, kfIndex: number) => {
    e.preventDefault();
    dragRef.current = { index: kfIndex, min, max };
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const move = (ev: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const t = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
      const v = drag.min + (1 - (ev.clientY - rect.top) / rect.height) * (drag.max - drag.min);
      onKeyframeChange(drag.index, { t, v: Math.round(v * 100) / 100 });
    };
    const up = () => {
      dragRef.current = null;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };
  // Convert a pointer position in the graph to (time, value), inverting the
  // x/y mappings above (including the PAD, which point-drag ignores).
  const pointToTimeValue = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const vx = ((clientX - rect.left) / rect.width) * W;
    const vy = ((clientY - rect.top) / rect.height) * H;
    const t = Math.max(0, Math.min(1, (vx - PAD) / (W - PAD * 2)));
    const v = min + (1 - (vy - PAD) / (H - PAD * 2)) * (max - min);
    return { t, v: Math.round(v * 100) / 100 };
  };
  const startHandleDrag = (
    e: React.PointerEvent,
    leftIndex: number,
    handle: 0 | 1,
    cubic: [number, number, number, number],
    aT: number,
    aV: number,
    bT: number,
    bV: number,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    handleDragRef.current = { leftIndex, handle, cubic, aT, aV, bT, bV, min, max };
    const move = (ev: PointerEvent) => {
      const drag = handleDragRef.current;
      if (!drag) return;
      const pt = pointToTimeValue(ev.clientX, ev.clientY);
      if (!pt) return;
      const spanT = drag.bT - drag.aT;
      const spanV = drag.bV - drag.aV;
      if (spanT === 0) return;
      const next = [...drag.cubic] as [number, number, number, number];
      if (drag.handle === 0) {
        next[0] = Math.round(Math.max(0, Math.min(1, (pt.t - drag.aT) / spanT)) * 100) / 100;
        // With equal values the easing shape is invisible, so only time moves.
        if (spanV !== 0) next[1] = Math.round(Math.max(-2, Math.min(2, (pt.v - drag.aV) / spanV)) * 100) / 100;
      } else {
        next[2] = Math.round(Math.max(0, Math.min(1, (pt.t - drag.aT) / spanT)) * 100) / 100;
        if (spanV !== 0) next[3] = Math.round(Math.max(-2, Math.min(2, (pt.v - drag.aV) / spanV)) * 100) / 100;
      }
      handleDragRef.current = { ...drag, cubic: next };
      onKeyframeChange(drag.leftIndex, { ease: formatCubicBezier(next) });
    };
    const up = () => {
      handleDragRef.current = null;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };
  // Bezier handles, one segment at a time. A segment's easing is stored on
  // its left keyframe, so both handles of a segment edit that keyframe's
  // cubic-bezier: handle 0 is (x1,y1), handle 1 is (x2,y2). Hold segments
  // have no curve to shape and get no handles. Handles are drawn before
  // the keyframe points, so a handle sitting exactly on a keyframe (the
  // linear case) does not steal the keyframe's own drag.
  const handles: Array<{
    key: string;
    leftIndex: number;
    handle: 0 | 1;
    cubic: [number, number, number, number];
    aT: number;
    aV: number;
    bT: number;
    bV: number;
    cx: number;
    cy: number;
  }> = [];
  for (let i = 0; i < numeric.length - 1; i++) {
    const a = numeric[i]!;
    const b = numeric[i + 1]!;
    if (a.ease === "hold") continue;
    const cubic = cubicBezierForEase(a.ease);
    handles.push({
      key: `${a.index}-0`,
      leftIndex: a.index,
      handle: 0,
      cubic,
      aT: a.t,
      aV: a.v,
      bT: b.t,
      bV: b.v,
      cx: x(a.t + cubic[0] * (b.t - a.t)),
      cy: y(a.v + cubic[1] * (b.v - a.v)),
    });
    handles.push({
      key: `${a.index}-1`,
      leftIndex: a.index,
      handle: 1,
      cubic,
      aT: a.t,
      aV: a.v,
      bT: b.t,
      bV: b.v,
      cx: x(a.t + cubic[2] * (b.t - a.t)),
      cy: y(a.v + cubic[3] * (b.v - a.v)),
    });
  }
  return (
    <div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full rounded-md border border-border bg-muted/30"
        onDoubleClick={(e) => {
          if (!onKeyframeAdd) return;
          const pt = pointToTimeValue(e.clientX, e.clientY);
          if (pt) onKeyframeAdd(pt.t, pt.v);
        }}
      >
        <path d={curve.join(" ")} fill="none" stroke="#2391FF" strokeWidth="2" />
        {time !== undefined ? (
          <line x1={x(time)} y1={0} x2={x(time)} y2={H} stroke="#2391FF" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
        ) : null}
        {handles.map((h) => (
          <g key={h.key}>
            <line
              x1={h.handle === 0 ? x(h.aT) : x(h.bT)}
              y1={h.handle === 0 ? y(h.aV) : y(h.bV)}
              x2={h.cx}
              y2={h.cy}
              stroke="#2391FF"
              strokeWidth="1"
              opacity="0.5"
            />
            <circle
              cx={h.cx}
              cy={h.cy}
              r="7"
              fill="transparent"
              className="cursor-grab"
              onPointerDown={(e) => startHandleDrag(e, h.leftIndex, h.handle, h.cubic, h.aT, h.aV, h.bT, h.bV)}
            />
            <rect x={h.cx - 3.5} y={h.cy - 3.5} width="7" height="7" fill="#ffffff" stroke="#2391FF" strokeWidth="1.5" className="pointer-events-none" />
          </g>
        ))}
        {track.keyframes.map((k, i) => {
          if (typeof k.v !== "number") return null;
          return (
            <g key={i}>
              <circle cx={x(k.t)} cy={y(k.v)} r="9" fill="transparent" className="cursor-grab" onPointerDown={(e) => startDrag(e, i)} />
              <circle cx={x(k.t)} cy={y(k.v)} r="4" fill="#ffffff" stroke="#2391FF" strokeWidth="1.5" className="pointer-events-none" />
            </g>
          );
        })}
      </svg>
      <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">Drag a point to change its time (horizontal) and value (vertical). Drag a square handle to reshape that segment's easing curve. Double-click the graph to add a keyframe there.</p>
    </div>
  );
}

function KeyframeInspector({
  track,
  keyframe,
  time,
  duration,
  fps,
  onChange,
  onTrackKeyframeChange,
  onTrackKeyframeAdd,
  onPrev,
  onNext,
  onCopy,
  onPaste,
  canPaste = false,
  selectedCount = 0,
  onDelete,
  onClose,
  docked = false,
}: {
  track: Track;
  keyframe: { t: number; v: number | string; ease?: string };
  time?: number;
  /** Clip length + frame rate, used for the timecode readout. */
  duration: number;
  fps: number;
  onChange: (patch: { t?: number; v?: number | string; ease?: string }) => void;
  onTrackKeyframeChange?: (kfIndex: number, patch: { t?: number; v?: number; ease?: string }) => void;
  onTrackKeyframeAdd?: (t: number, v: number) => void;
  onPrev?: () => void;
  onNext?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  canPaste?: boolean;
  /** How many diamonds are selected; the delete button removes them all. */
  selectedCount?: number;
  onDelete: () => void;
  onClose: () => void;
  /** Docked in the left sidebar (via the portal slot) instead of floating
      over the canvas: full width, in-flow, no absolute positioning. */
  docked?: boolean;
}) {
  const meta = PROPERTY_DEFINITIONS[track.property];
  const isColor =
    track.property === "fill" &&
    typeof keyframe.v === "string" &&
    /^#[0-9a-f]{3,8}$/i.test(keyframe.v);
  const easingMissing =
    keyframe.ease &&
    !EASING_OPTIONS.some((option) => option.value === keyframe.ease);
  const cubic = parseCubicBezier(keyframe.ease);

  return (
    <div
      data-keep-selection
      className={
        docked
          ? "w-full overflow-hidden bg-sidebar text-sidebar-foreground"
          : "absolute right-5 top-5 z-30 w-60 overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-lg"
      }
    >
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-primary" />
          <span className="text-[12px] font-medium">{meta.label}</span>
          <span className="text-[10px] text-muted-foreground">
            #{track.target}
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={onPrev}
            className="grid size-5 place-items-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            title="Previous keyframe ([)"
            aria-label="Previous keyframe"
          >
            <IconChevronRight className="size-3 rotate-180" />
          </button>
          <button
            onClick={onNext}
            className="grid size-5 place-items-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            title="Next keyframe (])"
            aria-label="Next keyframe"
          >
            <IconChevronRight className="size-3" />
          </button>
          <button
            onClick={onClose}
            className="grid size-5 place-items-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            title="Close"
          >
            <IconX className="size-3" />
          </button>
        </div>
      </div>

      <div className="space-y-3 p-3">
        <label className="block">
          <span className="mb-1 flex items-baseline justify-between text-[10px] font-medium text-muted-foreground">
            <span>Time</span>
            <span className="font-mono text-[10px] tabular-nums text-muted-foreground/80">
              {formatSecondsMs(keyframe.t * (duration / 1000))}
            </span>
          </span>
          <div className="flex items-center gap-2">
            <Slider
              value={[
                Math.round(
                  keyframe.t *
                    Math.max(1, Math.round((duration / 1000) * fps)),
                ),
              ]}
              min={0}
              max={Math.max(1, Math.round((duration / 1000) * fps))}
              step={1}
              onValueChange={([next]) =>
                onChange({
                  t:
                    (next ?? 0) /
                    Math.max(1, Math.round((duration / 1000) * fps)),
                })
              }
              thumbAriaLabel="Keyframe time"
              className="min-w-0 flex-1"
            />
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

        {keyframe.ease === "hold" ? null : cubic ? (
          <div>
            <span className="mb-1 block text-[10px] font-medium text-muted-foreground">Custom bezier</span>
            <div className="grid grid-cols-4 gap-1.5">
              {["x1", "y1", "x2", "y2"].map((label, i) => (
                <label key={label} className="block">
                  <span className="mb-0.5 block text-[10px] text-muted-foreground">{label}</span>
                  <Input
                    type="number"
                    step="0.01"
                    value={cubic[i]}
                    onChange={(e) => {
                      const parsed = parseFloat(e.target.value);
                      if (!Number.isFinite(parsed)) return;
                      const next = [...cubic] as [number, number, number, number];
                      const isX = i === 0 || i === 2;
                      const clamped = Math.round(Math.max(isX ? 0 : -2, Math.min(isX ? 1 : 2, parsed)) * 100) / 100;
                      if (i === 0) next[0] = clamped;
                      else if (i === 1) next[1] = clamped;
                      else if (i === 2) next[2] = clamped;
                      else next[3] = clamped;
                      onChange({ ease: formatCubicBezier(next) });
                    }}
                    className="h-7 px-1.5 text-[11px]"
                  />
                </label>
              ))}
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onChange({ ease: formatCubicBezier(cubicBezierForEase(keyframe.ease)) })}
            className="flex w-full items-center justify-center rounded-md border border-border py-1.5 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            Convert to custom bezier
          </button>
        )}

        <div>
          <span className="mb-1 block text-[10px] font-medium text-muted-foreground">Graph</span>
          {onTrackKeyframeChange ? (
            <GraphEditor track={track} time={time} onKeyframeChange={onTrackKeyframeChange} onKeyframeAdd={onTrackKeyframeAdd} />
          ) : (
            <p className="text-[11px] text-muted-foreground">Graph editing is unavailable for this track.</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={onCopy}
            title="Copy selected keyframes (Cmd/Ctrl+C)"
            className="flex items-center justify-center rounded-md border border-border py-1.5 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            {selectedCount > 1 ? `Copy ${selectedCount}` : "Copy keyframe"}
          </button>
          <button
            type="button"
            onClick={onPaste}
            disabled={!canPaste}
            title="Paste keyframe at the playhead (Cmd/Ctrl+V)"
            className="flex items-center justify-center rounded-md border border-border py-1.5 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-35"
          >
            Paste keyframe
          </button>
        </div>
        <button
          onClick={onDelete}
          className="flex w-full items-center justify-center gap-1.5 rounded-md border border-border py-1.5 text-[11px] text-muted-foreground transition-colors hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
        >
          <IconTrashFilled className="size-3" />
          {selectedCount > 1
            ? `Delete ${selectedCount} keyframes`
            : "Delete keyframe"}
        </button>
      </div>
    </div>
  );
}

function Timeline({
  tracks,
  time,
  selection,
  selectedKeyframes,
  selectedElementId,
  duration,
  playing,
  loop,
  fps,
  snapEnabled,
  height,
  sidebarWidth = 256,
  onHeightChange,
  onTogglePlay,
  onToggleLoop,
  onDurationChange,
  onFpsChange,
  onSnapChange,
  onScrub,
  onSelectKeyframe,
  onActivateKeyframe,
  onAdd,
  onRemove,
  onMoveMany,
}: {
  tracks: Track[];
  time: number;
  selection: Selection | null;
  selectedKeyframes: Selection[];
  selectedElementId?: string | null | undefined;
  duration: number;
  playing: boolean;
  loop: boolean;
  fps: number;
  snapEnabled: boolean;
  height: number;
  /** Width of the left sidebar. The timeline stretches left under it by
      this amount, so it always spans the full window width no matter how
      wide the user drags the sidebar (200–480px). */
  sidebarWidth?: number;
  onHeightChange: (height: number) => void;
  onTogglePlay: () => void;
  onToggleLoop: () => void;
  onDurationChange: (duration: number) => void;
  onFpsChange: (fps: number) => void;
  onSnapChange: (enabled: boolean) => void;
  onScrub: (t: number) => void;
  onSelectKeyframe: (next: Selection | null, additive?: boolean) => void;
  onActivateKeyframe: (next: Selection) => void;
  onAdd: (trackIndex: number, t?: number) => void;
  onRemove: (trackIndex: number, kfIndex: number) => void;
  onMoveMany: (
    moves: Array<{ track: number; keyframe: number; t: number }>,
  ) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const rowsRef = useRef<HTMLDivElement>(null);
  const rulerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    anchor: Selection;
    startClientX: number;
    rect: DOMRect;
    moved: boolean;
    /** Last time of the grabbed keyframe, so the playhead can follow live. */
    lastT: number | null;
    items: Array<Selection & { startT: number }>;
  } | null>(null);
  const scrubRef = useRef<DOMRect | null>(null);
  const panRef = useRef<{
    startX: number;
    startView: { start: number; end: number };
  } | null>(null);
  const handlersRef = useRef({ onMoveMany, onScrub });
  useEffect(() => {
    handlersRef.current = { onMoveMany, onScrub };
  }, [onMoveMany, onScrub]);

  // The visible slice of the clip. start/end are normalized 0..1; the
  // default is the whole clip. Zooming narrows the window instead of
  // changing the underlying time data, so keyframes never move when you
  // zoom.
  const [view, setView] = useState({ start: 0, end: 1 });
  const viewRef = useRef(view);
  viewRef.current = view;
  const [snapGuide, setSnapGuide] = useState<{
    t: number;
    kind: "keyframe" | "edge";
  } | null>(null);

  const [expandedElements, setExpandedElements] = useState<Set<string>>(
    () => new Set(selectedElementId ? [selectedElementId] : []),
  );

  const safeDuration =
    Number.isFinite(duration) && duration > 0 ? duration : 1000;
  const durationSeconds = safeDuration / 1000;
  const frameCount = Math.max(1, Math.round(durationSeconds * fps));
  // Never zoom past two visible frames: keyframes snap to frames, so
  // anything tighter only shows sub-frame tick labels.
  const minSpan = Math.max(MIN_TIMELINE_SPAN, 2 / frameCount);
  const span = Math.max(minSpan, view.end - view.start);
  const visibleStartSec = view.start * durationSeconds;
  const visibleEndSec = view.end * durationSeconds;
  const visibleSeconds = visibleEndSec - visibleStartSec;

  const ratioToTime = useCallback((ratio: number) => {
    const { start, end } = viewRef.current;
    return Math.max(0, Math.min(1, start + ratio * (end - start)));
  }, []);
  const timeToPercent = useCallback((t: number) => {
    const { start, end } = viewRef.current;
    const currentSpan = end - start;
    return currentSpan > 0 ? ((t - start) / currentSpan) * 100 : 0;
  }, []);

  const isTimeVisible = (t: number) =>
    t >= view.start - 1e-6 && t <= view.end + 1e-6;

  // A shorter clip or higher fps can raise the minimum zoom. Re-clamp an
  // existing window so the ruler and zoom readout never disagree.
  useEffect(() => {
    setView((prev) => {
      const currentSpan = prev.end - prev.start;
      if (currentSpan >= minSpan) return prev;
      const mid = (prev.start + prev.end) / 2;
      let start = mid - minSpan / 2;
      let end = mid + minSpan / 2;
      if (start < 0) {
        start = 0;
        end = minSpan;
      }
      if (end > 1) {
        end = 1;
        start = 1 - minSpan;
      }
      return { start, end };
    });
  }, [minSpan]);

  const playheadPercent = timeToPercent(time);
  const playheadVisible =
    playheadPercent >= -0.5 && playheadPercent <= 100.5;
  const zoomAnchor = playheadVisible
    ? time
    : (view.start + view.end) / 2;
  const playheadAnchor =
    playheadPercent <= 0.5
      ? "translate-x-0"
      : playheadPercent >= 99.5
        ? "-translate-x-full"
        : "-translate-x-1/2";
  const safePercent = (t: number) =>
    Math.max(0, Math.min(100, timeToPercent(t)));

  const applyView = useCallback((nextStart: number, nextEnd: number) => {
    let start = nextStart;
    let end = nextEnd;
    let nextSpan = end - start;
    if (!Number.isFinite(nextSpan) || nextSpan <= 0) return;
    if (nextSpan < minSpan) {
      const mid = (start + end) / 2;
      start = mid - minSpan / 2;
      end = mid + minSpan / 2;
      nextSpan = minSpan;
    }
    if (nextSpan > 1) {
      start = 0;
      end = 1;
      nextSpan = 1;
    }
    if (start < 0) {
      start = 0;
      end = nextSpan;
    }
    if (end > 1) {
      end = 1;
      start = 1 - nextSpan;
    }
    setView({ start, end });
  }, [minSpan]);

  const zoomAt = useCallback((factor: number, anchor: number) => {
    const { start, end } = viewRef.current;
    const currentSpan = end - start;
    if (!Number.isFinite(currentSpan) || currentSpan <= 0) return;
    const nextSpan = Math.max(
      minSpan,
      Math.min(1, currentSpan / factor),
    );
    const ratio = Math.max(
      0,
      Math.min(1, (anchor - start) / currentSpan),
    );
    let nextStart = anchor - ratio * nextSpan;
    if (nextStart < 0) nextStart = 0;
    if (nextStart + nextSpan > 1) nextStart = 1 - nextSpan;
    setView({ start: nextStart, end: nextStart + nextSpan });
  }, [minSpan]);

  const panBy = useCallback((delta: number) => {
    const { start, end } = viewRef.current;
    const currentSpan = end - start;
    let nextStart = start + delta;
    if (nextStart < 0) nextStart = 0;
    if (nextStart + currentSpan > 1) nextStart = 1 - currentSpan;
    setView({ start: nextStart, end: nextStart + currentSpan });
  }, []);

  // Keep the pointer-move listener stable while always reading the latest
  // track/snap state. Without this, playback re-registers the listener on
  // every animation frame.
  const snapContextRef = useRef({
    tracks,
    snapEnabled,
    span,
    frameCount,
  });
  snapContextRef.current = { tracks, snapEnabled, span, frameCount };

  const snapTime = useCallback(
    (
      raw: number,
      width: number,
      options?: { exclude?: Selection[]; disable?: boolean },
    ): {
      t: number;
      guide: { t: number; kind: "keyframe" | "edge" } | null;
    } => {
      const { tracks, snapEnabled, span, frameCount } =
        snapContextRef.current;
      const clamped = Math.max(0, Math.min(1, raw));
      if (!snapEnabled || options?.disable) {
        return { t: clamped, guide: null };
      }
      const threshold = Math.max(
        0.0005,
        (8 / Math.max(1, width)) * span,
      );
      let best: {
        t: number;
        kind: "keyframe" | "edge";
      } | null = null;
      let bestDistance = threshold;

      if (clamped < bestDistance) {
        best = { t: 0, kind: "edge" };
        bestDistance = clamped;
      }
      if (1 - clamped < bestDistance) {
        best = { t: 1, kind: "edge" };
        bestDistance = 1 - clamped;
      }

      const excluded = new Set(
        (options?.exclude ?? []).map(
          (item) => `${item.track}:${item.keyframe}`,
        ),
      );
      for (
        let trackIndex = 0;
        trackIndex < tracks.length;
        trackIndex += 1
      ) {
        const track = tracks[trackIndex]!;
        for (
          let keyframeIndex = 0;
          keyframeIndex < track.keyframes.length;
          keyframeIndex += 1
        ) {
          if (excluded.has(`${trackIndex}:${keyframeIndex}`)) continue;
          const candidate = track.keyframes[keyframeIndex]!;
          const distance = Math.abs(clamped - candidate.t);
          if (distance < bestDistance) {
            best = { t: candidate.t, kind: "keyframe" };
            bestDistance = distance;
          }
        }
      }

      if (best) return { t: best.t, guide: best };
      // Frame quantization is always on when snapping is enabled; only
      // keyframe/edge snaps draw a guide.
      return {
        t: Math.round(clamped * frameCount) / frameCount,
        guide: null,
      };
    },
    [],
  );

  useEffect(() => {
    const element = rootRef.current;
    if (!element) return;
    const handleWheel = (event: WheelEvent) => {
      // Don't change the window under an active drag/scrub.
      if (scrubRef.current || dragRef.current || panRef.current) return;
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        const rect = rowsRef.current?.getBoundingClientRect();
        const anchor = rect
          ? ratioToTime(
              Math.max(
                0,
                Math.min(
                  1,
                  (event.clientX - rect.left) /
                    Math.max(1, rect.width),
                ),
              ),
            )
          : (viewRef.current.start + viewRef.current.end) / 2;
        zoomAt(event.deltaY < 0 ? 1.2 : 1 / 1.2, anchor);
        return;
      }
      if (
        event.shiftKey ||
        Math.abs(event.deltaX) > Math.abs(event.deltaY)
      ) {
        event.preventDefault();
        const width = rowsRef.current?.clientWidth ?? 800;
        const { start, end } = viewRef.current;
        panBy(
          ((event.deltaX || event.deltaY) / Math.max(1, width)) *
            (end - start),
        );
      }
    };
    element.addEventListener("wheel", handleWheel, { passive: false });
    return () => element.removeEventListener("wheel", handleWheel);
  }, [panBy, ratioToTime, zoomAt]);

  // Keep a zoomed-in window on the playhead whenever time moves (playback,
  // Home/End, a drop). Panning alone does not move time, so a deliberate
  // pan while paused is left alone.
  useEffect(() => {
    // A scrub maps pointer x to the current window; recentering mid-scrub
    // would change that mapping under the cursor and make it jump.
    if (scrubRef.current || dragRef.current) return;
    const { start, end } = viewRef.current;
    if (time >= start && time <= end) return;
    const currentSpan = end - start;
    let nextStart = time - currentSpan / 2;
    if (nextStart < 0) nextStart = 0;
    if (nextStart + currentSpan > 1) nextStart = 1 - currentSpan;
    setView({ start: nextStart, end: nextStart + currentSpan });
  }, [time]);

  useEffect(() => {
    const move = (event: PointerEvent) => {
      if (panRef.current) {
        const { startX, startView } = panRef.current;
        const width = rowsRef.current?.clientWidth ?? 800;
        const delta =
          -((event.clientX - startX) / Math.max(1, width)) *
          (startView.end - startView.start);
        applyView(startView.start + delta, startView.end + delta);
        return;
      }
      if (dragRef.current) {
        const drag = dragRef.current;
        if (
          !drag.moved &&
          Math.abs(event.clientX - drag.startClientX) > 2
        ) {
          drag.moved = true;
        }
        if (!drag.moved) return;
        const ratio =
          (event.clientX - drag.rect.left) /
          Math.max(1, drag.rect.width);
        const snapped = snapTime(ratioToTime(ratio), drag.rect.width, {
          exclude: drag.items.map((item) => ({
            track: item.track,
            keyframe: item.keyframe,
          })),
          disable: event.altKey,
        });
        setSnapGuide(snapped.guide);
        const anchor =
          drag.items.find(
            (item) =>
              item.track === drag.anchor.track &&
              item.keyframe === drag.anchor.keyframe,
          ) ?? drag.items[0];
        if (!anchor) return;
        const minStart = Math.min(
          ...drag.items.map((item) => item.startT),
        );
        const maxStart = Math.max(
          ...drag.items.map((item) => item.startT),
        );
        const delta = Math.max(
          -minStart,
          Math.min(1 - maxStart, snapped.t - anchor.startT),
        );
        drag.lastT = anchor.startT + delta;
        handlersRef.current.onMoveMany(
          drag.items.map((item) => ({
            track: item.track,
            keyframe: item.keyframe,
            t: item.startT + delta,
          })),
        );
        // Follow the grabbed diamond with the playhead so the canvas keeps
        // previewing the pose live. The playhead is intentionally not a
        // snap target here: it moves with the drag and would be sticky.
        if (drag.lastT != null) {
          handlersRef.current.onScrub(drag.lastT);
        }
        return;
      }
      if (scrubRef.current) {
        const rect = scrubRef.current;
        const ratio =
          (event.clientX - rect.left) / Math.max(1, rect.width);
        const snapped = snapTime(ratioToTime(ratio), rect.width, {
          disable: event.altKey,
        });
        setSnapGuide(snapped.guide);
        handlersRef.current.onScrub(snapped.t);
      }
    };
    const up = () => {
      dragRef.current = null;
      scrubRef.current = null;
      panRef.current = null;
      setSnapGuide(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [applyView, ratioToTime, snapTime]);

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

  const [durationDraft, setDurationDraft] = useState(
    String(safeDuration / 1000),
  );
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

  // Ruler ticks adapt to the visible slice. Zoomed all the way in, labels
  // land on frame boundaries (the closest zoom shows two frames); zoomed
  // out, they become seconds. Minor ticks stay at a fifth of the major step.
  const frameSeconds = 1 / Math.max(1, fps);
  const tickStep =
    visibleSeconds <= frameSeconds * 3
      ? frameSeconds
      : visibleSeconds <= 0.5
        ? Math.max(frameSeconds * 2, 0.02)
        : visibleSeconds <= 1
        ? 0.1
        : visibleSeconds <= 2
          ? 0.25
          : visibleSeconds <= 5
            ? 0.5
            : visibleSeconds <= 15
              ? 1
              : visibleSeconds <= 30
                ? 2
                : 5;
  const markers = useMemo(() => {
    const next: number[] = [];
    const first = Math.ceil((visibleStartSec - 1e-9) / tickStep) * tickStep;
    for (
      let sec = first;
      sec <= visibleEndSec + 1e-9;
      sec += tickStep
    ) {
      next.push(Math.round(sec * 1000) / 1000);
    }
    // Always label the right edge, which is the clip end when fully zoomed
    // out and the window edge otherwise.
    const end = Math.round(visibleEndSec * 1000) / 1000;
    if (
      end > 1e-6 &&
      Math.abs(end - (next[next.length - 1] ?? 0)) > 1e-6
    ) {
      next.push(end);
    }
    return next;
  }, [tickStep, visibleEndSec, visibleStartSec]);

  const minorDivisions = 5;
  const minorMarkers = useMemo(() => {
    const step = tickStep / minorDivisions;
    const next: number[] = [];
    const first = Math.ceil((visibleStartSec - 1e-9) / step) * step;
    for (
      let index = 0;
      first + index * step <= visibleEndSec + 1e-9;
      index += 1
    ) {
      const sec = first + index * step;
      if (Math.abs(sec / tickStep - Math.round(sec / tickStep)) < 1e-6) {
        continue;
      }
      next.push(Math.round(sec * 1000) / 1000);
    }
    return next;
  }, [minorDivisions, tickStep, visibleEndSec, visibleStartSec]);

  const heightDragRef = useRef<{
    startY: number;
    startHeight: number;
  } | null>(null);

  useEffect(() => {
    const move = (event: PointerEvent) => {
      const drag = heightDragRef.current;
      if (!drag) return;
      const maxHeight = Math.max(320, window.innerHeight - 220);
      const next = Math.min(
        maxHeight,
        Math.max(180, drag.startHeight - (event.clientY - drag.startY)),
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

  const beginScrub = (
    event: React.PointerEvent<HTMLDivElement>,
    ruler: boolean,
  ) => {
    // Right-click should leave the selection and playhead alone.
    if (event.button !== 0 && event.button !== 1) return;
    if (event.button === 1) {
      event.preventDefault();
      panRef.current = {
        startX: event.clientX,
        startView: viewRef.current,
      };
      return;
    }
    const rect = (
      ruler ? rulerRef.current : event.currentTarget
    )?.getBoundingClientRect();
    if (!rect) return;
    scrubRef.current = rect;
    onSelectKeyframe(null);
    const snapped = snapTime(
      ratioToTime((event.clientX - rect.left) / Math.max(1, rect.width)),
      rect.width,
      { disable: event.altKey },
    );
    setSnapGuide(snapped.guide);
    onScrub(snapped.t);
  };

  const startRulerScrub = (event: React.PointerEvent<HTMLDivElement>) =>
    beginScrub(event, true);
  const startScrub = (event: React.PointerEvent<HTMLDivElement>) =>
    beginScrub(event, false);

  const startKeyframeDrag = (
    event: React.PointerEvent<HTMLButtonElement>,
    trackIndex: number,
    keyframeIndex: number,
    keyframe: Keyframe,
  ) => {
    event.stopPropagation();
    if (event.button !== 0) return;
    const rect = event.currentTarget.parentElement?.getBoundingClientRect();
    if (!rect) return;

    const next = { track: trackIndex, keyframe: keyframeIndex };
    const additive = event.shiftKey || event.metaKey || event.ctrlKey;
    if (additive) {
      onSelectKeyframe(next, true);
      return;
    }

    const alreadySelected = selectedKeyframes.some(
      (item) =>
        item.track === trackIndex && item.keyframe === keyframeIndex,
    );
    const dragged =
      alreadySelected && selectedKeyframes.length > 0
        ? selectedKeyframes
        : [next];
    if (alreadySelected) onActivateKeyframe(next);
    else onSelectKeyframe(next, false);

    dragRef.current = {
      anchor: next,
      startClientX: event.clientX,
      rect,
      moved: false,
      lastT: null,
      items: dragged.map((item) => ({
        ...item,
        startT:
          tracks[item.track]?.keyframes[item.keyframe]?.t ?? 0,
      })),
    };
    onScrub(keyframe.t);
  };

  const keyframeMarker = (
    trackIndex: number,
    kfIndex: number,
    keyframe: Keyframe,
  ) => {
    if (!isTimeVisible(keyframe.t)) return null;
    const active =
      selection?.track === trackIndex && selection.keyframe === kfIndex;
    const selected = selectedKeyframes.some(
      (item) =>
        item.track === trackIndex && item.keyframe === kfIndex,
    );
    const property = tracks[trackIndex]?.property;
    const label = property
      ? PROPERTY_DEFINITIONS[property].label
      : "Keyframe";
    const leftPercent = timeToPercent(keyframe.t);
    // At t=0 / t=1 the centered diamond would be clipped in half by the
    // track's overflow. Align it inside the edge instead.
    const horizontalAnchor =
      leftPercent <= 0.5
        ? "translate-x-0"
        : leftPercent >= 99.5
          ? "-translate-x-full"
          : "-translate-x-1/2";
    const timecode = formatSecondsMs(keyframe.t * durationSeconds);
    return (
      <button
        key={`${trackIndex}-${kfIndex}`}
        type="button"
        title={`${label} · ${timecode} · ${keyframe.v}`}
        aria-label={`${label} keyframe at ${timecode}`}
        onPointerDown={(event) =>
          startKeyframeDrag(event, trackIndex, kfIndex, keyframe)
        }
        onDoubleClick={(event) => {
          event.stopPropagation();
          onRemove(trackIndex, kfIndex);
          onSelectKeyframe(null);
        }}
        className={`absolute top-1/2 z-10 size-3 -translate-y-1/2 rotate-45 cursor-grab rounded-sm border-2 transition-colors active:cursor-grabbing ${horizontalAnchor} ${
          active
            ? "border-primary bg-primary scale-125 z-20"
            : selected
              ? "border-primary bg-primary/70 z-20"
              : "border-background bg-blue-400 hover:bg-blue-300"
        }`}
        style={{ left: `${leftPercent}%` }}
      />
    );
  };

  return (
    <div
      ref={rootRef}
      // relative + z-10: the timeline stretches left under the sidebar,
      // and the sidebar container is position:relative, so without this
      // its right border painted over the timeline's left strip.
      className="relative z-10 flex shrink-0 select-none flex-col border-t border-border bg-[#1a1a1a]"
      style={{
        height,
        marginLeft: -sidebarWidth,
        width: `calc(100% + ${sidebarWidth}px)`,
      }}
    >
      {/* Drag handle — resize the timeline height */}
      <div
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize timeline"
        onPointerDown={(event) => {
          event.preventDefault();
          heightDragRef.current = {
            startY: event.clientY,
            startHeight: height,
          };
        }}
        onDoubleClick={() => onHeightChange(256)}
        className="group relative -mt-px flex h-2 shrink-0 cursor-ns-resize items-center justify-center bg-[#1a1a1a] transition-colors hover:bg-primary/30"
        title="Drag to resize the timeline (double-click to reset)"
      >
        <span className="h-0.5 w-10 rounded-full bg-border transition-colors group-hover:bg-primary" />
      </div>

      {/* Transport — playback, timecode, frame rate, snapping, zoom,
          duration and looping in one row. */}
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-border/50 bg-[#222] px-3">
        <div className="flex shrink-0 items-center gap-1 rounded-full bg-[#2c2c2c] p-1 shadow-inner">
          <button
            type="button"
            onClick={() => onScrub(0)}
            className="relative group grid size-7 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
            aria-label="Back to start"
            title="Back to start"
          >
            <IconPlayerSkipBackFilled className="size-3.5" />
            <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-1.5 py-0.5 text-[11px] font-medium text-background opacity-0 shadow transition-opacity group-hover:opacity-100">
              Start
            </span>
          </button>
          <button
            type="button"
            onClick={onTogglePlay}
            className="relative group grid size-8 place-items-center rounded-full bg-[#2391FF] text-white shadow-md shadow-[#2391FF]/40 transition-all hover:scale-105 hover:bg-[#1f7fe0] active:scale-95"
            aria-label={playing ? "Pause" : "Play"}
            title={playing ? "Pause (Space)" : "Play (Space)"}
          >
            {playing ? (
              <IconPlayerPauseFilled className="size-4" />
            ) : (
              <IconPlayerPlayFilled className="size-4" />
            )}
            <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-1.5 py-0.5 text-[11px] font-medium text-background opacity-0 shadow transition-opacity group-hover:opacity-100">
              {playing ? "Pause" : "Play"}
            </span>
          </button>
        </div>

        <div className="flex shrink-0 items-baseline gap-1 rounded-full bg-[#2c2c2c] px-2.5 py-1 text-[10px] tabular-nums shadow-inner">
          <span className="font-mono text-foreground">
            {formatSecondsMs(time * durationSeconds)}
          </span>
          <span className="hidden text-muted-foreground/60 sm:inline">
            /
          </span>
          <span className="hidden font-mono text-muted-foreground sm:inline">
            {formatSecondsMs(durationSeconds)}
          </span>
        </div>

        <div className="hidden shrink-0 md:block">
          <Select
            value={String(fps)}
            onValueChange={(value) => onFpsChange(Number(value))}
          >
            <SelectTrigger
              className="h-7 w-[78px] text-[11px]"
              aria-label="Frame rate"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FPS_OPTIONS.map((option) => (
                <SelectItem
                  key={option}
                  value={String(option)}
                  className="text-[11px]"
                >
                  {option} fps
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <span className="ml-1 hidden min-w-0 flex-1 truncate text-[10px] text-muted-foreground xl:block">
          Drag diamonds to retime · Shift/Ctrl-click multi-select ·
          Double-click a track to add · Cmd/Ctrl+wheel zoom · Shift+wheel
          pan · [ ] step · Alt disables snap
        </span>

        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          {selectedKeyframes.length > 1 ? (
            <span className="hidden shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary lg:inline">
              {selectedKeyframes.length} selected
            </span>
          ) : null}

          <button
            type="button"
            onClick={() => onSnapChange(!snapEnabled)}
            className={`relative group grid size-7 place-items-center rounded-full transition-colors ${
              snapEnabled
                ? "bg-primary/20 text-primary"
                : "text-muted-foreground hover:bg-white/10 hover:text-foreground"
            }`}
            aria-label={
              snapEnabled
                ? "Disable timeline snapping"
                : "Enable timeline snapping"
            }
            aria-pressed={snapEnabled}
            title={
              snapEnabled
                ? "Snap on — hold Alt while dragging to disable"
                : "Snap off"
            }
          >
            {snapEnabled ? (
              <IconMagnetFilled className="size-4" />
            ) : (
              <IconMagnet className="size-4" />
            )}
            <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-1.5 py-0.5 text-[11px] font-medium text-background opacity-0 shadow transition-opacity group-hover:opacity-100">
              {snapEnabled ? "Snap on" : "Snap off"} · Alt disables
            </span>
          </button>

          <div className="flex items-center gap-0.5 rounded-full bg-[#2c2c2c] p-1 shadow-inner">
            <button
              type="button"
              onClick={() => zoomAt(1 / 1.5, zoomAnchor)}
              className="grid size-6 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
              aria-label="Zoom out timeline"
              title="Zoom out timeline"
            >
              <IconZoomOut className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => zoomAt(1.5, zoomAnchor)}
              className="grid size-6 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
              aria-label="Zoom in timeline"
              title="Zoom in timeline"
            >
              <IconZoomIn className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => applyView(0, 1)}
              className="grid size-6 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
              aria-label="Fit timeline"
              title="Fit full timeline"
            >
              <IconMaximize className="size-3.5" />
            </button>
          </div>
          <span className="hidden w-12 shrink-0 text-right text-[10px] tabular-nums text-muted-foreground sm:inline">
            {Math.round((1 / span) * 100)}%
          </span>

          <div className="flex items-center gap-1.5">
            <Input
              type="number"
              min={0.1}
              max={60}
              step={0.1}
              value={durationDraft}
              onChange={(event) =>
                setDurationDraft(event.target.value)
              }
              onBlur={commitDuration}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.currentTarget.blur();
              }}
              className="h-7 w-16 text-[11px]"
              aria-label="Duration in seconds"
            />
            <span className="text-[10px] text-muted-foreground">s</span>
          </div>

          <button
            type="button"
            onClick={onToggleLoop}
            className={`relative group grid size-8 place-items-center rounded-full transition-all hover:scale-105 active:scale-95 ${
              loop
                ? "bg-primary/20 text-primary shadow-sm shadow-primary/20"
                : "text-muted-foreground hover:bg-white/10 hover:text-foreground"
            }`}
            aria-label={loop ? "Disable looping" : "Enable looping"}
            aria-pressed={loop}
            title={loop ? "Looping on" : "Looping off"}
          >
            <IconRepeat className="size-4" />
            <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-1.5 py-0.5 text-[11px] font-medium text-background opacity-0 shadow transition-opacity group-hover:opacity-100">
              Loop
            </span>
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {tracks.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            No animation tracks yet — select an element, open Properties →
            Animate, and add a property.
          </div>
        ) : (
          <>
            {/* Time ruler — also a scrub surface. Markers are generated for
                the visible slice only, so zoomed-in views stay readable. */}
            <div className="sticky top-0 z-30 flex h-9 border-b border-border/50 bg-[#1e1e1e]">
              <div className="w-52 shrink-0 border-r border-border/50" />
              <div
                ref={rulerRef}
                className="relative min-w-0 flex-1 cursor-ew-resize overflow-hidden"
                onPointerDown={startRulerScrub}
                aria-hidden="true"
              >
                {minorMarkers.map((sec) => {
                  const percent = timeToPercent(sec / durationSeconds);
                  if (percent < -1 || percent > 101) return null;
                  return (
                    <span
                      key={`minor-${sec}`}
                      className="absolute bottom-0 h-1 w-px -translate-x-1/2 bg-border/30"
                      style={{ left: `${percent}%` }}
                    />
                  );
                })}
                {markers.map((sec) => {
                  const percent = timeToPercent(sec / durationSeconds);
                  if (percent < -1 || percent > 101) return null;
                  const anchor =
                    percent <= 0.5
                      ? ""
                      : percent >= 99.5
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
                {snapGuide ? (
                  <div
                    className="pointer-events-none absolute inset-y-0 z-20 w-px bg-amber-400"
                    style={{ left: `${safePercent(snapGuide.t)}%` }}
                  />
                ) : null}
                {playheadVisible ? (
                  <>
                    <div
                      className="pointer-events-none absolute inset-y-0 z-10 w-0.5 -translate-x-1/2 bg-primary shadow-[0_0_10px_1px_rgba(35,145,255,0.6)]"
                      style={{ left: `${playheadPercent}%` }}
                    />
                    <div
                      className={`group absolute top-0 z-20 cursor-grab px-3 pb-1.5 pt-0.5 active:cursor-grabbing ${playheadAnchor}`}
                      style={{ left: `${playheadPercent}%` }}
                      title={`Playhead · ${formatSecondsMs(
                        time * durationSeconds,
                      )}`}
                    >
                      <div
                        className="size-0 origin-top border-x-[7px] border-t-[11px] border-x-transparent border-t-primary transition-transform group-hover:scale-125"
                        style={{
                          filter:
                            "drop-shadow(0 1px 2px rgb(0 0 0 / 0.5))",
                        }}
                      />
                    </div>
                  </>
                ) : null}
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
                                  {
                                    PROPERTY_DEFINITIONS[track.property]
                                      .label
                                  }
                                </span>
                                <button
                                  type="button"
                                  onClick={() => onAdd(trackIndex)}
                                  className="ml-auto grid size-5 shrink-0 place-items-center rounded text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
                                  title="Add keyframe at playhead"
                                  aria-label={`Add ${
                                    PROPERTY_DEFINITIONS[track.property].label
                                  } keyframe at playhead`}
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
              <div
                ref={rowsRef}
                className="relative min-w-0 flex-1 overflow-hidden"
              >
                {snapGuide ? (
                  <div
                    className="pointer-events-none absolute inset-y-0 z-30 w-px bg-amber-400"
                    style={{ left: `${safePercent(snapGuide.t)}%` }}
                  >
                    <span className="absolute left-0 top-0 -translate-x-1/2 rounded-b bg-amber-400 px-1 text-[9px] font-medium text-black">
                      {snapGuide.kind}
                    </span>
                  </div>
                ) : null}
                {playheadVisible ? (
                  <div
                    className="pointer-events-none absolute inset-y-0 z-20 w-0.5 -translate-x-1/2 bg-primary shadow-[0_0_10px_1px_rgba(35,145,255,0.6)]"
                    style={{ left: `${playheadPercent}%` }}
                  />
                ) : null}
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
                              return track.keyframes.map(
                                (keyframe, kfIndex) =>
                                  keyframeMarker(
                                    trackIndex,
                                    kfIndex,
                                    keyframe,
                                  ),
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
                                onDoubleClick={(event) => {
                                  const rect =
                                    event.currentTarget.getBoundingClientRect();
                                  onAdd(
                                    trackIndex,
                                    ratioToTime(
                                      (event.clientX - rect.left) /
                                        Math.max(1, rect.width),
                                    ),
                                  );
                                }}
                              >
                                <div className="absolute inset-x-0 top-1/2 h-px bg-border/30" />
                                {track.keyframes.map(
                                  (keyframe, kfIndex) =>
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

function formatMarker(seconds: number): string {
  if (!Number.isFinite(seconds)) return "0s";
  if (Number.isInteger(seconds)) return `${seconds}s`;
  // Keep enough precision for extreme zoom (where ticks can be sub-frame)
  // without turning normal second labels into long decimals.
  const decimals = Math.abs(seconds) < 0.1 ? 3 : 2;
  return `${seconds.toFixed(decimals).replace(/\.?0+$/, "")}s`;
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
  onSave: (next: MotionAnimation) => Promise<boolean>;
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
          className="relative group grid size-6 place-items-center rounded-[5px] text-muted-foreground transition-colors hover:bg-accent/70 hover:text-foreground data-[state=open]:bg-accent/70 data-[state=open]:text-foreground"
          aria-label={`Canvas size ${dimensions.aspectRatio}, ${dimensions.width} by ${dimensions.height}`}
        >
          <Frame className="size-5" />
          <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-1.5 py-0.5 text-[11px] font-medium text-background opacity-0 shadow transition-opacity group-hover:opacity-100">Canvas size</span>
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
