# SVG MOTION

An agent-native SVG animation studio where you describe motion and the agent creates it. Built on the Agent Native framework with real-time collaboration, durable state, and timeline-based animation editing.

**SVG MOTION** transforms natural language descriptions into professional SVG animations. The agent draws the SVG and writes the keyframes — you shape the timing on the timeline.

## Features

- AI-Powered Animation: Describe any animation and watch the agent create it
- Timeline Editor: Zoom, pan, frame stepping, snapping, and multi-keyframe editing with easing controls
- Precision Tools: Transform, node editing, align, distribute, and snap to frames, keyframes, and clip edges
- Drawing Tools: Pen tool, shapes (rectangles, circles, stars), and text
- Image Support: Drag-and-drop images with smart positioning
- Layer Management: Full layer control with bring to front/send to back
- Element Tagging: Right-click elements or groups to tag several of them as chips in one agent prompt
- SVG Export: Export standalone animated SVG files
- Real-time Sync: Changes sync instantly across all sessions
- Auto-save: All projects saved automatically


## Run this project

Requirements: Node.js 22+ and pnpm (`corepack enable`).

```bash
pnpm install
cp .env.example .env
# .env.example enables demo mode, so there is no login wall.
pnpm dev
```

Open the URL printed by Vite (default `http://localhost:8082`); `/` goes
straight to the project launcher. If the agent needs a model that is not
already available, connect an AI provider in Settings -> Agent.

## Quick Start

1. Describe it: Use the prompt composer to describe an animation
2. Watch it move: The agent creates the SVG and animation tracks
3. Shape it: Edit keyframes on the timeline to perfect your timing
4. Export it: Download a standalone animated SVG file

## Example outcomes

Real animations produced by the studio (standalone animated SVG exports — open
the files to see them move):

<p align="center">
  <img src="download/demo-1.svg" width="200" alt="Demo 1" />
  <img src="download/demo-3.svg" width="200" alt="Demo 3" />
  <img src="download/demo-4.svg" width="200" alt="Demo 4" />
  <img src="download/demo-5.svg" width="200" alt="Demo 5" />
</p>

## Contact

- Creator: suvo
- Email: suvo.uio@gmail.com
- Repository: https://github.com/suvo-sos/motion

## License

This project is open source and released under the [MIT License](./LICENSE).
Anyone is free to use, modify, and distribute it.
Full docs: [agent-native.com/docs](https://agent-native.com/docs?utm_source=github&utm_medium=referral)
