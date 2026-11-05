# Implementation Plan: Motion Studio Infinite Render Loop Bugfix

## Overview

This implementation plan follows the exploratory bugfix workflow to fix the infinite render loop in the motion studio. The fix involves stabilizing three useEffect hooks in `app/routes/motion.tsx` that currently re-execute on every animation refetch due to unstable dependencies, even when animation content is unchanged.

The workflow ensures:
1. **Exploration** - Write tests BEFORE fix to understand and confirm the bug exists
2. **Preservation** - Write tests to capture existing correct behavior that must not break
3. **Implementation** - Apply the fix with understanding from exploration phase
4. **Validation** - Verify fix works and doesn't introduce regressions

## Tasks

- [ ] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Infinite Render Loop on Unchanged Animation Refetch
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the infinite render loop exists
  - **Scoped PBT Approach**: Focus on the concrete failing case - animation refetch with identical content but new object reference
  - Test implementation details from Bug Condition specification in design.md:
    - Mock `useActionQuery` to return animation objects with identical content but different references every 3 seconds
    - Monitor useEffect execution counts for all three buggy effects (lines 559-571, 597, 7672)
    - Assert that effect execution counts increase continuously during idle refetch periods
    - Track console.log calls and verify "🎨 Animation loaded:" appears repeatedly
  - The test assertions should match the Expected Behavior Properties from design:
    - Property 1: Effect execution count should NOT increase when animation content is unchanged
    - Verify applyAt is NOT called unnecessarily during refetch with unchanged SVG
    - Verify debug logging does NOT spam console during idle periods
    - Verify title effect does NOT re-execute when title content is unchanged
  - Run test on UNFIXED code in `app/routes/motion.tsx`
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found to understand root cause:
    - How many times do effects execute during a 10-second idle period?
    - Which dependencies are triggering the re-executions?
    - Does the render loop stabilize or continue indefinitely?
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Animation Rendering and Editing Behavior
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy inputs (actual content changes):
    - Load an animation and change the SVG content - observe applyAt is called
    - Edit an animation title - observe the title updates in the UI
    - Modify track keyframes - observe the artboard re-renders with new transforms
    - Scrub the timeline - observe smooth updates at various time positions
    - Play animation - observe continuous smooth playback
  - Write property-based tests capturing observed behavior patterns from Preservation Requirements in design.md:
    - Test that SVG content changes trigger applyAt effect execution
    - Test that actual title changes update the displayed title
    - Test that track modifications trigger re-render
    - Test that animation playback remains smooth across various time values
    - Test that timeline scrubbing updates the artboard correctly
    - Test that selection, visibility, and lock states persist across renders
    - Test that switching animation IDs loads the new animation
    - Test that polling detects and applies legitimate external updates
  - Property-based testing generates many test cases for stronger guarantees:
    - Generate random SVG content changes and verify effects trigger
    - Generate random track modifications and verify re-renders
    - Generate random time positions and verify playback smoothness
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

- [ ] 3. Fix infinite render loop in motion.tsx

  - [ ] 3.1 Stabilize line 7672 applyAt effect
    - Remove `animation.svg` from dependency array since SVG changes come with track changes
    - The effect now depends only on `[tracks, time]` which are stable and change only when content actually changes
    - Alternative approach if needed: use `useRef` to track previous SVG content and compare strings
    - Verify applyAt is still called when tracks or time changes (preservation)
    - _Bug_Condition: isBugCondition(input) where animation object reference changes but svg content is identical_
    - _Expected_Behavior: Effect should NOT re-execute when svg content is unchanged_
    - _Preservation: Effect MUST still execute when tracks or time changes (Requirements 3.1, 3.2)_
    - _Requirements: 2.1, 2.2, 2.3_

  - [ ] 3.2 Stabilize lines 559-571 debug logging effect
    - Remove `animation?.updatedAt` from dependency array
    - Keep only `animation?.id` as dependency since we want to log when animation ID changes
    - Add content-based comparison using `useRef` to track previous SVG/tracks if needed
    - Verify console log appears only once per animation load (expected behavior)
    - Verify log still appears when switching to a different animation ID (preservation)
    - _Bug_Condition: isBugCondition(input) where updatedAt changes but actual content is identical_
    - _Expected_Behavior: Effect should only execute when animation ID changes, not on every refetch_
    - _Preservation: Effect MUST still execute when user switches animations (Requirement 3.3)_
    - _Requirements: 2.4, 2.5_

  - [ ] 3.3 Stabilize line 597 title effect
    - Remove `animation?.updatedAt` from dependency array
    - Use `animation?.title` directly in dependencies OR use `useMemo` to create stable title reference
    - Alternative: add guard to only call `setTitle` if title content actually changed from current value
    - Verify title updates when animation changes (preservation)
    - Verify title doesn't get overwritten during user editing (expected behavior improvement)
    - _Bug_Condition: isBugCondition(input) where updatedAt changes but title content is unchanged_
    - _Expected_Behavior: Effect should only execute when title content actually changes_
    - _Preservation: Effect MUST still update title when switching animations or when title actually changes server-side (Requirements 3.3, 3.4)_
    - _Requirements: 2.4, 2.6_

  - [ ] 3.4 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Stable Effect Execution on Unchanged Refetch
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - Verify effect execution counts remain stable during refetch cycles with unchanged content
    - Verify console logging does not spam during idle periods
    - Verify applyAt is not called unnecessarily
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ] 3.5 Verify preservation tests still pass
    - **Property 2: Preservation** - Animation Rendering Continuity Maintained
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all animation rendering behavior is unchanged:
      - SVG content changes still trigger re-renders
      - Animation playback is still smooth
      - Timeline scrubbing still works
      - Title updates still apply
      - Track modifications still render correctly
      - Element selection/visibility/lock states still persist
      - Animation switching still works
      - External updates are still detected
    - Document any failures and investigate if they indicate regressions

- [ ] 4. Checkpoint - Ensure all tests pass
  - Run all tests to verify bug is fixed and no regressions introduced
  - Verify manual testing in browser shows no infinite render loop errors
  - Verify animation playback is smooth and responsive
  - If any tests fail or performance issues remain, investigate and fix before marking complete
  - Ask the user if questions arise about edge cases or unexpected behavior

## Notes

- The bug condition exploration test (task 1) is designed to FAIL on unfixed code - this is expected and confirms the bug exists
- The preservation tests (task 2) should PASS on unfixed code - this captures baseline behavior to maintain
- All three useEffect hooks (lines 559-571, 597, 7672) need stabilization to prevent cascading re-renders
- The primary fix is removing unstable dependencies (`animation.svg`, `animation?.updatedAt`) and relying on stable content-based comparisons
- Property-based testing is recommended for preservation tests to provide stronger guarantees across various animation states
