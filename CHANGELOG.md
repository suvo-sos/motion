# Changelog

All notable user-facing changes to this app are documented here.

## 2026-11-05

### Added

- Timeline zoom, pan, and fit controls, plus a frame-rate selector, frame stepping, and snapping to frames, keyframes, and clip edges.
- Multi-select keyframes with group drag, delete, copy, and paste.
- Element tagging stacks every selected element as a chip in the agent composer, and the Elements header has a Definitions help popover.
- The Projects gallery now uses the same card language as the template gallery.

### Changed

- Timeline readouts use total seconds plus milliseconds instead of frame timecode.
- Refreshed the SVG MOTION brand icons and removed the unused Brand logo reveal starter.
- Removed the dev-only React 19 script-tag warning from the console.

## 2026-11-03

### Added

- Image elements are first-class in the studio: add them from the canvas toolbar or the Elements rail (file or URL), drop an image file onto the artboard, or paste one from the clipboard.
- The Properties panel has a dedicated Image section with a live preview, source editing, one-click replace, and contain/cover/stretch fit options.
- Shapes, text, and freehand paths can be created directly in the studio: the "Add Shape" menu inserts rectangles (rounded), circles, ellipses, triangles, stars, lines, text, and groups; the pen tool (P) draws freehand paths. Geometry is editable in Properties → Group.
- `view-screen` now reports the open animation's canvas size (`canvasSize`), and the agent prompt instructs it to fill the canvas instead of drawing tiny artwork.

### Improved

- Studio headers and toolbars use solid (filled) icons for sharper, more readable controls.
- A build started from the home prompt now keeps its chat thread in the studio sidebar, so the prompt, the agent's run, and its edits stay visible beside the project instead of being replaced by an empty per-project conversation.

## 2026-10-10

### Fixed

- Large prompts with full context remain available to retry when sending fails.

## 2026-09-30

### Improved

- Chat uses a compact + menu with context submenus, keeps task, automation, and skill actions at the root, and omits Generate Image.

## 2026-09-27

### Fixed

- Chat retries the original request with its attachments after model setup.

## 2026-08-27

### Fixed

- Chat includes the runtime packages needed for provider keys after deployment.

For the full list of updates, see the [changelog folder](./changelog/).
