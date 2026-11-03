import {
  markAgentChatHomeHandoff,
  navigateWithAgentChatViewTransition,
} from "@agent-native/core/client/agent-chat";
import { createAgentNativeAgentKitTransport } from "@agent-native/core/client/agentkit-chat/transport";
import { useActionQuery, useActionMutation } from "@agent-native/core/client/hooks";
import { AgentKitComposer } from "@agent-native/toolkit/app/agentkit/react/components";
import { useAgentKitControl } from "@agent-native/toolkit/app/agentkit/react/context";
import { CoreComposerRuntimeProvider } from "@agent-native/toolkit/app/chat/agentkit-chat/composer";
import { CoreAgentKitRoot } from "@agent-native/toolkit/app/chat/agentkit-chat/index";
import { useRealtimeVoiceModeOptional } from "@agent-native/toolkit/app/chat/composer";
import { WaveBackground } from "@agent-native/toolkit/app/shared";
import { AgentNativeIcon } from "@agent-native/toolkit/app/shared/AgentNativeIcon";
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
import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getChatHomeThreadId } from "@/lib/chat-home-thread";
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
  CSS_TEMPLATES,
  MOTION_TEMPLATES,
  STARTER_TEMPLATES,
  type MotionTemplate,
  type TemplateIconName,
} from "../../../lib/templates";

const COMPOSER_PLACEHOLDER =
  "Describe an animation — a logo reveal, a bouncing loader, a sticker pop…";

/**
 * Template previews run on a slowed clock so browsing them reads as motion
 * design rather than flicker.
 */
const PREVIEW_SPEED = 2.2;

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

interface ProjectSummary extends MotionAnimation {
  updatedAt?: string;
}

export default function HomePage() {
  const navigate = useNavigate();
  const [threadId] = useState(getChatHomeThreadId);
  const [uploading, setUploading] = useState(false);
  const [creatingTemplate, setCreatingTemplate] = useState<string | null>(null);
  const [view, setView] = useState<"projects" | "templates">("projects");
  const save = useActionMutation("save-animation");
  const projectsQuery = useActionQuery(
    "list-animations",
    { includeSvg: true },
    { refetchInterval: 4000 } as any,
  );

  /**
   * Templates are complete animations, so this writes the project directly
   * instead of routing through the agent — one click, landed in the studio.
   */
  async function createFromTemplate(template: MotionTemplate) {
    if (creatingTemplate) return;
    setCreatingTemplate(template.id);
    try {
      // Imported CSS templates keep their own <style> block and are fetched on
      // demand so their embedded art stays out of the JS bundle.
      const svg = template.src
        ? await fetch(template.src).then((res) => {
            if (!res.ok) throw new Error(`HTTP ${res.status} loading ${template.src}`);
            return res.text();
          })
        : template.svg;
      if (!svg) throw new Error("Template has no SVG payload");
      const result: any = await save.mutateAsync({
        title: template.label,
        svg,
        tracks: template.tracks ?? [],
        duration: template.duration,
        loop: template.loop,
      });
      if (result?.id) {
        navigate(`/motion?id=${encodeURIComponent(result.id)}`);
      } else {
        alert(`Could not create "${template.label}": ${result?.error ?? "unknown error"}`);
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
      const result: any = await save.mutateAsync({
        title: file.name.replace(/\.svg$/i, ""),
        svg,
        tracks: [],
        duration: 2000,
        loop: true,
      });
      if (result?.id) {
        navigate(`/motion?id=${encodeURIComponent(result.id)}`);
      }
    } catch (err) {
      alert(`Upload failed: ${(err as Error)?.message ?? err}`);
    } finally {
      setUploading(false);
    }
  }

  const projects = ((projectsQuery.data as any)?.animations ??
    []) as ProjectSummary[];

  function start(message: string, options: ChatInitialComposerOptions = {}) {
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
        <AgentNativeIcon
          aria-hidden="true"
          className="h-8 w-14 text-foreground"
        />
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
          Describe it. Watch it move.
        </h1>
        <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
          The agent draws the SVG and writes the keyframes. You shape the timing
          on the timeline, then export a standalone animated SVG.
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
              active={view === "projects"}
              count={projects.length}
              onClick={() => setView("projects")}
            >
              My projects
            </TabButton>
            <TabButton
              active={view === "templates"}
              count={MOTION_TEMPLATES.length}
              onClick={() => setView("templates")}
            >
              Templates
            </TabButton>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              {projectsQuery.isFetching ? (
                <IconLoader2 className="size-3 animate-spin" />
              ) : null}
              {view === "projects"
                ? "Saved automatically"
                : "Previewing slowly · click to add"}
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

        {view === "templates" ? (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {STARTER_TEMPLATES.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  busy={creatingTemplate === template.id}
                  disabled={creatingTemplate !== null}
                  onUse={() => void createFromTemplate(template)}
                />
              ))}
            </div>
            <div className="flex items-center gap-3 pt-1">
              <span className="text-[11px] font-medium text-muted-foreground">
                Imported CSS
              </span>
              <span className="h-px flex-1 bg-border" />
              <span className="text-[10px] text-muted-foreground">
                plays exactly as authored · not on the timeline
              </span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {CSS_TEMPLATES.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  busy={creatingTemplate === template.id}
                  disabled={creatingTemplate !== null}
                  onUse={() => void createFromTemplate(template)}
                />
              ))}
            </div>
          </div>
        ) : projectsQuery.isLoading && projects.length === 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-48 rounded-lg" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border px-6 py-14 text-center">
            <div className="grid size-10 place-items-center rounded-lg bg-muted text-foreground">
              <IconSparkles className="size-4" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">No projects yet</p>
              <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
                Pick a template to open a ready-made animation, or describe your
                own and the agent will build it.
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
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
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
      <span
        className={cn(
          "rounded-full px-1.5 py-0.5 text-[10px] tabular-nums",
          active ? "bg-muted text-foreground" : "bg-muted/60 text-muted-foreground",
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
  const [src] = useState(() =>
    template.src
      ? template.src
      : `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
          toAnimatedSvg({
            id: template.id,
            title: template.label,
            svg: template.svg ?? "",
            tracks: template.tracks ?? [],
            duration: Math.round(template.duration * PREVIEW_SPEED),
            loop: template.loop,
          }),
        )}`,
  );
  const Icon = TEMPLATE_ICONS[template.icon];

  return (
    <button
      type="button"
      onClick={onUse}
      disabled={disabled}
      className="group flex flex-col overflow-hidden rounded-lg border border-border bg-card text-left transition-colors hover:border-foreground/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-70"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        <div
          className="absolute inset-0 opacity-60"
          style={{
            backgroundImage:
              "radial-gradient(circle at center, hsl(var(--border)) 1px, transparent 1px)",
            backgroundSize: "18px 18px",
          }}
        />
        <img
          src={src}
          alt={`${template.label} preview`}
          loading="lazy"
          className="relative h-full w-full object-contain p-5"
        />
        <span className="absolute right-2 top-2 rounded-full border border-border bg-background/80 px-2 py-0.5 text-[10px] font-medium text-muted-foreground backdrop-blur">
          {template.loop ? "loop" : "once"}
        </span>
        {template.source === "css" ? (
          <span className="absolute left-2 top-2 rounded-full border border-border bg-background/80 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground backdrop-blur">
            CSS
          </span>
        ) : null}
        {busy ? (
          <span className="absolute inset-0 grid place-items-center bg-background/70 backdrop-blur-sm">
            <IconLoader2 className="size-5 animate-spin text-foreground" />
          </span>
        ) : null}
      </div>
      <div className="flex items-center justify-between gap-2 px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <Icon className="size-3.5 shrink-0 text-muted-foreground" strokeWidth={1.8} />
          <div className="min-w-0">
            <div className="truncate text-[13px] font-medium">
              {template.label}
            </div>
            <div className="mt-0.5 truncate text-[10px] text-muted-foreground">
              {template.hint}
            </div>
          </div>
        </div>
        <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
          {(template.duration / 1000).toFixed(1)}s
        </span>
      </div>
    </button>
  );
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

function ProjectCard({ project }: { project: ProjectSummary }) {
  const [hover, setHover] = useState(false);
  const staticSrc = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    project.svg,
  )}`;
  const animatedSrc = hover
    ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
        toAnimatedSvg(project),
      )}`
    : staticSrc;

  return (
    <Link
      to={`/motion?id=${encodeURIComponent(project.id)}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="group flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-foreground/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        <div
          className="absolute inset-0 opacity-60"
          style={{
            backgroundImage:
              "radial-gradient(circle at center, hsl(var(--border)) 1px, transparent 1px)",
            backgroundSize: "18px 18px",
          }}
        />
        <img
          src={animatedSrc}
          alt=""
          className="relative h-full w-full object-contain p-5"
        />
        <span className="absolute right-2 top-2 rounded-full border border-border bg-background/80 px-2 py-0.5 text-[10px] font-medium text-muted-foreground backdrop-blur">
          {project.loop ? "loop" : "once"}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2 px-3 py-2.5">
        <div className="min-w-0">
          <div className="truncate text-[13px] font-medium">{project.title}</div>
          <div className="mt-0.5 text-[10px] text-muted-foreground">
            {(project.duration / 1000).toFixed(2)}s ·{" "}
            {relativeTime(project.updatedAt)}
          </div>
        </div>
        <IconArrowUpRight className="size-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
      </div>
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
