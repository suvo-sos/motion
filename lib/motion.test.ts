import { describe, expect, it } from "vitest";

import { exportJs } from "./export";
import { sampleTrack, toAnimatedSvg, type MotionAnimation, type Track } from "./motion";
import { sanitizeSvg } from "./sanitize";

function track(property: Track["property"], keyframes: Track["keyframes"]): Track {
  return { target: "box", property, keyframes };
}

function anim(overrides: Partial<MotionAnimation> = {}): MotionAnimation {
  return {
    id: "a1",
    title: "Test",
    svg: '<svg width="200" height="200" viewBox="0 0 200 200"><rect id="box" x="10" y="10" width="50" height="50" fill="#ff0000" /></svg>',
    tracks: [],
    duration: 2000,
    loop: true,
    ...overrides,
  };
}

describe("sampleTrack", () => {
  it("interpolates numbers linearly", () => {
    const t = track("translateX", [
      { t: 0, v: 0 },
      { t: 1, v: 100 },
    ]);
    expect(sampleTrack(t, 0.5)).toBe(50);
  });

  it("hold stays on the left keyframe for the whole segment", () => {
    const t = track("translateX", [
      { t: 0, v: 10, ease: "hold" },
      { t: 1, v: 90 },
    ]);
    expect(sampleTrack(t, 0.9)).toBe(10);
    expect(sampleTrack(t, 1)).toBe(90);
  });

  it("blends colours channel by channel", () => {
    const t = track("fill", [
      { t: 0, v: "#000000" },
      { t: 1, v: "#ffffff" },
    ]);
    expect(sampleTrack(t, 0.5)).toBe("#808080");
  });
});

describe("toAnimatedSvg", () => {
  it("exports hold as steps(1, end)", () => {
    const svg = toAnimatedSvg(
      anim({
        tracks: [
          track("translateX", [
            { t: 0, v: 0, ease: "hold" },
            { t: 1, v: 100 },
          ]),
        ],
      }),
    );
    expect(svg).toContain("steps(1, end)");
  });

  it("does not carry script or event handlers from the source SVG", () => {
    const svg = toAnimatedSvg(
      anim({
        svg: '<svg width="200" height="200" viewBox="0 0 200 200"><script>alert(1)</script><rect id="box" x="10" y="10" width="50" height="50" onload="alert(2)" /></svg>',
      }),
    );
    expect(svg).not.toContain("alert(1)");
    expect(svg).not.toContain("onload");
  });
});

describe("sanitizeSvg", () => {
  it("removes script, foreignObject and event handlers, keeps the artwork", () => {
    const out = sanitizeSvg(
      '<svg><script>alert(1)</script><foreignObject><div>hi</div></foreignObject><rect id="box" onclick="alert(2)" fill="red" /><a href="javascript:alert(3)"><text>x</text></a><style>.a{fill:red}</style></svg>',
    );
    expect(out).not.toContain("alert");
    expect(out).not.toContain("onclick");
    expect(out).not.toContain("javascript:");
    expect(out).toContain('fill="red"');
    // <style> is kept on purpose: artworks legitimately style themselves.
    expect(out).toContain(".a");
  });
});

describe("exportJs", () => {
  it("does not reference undefined variables in the player script", () => {
    const { content } = exportJs(anim({ loop: false }));
    expect(content).not.toContain("options?.frameRate");
    expect(content).not.toContain("const duration = animation.duration / speed;");
    expect(content).not.toContain("const triggerMode = trigger;");
    // Baked-in literals instead: frame rate, speed, loop, trigger.
    expect(content).toContain("1000 / 60");
    expect(content).toContain("shouldLoop = false");
  });

  it("carries hold and colour handling in the player, so it cannot silently drift from lib/motion.ts", () => {
    const { content } = exportJs(anim());
    expect(content).toContain('ease === "hold"');
    expect(content).toContain("parseColor");
    expect(content).toContain("lerpColor");
  });

  it("escapes </script> in embedded JSON and sanitises the embedded SVG", () => {
    const { content } = exportJs(
      anim({
        title: 'x</script><script>alert(1)</script>',
        svg: '<svg width="200" height="200" viewBox="0 0 200 200"><script>alert(2)</script><rect id="box" x="10" y="10" width="50" height="50" /></svg>',
      }),
    );
    expect(content).not.toContain("alert(1)");
    expect(content).not.toContain("alert(2)");
    // The only literal </script> left is the player's own closing tag.
    expect(content.match(/<\/script>/g)?.length).toBe(1);
  });
});
