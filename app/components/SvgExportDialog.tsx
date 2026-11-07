import * as React from "react";
import { IconDownload, IconX, IconCopy, IconCheck } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toAnimatedSvg } from "../../lib/motion";
import type { MotionAnimation } from "../../lib/motion";
import type { RasterExportOptions } from "../../lib/raster-export";

export interface SvgExportOptions {
  type: "js" | "css";
  hyperlink: string;
  responsive: boolean;
  canvasBg: string; // hex or "none"
  loop: boolean;
  speed: number;
  trigger: "load" | "hover";
  scale: number;
  minify: boolean;
  includeMetadata: boolean;
  filename: string;
  frameRate: number;
  // New optimization options
  optimize: boolean;
  precision: number;
  removeViewBox: boolean;
  removeDimensions: boolean;
  normalizeViewBox: boolean;
  removeDefaults: boolean;
  cleanupIds: boolean;
  // Accessibility
  title: string;
  description: string;
  addAriaLabels: boolean;
}

interface Props {
  open: boolean;
  svg: string;
  title: string;
  duration: number;
  tracks: any[];
  loop: boolean;
  onClose: () => void;
  onExport: (format: "svg" | "webcss" | "js" | "copy", options: SvgExportOptions) => void;
  /** Raster export (GIF / video) is async and reports progress, so it gets
      its own callback instead of sharing the sync onExport path. */
  onExportRaster?: (
    kind: "gif" | "video",
    options: RasterExportOptions,
  ) => Promise<void>;
}

const QUALITY_PRESETS = {
  web: {
    label: "Web Optimized",
    optimize: true,
    precision: 2,
    minify: true,
    removeDefaults: true,
    cleanupIds: true,
    removeDimensions: false,
  },
  production: {
    label: "Production",
    optimize: true,
    precision: 1,
    minify: true,
    removeDefaults: true,
    cleanupIds: true,
    removeDimensions: false,
  },
  icon: {
    label: "Icon",
    optimize: true,
    precision: 2,
    removeDimensions: true,
    removeDefaults: true,
    cleanupIds: true,
    minify: true,
  },
  unoptimized: {
    label: "Unoptimized",
    optimize: false,
    precision: 3,
    minify: false,
    removeDefaults: false,
    cleanupIds: false,
    removeDimensions: false,
  },
};

export function SvgExportDialog({ open, svg, title, duration, tracks, loop: loopProp, onClose, onExport, onExportRaster }: Props) {
  const [format, setFormat] = React.useState<"svg" | "webcss" | "js" | "copy" | "gif" | "video">("svg");
  const [preset, setPreset] = React.useState<keyof typeof QUALITY_PRESETS>("web");
  const [hyperlink, setHyperlink] = React.useState("");
  const [responsive, setResponsive] = React.useState(true);
  const [canvasBg, setCanvasBg] = React.useState("#ffffff");
  const [bgNone, setBgNone] = React.useState(false);
  const [loop, setLoop] = React.useState(loopProp ?? true);
  const [speed, setSpeed] = React.useState(1);
  const [trigger, setTrigger] = React.useState<"load" | "hover">("load");
  const [scale, setScale] = React.useState(1);
  const [minify, setMinify] = React.useState(true);
  const [includeMetadata, setIncludeMetadata] = React.useState(true);
  const [filename, setFilename] = React.useState(title || "animation");
  const [frameRate, setFrameRate] = React.useState(60);
  
  // Optimization
  const [optimize, setOptimize] = React.useState(true);
  const [precision, setPrecision] = React.useState(2);
  const [removeViewBox, setRemoveViewBox] = React.useState(false);
  const [removeDimensions, setRemoveDimensions] = React.useState(false);
  const [normalizeViewBox, setNormalizeViewBox] = React.useState(true);
  const [removeDefaults, setRemoveDefaults] = React.useState(true);
  const [cleanupIds, setCleanupIds] = React.useState(true);
  
  // Accessibility
  const [svgTitle, setSvgTitle] = React.useState(title || "");
  const [description, setDescription] = React.useState("");
  const [addAriaLabels, setAddAriaLabels] = React.useState(false);
  
  
  const [copied, setCopied] = React.useState(false);
  // Raster (GIF / video) export runs async and takes seconds, so the dialog
  // stays open with progress instead of closing on click.
  const [rasterBusy, setRasterBusy] = React.useState(false);
  const [rasterProgress, setRasterProgress] = React.useState<{
    done: number;
    total: number;
    stage: string;
  } | null>(null);
  const [rasterError, setRasterError] = React.useState<string | null>(null);
  const [estimatedSize, setEstimatedSize] = React.useState({ original: 0, optimized: 0 });

  React.useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  React.useEffect(() => {
    // Estimate file sizes based on optimization settings
    const original = new Blob([svg]).size;
    let estimatedSavings = 0;
    
    if (optimize) {
      // Base optimization saves ~20%
      estimatedSavings = 0.20;
      
      // Higher precision saves more
      if (precision <= 1) estimatedSavings += 0.15;
      else if (precision === 2) estimatedSavings += 0.10;
      
      // Minification saves ~10%
      if (minify) estimatedSavings += 0.10;
      
      // ID cleanup saves ~5%
      if (cleanupIds) estimatedSavings += 0.05;
      
      // Remove defaults saves ~3%
      if (removeDefaults) estimatedSavings += 0.03;
      
      // Cap at 60% max savings
      estimatedSavings = Math.min(0.60, estimatedSavings);
    }
    
    const optimizedGuess = Math.round(original * (1 - estimatedSavings));
    setEstimatedSize({ original, optimized: optimizedGuess });
  }, [svg, optimize, precision, minify, cleanupIds, removeDefaults]);

  React.useEffect(() => {
    // Apply preset
    const p = QUALITY_PRESETS[preset];
    setOptimize(p.optimize);
    setPrecision(p.precision);
    setMinify(p.minify ?? false);
    setRemoveDefaults(p.removeDefaults ?? false);
    setCleanupIds(p.cleanupIds ?? false);
    setRemoveDimensions(p.removeDimensions ?? false);
  }, [preset]);

  // Generate animated preview SVG
  const animatedPreviewSvg = React.useMemo(() => {
    const animation: MotionAnimation = {
      id: "preview",
      title: title || "Preview",
      svg,
      tracks,
      duration,
      loop,
    };
    return toAnimatedSvg(animation, { speed: 1 });
  }, [svg, tracks, duration, loop, title]);

  if (!open) return null;

  const isAnimated = format !== "copy";
  const isRaster = format === "gif" || format === "video";
  const showResponsive = format === "webcss" || format === "js";
  
  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };
  
  const savings = estimatedSize.original > 0 
    ? Math.round(((estimatedSize.original - estimatedSize.optimized) / estimatedSize.original) * 100)
    : 0;

  const handleCopyToClipboard = async () => {
    try {
      // Copy the animated export, not the raw artwork — the raw SVG has no
      // animation in it, so copying it silently dropped the motion.
      await navigator.clipboard.writeText(animatedPreviewSvg);
      setCopied(true);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleFormatChange = (value: typeof format) => {
    setFormat(value);
    // Raster formats render at fixed frame rates — pick the sensible
    // default instead of leaving the 60 fps JS default, which would make
    // a huge GIF.
    if (value === "gif") setFrameRate(15);
    if (value === "video") setFrameRate(30);
    // Raster exports always need dimensions (the Scale slider) — a
    // leftover "remove dimensions" would hide it.
    if (value === "gif" || value === "video") setRemoveDimensions(false);
    setRasterError(null);
  };

  const handleRasterExport = async (kind: "gif" | "video") => {
    if (!onExportRaster) {
      setRasterError("GIF / video export is not wired up in this build.");
      return;
    }
    setRasterError(null);
    setRasterBusy(true);
    setRasterProgress({ done: 0, total: 1, stage: "Starting…" });
    try {
      await onExportRaster(kind, {
        fps:
          kind === "gif"
            ? Math.min(Math.max(frameRate, 10), 30)
            : Math.min(Math.max(frameRate, 15), 60),
        scale,
        canvasBg: bgNone ? "none" : canvasBg,
        loop,
        speed,
        filename,
        onProgress: (done, total, stage) =>
          setRasterProgress({ done, total, stage }),
      });
      onClose();
    } catch (err) {
      setRasterError(err instanceof Error ? err.message : "Export failed.");
    } finally {
      setRasterBusy(false);
      setRasterProgress(null);
    }
  };

  const handleExportClick = () => {
    if (format === "copy") {
      handleCopyToClipboard();
      return;
    }
    if (format === "gif" || format === "video") {
      void handleRasterExport(format);
      return;
    }

    onExport(format, {
      type: format === "webcss" ? "css" : "js",
      hyperlink,
      responsive,
      canvasBg: bgNone ? "none" : canvasBg,
      loop,
      speed,
      trigger,
      scale,
      minify,
      includeMetadata,
      filename,
      frameRate,
      optimize,
      precision,
      removeViewBox,
      removeDimensions,
      normalizeViewBox,
      removeDefaults,
      cleanupIds,
      title: svgTitle,
      description,
      addAriaLabels,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex h-[85vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-border bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <div>
            <h2 className="text-base font-semibold">Export Animation</h2>
            <p className="text-xs text-muted-foreground">Configure export settings and download</p>
          </div>
          <button 
            onClick={onClose} 
            className="grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <IconX className="size-4" />
          </button>
        </div>
        
        <div className="flex min-h-0 flex-1">
          {/* Left: preview */}
          <div className="flex flex-1 flex-col border-r border-border bg-muted/30">
            {/* Preview area - takes all available space */}
            <div className="flex flex-1 items-center justify-center overflow-auto p-12">
              <style>{`.export-preview svg { max-width: 100%; max-height: 100%; width: auto; height: auto; }`}</style>
              <div className="export-preview flex max-h-full max-w-full items-center justify-center" dangerouslySetInnerHTML={{ __html: animatedPreviewSvg }} />
            </div>
            
            {/* Stats bar at bottom */}
            <div className="shrink-0 border-t border-border bg-background px-6 py-3">
              <div className="flex h-10 items-center justify-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-muted-foreground">Duration:</span>
                  <span className="font-semibold">{(duration / 1000).toFixed(2)}s</span>
                </div>
                <span className="text-muted-foreground">•</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-muted-foreground">Size:</span>
                  <span className="font-semibold">{formatBytes(estimatedSize.original)}</span>
                  {optimize && savings > 0 && (
                    <>
                      <span className="text-muted-foreground">→</span>
                      <span className="font-semibold text-green-600 dark:text-green-400">
                        {formatBytes(estimatedSize.optimized)}
                      </span>
                      <span className="rounded-full bg-green-600/10 px-2 py-0.5 text-xs font-bold text-green-600 dark:text-green-400">
                        -{savings}%
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Right: options */}
          <div className="w-96 shrink-0 overflow-hidden">
            <Tabs defaultValue="format" className="flex h-full flex-col">
              <TabsList className="m-4 mb-0 grid w-auto grid-cols-4 rounded-lg">
                <TabsTrigger value="format" className="text-xs">Format</TabsTrigger>
                <TabsTrigger value="quality" className="text-xs">Quality</TabsTrigger>
                <TabsTrigger value="animation" className="text-xs">Animation</TabsTrigger>
                <TabsTrigger value="advanced" className="text-xs">Advanced</TabsTrigger>
              </TabsList>
              
              <div className="min-h-0 flex-1 overflow-y-auto p-4">
                {/* FORMAT TAB */}
                <TabsContent value="format" className="mt-0 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Export Format</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {([
                        { value: "svg", label: "SVG", desc: "Optimized vector" },
                        { value: "webcss", label: "HTML+CSS", desc: "Web ready" },
                        { value: "js", label: "JavaScript", desc: "Interactive" },
                        { value: "gif", label: "GIF", desc: "Looping image" },
                        { value: "video", label: "Video", desc: "WebM / MP4" },
                        { value: "copy", label: "Copy Code", desc: "To clipboard" },
                      ] as const).map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => handleFormatChange(opt.value)}
                          className={`flex flex-col items-start rounded-lg border px-3 py-2.5 text-left transition-all ${
                            format === opt.value
                              ? "border-blue-500 bg-blue-500/10 shadow-sm"
                              : "border-border bg-background hover:border-blue-500/50 hover:bg-accent"
                          }`}
                        >
                          <span className="text-sm font-medium">{opt.label}</span>
                          <span className="text-xs text-muted-foreground">{opt.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {isRaster && (
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {format === "gif"
                        ? "GIF renders at up to 30 fps in 256 colours. A transparent background is filled with the canvas colour."
                        : "Video records in real time — a 10s animation takes about 10s. WebM in Chrome/Firefox, MP4 in Safari."}
                    </p>
                  )}

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Filename</Label>
                    <Input
                      value={filename}
                      onChange={(e) => setFilename(e.target.value)}
                      placeholder="animation"
                      className="h-9 text-sm"
                    />
                  </div>

                  {format !== "copy" && (
                    <>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Dimensions</Label>
                        <div className="space-y-2">
                          {!isRaster && (
                            <div className="flex items-center gap-2">
                              <Checkbox 
                                checked={removeDimensions} 
                                onCheckedChange={(c) => setRemoveDimensions(Boolean(c))} 
                              />
                              <Label className="text-xs font-normal">Remove width/height (responsive)</Label>
                            </div>
                          )}
                          {!removeDimensions && (
                            <div className="space-y-1.5 pl-6">
                              <div className="flex items-center justify-between">
                                <Label className="text-xs">Scale</Label>
                                <span className="text-xs text-muted-foreground">{scale}x</span>
                              </div>
                              <Slider
                                value={[scale]}
                                onValueChange={(v) => setScale(Math.max(0.5, Math.round((v[0] ?? 1) * 2) / 2))}
                                min={0.5}
                                max={4}
                                step={0.5}
                                className="w-full"
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      {!isRaster && (
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Accessibility</Label>
                        <Input
                          value={svgTitle}
                          onChange={(e) => setSvgTitle(e.target.value)}
                          placeholder="Title (for screen readers)"
                          className="h-9 text-sm"
                        />
                        <Input
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="Description (optional)"
                          className="h-9 text-sm"
                        />
                        <div className="flex items-center gap-2">
                          <Checkbox 
                            checked={addAriaLabels} 
                            onCheckedChange={(c) => setAddAriaLabels(Boolean(c))} 
                          />
                          <Label className="text-xs font-normal">Add ARIA labels</Label>
                        </div>
                        </div>
                      )}
                    </>
                  )}
                </TabsContent>

                {/* QUALITY TAB */}
                <TabsContent value="quality" className="mt-0 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Quality Preset</Label>
                    <Select value={preset} onValueChange={(v) => setPreset(v as keyof typeof QUALITY_PRESETS)}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(QUALITY_PRESETS).map(([key, { label }]) => (
                          <SelectItem key={key} value={key} className="text-sm">
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        checked={optimize} 
                        onCheckedChange={(c) => setOptimize(Boolean(c))} 
                      />
                      <Label className="text-sm font-medium">Optimize SVG</Label>
                    </div>
                    {optimize && (
                      <div className="space-y-3 pl-6">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs">Decimal precision</Label>
                            <span className="text-xs text-muted-foreground">{precision}</span>
                          </div>
                          <Slider
                            value={[precision]}
                            onValueChange={(v) => setPrecision(Math.round(v[0] ?? 2))}
                            min={1}
                            max={4}
                            step={1}
                            className="w-full"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox 
                            checked={normalizeViewBox} 
                            onCheckedChange={(c) => setNormalizeViewBox(Boolean(c))} 
                          />
                          <Label className="text-xs font-normal">Normalize viewBox</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox 
                            checked={cleanupIds} 
                            onCheckedChange={(c) => setCleanupIds(Boolean(c))} 
                          />
                          <Label className="text-xs font-normal">Cleanup IDs & classes</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox 
                            checked={removeDefaults} 
                            onCheckedChange={(c) => setRemoveDefaults(Boolean(c))} 
                          />
                          <Label className="text-xs font-normal">Remove default attributes</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox 
                            checked={minify} 
                            onCheckedChange={(c) => setMinify(Boolean(c))} 
                          />
                          <Label className="text-xs font-normal">Minify output</Label>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="rounded-lg border border-border bg-muted/30 p-3">
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Original size:</span>
                        <span className="font-medium">{formatBytes(estimatedSize.original)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Optimized size:</span>
                        <span className="font-medium text-green-600 dark:text-green-400">
                          {formatBytes(estimatedSize.optimized)}
                        </span>
                      </div>
                      {savings > 0 && (
                        <div className="pt-1">
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                            <div 
                              className="h-full bg-green-600 transition-all" 
                              style={{ width: `${savings}%` }}
                            />
                          </div>
                          <p className="mt-1 text-center font-medium text-green-600 dark:text-green-400">
                            {savings}% smaller
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>

                {/* ANIMATION TAB */}
                <TabsContent value="animation" className="mt-0 space-y-4">
                  {format !== "copy" && (
                    <>
                      <div className="flex items-center gap-2">
                        <Checkbox checked={loop} onCheckedChange={(c) => setLoop(Boolean(c))} />
                        <Label className="text-sm font-medium">Loop animation</Label>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium">Playback speed</Label>
                          <span className="text-xs text-muted-foreground">{speed.toFixed(1)}x</span>
                        </div>
                        <Slider
                          value={[speed]}
                          onValueChange={(v) => setSpeed(Math.max(0.1, Math.round((v[0] ?? 1) * 10) / 10))}
                          min={0.1}
                          max={3}
                          step={0.1}
                          className="w-full"
                        />
                      </div>

                      {!isRaster && (
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Start trigger</Label>
                          <Select value={trigger} onValueChange={(v) => setTrigger(v as "load" | "hover")}>
                            <SelectTrigger className="h-9 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="load" className="text-sm">On page load</SelectItem>
                              <SelectItem value="hover" className="text-sm">On mouse hover</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium">Frame rate</Label>
                          <span className="text-xs text-muted-foreground">{frameRate} fps</span>
                        </div>
                        <Slider
                          value={[frameRate]}
                          onValueChange={(v) => setFrameRate(Math.max(15, Math.round(v[0] ?? 60)))}
                          min={15}
                          max={120}
                          step={15}
                          className="w-full"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Canvas background</Label>
                        <div className="flex items-center gap-3">
                          <Checkbox checked={bgNone} onCheckedChange={(c) => setBgNone(Boolean(c))} />
                          <span className="text-xs text-muted-foreground">Transparent</span>
                          {!bgNone && (
                            <Input
                              type="color"
                              value={canvasBg}
                              onChange={(e) => setCanvasBg(e.target.value)}
                              className="h-9 w-16 cursor-pointer p-1"
                            />
                          )}
                        </div>
                      </div>

                      {showResponsive && !isRaster && (
                        <div className="flex items-center gap-2">
                          <Checkbox checked={responsive} onCheckedChange={(c) => setResponsive(Boolean(c))} />
                          <Label className="text-sm font-medium">Responsive sizing</Label>
                        </div>
                      )}

                      {!isRaster && (
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Hyperlink (optional)</Label>
                          <Input
                            value={hyperlink}
                            onChange={(e) => setHyperlink(e.target.value)}
                            placeholder="https://example.com"
                            className="h-9 text-sm"
                          />
                        </div>
                      )}
                    </>
                  )}
                </TabsContent>

                {/* ADVANCED TAB */}
                <TabsContent value="advanced" className="mt-0 space-y-4">
                  <p className="text-xs text-muted-foreground">Advanced export options that were never implemented (colour format, CSS variables, external CSS) were removed — the controls above are the ones that actually affect the export.</p>

                  <div className="flex items-center gap-2">
                    <Checkbox 
                      checked={removeViewBox} 
                      onCheckedChange={(c) => setRemoveViewBox(Boolean(c))} 
                    />
                    <Label className="text-sm font-medium">Remove viewBox</Label>
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox 
                      checked={includeMetadata} 
                      onCheckedChange={(c) => setIncludeMetadata(Boolean(c))} 
                    />
                    <Label className="text-sm font-medium">Include metadata</Label>
                  </div>

                  <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      <span className="font-medium">Note:</span> These settings are for advanced users and may affect compatibility with certain tools.
                    </p>
                  </div>
                </TabsContent>
              </div>
              
              <div className="shrink-0 border-t border-border px-4 py-3">
                {rasterProgress && (
                  <div className="mb-2 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{rasterProgress.stage}</span>
                      <span className="font-medium">
                        {rasterProgress.done}/{rasterProgress.total}
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-blue-600 transition-all"
                        style={{ width: `${Math.round((rasterProgress.done / Math.max(1, rasterProgress.total)) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}
                {rasterError && (
                  <p className="mb-2 text-xs leading-relaxed text-red-600 dark:text-red-400">{rasterError}</p>
                )}
                <div className="flex gap-2">
                  {format !== "copy" && (
                    <Button
                      variant="outline"
                      className="h-10 flex-1"
                      onClick={handleCopyToClipboard}
                    >
                      {copied ? (
                        <>
                          <IconCheck className="mr-2 size-4" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <IconCopy className="mr-2 size-4" />
                          Copy
                        </>
                      )}
                    </Button>
                  )}
                  <Button
                    className="h-10 flex-1 bg-blue-600 text-white hover:bg-blue-700"
                    onClick={handleExportClick}
                    disabled={rasterBusy}
                  >
                    {format === "copy" ? (
                      <>
                        <IconCopy className="mr-2 size-4" />
                        {copied ? "Copied!" : "Copy to Clipboard"}
                      </>
                    ) : (
                      <>
                        <IconDownload className="mr-2 size-4" />
                        {rasterBusy
                          ? "Exporting…"
                          : `Export ${format === "video" ? "Video" : format.toUpperCase()}`}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}