import * as React from "react";
import { IconDownload, IconX } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface SvgExportOptions {
  type: "js" | "css";
  hyperlink: string;
  responsive: boolean;
  canvasBg: string; // hex or "none"
  loop: boolean;
}

interface Props {
  open: boolean;
  svg: string;
  title: string;
  onClose: () => void;
  onExport: (format: "svg" | "webcss" | "js", options: SvgExportOptions) => void;
}

export function SvgExportDialog({ open, svg, title, onClose, onExport }: Props) {
  const [type, setType] = React.useState<"js" | "css">("js");
  const [hyperlink, setHyperlink] = React.useState("");
  const [responsive, setResponsive] = React.useState(true);
  const [canvasBg, setCanvasBg] = React.useState("#ffffff");
  const [bgNone, setBgNone] = React.useState(false);
  const [loop, setLoop] = React.useState(true);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="flex h-[80vh] w-[90vw] max-w-5xl flex-col overflow-hidden rounded-xl border border-border bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">Export SVG for Web</h2>
          <button onClick={onClose} className="grid size-7 place-items-center rounded text-muted-foreground hover:bg-accent hover:text-foreground">
            <IconX className="size-4" />
          </button>
        </div>
        <div className="flex min-h-0 flex-1">
          {/* Left: preview */}
          <div className="flex flex-1 items-center justify-center overflow-auto border-r border-border bg-muted/30 p-6">
            <div className="max-h-full max-w-full" dangerouslySetInnerHTML={{ __html: svg }} />
          </div>
          {/* Right: options */}
          <div className="w-80 shrink-0 space-y-4 overflow-y-auto p-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Output type</Label>
              <Select value={type} onValueChange={(v) => setType(v as "js" | "css")}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="js" className="text-xs">JavaScript (interactive)</SelectItem>
                  <SelectItem value="css" className="text-xs">CSS (lighter)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Hyperlink (wrap in &lt;a&gt;)</Label>
              <Input
                value={hyperlink}
                onChange={(e) => setHyperlink(e.target.value)}
                placeholder="https://..."
                className="h-8 text-xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={responsive} onCheckedChange={(c) => setResponsive(Boolean(c))} />
              <Label className="text-xs">Responsive sizing</Label>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Canvas background</Label>
              <div className="flex items-center gap-2">
                <Checkbox checked={bgNone} onCheckedChange={(c) => setBgNone(Boolean(c))} />
                <span className="text-xs text-muted-foreground">Transparent</span>
                {!bgNone && (
                  <Input
                    type="color"
                    value={canvasBg}
                    onChange={(e) => setCanvasBg(e.target.value)}
                    className="h-8 w-12 cursor-pointer p-1"
                  />
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={loop} onCheckedChange={(c) => setLoop(Boolean(c))} />
              <Label className="text-xs">Loop animation</Label>
            </div>
            <div className="pt-2">
              <Button
                className="w-full"
                onClick={() => {
                  onExport(type === "css" ? "webcss" : "js", {
                    type,
                    hyperlink,
                    responsive,
                    canvasBg: bgNone ? "none" : canvasBg,
                    loop,
                  });
                  onClose();
                }}
              >
                <IconDownload className="mr-2 size-4" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}