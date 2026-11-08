import { useSession } from "@agent-native/core/client/hooks";
import { useT } from "@agent-native/core/client/i18n";
import {
  deleteProjectEverywhere,
  getLocalProject,
  saveLocalProject,
  setLocalProjectPinned,
  syncProjectToServer,
  useLocalProjects,
} from "@/lib/local-projects";
import { OrgSwitcher } from "@agent-native/toolkit/app/org";
import { openCommandMenu } from "@agent-native/toolkit/app/shared";
import {
  IconDownload,
  IconDots,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
  IconLoader2,
  IconPin,
  IconPlus,
  IconTrash,
  IconSearch,
} from "@tabler/icons-react";
import { Link, useLocation, useNavigate } from "react-router";

import { AppMark } from "@/components/brand/AppMark";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { APP_TITLE } from "@/lib/app-config";
import { toAnimatedSvg } from "../../../lib/motion";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { startFreshStudioChat } from "@/lib/studio-chat";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const BLANK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <rect width="200" height="200" fill="#ffffff" />
</svg>`;

interface SidebarProps {
  collapsed?: boolean;
  collapsible?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

interface ProjectRow {
  id: string;
  title: string;
  duration: number;
  pinned?: boolean;
  updatedAt?: string;
}

function ProjectsSection({ collapsed }: { collapsed: boolean }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { projects } = useLocalProjects();
  const [creating, setCreating] = useState(false);
  const rows: ProjectRow[] = projects;
  const activeId =
    location.pathname === "/motion"
      ? new URLSearchParams(location.search).get("id")
      : null;

  const handleNewProject = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const res = saveLocalProject({
        title: "Untitled",
        svg: BLANK_SVG,
        tracks: [],
        duration: 2000,
        loop: true,
      });
      if (res.id) {
        // A brand-new project must not inherit the previous chat thread.
        startFreshStudioChat();
        void syncProjectToServer(res.id);
        navigate(`/motion?id=${encodeURIComponent(res.id)}`);
      }
    } catch (error) {
      console.error(error);
      toast.error("Couldn't create the project. Try again.");
    } finally {
      setCreating(false);
    }
  };

  const newProjectButton = (
    <button
      type="button"
      onClick={() => void handleNewProject()}
      disabled={creating}
      aria-label="New project"
      className={cn(
        "flex items-center text-sidebar-accent-foreground transition-colors hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring disabled:opacity-60",
        collapsed
          ? "size-8 justify-center rounded-md"
          : "h-8 w-full gap-3 rounded-lg px-3 text-sm font-medium",
      )}
    >
      {creating ? (
        <IconLoader2 className="size-4 shrink-0 animate-spin" />
      ) : (
        <IconPlus className="size-4 shrink-0" strokeWidth={1.8} />
      )}
      <span className={collapsed ? "sr-only" : "truncate"}>
        {creating ? "Creating…" : "New project"}
      </span>
    </button>
  );

  if (collapsed) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>{newProjectButton}</TooltipTrigger>
          <TooltipContent side="right">New project</TooltipContent>
        </Tooltip>
        {rows.slice(0, 8).map((project) => (
          <Tooltip key={project.id}>
            <TooltipTrigger asChild>
              <Link
                to={`/motion?id=${encodeURIComponent(project.id)}`}
                aria-label={project.title}
                onClick={startFreshStudioChat}
                className={cn(
                  "grid size-8 place-items-center rounded-md text-[11px] font-semibold uppercase transition-colors",
                  activeId === project.id
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                {project.title.trim().charAt(0) || "•"}
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">{project.title}</TooltipContent>
          </Tooltip>
        ))}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="px-2 pb-3">{newProjectButton}</div>
      <div className="flex items-center justify-between px-3 pb-1.5">
        <span className="text-[11px] font-medium text-sidebar-foreground">
          Projects
        </span>
        {rows.length > 0 ? (
          <span className="text-[10px] tabular-nums text-sidebar-foreground/60">
            {rows.length}
          </span>
        ) : null}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {rows.length === 0 ? (
          <p className="px-1 pt-1 text-[11px] leading-relaxed text-sidebar-foreground/70">
            No projects yet. Describe one on the home page and the agent will
            build it.
          </p>
        ) : (
          <ul className="space-y-0.5">
            {rows.map((project) => {
              const active = activeId === project.id;
              return (
                <li key={project.id}>
                  <div
                    className={cn(
                      "group flex items-center gap-1 rounded-md px-2 py-1.5 transition-colors",
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    )}
                  >
                    <Link
                      to={`/motion?id=${encodeURIComponent(project.id)}`}
                      aria-current={active ? "page" : undefined}
                      onClick={startFreshStudioChat}
                      className="flex min-w-0 flex-1 items-center gap-2 focus-visible:outline-none"
                    >
                      <span
                        className={cn(
                          "size-1.5 shrink-0 rounded-full",
                          active
                            ? "bg-sidebar-primary"
                            : "bg-sidebar-foreground/30",
                        )}
                      />
                      <span className="min-w-0 flex-1 truncate text-[13px]">
                        {project.title}
                      </span>
                      <span className="text-[10px] tabular-nums text-sidebar-foreground/60">
                        {(project.duration / 1000).toFixed(1)}s
                      </span>
                    </Link>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          aria-label="Project options"
                          className="grid size-6 shrink-0 place-items-center rounded text-sidebar-foreground/60 opacity-0 transition-opacity hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:opacity-100 group-hover:opacity-100"
                        >
                          <IconDots className="size-3.5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem
                          onSelect={() => {
                            startFreshStudioChat();
                            navigate(`/motion?id=${encodeURIComponent(project.id)}`);
                          }}
                        >
                          Open
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={async () => {
                            try {
                              const animation = getLocalProject(project.id);
                              if (!animation) return;
                              const svg = toAnimatedSvg({
                                ...animation,
                                id: animation.id ?? project.id,
                                title: animation.title ?? project.title,
                                tracks: animation.tracks ?? [],
                                duration: animation.duration ?? project.duration,
                                loop: animation.loop ?? true,
                              });
                              const blob = new Blob([svg], {
                                type: "image/svg+xml",
                              });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement("a");
                              a.href = url;
                              a.download = `${project.title || "animation"}.svg`;
                              a.click();
                              URL.revokeObjectURL(url);
                            } catch (error) {
                              console.error(error);
                            }
                          }}
                        >
                          <IconDownload className="mr-2 size-4" />
                          Download SVG
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={async () => {
                            try {
                              setLocalProjectPinned(project.id, !project.pinned);
                            } catch (error) {
                              console.error(error);
                            }
                          }}
                        >
                          <IconPin className="mr-2 size-4" />
                          {project.pinned ? "Unpin" : "Pin"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onSelect={async () => {
                            try {
                              await deleteProjectEverywhere(project.id);
                              if (activeId === project.id) navigate("/home");
                            } catch (error) {
                              console.error(error);
                            }
                          }}
                        >
                          <IconTrash className="mr-2 size-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

export function Sidebar({
  collapsed = false,
  collapsible = true,
  onCollapsedChange,
}: SidebarProps) {
  const t = useT();
  // OrgSwitcher calls /_agent-native/org/me, which 401s without a session.
  const { status } = useSession();
  const ToggleIcon = collapsed
    ? IconLayoutSidebarLeftExpand
    : IconLayoutSidebarLeftCollapse;
  const collapseButton = collapsible ? (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={() => onCollapsedChange?.(!collapsed)}
          className="flex size-8 shrink-0 items-center justify-center rounded-md text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
          aria-label={
            collapsed
              ? t("navigation.expandSidebar")
              : t("navigation.collapseSidebar")
          }
        >
          <ToggleIcon className="size-4" strokeWidth={1.8} />
        </button>
      </TooltipTrigger>
      <TooltipContent side="right">
        {collapsed
          ? t("navigation.expandSidebar")
          : t("navigation.collapseSidebar")}
      </TooltipContent>
    </Tooltip>
  ) : null;
  const searchButton = (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={openCommandMenu}
          aria-label={t("root.commandSearch")}
          className="flex size-8 items-center justify-center rounded-md text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        >
          <IconSearch className="size-4" strokeWidth={1.8} />
        </button>
      </TooltipTrigger>
      <TooltipContent side="right">{t("root.commandSearch")}</TooltipContent>
    </Tooltip>
  );

  return (
    <aside
      data-collapsed={collapsed ? "true" : "false"}
      className={cn(
        "flex h-full min-w-0 shrink-0 flex-col overflow-hidden border-e border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-out",
        collapsed ? "w-12" : "w-full",
      )}
    >
      <div
        className={cn(
          "flex h-14 shrink-0 items-center",
          collapsed ? "justify-center px-1" : "gap-1 px-3",
        )}
      >
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                to="/home"
                aria-label={APP_TITLE}
                className="flex size-8 items-center justify-center rounded outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
              >
                <AppMark className="h-3.5 w-6 text-sidebar-accent-foreground" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">{APP_TITLE}</TooltipContent>
          </Tooltip>
        ) : (
          <Link
            to="/home"
            className="flex min-w-0 flex-1 items-center gap-3 rounded outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
          >
            <AppMark className="h-3.5 w-6 shrink-0 text-sidebar-accent-foreground" />
            <span className="truncate text-sm font-semibold text-sidebar-accent-foreground">
              {APP_TITLE}
            </span>
          </Link>
        )}
      </div>

      <nav
        aria-label="Projects"
        className={cn(
          "flex min-h-0 flex-1 flex-col",
          collapsed ? "items-center gap-1 px-1 py-2" : "pt-1",
        )}
      >
        <ProjectsSection collapsed={collapsed} />
      </nav>

      <div className="mt-auto shrink-0 border-t border-sidebar-border p-2">
        <div
          className={cn(
            collapsed
              ? "flex flex-col items-center gap-1"
              : "flex items-center gap-0.5",
          )}
        >
          {status === "authenticated" && (
            <OrgSwitcher
              reserveSpace
            compact={collapsed}
            currentAppId="chat"
            className={
              collapsed
                ? "size-8 bg-transparent p-0 hover:bg-sidebar-accent"
                : "min-w-0 flex-1 h-11 rounded-lg bg-transparent px-3 py-2 text-sm text-sidebar-accent-foreground hover:bg-sidebar-accent"
            }
            />
          )}
          {searchButton}
          {collapseButton}
        </div>
      </div>
    </aside>
  );
}
