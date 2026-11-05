# Motion Studio Infinite Render Loop Bugfix Design

## Overview

The motion studio experiences an infinite render loop caused by unstable dependencies in multiple useEffect hooks that depend on `animation.svg` and other animation properties. These properties are recreated on every query refetch even when the content is unchanged, causing React to execute effects unnecessarily and leading to performance degradation and continuous re-rendering.

The bug manifests in three key areas:
1. Line 7672: `useEffect` with `animation.svg` dependency triggering `applyAt` on every animation object change
2. Lines 559-571: Debug logging effect with unstable `animation` object dependencies
3. Line 597: Title effect depending on volatile `animation?.updatedAt` property

The fix will stabilize these dependencies by:
- Using content-based comparisons instead of reference equality
- Memoizing derived values to prevent unnecessary effect executions
- Tracking only the specific properties needed rather than the entire animation object

## Glossary

- **Bug_Condition (C)**: The condition that triggers the infinite render loop - when animation properties change reference identity without content changes, causing useEffect hooks to re-execute
- **Property (P)**: The desired behavior - useEffect hooks should only execute when the actual content of animation properties changes, not when object references change
- **Preservation**: Existing animation playback, rendering, and editing behavior that must remain unchanged by the fix
- **animation object**: The MotionAnimation data structure returned by `useActionQuery("get-animation")` containing `id`, `title`, `svg`, `tracks`, `duration`, `loop`, and `updatedAt`
- **useEffect dependency**: A React hook dependency that triggers effect re-execution when its value changes (by reference equality)
- **refetchInterval**: The 3000ms polling interval that refetches animation data and creates new object references
- **applyAt function**: The function in `lib/motion.ts` that applies animation transforms to SVG elements at a specific time

## Bug Details

### Bug Condition

The bug manifests when the `get-animation` query refetches data (every 3 seconds due to `refetchInterval: 3000`) and returns a new animation object with identical content but different reference identity. This causes useEffect hooks that depend on `animation.svg`, `animation.updatedAt`, or the `animation` object itself to re-execute even though the actual content hasn't changed.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { animation: MotionAnimation | null, prevAnimation: MotionAnimation | null }
  OUTPUT: boolean
  
  RETURN input.animation !== null
         AND input.prevAnimation !== null
         AND input.animation !== input.prevAnimation  // reference changed
         AND input.animation.svg === input.prevAnimation.svg  // content unchanged
         AND input.animation.id === input.prevAnimation.id
         AND useEffectWillExecute(input.animation)
END FUNCTION
```

### Examples

- **Line 7672 Render Loop**: `useEffect(() => { if (stageRef.current) applyAt(stageRef.current, tracks, time); }, [tracks, time, animation.svg])` - This effect depends on `animation.svg` which gets a new reference every 3 seconds even when the SVG content is identical, causing unnecessary `applyAt` calls
- **Lines 559-571 Debug Loop**: `useEffect(() => { if (animation) { console.log('🎨 Animation loaded:', ...) } }, [animation?.id, animation?.updatedAt])` - This effect depends on `animation?.updatedAt` which changes on every refetch even when no actual update occurred
- **Line 597 Title Loop**: `useEffect(() => { if (animation) setTitle(animation.title); }, [animation?.id, animation?.updatedAt])` - This effect resets the title on every refetch, potentially overwriting user input in progress
- **Edge case - User editing title**: When a user is actively editing the title in the UI, the refetch fires and the effect overwrites their in-progress changes with the server value

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Animation playback must continue to work exactly as before with smooth rendering at the correct frame rate
- Timeline scrubbing and track editing must remain responsive
- SVG element transformations (`applyAt`) must render at the correct time positions
- Animation properties (tracks, duration, loop) must update when they actually change on the server
- Selection, visibility, and lock state management must continue working
- All other useEffect hooks not related to the bug condition must remain unchanged

**Scope:**
All animation rendering and editing behavior that does NOT involve the three specific useEffect hooks with unstable dependencies should be completely unaffected by this fix. This includes:
- Mouse interactions (pan, zoom, selection, drag)
- Element creation and editing
- Keyframe manipulation in the timeline
- Export functionality
- All other UI interactions not dependent on the buggy effects

## Hypothesized Root Cause

Based on the bug description and code analysis, the most likely issues are:

1. **React Query Object Recreation**: The `useActionQuery` hook returns a new object reference on every refetch, even when the data is identical. React's dependency array uses reference equality (`===`), so new objects trigger effects even with unchanged content.

2. **String Dependency Instability**: While primitive strings like `animation.svg` should be stable by value, the parent `animation` object recreation may cause React to see the dependency as changed. Additionally, `animation?.updatedAt` is explicitly volatile and changes on every server write.

3. **Unnecessary Polling**: The `refetchInterval: 3000` causes continuous refetching regardless of whether changes occurred, amplifying the reference instability problem.

4. **Missing Content Comparison**: The effects don't implement content-based equality checks (e.g., comparing SVG string content) and rely solely on React's reference equality.

## Correctness Properties

Property 1: Bug Condition - Stable Effect Execution

_For any_ refetch event where the animation content (svg, title, tracks) is unchanged from the previous render, the fixed useEffect hooks SHALL NOT re-execute, preventing unnecessary DOM operations and re-renders.

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Preservation - Animation Rendering Continuity

_For any_ animation state change where actual content HAS changed (user edits, server updates, time progression), the fixed code SHALL trigger the appropriate effects and update the display exactly as the original code did, preserving all animation playback and editing functionality.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `app/routes/motion.tsx`

**Function**: Multiple useEffect hooks (lines 559-571, 597, 7672)

**Specific Changes**:

1. **Line 7672 - Stabilize applyAt Effect**:
   - Change from: `useEffect(() => { if (stageRef.current) applyAt(stageRef.current, tracks, time); }, [tracks, time, animation.svg])`
   - Change to: Use a ref to track the previous SVG content and only call `applyAt` when the content actually changes
   - Implementation: Create `prevSvgContentRef` and compare string content instead of reference

2. **Lines 559-571 - Stabilize Debug Logging**:
   - Change from: `useEffect(() => { ... }, [animation?.id, animation?.updatedAt])`
   - Change to: Depend only on `animation?.id` and compare SVG content hash or length
   - Implementation: Remove `animation?.updatedAt` from dependencies and add content-based comparison

3. **Line 597 - Stabilize Title Effect**:
   - Change from: `useEffect(() => { if (animation) setTitle(animation.title); }, [animation?.id, animation?.updatedAt])`
   - Change to: Only update title when the actual title content changes
   - Implementation: Use `useMemo` or `useRef` to track the previous title and only update on actual changes

4. **Add Content Comparison Utilities**:
   - Create a `usePrevious` custom hook to track previous values
   - Or use `useRef` directly in each effect to compare content before executing

5. **Optional - Consider Reducing Refetch Frequency**:
   - Evaluate if `refetchInterval: 3000` can be increased to 5000 or 10000
   - Or implement smarter refetching based on user activity (don't refetch while editing)

### Code Pattern Example

For the line 7672 fix:
```typescript
// Before (buggy)
useEffect(() => {
  if (stageRef.current) applyAt(stageRef.current, tracks, time);
}, [tracks, time, animation.svg]);

// After (fixed)
const prevSvgRef = useRef<string>('');
useEffect(() => {
  const currentSvg = animation?.svg ?? '';
  if (stageRef.current && currentSvg !== prevSvgRef.current) {
    applyAt(stageRef.current, tracks, time);
    prevSvgRef.current = currentSvg;
  } else if (stageRef.current) {
    // SVG unchanged, but tracks or time changed - still apply
    applyAt(stageRef.current, tracks, time);
  }
}, [tracks, time, animation?.svg]);

// Simplified approach - always call applyAt but remove svg from deps:
useEffect(() => {
  if (stageRef.current) applyAt(stageRef.current, tracks, time);
}, [tracks, time]);
// Note: This assumes SVG changes always come with track changes
```

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the infinite render loop on unfixed code, then verify the fix eliminates unnecessary effect executions while preserving correct behavior for actual content changes.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the infinite render loop BEFORE implementing the fix. Confirm the root cause by observing effect executions when animation content is unchanged.

**Test Plan**: Write tests that monitor useEffect execution counts and verify they increase continuously even when animation data is unchanged. Run these tests on the UNFIXED code to observe the render loop and understand its frequency.

**Test Cases**:
1. **Refetch Without Changes Test**: Mock `useActionQuery` to return the same animation content with new object references every 3 seconds. Assert that effect execution count increases without bound (will fail on unfixed code showing the bug)
2. **SVG Reference Change Test**: Create two animation objects with identical SVG strings but different references. Assert that the applyAt effect does NOT execute (will fail on unfixed code)
3. **UpdatedAt Volatility Test**: Mock animation data where only `updatedAt` changes. Assert that title and debug effects do NOT execute (will fail on unfixed code)
4. **Console Log Spam Test**: Monitor console.log calls during a 10-second period with no user interaction. Assert fewer than 5 debug logs (will fail on unfixed code with ~30+ logs)

**Expected Counterexamples**:
- useEffect hooks execute every 3 seconds during idle periods
- Console is spammed with "🎨 Animation loaded:" messages
- applyAt is called unnecessarily, consuming CPU cycles
- Possible causes: reference equality checks, volatile updatedAt dependency, lack of content comparison

### Fix Checking

**Goal**: Verify that for all scenarios where animation content is unchanged, the fixed useEffect hooks do NOT re-execute.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  effectExecutionCount := monitorEffectExecutions(input)
  ASSERT effectExecutionCount = 0  // No executions for unchanged content
END FOR
```

**Test Cases**:
1. **Idle Refetch Test**: Let the animation refetch 10 times without changes. Assert applyAt is NOT called unnecessarily
2. **Reference Stability Test**: Verify effect execution counts remain constant during refetch cycles
3. **Content Hash Test**: Verify effects only fire when SVG/title/tracks content actually changes

### Preservation Checking

**Goal**: Verify that for all scenarios where animation content DOES change, the fixed useEffect hooks execute correctly and maintain existing behavior.

**Pseudocode:**
```
FOR ALL input WHERE contentActuallyChanged(input) DO
  ASSERT fixedBehavior(input) = originalBehavior(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across different animation states
- It catches edge cases like simultaneous SVG and track changes
- It provides strong guarantees that animation rendering is unchanged for all valid inputs

**Test Plan**: First observe behavior on UNFIXED code for various content changes (SVG edits, title changes, track modifications), then write property-based tests capturing that exact behavior.

**Test Cases**:
1. **SVG Content Change Test**: Observe that changing SVG content triggers applyAt on unfixed code, then verify this continues after fix
2. **Title Update Test**: Observe that actual title changes update the UI on unfixed code, then verify preservation
3. **Track Modification Test**: Observe that track edits trigger re-render on unfixed code, then verify preservation
4. **Animation Playback Test**: Observe smooth playback at various time positions on unfixed code, then verify identical framerate and smoothness after fix
5. **Scrubbing Test**: Observe timeline scrubbing updates the artboard on unfixed code, then verify preservation

### Unit Tests

- Test that `usePrevious` or ref-based comparison correctly identifies unchanged content
- Test that SVG string comparison works for various SVG structures (with/without whitespace differences)
- Test that title updates only occur when title content actually changes
- Test that debug logging respects content changes and doesn't spam

### Property-Based Tests

- Generate random animation objects with varying content and verify effect execution only on actual changes
- Generate random sequences of refetches with/without content changes and verify correct effect behavior
- Test across many different SVG structures, track configurations, and animation durations
- Verify animation rendering produces identical output for identical inputs across many test cases

### Integration Tests

- Test full animation playback with refetching active - verify smooth rendering without stutters
- Test editing an element's properties while refetching occurs - verify changes persist
- Test timeline scrubbing during refetch cycles - verify responsive interaction
- Test that the debug log only appears when animation ID changes or content actually updates
