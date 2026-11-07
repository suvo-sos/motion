import { describe, expect, it } from "vitest";

import {
  artboardSize,
  frameTime,
  rasterFrameCount,
  supportedVideoFormats,
} from "./raster-export";

// Only the pure helpers are tested here: the frame renderer and the
// encoders need a real canvas, MediaRecorder and gifenc, which the
// node test environment does not have. Those paths are exercised in dev.

describe("rasterFrameCount", () => {
  it("renders duration * fps frames", () => {
    expect(rasterFrameCount(2000, 15)).toBe(30);
    expect(rasterFrameCount(10000, 30)).toBe(300);
  });

  it("renders at least one frame, even for a 0ms clip", () => {
    expect(rasterFrameCount(0, 30)).toBe(1);
    expect(rasterFrameCount(NaN, 30)).toBe(1);
  });
});

describe("frameTime", () => {
  it("samples [0, 1) for a loop so the last frame does not repeat the first", () => {
    expect(frameTime(0, 4, true)).toBe(0);
    expect(frameTime(3, 4, true)).toBe(0.75);
  });

  it("samples [0, 1] for a one-shot clip so it ends on its final pose", () => {
    expect(frameTime(0, 4, false)).toBe(0);
    expect(frameTime(3, 4, false)).toBe(1);
  });

  it("returns 0 for a single frame", () => {
    expect(frameTime(0, 1, true)).toBe(0);
    expect(frameTime(0, 1, false)).toBe(0);
  });
});

describe("supportedVideoFormats", () => {
  it("reports no recordable format where MediaRecorder does not exist", () => {
    expect(supportedVideoFormats()).toEqual([]);
  });
});

describe("artboardSize", () => {
  it("reads the viewBox", () => {
    expect(
      artboardSize('<svg viewBox="0 0 800 600"></svg>'),
    ).toEqual({ width: 800, height: 600 });
  });

  it("falls back to width/height attributes, then 800x800", () => {
    expect(
      artboardSize('<svg width="400" height="300"></svg>'),
    ).toEqual({ width: 400, height: 300 });
    expect(artboardSize("<svg></svg>")).toEqual({ width: 800, height: 800 });
  });
});
