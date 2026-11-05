# SVG MOTION — Hackathon Submission

## Project

**SVG MOTION** is a project-based SVG motion studio. A project is one animated
SVG: raw SVG markup plus keyframe tracks. You can draw or import artwork, edit
it on a visual timeline, and let an AI agent create or refine animations from a
plain-language prompt. The agent and the user edit the same project row, so
changes stay in sync between chat and the studio.

- Repository: https://github.com/suvo-sos/motion
- Demo clip: (add public Clips link here — must be viewable without login)
- Live demo: (optional)

## Creator / team

- Name(s): suvo
- Contact: suvo.uio@gmail.com

## How to run locally

```bash
pnpm install
cp .env.example .env
pnpm dev
```

Open the URL printed by Vite (default `http://localhost:8082`); `/` goes
straight to the project launcher.

## Pre-existing work, templates, and third-party assets

- Started from the Agent-Native app template (`agent-native create`), which
  provides auth, storage, chat, and the agent runtime.
- Framework and libraries: `@agent-native/core`, `@agent-native/toolkit`,
  React, React Router, Vite, Nitro, Tailwind, shadcn/ui primitives, and
  other dependencies listed in `package.json`.
- One imported SVG export (`cup-game-loader`) whose artwork and CSS keyframes
  were converted into an editable project. Its pristine source export is not
  committed; only the converted SVG and tracks are.
- Two patches under `patches/` adjust `@agent-native/core` and
  `@agent-native/toolkit` for static asset handling and composer chip
  behavior.

## What changed during the Hackathon (Oct 27 – Nov 9, 2026)

- Renamed the app to SVG MOTION; updated branding, title, manifest, and docs.
- Timeline editor P0: zoom/pan/fit, frame rate + seconds/ms readout, frame
  stepping, snapping, multi-select keyframes with group move/delete/copy/paste.
- Multi-element selection appears as chips in the agent composer (gray
  background, 6px radius).
- Projects gallery aligned with the templates gallery; removed the brand logo
  reveal template.
- Snap icon filled when on, hollow when off.
- Added a `?` Definitions popover listing definitions and explaining they are
  edited from Properties.
- Removed debug logging from the studio and save-animation action.
- Disabled the login wall for local/demo use (`AUTH_DISABLED`); `/` redirects
  straight to the project launcher.
- Documentation: README local-run and production notes, CHANGELOG entry.

## Notes

- `pnpm build` reports production configuration errors if `AUTH_DISABLED` is
  set or `BETTER_AUTH_SECRET`/a persistent database URL is missing. For a
  production deployment, unset `AUTH_DISABLED`, set `BETTER_AUTH_SECRET`, and
  provide `DATABASE_URL`/`NETLIFY_DATABASE_URL`.