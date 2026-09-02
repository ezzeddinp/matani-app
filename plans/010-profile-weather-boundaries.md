# Profile and weather component boundaries

- Status: TODO
- Baseline commit: `e9a2173`
- Severity: Low
- Category: Maintainability
- React Doctor rule: `no-giant-component`
- Scope: `app/(tabs)/profile.tsx`, `app/(tabs)/weather.tsx`
- Milestone: M4 only

## Problem

Profile and Weather each mix several presentation sections with screen-level loading and interaction state. The warning establishes review scope, not permission to merge their behavior or redesign the screens.

## Target

Handle the two screens as separate, independently reviewable batches. Extract only cohesive presentational leaves while retaining authentication/resource loading in Profile and forecast/risk computation ownership in Weather.

## Steps

1. Characterize guest, authenticated, loading, error, refresh, and navigation states in Profile.
2. Extract Profile presentation sections without moving session or resource effects.
3. Characterize Weather loading, populated, unavailable, refresh, and field-selection states.
4. Extract Weather summary and forecast presentation without moving HYP-07 computation.
5. Reject further splitting once each remaining screen component has one clear orchestration responsibility.

## Boundaries

- Do not combine the two screens or add shared abstractions for one-use sections.
- Preserve Profile sign-in/sign-out, settings, links, accessibility, and error handling.
- Preserve Weather values, units, forecast order, field selection, and HYP-07 wording and behavior.
- Do not modify research thresholds or make new domain claims.

## Verification

- `npm run verify`
- On a phone, test Profile as guest and authenticated user, including refresh, links, and sign-out.
- Test Weather with populated, loading, unavailable, and failure fixtures; compare compact and large-phone screenshots and verify scrolling/touch targets.
