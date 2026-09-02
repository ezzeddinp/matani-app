# Splash animation evidence review

- Status: TODO
- Baseline commit: `e9a2173`
- Severity: Low
- Category: Performance / UI
- React Doctor rule: `rn-prefer-reanimated`
- Scope: `app/splash.tsx`

## Problem

React Doctor recommends Reanimated, but the current splash animation already uses React Native Animated with `useNativeDriver: true`. There is no measured limitation or visible defect establishing that a migration is needed.

## Target

Default outcome: retain the current implementation and record the finding as rejected with phone evidence. Migrate only if a release-build profile demonstrates repeatable frame loss, JS-thread coupling, or another Animated limitation during the splash.

If evidence exists, use the already-installed Reanimated version and preserve the exact animation sequence, duration, cancellation, reduced-motion behavior, and navigation callback. Do not change splash design in the migration.

## Steps

1. Capture release-build behavior and frame timing on the slowest supported test phone.
2. Test cold start, warm start, reduced motion, background/foreground, and repeated launch.
3. If smooth and correct, make no source change and close as rejected.
4. If a reproducible limitation exists, replace only the affected animation primitives and repeat the same matrix.

## Boundaries

- No new animation dependency, visual redesign, timing change, or navigation-flow change.
- Do not migrate solely to improve the React Doctor score.
- Preserve accessibility and avoid duplicate navigation when the app backgrounds or the animation completes.

## Verification

- Test a release build on a physical phone, not only Expo web or a simulator.
- Confirm the splash completes once, navigation happens once, no flash appears, and reduced-motion behavior remains acceptable.
- If code changes: `npm run verify`.
