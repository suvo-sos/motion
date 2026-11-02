import { getDb } from "../server/db/index.js";
import { animations } from "../server/db/schema.js";
import { randomUUID } from "node:crypto";

const SAMPLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <rect width="200" height="200" fill="#ffffff"/>
  <circle id="ball" cx="100" cy="60" r="18" fill="#171717"/>
  <circle id="dot" cx="40" cy="160" r="6" fill="#a3a3a3"/>
</svg>`;

const SAMPLE_TRACKS = [
  {
    target: "ball",
    property: "translateY",
    keyframes: [
      { t: 0, v: -40, ease: "ease-in" },
      { t: 0.5, v: 90, ease: "ease-out" },
      { t: 1, v: -40, ease: "ease-in" },
    ],
  },
  {
    target: "ball",
    property: "scale",
    keyframes: [
      { t: 0, v: 1 },
      { t: 0.5, v: 1.25 },
      { t: 1, v: 1 },
    ],
  },
  {
    target: "dot",
    property: "translateX",
    keyframes: [
      { t: 0, v: 0, ease: "ease-in-out" },
      { t: 0.5, v: 120, ease: "ease-in-out" },
      { t: 1, v: 0, ease: "ease-in-out" },
    ],
  },
];

async function main() {
  const db = getDb();
  
  const id = randomUUID();
  
  await db.insert(animations).values({
    id,
    title: "Bouncing ball",
    svg: SAMPLE_SVG,
    tracks: JSON.stringify(SAMPLE_TRACKS),
    duration: 1600,
    loop: true,
  });
  
  console.log(`✅ Sample animation created with ID: ${id}`);
  console.log(`🚀 Open: http://localhost:8082/motion?id=${id}`);
}

main().catch(console.error);
