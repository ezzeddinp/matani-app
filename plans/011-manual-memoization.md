# Manual memoization review

- Status: TODO
- Baseline commit: `e9a2173`
- Severity: Low
- Category: Maintainability / performance
- React Doctor rule: `react-compiler-no-manual-memoization`
- Scope: 66 reported `useMemo`, `useCallback`, and memoization sites across the app
- Milestone: After plans 007–010

## Problem

React Doctor reports manual memoization that the React Compiler may make redundant. Removing wrappers in bulk can change effect dependencies, focus lifecycle, navigation timing, map gestures, or child render behavior without producing a user-visible benefit.

## Target

Keep existing memoization by default. Review one component after its final boundary is established and remove a wrapper only when compiler output or a render profile shows it is redundant and behavior tests remain unchanged. A justified retained wrapper is a resolved review outcome even if the scanner continues to report it.

## Steps

1. Group the JSON report by component and review only after plans 007–010 settle component ownership.
2. Protect `useFocusEffect` callbacks, splash navigation callbacks, async loaders, map gesture callbacks, and values used as effect dependencies unless equivalence is proven.
3. Capture a before render profile for a representative interaction.
4. Remove at most one related memoization group per change.
5. Compare compiler output, render counts, and phone behavior; revert any change without clear evidence.
6. Record each site as `Removed`, `Retained: dependency contract`, or `Retained: measured benefit`.

## Boundaries

- No bulk deletion and no dependency-array changes disguised as cleanup.
- Do not introduce custom comparison functions or new memoization helpers.
- Do not change effect timing, focus refresh, gestures, navigation, or API request count.

## Verification

- Re-run React Doctor and compare the exact location list, not only the score.
- `npm run verify`
- Profile and phone-test tab focus/blur, map pan/draw, modal input, refresh, navigation, splash completion, and rapid repeated taps.
