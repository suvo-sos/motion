import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { MOTION_TEMPLATES } from "../lib/templates";
import { toAnimatedSvg } from "../lib/motion";

const outDir = join(process.cwd(), "examples");
mkdirSync(outDir, { recursive: true });

const picks = ["loading-dots", "heartbeat", "orbit", "spinner", "sticker-pop", "bounce"];

for (const id of picks) {
  const t = MOTION_TEMPLATES.find((x) => x.id === id);
  if (!t || !t.svg || !t.tracks) {
    console.log("skip", id);
    continue;
  }
  const svg = toAnimatedSvg(
    {
      id: t.id,
      title: t.label,
      svg: t.svg,
      tracks: t.tracks,
      duration: t.duration,
      loop: t.loop,
    },
    { speed: 1 },
  );
  writeFileSync(join(outDir, `${id}.svg`), svg);
  console.log("wrote", id);
}