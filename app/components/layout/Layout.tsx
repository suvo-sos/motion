import { useT } from "@agent-native/core/client/i18n";
import {
  HeaderActionsProvider,
  useHeaderActions,
  useHeaderTitle,
} from "@agent-native/toolkit/app-shell/header-actions";
import {
  isAgentChatHomeHandoffActive,
  useAgentChatHomeHandoff,
  useAgentChatHomeHandoffLinks,
} from "@agent-native/toolkit/app/chat/agentkit-chat/rail";
import {
  RealtimeVoiceModeProvider,
  useRealtimeVoiceModeOptional,
} from "@agent-native/toolkit/app/chat/composer";
import { isSettingsPathname } from "@agent-native/toolkit/app/settings";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { APP_TITLE } from "@/lib/app-config";
import { HOME_PATH, isChatPathname } from "@/lib/chat-paths";
import { TAB_ID } from "@/lib/tab-id";

// Not lazy() like Header: the inspector wraps the page, so a Suspense fallback
// would mount the page once before its chunk loads and again after.
// AgentSidebar already lazy-loads its own panel.
import { AgentInspector } from "./AgentInspector";
import { MobileAppBar } from "./MobileAppBar";
import { Sidebar } from "./Sidebar";

const Header = lazy(() =>
  import("./Header").then((module) => ({ default: module.Header })),
);

interface LayoutProps {
  children: React.ReactNode;
}

const SIDEBAR_COLLAPSE_KEY = "chat.sidebar.collapsed";

function routeOwnsToolbar(pathname: string): boolean {
  return (
    pathname === HOME_PATH ||
    isChatPathname(pathname) ||
    pathname === "/database" ||
    pathname.startsWith("/extensions")
  );
}

/**
 * A voice chat follows the user into a chat thread, so Get started can hand
 * one off. Other pages show no controls for this session, so any other
 * navigation ends it rather than leave the microphone open with nothing to
 * stop it. The agent sidebar owns a separate session and keeps its own
 * controls on screen, so this leaves that one alone.
 */
function EndVoiceChatOutsideChat() {
  const { pathname } = useLocation();
  const end = useRealtimeVoiceModeOptional()?.end;
  const previousPathnameRef = useRef(pathname);

  useEffect(() => {
    if (previousPathnameRef.current === pathname) return;
    previousPathnameRef.current = pathname;
    if (!isChatPathname(pathname)) end?.();
  }, [end, pathname]);

  return null;
}

export function Layout({ children }: LayoutProps) {
  return (
    <RealtimeVoiceModeProvider browserTabId={TAB_ID}>
      <EndVoiceChatOutsideChat />
      <LayoutShell>{children}</LayoutShell>
    </RealtimeVoiceModeProvider>
  );
}

function LayoutShell({ children }: LayoutProps) {
  const location = useLocation();
  const t = useT();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const isChatRoute = isChatPathname(location.pathname);
  // Settings brings its own navigation, header, and agent toggle, so it
  // renders full width.
  const settingsOwnsChrome = isSettingsPathname(location.pathname);
  // The motion editor is a full-bleed studio: no app sidebar or header.
  const isStudioRoute = location.pathname.startsWith("/motion");
  // Home never shows the agent sidebar, full stop. AgentInspector restores
  // the sidebar's persisted open state (storageKey="chat") on mount, so
  // merely asking it to close on the way back from a project did not work:
  // Layout unmounts AgentInspector on /motion, so on returning to /home it
  // mounted fresh, never saw the /motion -> /home transition, and reopened
  // from stored state. Not mounting it on /home at all is the guarantee.
  const isHomeRoute = location.pathname === HOME_PATH;
  const chatHomeHandoffActive = useAgentChatHomeHandoff({
    storageKey: "chat",
    activePath: location.pathname,
    enabled: !isChatRoute,
  });
  const chatHomeHandoffPending = isAgentChatHomeHandoffActive("chat");
  useAgentChatHomeHandoffLinks({
    storageKey: "chat",
    isChatPath: isChatPathname,
    requireActiveHandoff: true,
  });

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  // Belt and braces for any toolkit-level agent sidebar that lives outside
  // AgentInspector: tell it to close whenever home is entered. This lives
  // here, not in AgentInspector, because LayoutShell stays mounted across
  // routes while AgentInspector is unmounted on /motion — an effect inside
  // AgentInspector can never observe the return trip.
  useEffect(() => {
    if (location.pathname !== HOME_PATH) return;
    window.dispatchEvent(
      new CustomEvent("agent-chat:close-sidebar", {
        detail: { source: "navigation-to-home" },
      }),
    );
  }, [location.pathname]);

  useEffect(() => {
    const closeMobileSidebar = () => setMobileSidebarOpen(false);
    window.addEventListener("agent-chat:open-thread", closeMobileSidebar);
    return () => {
      window.removeEventListener("agent-chat:open-thread", closeMobileSidebar);
    };
  }, []);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(SIDEBAR_COLLAPSE_KEY);
      if (stored !== null) setSidebarCollapsed(stored === "1");
    } catch {
      // Ignore storage access errors; the default collapsed state still works.
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        SIDEBAR_COLLAPSE_KEY,
        sidebarCollapsed ? "1" : "0",
      );
    } catch {
      // Ignore storage access errors.
    }
  }, [sidebarCollapsed]);

  const pageTitle = useHeaderTitle();
  const pageActions = useHeaderActions();
  // Until the chat route publishes its title and toolbar here, the AgentKit
  // header must stay visible on phones or the thread loses both.
  const chatHeaderInAppBar =
    isChatRoute && (pageTitle != null || pageActions != null);
  const openMobileSidebar = () => setMobileSidebarOpen(true);
  const ownsToolbar = routeOwnsToolbar(location.pathname);
  const contentFrame = (
    <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
      {isStudioRoute ? null : isChatRoute ? (
        <MobileAppBar
          className="md:hidden"
          onOpenNavigation={openMobileSidebar}
          title={pageTitle ?? APP_TITLE}
          actions={pageActions}
        />
      ) : ownsToolbar ? (
        <MobileAppBar
          className="md:hidden"
          onOpenNavigation={openMobileSidebar}
        />
      ) : settingsOwnsChrome ? null : (
        <Suspense fallback={<div className="h-12 shrink-0" />}>
          <Header onOpenMobileSidebar={openMobileSidebar} />
        </Suspense>
      )}
      <main
        className={`agent-native-app-main min-w-0 flex-1 overscroll-contain ${
          isStudioRoute ? "overflow-hidden" : "overflow-y-auto"
        }`}
      >
        {children}
      </main>
    </div>
  );

  return (
    <HeaderActionsProvider>
      <div className="agent-layout-shell chat-layout-shell flex h-screen w-full overflow-hidden bg-background text-foreground">
        {settingsOwnsChrome || isStudioRoute ? null : (
          <div
            data-collapsed={sidebarCollapsed ? "true" : "false"}
            className="agent-layout-left-drawer hidden md:block"
          >
            <Sidebar
              collapsed={sidebarCollapsed}
              onCollapsedChange={setSidebarCollapsed}
            />
          </div>
        )}
        <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
          <SheetContent
            side="left"
            className="w-[var(--chat-sidebar-width)] p-0"
          >
            <SheetTitle className="sr-only">
              {t("navigation.navigation")}
            </SheetTitle>
            <SheetDescription className="sr-only">
              {t("navigation.navigationDescription")}
            </SheetDescription>
            <Sidebar collapsed={false} collapsible={false} />
          </SheetContent>
        </Sheet>
        {isChatRoute ? (
          <div
            data-agent-chat-canvas="true"
            data-chat-header-in-app-bar={
              chatHeaderInAppBar ? "true" : undefined
            }
            className="agent-layout-main-surface flex min-w-0 flex-1 overflow-hidden"
          >
            {contentFrame}
          </div>
        ) : isHomeRoute ? (
          // Home has its own composer; it does not get the agent sidebar.
          contentFrame
        ) : (
          <AgentInspector
            chatHomeHandoffActive={chatHomeHandoffActive}
            chatHomeHandoffPending={chatHomeHandoffPending}
          >
            {contentFrame}
          </AgentInspector>
        )}
      </div>
    </HeaderActionsProvider>
  );
}
