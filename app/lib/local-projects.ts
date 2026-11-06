import { useEffect, useState } from "react";

import type { MotionAnimation, Track } from "../../lib/motion";
import { sanitizeSvg } from "../../lib/sanitize";

/**
 * Hackathon storage: the project library lives in the browser, not the server.
 *
 * The deployed Postgres is only a short-lived scratchpad for the agent (it
 * writes a freshly generated animation so the studio can pick it up). Every
 * project the user keeps is stored here, in localStorage. Clearing browser
 * data clears the library — that is intentional: we do not keep user data.
 */
export interface LocalProject extends MotionAnimation {
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SaveLocalProjectInput {
  id?: string;
  title: string;
  svg: string;
  tracks: Track[];
  duration: number;
  loop: boolean;
}

const STORAGE_KEY = "motion-studio-projects:v1";
const BACKUP_KEY = "motion-studio-projects:v1.backup";
const CORRUPT_KEY_PREFIX = "motion-studio-projects:v1.corrupt-";
const CHANGE_EVENT = "motion-studio-projects:change";

/**
 * Set when the stored library fails to parse or validate. While set,
 * writeProjects() refuses to write, so a corruption-read [] can never be
 * treated as an empty library that the next save overwrites. The raw value
 * is preserved under a `motion-studio-projects:v1.corrupt-<timestamp>` key
 * (see quarantineCorruptLibrary) and the original is left in place, so the
 * corruption is re-detected after a reload until the stored value is fixed.
 * A successful read clears the flag.
 */
let libraryCorrupt = false;
let corruptBackupKey: string | null = null;
let lastQuarantinedRaw: string | null = null;

export function isLocalLibraryCorrupt(): boolean {
  return libraryCorrupt;
}

export function getLocalLibraryCorruptBackupKey(): string | null {
  return corruptBackupKey;
}

/**
 * Hackathon switch. The DB actions, tables, and agent integration stay in the
 * repo, but this build does not write projects to Postgres. Set this to `true`
 * to restore the server scratchpad (agent-created projects + live agent reads).
 */
const SERVER_SCRATCHPAD_ENABLED = true;

export function isServerScratchpadEnabled(): boolean {
  return SERVER_SCRATCHPAD_ENABLED;
}

function hasStorage(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return Boolean(window.localStorage);
  } catch {
    return false;
  }
}

function isLocalProject(value: unknown): value is LocalProject {
  if (!value || typeof value !== "object") return false;
  const row = value as Partial<LocalProject>;
  return (
    typeof row.id === "string" &&
    typeof row.title === "string" &&
    typeof row.svg === "string" &&
    Array.isArray(row.tracks) &&
    typeof row.duration === "number" &&
    typeof row.loop === "boolean" &&
    typeof row.createdAt === "string" &&
    typeof row.updatedAt === "string"
  );
}

function quarantineCorruptLibrary(raw: string): void {
  libraryCorrupt = true;
  // Quarantine each distinct raw value once; every read re-detects the same
  // corrupt value, and without this guard each read would mint a new key.
  if (raw === lastQuarantinedRaw) return;
  lastQuarantinedRaw = raw;
  try {
    // Each quarantine is a full copy of the library. Keep only the newest
    // one: older copies are dead weight that can push storage over quota
    // and make every later save fail with "Browser storage is full".
    const stale: string[] = [];
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (key && key.startsWith(CORRUPT_KEY_PREFIX)) stale.push(key);
    }
    for (const key of stale) window.localStorage.removeItem(key);
    const key = `${CORRUPT_KEY_PREFIX}${Date.now()}`;
    window.localStorage.setItem(key, raw);
    corruptBackupKey = key;
  } catch {
    // Backup is best-effort; the original value is left in place, so the
    // corruption is re-detected (and re-quarantined) on the next read.
  }
}

function readProjects(): LocalProject[] {
  if (!hasStorage()) return [];
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    // Any validation failure quarantines the whole stored value instead of
    // silently dropping rows: a partial read must never look like an empty
    // library that the next save overwrites.
    if (!Array.isArray(parsed) || !parsed.every(isLocalProject)) {
      quarantineCorruptLibrary(raw);
      return [];
    }
    libraryCorrupt = false;
    corruptBackupKey = null;
    return parsed;
  } catch {
    if (raw) quarantineCorruptLibrary(raw);
    else libraryCorrupt = true;
    return [];
  }
}

function sortProjects(projects: LocalProject[]): LocalProject[] {
  return [...projects].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
  });
}

function emitChange(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function writeProjects(projects: LocalProject[]): void {
  if (!hasStorage()) return;
  // Never let a corruption-read [] feed a write: if the stored library
  // failed to parse/validate, refuse to overwrite it until it is restored.
  if (libraryCorrupt) {
    throw new Error(
      "Project library is damaged and was backed up. Restore it before saving so no projects are lost.",
    );
  }
  const payload = JSON.stringify(projects);
  // Keep a last-good backup before overwriting, so a later corrupt read
  // never destroys the previous good library. Only a value that parses
  // and validates is backed up; a corrupt current value must not clobber
  // the good backup. The backup write is best-effort on its own: a backup
  // that does not fit must never fail the save itself.
  try {
    const previous = window.localStorage.getItem(STORAGE_KEY);
    if (previous) {
      try {
        const prevParsed = JSON.parse(previous) as unknown;
        if (Array.isArray(prevParsed) && prevParsed.every(isLocalProject)) {
          window.localStorage.setItem(BACKUP_KEY, previous);
        }
      } catch {
        // Unparseable current value, or a backup that does not fit:
        // leave the existing backup alone and continue to the save.
      }
    }
  } catch {
    // Reading storage failed; continue to the main write below.
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, payload);
  } catch {
    // The backup holds a full second copy of the library. Dropping it
    // frees roughly half the used space, so retry once before giving up:
    // a full disk should cost the backup, not the user's edits.
    try {
      window.localStorage.removeItem(BACKUP_KEY);
      window.localStorage.setItem(STORAGE_KEY, payload);
    } catch {
      throw new Error(
        "Browser storage is full. Delete an old project or export it before saving another.",
      );
    }
  }
  emitChange();
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function listLocalProjects(): LocalProject[] {
  return sortProjects(readProjects());
}

export function getLocalProject(id: string): LocalProject | null {
  return readProjects().find((project) => project.id === id) ?? null;
}

export function saveLocalProject(input: SaveLocalProjectInput): {
  id: string;
  updatedAt: string;
} {
  const svg = sanitizeSvg(input.svg);
  if (!svg.includes("<svg")) {
    throw new Error("Invalid SVG: missing <svg> tag");
  }

  const now = new Date().toISOString();
  const projects = readProjects();
  const id = input.id ?? newId();
  const existing = projects.find((project) => project.id === id);
  const next: LocalProject = {
    id,
    title: input.title.trim() || "Untitled animation",
    svg,
    tracks: input.tracks,
    duration: input.duration,
    loop: input.loop,
    pinned: existing?.pinned ?? false,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  writeProjects(
    existing
      ? projects.map((project) => (project.id === id ? next : project))
      : [...projects, next],
  );
  return { id, updatedAt: now };
}

export function deleteLocalProject(id: string): void {
  const projects = readProjects();
  if (!projects.some((project) => project.id === id)) return;
  writeProjects(projects.filter((project) => project.id !== id));
}

export function setLocalProjectPinned(id: string, pinned: boolean): void {
  const projects = readProjects();
  const existing = projects.find((project) => project.id === id);
  if (!existing) return;
  writeProjects(
    projects.map((project) =>
      project.id === id
        ? { ...project, pinned, updatedAt: new Date().toISOString() }
        : project,
    ),
  );
}

/**
 * Copy an animation the agent created on the server into the browser library.
 * Local edits win: a stale server copy never overwrites a newer local project.
 */
export function importLocalProject(animation: MotionAnimation & {
  pinned?: boolean;
  createdAt?: string;
  updatedAt?: string;
}): void {
  const projects = readProjects();
  const existing = projects.find((project) => project.id === animation.id);
  if (
    existing &&
    Date.parse(existing.updatedAt) >= Date.parse(animation.updatedAt ?? "0")
  ) {
    return;
  }

  const now = new Date().toISOString();
  const next: LocalProject = {
    id: animation.id,
    title: animation.title || "Untitled animation",
    svg: sanitizeSvg(animation.svg ?? ""),
    tracks: Array.isArray(animation.tracks) ? animation.tracks : [],
    duration: animation.duration ?? 2000,
    loop: animation.loop ?? true,
    pinned: existing?.pinned ?? animation.pinned ?? false,
    createdAt: existing?.createdAt ?? animation.createdAt ?? now,
    updatedAt: animation.updatedAt ?? now,
  };

  writeProjects(
    existing
      ? projects.map((project) => (project.id === next.id ? next : project))
      : [...projects, next],
  );
}

/**
 * Mirror a browser project into the server scratchpad so the agent can read
 * the current canvas. This is ephemeral: cleanup can delete old rows.
 */
export async function syncProjectToServer(id: string): Promise<void> {
  if (!SERVER_SCRATCHPAD_ENABLED) return;
  const project = getLocalProject(id);
  if (!project) return;
  try {
    const { callAction } = await import("@agent-native/core/client/hooks");
    await callAction("save-animation", {
      id: project.id,
      title: project.title,
      svg: project.svg,
      tracks: project.tracks,
      duration: project.duration,
      loop: project.loop,
    });
  } catch {
    // The browser copy is authoritative; a failed mirror must not break editing.
  }
}

const mirrorTimers = new Map<string, number>();

/** Debounced mirror for autosave paths that fire on every property edit. */
export function syncProjectToServerDebounced(
  id: string,
  delayMs = 2500,
): void {
  if (!SERVER_SCRATCHPAD_ENABLED || typeof window === "undefined") return;
  const existing = mirrorTimers.get(id);
  if (existing) window.clearTimeout(existing);
  mirrorTimers.set(
    id,
    window.setTimeout(() => {
      mirrorTimers.delete(id);
      void syncProjectToServer(id);
    }, delayMs),
  );
}

export async function deleteProjectEverywhere(id: string): Promise<void> {
  deleteLocalProject(id);
  if (!SERVER_SCRATCHPAD_ENABLED) return;
  try {
    const { callAction } = await import("@agent-native/core/client/hooks");
    await callAction("delete-animation", { id });
  } catch {
    // Local delete already succeeded.
  }
}

export function useLocalProjects(): {
  projects: LocalProject[];
  isLoading: boolean;
  isFetching: boolean;
  isCorrupt: boolean;
} {
  const [projects, setProjects] = useState<LocalProject[]>([]);
  const [ready, setReady] = useState(false);
  const [isCorrupt, setIsCorrupt] = useState(false);

  useEffect(() => {
    const update = () => {
      setProjects(listLocalProjects());
      setIsCorrupt(isLocalLibraryCorrupt());
      setReady(true);
    };
    update();
    window.addEventListener(CHANGE_EVENT, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(CHANGE_EVENT, update);
      window.removeEventListener("storage", update);
    };
  }, []);

  return { projects, isLoading: !ready, isFetching: false, isCorrupt };
}

export function useLocalProject(id: string | null): LocalProject | null {
  const [project, setProject] = useState<LocalProject | null>(null);

  useEffect(() => {
    if (!id) {
      setProject(null);
      return;
    }
    const update = () => setProject(getLocalProject(id));
    update();
    window.addEventListener(CHANGE_EVENT, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(CHANGE_EVENT, update);
      window.removeEventListener("storage", update);
    };
  }, [id]);

  return project;
}
