# React Native shadow compatibility review

- Status: TODO
- Baseline commit: `e9a2173`
- Severity: Low
- Category: UI compatibility
- React Doctor rule: `rn-no-legacy-shadow-styles`
- Scope: 43 reported shadow style sites

## Problem

The app commonly pairs iOS `shadowColor`/`shadowOffset`/`shadowOpacity`/`shadowRadius` with Android `elevation`. React Doctor 0.9.12 reports the legacy properties, but its canonical guidance identifies this rule as compatibility-only; removing one side can visibly break shadows on a supported platform.

## Target

Default outcome: retain intentional paired iOS and Android shadows and record them as rejected findings. Make a source change only for a demonstrably redundant zero/no-op style or when the project deliberately adopts and verifies a supported `boxShadow` path across its phone matrix.

## Steps

1. Group all 43 findings by shared style or component and capture iOS/Android screenshots.
2. Label each site paired compatibility, platform-specific, zero/no-op, or accidental duplicate.
3. Keep paired compatibility styles.
4. Remove a zero/no-op value only when before/after screenshots are identical on both platforms.
5. Do not create a shadow token system as part of scanner cleanup.

## Boundaries

- No broad style conversion, design-system refactor, or score-driven `boxShadow` migration.
- Preserve card hierarchy, modal separation, tab bar appearance, pressed states, dark/light contrast, clipping, and performance.
- Treat a justified retained warning as resolved review work.

## Verification

- Compare iOS and Android screenshots for tabs, cards, modals, floating controls, forms, and onboarding in light and dark modes where supported.
- Check compact and large phones for clipping and stacking regressions.
- If code changes: `npm run verify` and compare React Doctor locations.
