# SVG MOTION — Agent Guide

SVG MOTION is a project-based, agent-native SVG motion app. A project is one animated SVG: raw SVG markup plus keyframe tracks. The agent draws the SVG and writes the tracks; the user shapes them on a timeline. `/home` is the project launcher, `/motion?id=<id>` is the studio, and `/chat` remains the full-screen chat surface.

## Skills

Search with `rg --hidden --follow`; read the exact linked guide before deeper work. `.agents/skills/build-an-app/SKILL.md` — start here for vague requests to create a domain app. `.agents/skills/adding-a-feature/SKILL.md` — cross-area feature checklist. Data/integrations: `.agents/skills/actions/SKILL.md`, `.agents/skills/storing-data/SKILL.md`, `.agents/skills/security/SKILL.md`, `.agents/skills/secrets/SKILL.md`, `.agents/skills/sharing/SKILL.md`. UI: `.agents/skills/frontend-design/SKILL.md`, `.agents/skills/shadcn-ui/SKILL.md`, `.agents/skills/client-side-routing/SKILL.md`. Agent context/workflows: `.agents/skills/context-awareness/SKILL.md`, `.agents/skills/real-time-sync/SKILL.md`, `.agents/skills/reliable-mutations/SKILL.md`, `.agents/skills/performance/SKILL.md`, `.agents/skills/delegate-to-agent/SKILL.md`. Framework: `.agents/skills/agent-native-docs/SKILL.md`, `.agents/skills/agent-native-toolkit/SKILL.md`, `.agents/skills/customizing-agent-native/SKILL.md`.

Use local docs only (no web research): `pnpm action docs-search --query "<topic>"`, `pnpm action docs-search --slug "<slug>"`, `pnpm action docs-search --list`, `pnpm action source-search --query "<pattern>"`, `pnpm action source-search --path <path>`, or `pnpm action source-search --list`. For external-agent integrations, read `pnpm action docs-search --slug "external-agents"`.

## Core rules

- UI feedback: target 100 ms, never exceed 400 ms; acknowledge before network work.
- Normal app data must flow through actions. Keep actions deterministic and focused; use agent chat/AgentSidebar for AI work and follow-ups in the same thread. Keep structured state in SQL and large files in configured storage; persist references only.
- For external integrations, inspect the workspace/provider connection catalog first; reuse its scoped resolver. Never hardcode credentials, webhook URLs, or private/customer data.
- Never fabricate. Report failures and recover; verify writes by reading the row or screen. Navigation is in `<current-screen>`; use `view-screen` for fresh visible-record details.

For custom branding, keep `server/plugins/agent-native-email-branding.ts` aligned: `app.name` appears in transactional email and optional `app.logoUrl` must be an absolute HTTPS URL.

## Application state

- A project is an `animations` row; the selected project id is the `motion` view's `id`.
- `home` is the project launcher at `/home`: prompt composer, template buttons, and the project grid.
- `motion` is the studio at `/motion?id=<id>`: full-bleed editor with the AgentSidebar on the right.
- `chat` is the full-screen chat at `/chat` and `/chat/<threadId>`. The home composer hands a prompt off to a chat thread, where the agent creates the project and typically navigates into the studio.
- `/` opens shared sign-in/signup and lands on `/home`.
- Use `navigate` when supported and `view-screen` for a fresh read of visible details; basic navigation is already in `<current-screen>`.

## App shell

- `app/components/layout/Sidebar.tsx` lists **projects** from `list-animations`, not chat threads. It has no documentation or community links. Keep the project list scrollable and the “New project” action pointed at `/home`.
- `app/components/home/HomePage.tsx` is the project launcher: the AgentKit composer, template prompt buttons, and project cards (with an SVG preview). It must not render docs/community columns.
- `app/routes/motion.tsx` is the studio. `app/components/layout/Layout.tsx` omits the app sidebar and header on `/motion`, so the studio owns the full screen; the shared `AgentInspector` stays and the studio header hosts `AgentToggleButton`.
- `AgentInspector` keeps one chat thread across `/home` → `/chat` → `/motion` (storage key `chat`, no per-project scope). A build started from the home composer must stay visible in the studio sidebar, so the inspector reopens the remembered thread (`rememberLastChatThread` / `readLastChatThread`) when the handoff is active. Opening a project from home (a template, an upload, or a saved project card) instead calls `startFreshStudioChat` (`app/lib/studio-chat.ts`) before navigating: it drops the sidebar's remembered thread and tab pointers so the studio opens on a brand-new chat instead of resurrecting the previous conversation.
- `app/lib/app-config.ts` holds `APP_TITLE`; the sidebar brand, page titles, and metadata use it.

## SVG MOTION data

`animations` rows hold raw `svg`, a JSON `tracks` array, `duration` (ms), and `loop`. A track is `{ target, property, keyframes }`; `property` is one of `translateX`, `translateY`, `scale`, `rotate`, `opacity`, `fill`, `strokeDashoffset`; each keyframe is `{ t (0-1), v, ease? }`.

Invariants: every `target` matches an element id in `svg`; ids are unique; keyframes are inside 0..1; loops match the first and last pose. The UI and the agent edit the same row, so the studio polls `list-animations` and `get-animation` and adopts external writes.

Image elements (`<image>` with `href`, `x`, `y`, `width`, `height`, `preserveAspectRatio`) are first-class: the studio adds them from the Elements rail (file/URL), via drag-and-drop onto the artboard, or by pasting from the clipboard, and the Properties → Image section previews, replaces, and fits them.

The studio also creates elements directly: the Elements rail "Add Shape" menu and the canvas toolbar insert rectangles (rounded), circles, ellipses, triangles, stars, lines, text, and groups; the pen tool (P) draws freehand paths by clicking points (close by clicking the first point, Enter to finish, Esc to cancel). Geometry is editable in Properties → Group.

The canvas has five tools: Transform (V, move), Node (N, edit anchor points of paths/polygons/polylines/lines), Resize (R, scale from corners), Hand (H, pan), and Pen (P, draw).

Right-clicking an element or group in the Elements list offers **Ask AI**: it tags that element in the agent composer (`app/lib/agent-element-context.ts`) with its markup, tree path, and existing tracks, selects it, and focuses the chat so the user can describe the change in plain language. The tag is a composer context chip for the agent and also an inline mention, which the framework serializes into the message text so the sent chat bubble shows the same element the input showed.

| Action | Use |
| --- | --- |
| list-animations | List projects; pass `includeSvg: true` to include `svg` + `tracks` for thumbnails |
| get-animation | Read svg + tracks for one id |
| save-animation | Create (no id) or update (id) |
| delete-animation | Remove one id |

The agent-facing workflow lives in `server/plugins/agent-chat.ts`: stable ids, one track per property per element, normalized keyframe time, meaningful easing, draw-on via `pathLength="1"` + `stroke-dasharray="1"` + `strokeDashoffset`, and `navigate` to `/motion?id=<id>` after saving.

## Verification

Run `pnpm typecheck` and `pnpm agent-native:doctor` after edits. Do **not** run browser automation, screenshots, or curl/uptime probes; ask the user to load the affected screen and report what they see.
