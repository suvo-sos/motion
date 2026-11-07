import { applyAt, type MotionAnimation, type Track } from "./motion";
import { sanitizeSvg } from "./sanitize";

/**
 * GIF + video export. Both are raster formats, so they work by posing the
 * artwork at successive times with the same applyAt engine the canvas and
 * the JS export use, rasterizing each pose to a canvas, and then encoding
 * the frames — gifenc for GIF, MediaRecorder for video.
 *
 * Two things the vector exports do not have to care about apply here:
 * - An SVG loaded as an image does not run its CSS animations, so the
 *   frames must be posed one by one (applyAt) instead of reusing
 *   toAnimatedSvg.
 * - An SVG image without explicit width/height rasterizes at the 300x150
 *   default, so the export pixel size is pinned onto the <svg> element
 *   before serializing each frame.
 *
 * Browser notes: video is WebM (VP9/VP8) in Chrome/Firefox and MP4 in
 * Safari, because MediaRecorder can only write what the browser ships.
 * There is no MP4 encoder in the browser without ffmpeg.wasm. GIFs are
 * 256 colours by definition; a "none" (transparent) background is filled
 * with the canvas colour (white by default) because transparent GIF
 * palettes are a separate encoding path.
 */

export type RasterExportKind = "gif" | "video";

/** Container the video is recorded in. What a browser can record is
 * fixed: Chrome/Firefox do WebM, Safari does MP4. Asking for a format
 * the browser cannot record falls back to one it can. */
export type VideoFormat = "webm" | "mp4";

export interface RasterExportOptions {
  fps?: number | undefined;
  scale?: number | undefined;
  /** Hex colour, or "none" for transparent (GIF fills white instead). */
  canvasBg?: string | undefined;
  loop?: boolean | undefined;
  speed?: number | undefined;
  filename?: string | undefined;
  videoFormat?: VideoFormat | undefined;
  onProgress?: ((done: number, total: number, stage: string) => void) | undefined;
}

export interface RasterExportResult {
  blob: Blob;
  filename: string;
  mime: string;
}

/** Longest side of a raster export, in pixels. Templates top out at 1080. */
const MAX_SIDE = 1080;

function slug(s: string): string {
  return (s || "animation")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** How many frames a raster export renders. At least one, even for a 0ms clip. */
export function rasterFrameCount(durationMs: number, fps: number): number {
  const duration = Number.isFinite(durationMs) ? Math.max(0, durationMs) : 0;
  const rate = Math.max(1, Math.round(fps) || 1);
  return Math.max(1, Math.round((duration / 1000) * rate));
}

/** Normalised time of frame i. A looping clip samples [0, 1) so the last
    frame does not duplicate the first; a one-shot clip samples [0, 1] so
    it ends on its final pose. */
export function frameTime(index: number, frames: number, loop: boolean): number {
  if (frames <= 1) return 0;
  if (loop) return index / frames;
  return index / (frames - 1);
}

/** Artboard size from the artwork's viewBox, else width/height attrs, else 800x800. */
export function artboardSize(svg: string): { width: number; height: number } {
  const vb =
    /viewBox\s*=\s*["']\s*([-\d.eE+]+)\s+([-\d.eE+]+)\s+([\d.eE+]+)\s+([\d.eE+]+)\s*["']/i.exec(
      svg,
    );
  if (vb) {
    const w = Number(vb[3]);
    const h = Number(vb[4]);
    if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) {
      return { width: w, height: h };
    }
  }
  const wMatch = /\swidth\s*=\s*["']([\d.]+)["']/i.exec(svg);
  const hMatch = /\sheight\s*=\s*["']([\d.]+)["']/i.exec(svg);
  const w = wMatch ? Number(wMatch[1]) : NaN;
  const h = hMatch ? Number(hMatch[1]) : NaN;
  if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) {
    return { width: w, height: h };
  }
  return { width: 800, height: 800 };
}

function exportSize(anim: MotionAnimation, scale: number | undefined): {
  width: number;
  height: number;
} {
  const base = artboardSize(sanitizeSvg(anim.svg));
  const s = Math.max(0.1, scale ?? 1);
  let width = Math.max(1, Math.round(base.width * s));
  let height = Math.max(1, Math.round(base.height * s));
  const longest = Math.max(width, height);
  if (longest > MAX_SIDE) {
    const k = MAX_SIDE / longest;
    width = Math.max(1, Math.round(width * k));
    height = Math.max(1, Math.round(height * k));
  }
  return { width, height };
}

function playDurationMs(anim: MotionAnimation, speed: number | undefined): number {
  const raw = Number.isFinite(anim.duration) ? anim.duration : 2000;
  return Math.max(100, raw / Math.max(0.1, speed ?? 1));
}

/** Poses the artwork and rasterizes one frame onto a canvas. One renderer
    is reused for every frame: applyAt clears the previous pose first. */
class FrameRenderer {
  private host: HTMLDivElement;
  private svgEl: SVGSVGElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private bg: string | null;

  constructor(anim: MotionAnimation, width: number, height: number, bg: string | null) {
    this.host = document.createElement("div");
    this.host.innerHTML = sanitizeSvg(anim.svg);
    const svgEl = this.host.querySelector("svg");
    if (!svgEl) {
      throw new Error("This animation has no SVG artwork to export.");
    }
    svgEl.setAttribute("width", String(width));
    svgEl.setAttribute("height", String(height));
    if (!svgEl.getAttribute("xmlns")) {
      svgEl.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    }
    this.svgEl = svgEl;
    this.canvas = document.createElement("canvas");
    this.canvas.width = width;
    this.canvas.height = height;
    const ctx = this.canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      throw new Error("This browser could not create a 2D canvas for export.");
    }
    this.ctx = ctx;
    this.bg = bg;
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  /** Pose at time t and draw the frame. Throws a plain-English error when
      the browser refuses to rasterize (usually an external image or font
      in the artwork, which would taint the canvas). */
  async draw(t: number, tracks: Track[]): Promise<void> {
    applyAt(this.host, tracks, t);
    const markup = new XMLSerializer().serializeToString(this.svgEl);
    const url = URL.createObjectURL(
      new Blob([markup], { type: "image/svg+xml;charset=utf-8" }),
    );
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      const { ctx, canvas } = this;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (this.bg) {
        ctx.fillStyle = this.bg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    } catch {
      throw new Error(
        "Could not draw a frame — this animation may contain an external image or font the browser will not rasterize. Try removing linked images first.",
      );
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  readPixels(): ImageData {
    return this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
  }
}

async function exportGif(
  anim: MotionAnimation,
  options: RasterExportOptions | undefined,
  size: { width: number; height: number },
  bg: string,
): Promise<Blob> {
  // gifenc is loaded on demand so the GIF encoder stays out of the main
  // bundle until someone actually exports a GIF.
  const { GIFEncoder, applyPalette, quantize } = await import("gifenc");
  const fps = clamp(Math.round(options?.fps ?? 15), 10, 30);
  const durationMs = playDurationMs(anim, options?.speed);
  const frames = rasterFrameCount(durationMs, fps);
  const delay = Math.round(1000 / fps);
  const loop = options?.loop ?? anim.loop;
  const renderer = new FrameRenderer(anim, size.width, size.height, bg);
  const gif = GIFEncoder();
  for (let i = 0; i < frames; i++) {
    await renderer.draw(frameTime(i, frames, loop), anim.tracks ?? []);
    const { data } = renderer.readPixels();
    const palette = quantize(data, 256);
    const index = applyPalette(data, palette);
    gif.writeFrame(index, size.width, size.height, {
      palette,
      delay,
      // The loop extension is written with the first frame only.
      ...(i === 0 ? { repeat: loop ? 0 : -1 } : {}),
    });
    options?.onProgress?.(i + 1, frames, "Rendering GIF…");
  }
  gif.finish();
  return new Blob([gif.bytes() as BlobPart], { type: "image/gif" });
}

function isMimeSupported(mime: string): boolean {
  if (typeof MediaRecorder === "undefined") return false;
  try {
    return MediaRecorder.isTypeSupported(mime);
  } catch {
    // isTypeSupported throwing means "not supported" here.
    return false;
  }
}

/** Video containers this browser can actually record, in preference
 * order. Empty where MediaRecorder does not exist (Node, old browsers). */
export function supportedVideoFormats(): VideoFormat[] {
  const formats: VideoFormat[] = [];
  if (isMimeSupported("video/webm")) formats.push("webm");
  if (isMimeSupported("video/mp4")) formats.push("mp4");
  return formats;
}

function pickVideoMimeType(preferred?: VideoFormat): string {
  if (typeof MediaRecorder === "undefined") return "";
  const webm = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];
  const mp4 = ["video/mp4;codecs=avc1", "video/mp4"];
  const ordered = preferred === "mp4" ? [...mp4, ...webm] : [...webm, ...mp4];
  for (const candidate of ordered) {
    if (isMimeSupported(candidate)) return candidate;
  }
  return "";
}

async function exportVideo(
  anim: MotionAnimation,
  options: RasterExportOptions | undefined,
  size: { width: number; height: number },
  bg: string | null,
): Promise<{ blob: Blob; mime: string }> {
  if (typeof MediaRecorder === "undefined") {
    throw new Error(
      "Video export needs MediaRecorder, which this browser does not support.",
    );
  }
  const fps = clamp(Math.round(options?.fps ?? 30), 15, 60);
  const durationMs = playDurationMs(anim, options?.speed);
  const frames = rasterFrameCount(durationMs, fps);
  const frameMs = 1000 / fps;
  const loop = options?.loop ?? anim.loop;
  const renderer = new FrameRenderer(anim, size.width, size.height, bg);
  const canvas = renderer.getCanvas();
  if (typeof canvas.captureStream !== "function") {
    throw new Error(
      "Video export needs canvas capture, which this browser does not support.",
    );
  }
  // captureStream(0) + requestFrame captures exactly one frame per draw,
  // so no frame is dropped or duplicated. Browsers without requestFrame
  // (Safari) fall back to a live fps stream and the same paced draws.
  const stream = canvas.captureStream(0);
  const track = stream.getVideoTracks()[0];
  if (!track) {
    throw new Error("This browser could not capture the export canvas.");
  }
  const requestFrame = (
    track as unknown as { requestFrame?: () => void }
  ).requestFrame;
  const canRequestFrame = typeof requestFrame === "function";
  const mimeType = pickVideoMimeType(options?.videoFormat);
  const recorder = new MediaRecorder(
    stream,
    mimeType
      ? { mimeType, videoBitsPerSecond: 8_000_000 }
      : { videoBitsPerSecond: 8_000_000 },
  );
  const chunks: Blob[] = [];
  recorder.ondataavailable = (event: BlobEvent) => {
    if (event.data.size > 0) chunks.push(event.data);
  };
  const stopped = new Promise<void>((resolve, reject) => {
    recorder.onstop = () => resolve();
    recorder.onerror = () =>
      reject(new Error("Video recording failed in this browser."));
  });
  // A timeslice keeps data flowing even if stop is delayed.
  recorder.start(250);
  try {
    for (let i = 0; i < frames; i++) {
      await renderer.draw(frameTime(i, frames, loop), anim.tracks ?? []);
      if (canRequestFrame) requestFrame.call(track);
      options?.onProgress?.(i + 1, frames, "Recording video…");
      if (i < frames - 1) await sleep(frameMs);
    }
    // Let the last frame play for a full frame before stopping, so the
    // video ends on it instead of cutting it short.
    await sleep(frameMs);
  } finally {
    if (recorder.state !== "inactive") recorder.stop();
  }
  await stopped;
  track.stop();
  return {
    blob: new Blob(chunks, { type: recorder.mimeType || "video/webm" }),
    mime: recorder.mimeType || "video/webm",
  };
}

export async function exportRaster(
  anim: MotionAnimation,
  kind: RasterExportKind,
  options?: RasterExportOptions,
): Promise<RasterExportResult> {
  const size = exportSize(anim, options?.scale);
  const name = slug(options?.filename?.trim() || anim.title);
  const bg =
    options?.canvasBg && options.canvasBg !== "none" ? options.canvasBg : null;
  if (kind === "gif") {
    // GIFs have no transparency support here, so a transparent canvas is
    // filled white rather than silently producing a black background.
    const blob = await exportGif(anim, options, size, bg ?? "#ffffff");
    return { blob, filename: `${name}.gif`, mime: "image/gif" };
  }
  const { blob, mime } = await exportVideo(anim, options, size, bg);
  const ext = mime.includes("mp4") ? "mp4" : "webm";
  return { blob, filename: `${name}.${ext}`, mime };
}
