# Home screen component boundaries

- Status: TODO
- Baseline commit: `e9a2173`
- Severity: Medium
- Category: Maintainability
- React Doctor rules: `no-giant-component`, `prefer-useReducer`
- Scope: `app/(tabs)/index.tsx`
- Milestone: M4 only

## Problem

The Home screen owns selected-lahan weather loading, summaries, saved fields, notes, navigation, refresh, and presentation in one large component. React Doctor's state-count heuristic does not prove these independent resources belong in one reducer.

## Target

After fixing the stale weather request in plan 001 and validating list behavior in plan 004, extract only pure presentation sections such as the weather summary, saved-field row, and notes section. Keep data loading, request identity, refresh, selection, and navigation in the screen unless an existing hook already owns them.

## Steps

1. Complete plans 001 and 004 first.
2. Add characterization coverage for initial load, refresh, selection, empty, error, and stale-request behavior.
3. Extract one leaf section at a time with explicit data and callback props.
4. Keep independent server-resource state independent; introduce no reducer solely to satisfy the warning.

## Boundaries

- Preserve the current sticky header, cards, scrolling, navigation destinations, weather copy, notes, and selection behavior.
- Preserve honest unavailable/error states and measurement provenance wording.
- Do not move or duplicate provider calls.

## Verification

- `npm run verify`
- On a phone, test cold start, pull-to-refresh, rapid field selection, empty account, request failure, retry, saved-field scrolling, notes, and every Home navigation action.
- Compare compact and large-phone screenshots for loading, populated, empty, and error states.
