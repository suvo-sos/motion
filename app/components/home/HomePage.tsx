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
  IconBolt,
  IconChartBar,
  IconCircleDot,
  IconLoader2,
  IconSparkles,
  IconUpload,
} from "@tabler/icons-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getChatHomeThreadId } from "@/lib/chat-home-thread";
import {
  chatHandoffComposerOptions,
  chatThreadPath,
  type ChatInitialComposerOptions,
  type ChatRouteState,
} from "@/lib/chat-paths";
import { TAB_ID } from "@/lib/tab-id";
import { toAnimatedSvg, type MotionAnimation } from "../../../lib/motion";

const COMPOSER_PLACEHOLDER =
  "Describe an animation — a logo reveal, a bouncing loader, a sticker pop…";

const TEMPLATES: Array<{
  label: string;
  prompt: string;
  icon: typeof IconSparkles;
}> = [
  {
    label: "Logo reveal",
    icon: IconSparkles,
    prompt:
      "Make a logo reveal animation: a mark draws on with a stroke, then scales in with a soft overshoot. Use a primary move plus a smaller supporting move, and loop seamlessly.",
  },
  {
    label: "Loading dots",
    icon: IconLoader2,
    prompt:
      "Create a three-dot loading animation with staggered bounces, snappy eased timing, and a seamless loop.",
  },
  {
    label: "Sticker pop",
    icon: IconBolt,
    prompt:
      "Make a playful sticker pop: a star scales in from 0.9 with an overshoot, rotates slightly, and settles. Loop it seamlessly.",
  },
  {
    label: "Spinner",
    icon: IconCircleDot,
    prompt:
      "Create a smooth circular spinner: a stroked arc draws on and rotates continuously. Loop it seamlessly.",
  },
  {
    label: "Equalizer",
    icon: IconChartBar,
    prompt:
      "Create a looping equalizer: five bars rise and fall with staggered translateY motion and eased timing.",
  },
];

interface ProjectSummary extends MotionAnimation {
  updatedAt?: string;
}

export default function HomePage() {
  const navigate = useNavigate();
  const [threadId] = useState(getChatHomeThreadId);
  const [uploading, setUploading] = useState(false);
  const save = useActionMutation("save-animation");
  const projectsQuery = useActionQuery(
    "list-animations",
    { includeSvg: true },
    { refetchInterval: 4000 } as any,
  );

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

      <section className="mx-auto w-full max-w-5xl space-y-3 px-6 pb-10">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-medium text-muted-foreground">
            Templates
          </span>
          <span className="h-px flex-1 bg-border" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
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
          {TEMPLATES.map((template) => {
            const Icon = template.icon;
            return (
              <button
                key={template.label}
                type="button"
                onClick={() => start(template.prompt)}
                className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Icon
                  className="size-3.5 text-muted-foreground"
                  strokeWidth={1.8}
                />
                {template.label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl space-y-4 px-6 pb-16">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">My projects</h2>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] tabular-nums text-muted-foreground">
              {projects.length}
            </span>
          </div>
          <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            {projectsQuery.isFetching ? (
              <IconLoader2 className="size-3 animate-spin" />
            ) : null}
            Saved automatically
          </span>
        </div>

        {projectsQuery.isLoading && projects.length === 0 ? (
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
                Pick a template above or describe your own animation. The agent
                will build it and open it in the studio.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => start(TEMPLATES[0]!.prompt)}
            >
              Start with a logo reveal
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
