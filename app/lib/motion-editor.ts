import { useSyncExternalStore } from "react";
import type { Property, Track } from "../../lib/motion";

export interface MotionEditorSnapshot {
  tracks: Track[];
  time: number;
  duration: number;
}

export interface MotionEditorActions {
  addProperty: (
    target: string,
    property: Property,
    initialValue?: number | string,
  ) => void;
  removeProperty: (target: string, property: Property) => void;
  setValueAtTime: (
    target: string,
    property: Property,
    value: number | string,
    at: number,
  ) => void;
  addKeyframe: (target: string, property: Property, at: number) => void;
  removeKeyframe: (target: string, property: Property, at: number) => void;
}

const EMPTY_SNAPSHOT: MotionEditorSnapshot = {
  tracks: [],
  time: 0,
  duration: 2000,
};

let snapshot: MotionEditorSnapshot = EMPTY_SNAPSHOT;
let actions: MotionEditorActions | null = null;
let lastNotifyAt = 0;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

export function publishMotionEditor(next: MotionEditorSnapshot) {
  const tracksChanged = next.tracks !== snapshot.tracks;
  const durationChanged = next.duration !== snapshot.duration;
  const now =
    typeof performance !== "undefined" ? performance.now() : Date.now();

  // Scrubbing and playback update time at 60fps. Structural edits notify
  // immediately; time-only updates are throttled so the properties panel does
  // not re-render on every frame.
  if (!tracksChanged && !durationChanged && now - lastNotifyAt < 70) return;

  snapshot = { ...next };
  lastNotifyAt = now;
  notify();
}

export function resetMotionEditor() {
  snapshot = EMPTY_SNAPSHOT;
  lastNotifyAt = 0;
  notify();
}

export function setMotionEditorActions(next: MotionEditorActions | null) {
  actions = next;
}

export function getMotionEditorActions(): MotionEditorActions | null {
  return actions;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return snapshot;
}

export function useMotionEditorSnapshot(): MotionEditorSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
