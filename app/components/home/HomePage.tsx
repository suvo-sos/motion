import {
  markAgentChatHomeHandoff,
  navigateWithAgentChatViewTransition,
} from "@agent-native/core/client/agent-chat";
import { createAgentNativeAgentKitTransport } from "@agent-native/core/client/agentkit-chat/transport";
import {
  saveLocalProject,
  syncProjectToServer,
  useLocalProjects,
} from "@/lib/local-projects";
import { AgentKitComposer } from "@agent-native/toolkit/app/agentkit/react/components";
import { useAgentKitControl } from "@agent-native/toolkit/app/agentkit/react/context";
import { CoreComposerRuntimeProvider } from "@agent-native/toolkit/app/chat/agentkit-chat/composer";
import { CoreAgentKitRoot } from "@agent-native/toolkit/app/chat/agentkit-chat/index";
import { useRealtimeVoiceModeOptional } from "@agent-native/toolkit/app/chat/composer";
import { WaveBackground } from "@agent-native/toolkit/app/shared";
import {
  IconArrowUpRight,
  IconBallTennis,
  IconBolt,
  IconChartBar,
  IconCircleDot,
  IconHeart,
  IconLoader2,
  IconPlanet,
  IconSparkles,
  IconUpload,
} from "@tabler/icons-react";
import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { Link, useNavigate } from "react-router";

import { Button } from "@/components/ui/button";
import { AppMark } from "@/components/brand/AppMark";
import { Skeleton } from "@/components/ui/skeleton";
import { getChatHomeThreadId, rememberLastChatThread } from "@/lib/chat-home-thread";
import { startFreshStudioChat } from "@/lib/studio-chat";
import { cn } from "@/lib/utils";
import {
  chatHandoffComposerOptions,
  chatThreadPath,
  type ChatInitialComposerOptions,
  type ChatRouteState,
} from "@/lib/chat-paths";
import { TAB_ID } from "@/lib/tab-id";
import { toAnimatedSvg, type MotionAnimation } from "../../../lib/motion";
import {
  MOTION_TEMPLATES,
  type MotionTemplate,
  type TemplateIconName,
} from "../../../lib/templates";

const COMPOSER_PLACEHOLDER =
  "e.g. 1.4s logo reveal — outline draws on, mark scales in, cubic ease-out";

/**
 * Template previews run on a slowed clock so browsing them reads as motion
 * design rather than flicker. Long choreographies are already slow-paced, so
 * they play at their real speed instead of dragging on for minutes.
 */
const PREVIEW_SPEED = 2.2;
const PREVIEW_SLOW_MAX_MS = 8000;

/** Shared preview clock: long choreographies keep their real pace. */
function previewDuration(duration: number): number {
  return duration <= PREVIEW_SLOW_MAX_MS
    ? Math.round(duration * PREVIEW_SPEED)
    : duration;
}

/**
 * The big exports are fetched once per session: they carry ~1 MB of embedded
 * art, and the preview needs the markup to rebuild the motion from its tracks.
 */
const templateSvgCache = new Map<string, Promise<string>>();
function loadTemplateSvg(url: string) {
  let cached = templateSvgCache.get(url);
  if (!cached) {
    cached = fetch(url).then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status} loading ${url}`);
      return res.text();
    });
    templateSvgCache.set(url, cached);
  }
  return cached;
}

const TEMPLATE_ICONS: Record<TemplateIconName, typeof IconSparkles> = {
  sparkles: IconSparkles,
  loader: IconLoader2,
  bolt: IconBolt,
  spinner: IconCircleDot,
  bars: IconChartBar,
  heart: IconHeart,
  orbit: IconPlanet,
  ball: IconBallTennis,
};

/** Canvas colours for template cards — hand-picked so each art reads on its card. */
const TEMPLATE_CANVAS_COLORS: Record<string, string> = {
  "cup-game-loader": "#2391FF",
  "discount-promo": "#EFECD7",
  "rocket-loader": "#00B7CD",
  "countdown-loader": "#E3AFC9",
  "app-download-promo": "#FFCD54",
  "logo-reveal": "#FFF83F",
  "loading-dots": "#FFF1D1",
  "sticker-pop": "#FF9100",
  "spinner": "#E11A45",
  "equalizer": "#F70063",
  "heartbeat": "#00B7CD",
  "orbit": "#EDC92C",
  "bounce": "#E3AFC9",
};

function templateCanvasColor(id: string): string {
  const color = TEMPLATE_CANVAS_COLORS[id];
  if (color) return color;
  return [
    "#2391FF",
    "#FFF83F",
    "#FFCD54",
    "#F70063",
    "#DF301C",
    "#FF9100",
    "#FFF1D1",
    "#00B7CD",
    "#E11A45",
    "#E3AFC9",
    "#EFECD7",
    "#EDC92C",
  ][Math.abs(hashString(id)) % 12] as string;
}

function hashString(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) {
    h = (h << 5) - h + value.charCodeAt(i);
    h |= 0;
  }
  return h;
}

function isLightColor(hex: string): boolean {
  const cleaned = hex.replace("#", "");
  const r = parseInt(cleaned.slice(0, 2), 16);
  const g = parseInt(cleaned.slice(2, 4), 16);
  const b = parseInt(cleaned.slice(4, 6), 16);
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return lum > 0.6;
}

interface ProjectSummary extends MotionAnimation {
  updatedAt?: string;
}

export default function HomePage() {
  const navigate = useNavigate();
  const [threadId] = useState(getChatHomeThreadId);
  const [uploading, setUploading] = useState(false);
  const [creatingTemplate, setCreatingTemplate] = useState<string | null>(null);
  const [view, setView] = useState<"projects" | "templates">("templates");
  const { projects, isLoading: projectsLoading } = useLocalProjects();

  /**
   * Templates are complete animations, so this writes the project directly
   * instead of routing through the agent — one click, landed in the studio.
   */
  async function createFromTemplate(template: MotionTemplate) {
    if (creatingTemplate) return;
    setCreatingTemplate(template.id);
    try {
      // Big templates keep their art in /public and are fetched on demand so
      // the embedded payload never enters the JS bundle.
      const svg = template.src
        ? await fetch(template.src).then((res) => {
            if (!res.ok) throw new Error(`HTTP ${res.status} loading ${template.src}`);
            return res.text();
          })
        : template.svg;
      if (!svg) throw new Error("Template has no SVG payload");
      const result = saveLocalProject({
        title: template.label,
        svg,
        tracks: template.tracks ?? [],
        duration: template.duration,
        loop: template.loop,
      });
      void syncProjectToServer(result.id);
      if (result.id) {
        // Opening a template is a new project, not a continuation of whatever
        // the agent sidebar last showed, so the studio starts on a new chat.
        startFreshStudioChat();
        navigate(`/motion?id=${encodeURIComponent(result.id)}`);
      } else {
        alert(`Could not create "${template.label}": unknown error`);
      }
    } catch (err) {
      alert(`Could not create "${template.label}": ${(err as Error)?.message ?? err}`);
    } finally {
      setCreatingTemplate(null);
    }
  }

  async function handleUpload(file: File) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".svg")) {
      alert("Please choose an .svg file.");
      return;
    }
    setUploading(true);
    try {
      const raw = await file.text();
      // Strip any script tags so an uploaded SVG can't execute code in the studio.
      const svg = raw.replace(/<script[\s\S]*?<\/script>/gi, "");
      const result = saveLocalProject({
        title: file.name.replace(/\.svg$/i, ""),
        svg,
        tracks: [],
        duration: 2000,
        loop: true,
      });
      void syncProjectToServer(result.id);
      if (result.id) {
        // Same as templates: a fresh project opens with a fresh chat.
        startFreshStudioChat();
        navigate(`/motion?id=${encodeURIComponent(result.id)}`);
      }
    } catch (err) {
      alert(`Upload failed: ${(err as Error)?.message ?? err}`);
    } finally {
      setUploading(false);
    }
  }



  function start(message: string, options: ChatInitialComposerOptions = {}) {
    rememberLastChatThread(threadId);
    const state: ChatRouteState = {
      initialMessage: message,
      initialComposerOptions: options,
    };
    markAgentChatHomeHandoff("chat");
    navigateWithAgentChatViewTransition(navigate, chatThreadPath(threadId), {
      state,
    });
  }

  return (
    <div className="flex min-h-full flex-col">
      <section className="relative isolate flex flex-col items-center gap-6 overflow-hidden px-4 pb-12 pt-16 text-center sm:pt-20">
        <WaveBackground
          matchPageSurface
          className="pointer-events-none absolute inset-0 -z-10"
        />
        <AppMark className="h-8 w-14 text-foreground" />
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
          Professional-grade SVG animation at your fingertips.
        </h1>
        <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
          Start with the pen tool, an existing file, or a prompt. Set timing with
          bezier easing on a real timeline, then export optimized SVG, CSS, or JS
          that ships anywhere.
        </p>
        <HomeAgentComposer threadId={threadId} onStart={start} />
      </section>

      <section className="mx-auto w-full max-w-5xl space-y-4 px-6 pb-16">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div
            role="group"
            aria-label="Home sections"
            className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-muted/60 p-0.5"
          >
            <TabButton
              active={view === "templates"}
              count={MOTION_TEMPLATES.length}
              onClick={() => setView("templates")}
            >
              Templates
            </TabButton>
            <TabButton
              active={view === "projects"}
              count={projects.length}
              onClick={() => setView("projects")}
            >
              Projects
            </TabButton>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              {view === "projects"
                ? "Saved in this browser"
                : "Every preview is editable · click to add"}
            </span>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <IconUpload
                className="size-3.5 text-muted-foreground"
                strokeWidth={1.8}
              />
              {uploading ? "Uploading…" : "Upload SVG"}
              <input
                type="file"
                accept=".svg,image/svg+xml"
                className="sr-only"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleUpload(file);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
        </div>

        <TemplateGallery
          hidden={view !== "templates"}
          busyId={creatingTemplate}
          onUse={(template) => void createFromTemplate(template)}
        />

        {projectsLoading && projects.length === 0 ? (
          <div className={cn("grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3", view !== "projects" && "hidden")}>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="aspect-[4/3] rounded-3xl" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className={cn("flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border px-6 py-14 text-center", view !== "projects" && "hidden")}>
            <div className="grid size-10 place-items-center rounded-lg bg-muted text-foreground">
              <IconSparkles className="size-4" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">No projects yet</p>
              <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
                Start from a preset, upload an SVG, or describe the motion. Every
                keyframe and bezier curve stays editable.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setView("templates")}
            >
              Browse templates
            </Button>
          </div>
        ) : (
          <ProjectGallery projects={projects} hidden={view !== "projects"} />
        )}
      </section>
    </div>
  );
}

function TabButton({
  active,
  count,
  onClick,
  children,
}: {
  active: boolean;
  count: number;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-[6px] px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "bg-blue-500 text-white shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
      <span
        className={cn(
          "rounded-full px-1.5 py-0.5 text-[10px] tabular-nums",
          active ? "bg-blue-600 text-white" : "bg-muted/60 text-muted-foreground",
        )}
      >
        {count}
      </span>
    </button>
  );
}

/**
 * Template previews play on a slowed-down clock so the motion reads clearly
 * while browsing, and every card is a real animated SVG — no video, no canvas.
 */
function TemplateCard({
  template,
  busy,
  disabled,
  onUse,
}: {
  template: MotionTemplate;
  busy: boolean;
  disabled: boolean;
  onUse: () => void;
}) {
  const [svg, setSvg] = useState<string | null>(template.src ? null : template.svg ?? "");

  useEffect(() => {
    if (!template.src) {
      setSvg(template.svg ?? "");
      return;
    }
    let cancelled = false;
    setSvg(null);
    loadTemplateSvg(template.src)
      .then((text) => {
        if (!cancelled) setSvg(text);
      })
      .catch(() => {
        if (!cancelled) setSvg(null);
      });
    return () => {
      cancelled = true;
    };
  }, [template.src, template.svg]);

  const src = useMemo(() => {
    if (!svg) return null;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
      toAnimatedSvg({
        id: template.id,
        title: template.label,
        svg,
        tracks: template.tracks ?? [],
        duration: previewDuration(template.duration),
        loop: template.loop,
      }),
    )}`;
  }, [svg, template]);

  const Icon = TEMPLATE_ICONS[template.icon];
  const artboard = artboardSize(template);
  const aspectRatio = Math.min(
    1.85,
    Math.max(0.6, artboard.width / artboard.height),
  );

  const canvasColor = templateCanvasColor(template.id);
  const light = isLightColor(canvasColor);

  return (
    <button
      type="button"
      onClick={onUse}
      disabled={disabled}
      aria-label={`Open the ${template.label} template`}
      style={{ aspectRatio: `${aspectRatio}`, backgroundColor: canvasColor }}
      className={cn(
        "group relative block w-full overflow-hidden rounded-3xl border text-left",
        light ? "border-black/5" : "border-white/10",
        "transition-[border-color,box-shadow,transform] duration-300 ease-out",
        "hover:-translate-y-0.5 hover:shadow-[0_22px_45px_-30px_rgb(0_0_0/0.6)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:cursor-not-allowed disabled:opacity-70",
      )}
    >
      {/* Stage: faint grid, faded to the edges so the art floats. */}
      <span
        aria-hidden="true"
        className="absolute inset-0 opacity-50 [mask-image:radial-gradient(circle_at_50%_45%,#000_10%,transparent_78%)]"
        style={{
          backgroundImage: light
            ? "linear-gradient(rgba(0,0,0,0.10) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.10) 1px, transparent 1px)"
            : "linear-gradient(rgba(255,255,255,0.14) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.14) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />

      {src ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          draggable={false}
          className="absolute inset-0 size-full object-contain transition-transform duration-500 ease-out group-hover:scale-[1.02]"
        />
      ) : (
        <span className="absolute inset-0 grid place-items-center">
          <IconLoader2 className="size-4 animate-spin text-muted-foreground" />
        </span>
      )}

      {/* Caption: always on for touch, slides in on hover/focus for pointers. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/85 via-black/45 to-transparent transition-opacity duration-300 md:opacity-0 md:group-hover:opacity-100 md:group-focus-visible:opacity-100"
      />
      <span className="absolute inset-x-0 bottom-0 block p-3.5 text-white transition-all duration-300 md:translate-y-1.5 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100 md:group-focus-visible:translate-y-0 md:group-focus-visible:opacity-100">
        <span className="flex items-center gap-1.5">
          <Icon className="size-3.5 shrink-0 text-white/70" strokeWidth={1.8} />
          <span className="truncate text-[13px] font-semibold tracking-tight">
            {template.label}
          </span>
          <span className="ml-auto flex shrink-0 items-center gap-1.5">
            <span className="text-[10px] font-medium tabular-nums text-white/70">
              {(template.duration / 1000).toFixed(1)}s
            </span>
            <span className="rounded-full bg-white/15 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-white/75">
              {template.loop ? "loop" : "once"}
            </span>
          </span>
        </span>
        <span className="mt-1 line-clamp-2 block text-[11px] leading-relaxed text-white/70">
          {template.hint}
        </span>
      </span>

      {busy ? (
        <span className="absolute inset-0 grid place-items-center bg-background/60 backdrop-blur-sm">
          <IconLoader2 className="size-5 animate-spin text-foreground" />
        </span>
      ) : null}
    </button>
  );
}

/**
 * Templates are laid out masonry-style: every preview keeps its artboard ratio
 * and cards drop into the shortest column, so the gallery reads left-to-right
 * while the columns stay balanced.
 */
function TemplateGallery({
  hidden,
  busyId,
  onUse,
}: {
  hidden: boolean;
  busyId: string | null;
  onUse: (template: MotionTemplate) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const columns = useGalleryColumns(ref);
  const buckets = useMemo(
    () => distributeItems(MOTION_TEMPLATES, columns, artboardSize),
    [columns],
  );

  return (
    <div ref={ref} className={cn("items-start gap-2.5", hidden ? "hidden" : "flex")}>
      {buckets.map((bucket, index) => (
        <div key={index} className="flex min-w-0 flex-1 flex-col gap-2.5">
          {bucket.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              busy={busyId === template.id}
              disabled={busyId !== null}
              onUse={() => onUse(template)}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Column count from the container width, so galleries never depend on breakpoints. */
function useGalleryColumns(ref: RefObject<HTMLDivElement | null>) {
  const [columns, setColumns] = useState(3);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const width = el.clientWidth;
      // Hidden tabs report 0 — keep the last good column count.
      if (width <= 0) return;
      setColumns(width < 480 ? 1 : width < 820 ? 2 : 3);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return columns;
}

/** Balance cards into columns using each item's artboard ratio as its height. */
function distributeItems<T>(
  items: T[],
  columns: number,
  artboardOf: (item: T) => { width: number; height: number },
): T[][] {
  const buckets = Array.from({ length: columns }, () => ({
    items: [] as T[],
    height: 0,
  }));
  for (const item of items) {
    const target = buckets.reduce((a, b) => (a.height <= b.height ? a : b));
    target.items.push(item);
    const artboard = artboardOf(item);
    // Relative height at a shared column width: tall art stacks lower.
    target.height += artboard.height / artboard.width;
  }
  return buckets.map((bucket) => bucket.items);
}

function artboardSize(artboard: {
  width?: number | undefined;
  height?: number | undefined;
  svg?: string | undefined;
}): { width: number; height: number } {
  if (artboard.width && artboard.height) {
    return { width: artboard.width, height: artboard.height };
  }
  const box = artboard.svg
    ? /viewBox=["']([^"']+)["']/
        .exec(artboard.svg)?.[1]
        ?.trim()
        .split(/[\s,]+/)
        .map(Number)
    : null;
  const width = box?.[2];
  const height = box?.[3];
  if (
    typeof width === "number" &&
    typeof height === "number" &&
    width > 0 &&
    height > 0
  ) {
    return { width, height };
  }
  return { width: 3, height: 2 };
}

function HomeAgentComposer({
  threadId,
  onStart,
}: {
  threadId: string;
  onStart: (
    message: string,
    options: ChatInitialComposerOptions,
  ) => void;
}) {
  const navigate = useNavigate();
  const realtimeVoice = useRealtimeVoiceModeOptional();
  const [transport] = useState(() =>
    createAgentNativeAgentKitTransport({
      browserTabId: TAB_ID,
      surface: "app",
      adapter: { textFormat: "markdown" },
    }),
  );

  function startVoiceChat() {
    rememberLastChatThread(threadId);
    void realtimeVoice?.start({ threadId });
    markAgentChatHomeHandoff("chat");
    navigateWithAgentChatViewTransition(navigate, chatThreadPath(threadId));
  }

  return (
    <div
      className="agentkit-tokens w-full max-w-[calc(var(--agent-kit-conversation-max-width,47rem)-2rem)] text-start"
      data-agentkit-composer-size="large"
    >
      <CoreComposerRuntimeProvider>
        <CoreAgentKitRoot
          transport={transport}
          clientOptions={{ transportOwnership: "owned" }}
          threadId={threadId}
        >
          <HomeAgentComposerInput
            threadId={threadId}
            onSubmit={(text, options, onLocalSubmit) => {
              onStart(text, options);
              onLocalSubmit?.();
            }}
            onVoiceChatStart={startVoiceChat}
          />
        </CoreAgentKitRoot>
      </CoreComposerRuntimeProvider>
    </div>
  );
}

function HomeAgentComposerInput({
  threadId,
  onSubmit,
  onVoiceChatStart,
}: {
  threadId: string;
  onSubmit: (
    text: string,
    options: ChatInitialComposerOptions,
    onLocalSubmit?: () => void,
  ) => void;
  onVoiceChatStart: () => void;
}) {
  const control = useAgentKitControl(threadId);

  return (
    <AgentKitComposer
      threadId={threadId}
      requireAgentEngine
      placeholder={COMPOSER_PLACEHOLDER}
      plusMenuMode="hidden"
      attachmentsEnabled={false}
      voiceEnabled
      onVoiceChatStart={onVoiceChatStart}
      onSubmit={async (text, files, references, options) => {
        const uploadedAttachments = files.length
          ? await control.uploadFiles(
              files.map((file) => ({
                name: file.name,
                mediaType: file.type || "application/octet-stream",
                size: file.size,
                body: file,
              })),
            )
          : [];
        onSubmit(
          text,
          chatHandoffComposerOptions(options, {
            references,
            ...(uploadedAttachments.length ? { uploadedAttachments } : {}),
          }),
          options.onLocalSubmit,
        );
      }}
    />
  );
}

function ProjectGallery({
  projects,
  hidden,
}: {
  projects: ProjectSummary[];
  hidden: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const columns = useGalleryColumns(ref);
  const buckets = useMemo(
    () => distributeItems(projects, columns, artboardSize),
    [projects, columns],
  );

  return (
    <div
      ref={ref}
      className={cn("items-start gap-2.5", hidden ? "hidden" : "flex")}
    >
      {buckets.map((bucket, index) => (
        <div key={index} className="flex min-w-0 flex-1 flex-col gap-2.5">
          {bucket.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Saved projects use the same gallery language as templates: the art fills a
 * rounded colour stage, plays its motion continuously, and the caption slides
 * in on hover. Projects keep their own title and save time instead of a hint.
 */
function ProjectCard({ project }: { project: ProjectSummary }) {
  const src = useMemo(
    () =>
      `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
        toAnimatedSvg({
          ...project,
          duration: previewDuration(project.duration),
        }),
      )}`,
    [project],
  );

  const artboard = artboardSize(project);
  const aspectRatio = Math.min(
    1.85,
    Math.max(0.6, artboard.width / artboard.height),
  );
  const canvasColor = templateCanvasColor(project.id);
  const light = isLightColor(canvasColor);

  return (
    <Link
      to={`/motion?id=${encodeURIComponent(project.id)}`}
      onClick={startFreshStudioChat}
      style={{ aspectRatio: `${aspectRatio}`, backgroundColor: canvasColor }}
      className={cn(
        "group relative block w-full overflow-hidden rounded-3xl border text-left",
        light ? "border-black/5" : "border-white/10",
        "transition-[border-color,box-shadow,transform] duration-300 ease-out",
        "hover:-translate-y-0.5 hover:shadow-[0_22px_45px_-30px_rgb(0_0_0/0.6)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      )}
    >
      {/* Stage: faint grid, faded to the edges so the art floats. */}
      <span
        aria-hidden="true"
        className="absolute inset-0 opacity-50 [mask-image:radial-gradient(circle_at_50%_45%,#000_10%,transparent_78%)]"
        style={{
          backgroundImage: light
            ? "linear-gradient(rgba(0,0,0,0.10) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.10) 1px, transparent 1px)"
            : "linear-gradient(rgba(255,255,255,0.14) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.14) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />

      <img
        src={src}
        alt=""
        loading="lazy"
        draggable={false}
        className="absolute inset-0 size-full object-contain transition-transform duration-500 ease-out group-hover:scale-[1.02]"
      />

      {/* Caption: always on for touch, slides in on hover/focus for pointers. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/85 via-black/45 to-transparent transition-opacity duration-300 md:opacity-0 md:group-hover:opacity-100 md:group-focus-visible:opacity-100"
      />
      <span className="absolute inset-x-0 bottom-0 block p-3.5 text-white transition-all duration-300 md:translate-y-1.5 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100 md:group-focus-visible:translate-y-0 md:group-focus-visible:opacity-100">
        <span className="flex items-center gap-1.5">
          <IconSparkles
            className="size-3.5 shrink-0 text-white/70"
            strokeWidth={1.8}
          />
          <span className="truncate text-[13px] font-semibold tracking-tight">
            {project.title}
          </span>
          <span className="ml-auto flex shrink-0 items-center gap-1.5">
            <span className="text-[10px] font-medium tabular-nums text-white/70">
              {(project.duration / 1000).toFixed(1)}s
            </span>
            <span className="rounded-full bg-white/15 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-white/75">
              {project.loop ? "loop" : "once"}
            </span>
          </span>
        </span>
        <span className="mt-1 flex items-center gap-1 text-[11px] leading-relaxed text-white/70">
          Saved {relativeTime(project.updatedAt)}
          <IconArrowUpRight className="size-3 shrink-0" strokeWidth={1.8} />
        </span>
      </span>
    </Link>
  );
}

function relativeTime(iso?: string) {
  if (!iso) return "just now";
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "just now";
  const minutes = Math.max(0, Math.floor((Date.now() - then) / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(then).toLocaleDateString();
}
