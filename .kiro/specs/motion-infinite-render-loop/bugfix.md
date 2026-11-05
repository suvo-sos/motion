# Bugfix Requirements Document

## Introduction

The motion studio route (`/motion?id=<id>`) experiences a critical infinite render loop causing "Maximum update depth exceeded" errors. The animation playback system triggers continuous re-renders when the animation data is polled, making the studio unusable. This bug affects all users attempting to view or edit animations in the motion studio.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the motion studio loads an animation THEN the system triggers infinite re-renders with "Maximum update depth exceeded" errors originating from requestAnimationFrame callbacks

1.2 WHEN the animation query refetches data (every 3 seconds) THEN the system re-runs animation effects with the new animation object reference even when SVG content is unchanged

1.3 WHEN the `applyAt` useEffect depends on `animation.svg` THEN the system re-executes the effect on every animation object recreation

1.4 WHEN multiple useEffect hooks depend on `animation?.id` and `animation?.updatedAt` simultaneously THEN the system creates a cascade of state updates

1.5 WHEN the console logs "🎨 Animation loaded: Object" THEN the system outputs this message hundreds of times indicating repeated effect execution

1.6 WHEN the error "flushSync was called from inside a lifecycle method" occurs THEN the system indicates improper synchronous state updates during render

### Expected Behavior (Correct)

2.1 WHEN the motion studio loads an animation THEN the system SHALL load the animation once and render smoothly without infinite loops

2.2 WHEN the animation query refetches unchanged data THEN the system SHALL NOT re-execute animation effects if SVG content is identical

2.3 WHEN the `applyAt` useEffect needs SVG dependency THEN the system SHALL use a stable reference or memoized value that only changes when content actually changes

2.4 WHEN multiple useEffect hooks track animation state THEN the system SHALL use stable dependencies that don't create cascading updates

2.5 WHEN animation data is loaded THEN the system SHALL log "🎨 Animation loaded" only once per unique animation load

2.6 WHEN state updates occur during animation playback THEN the system SHALL batch updates properly without triggering synchronous flushSync errors

### Unchanged Behavior (Regression Prevention)

3.1 WHEN an animation's SVG content actually changes (user edit, agent update) THEN the system SHALL CONTINUE TO re-render the artboard with the new content

3.2 WHEN the animation playback system uses requestAnimationFrame THEN the system SHALL CONTINUE TO smoothly animate the timeline and update visual properties

3.3 WHEN the user switches between different animation IDs THEN the system SHALL CONTINUE TO load and display the newly selected animation

3.4 WHEN the polling interval refetches animation data THEN the system SHALL CONTINUE TO detect and apply legitimate updates from external sources

3.5 WHEN the optimistic SVG preview system updates `previewSvg` THEN the system SHALL CONTINUE TO show immediate feedback for property edits

3.6 WHEN the user interacts with timeline controls (play, pause, scrub) THEN the system SHALL CONTINUE TO respond immediately without performance degradation

3.7 WHEN hidden/locked element states are managed THEN the system SHALL CONTINUE TO persist these states across re-renders

3.8 WHEN elements need stable IDs for selection THEN the system SHALL CONTINUE TO auto-generate IDs for unnamed elements
