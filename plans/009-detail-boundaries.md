# Lahan detail component boundaries

- Status: TODO
- Baseline commit: `e9a2173`
- Severity: Medium
- Category: Maintainability
- React Doctor rules: `no-giant-component`, `prefer-useReducer`
- Scope: `app/detail-lahan-page.tsx`
- Milestone: M4 only

## Problem

The lahan detail screen combines measurement job state, polling, chart/history presentation, retry behavior, and screen layout. These transitions are thesis-critical because the UI must not present prototype or unavailable data as measured data.

## Target

Keep job creation, polling, cancellation, provenance handling, and retry orchestration together. Extract only pure chart, status, history, and action sections after characterization tests exist. Add a reducer only if tests demonstrate a concrete invalid job-state transition that it prevents.

## Steps

1. Locate the exact route and record its current job-state transition table before editing.
2. Characterize initial, queued, processing, success, unavailable, error, retry, navigation-away, and return flows.
3. Extract one presentational leaf at a time without moving polling ownership.
4. Retain the existing polling interval and request semantics.
5. Reject the reducer warning if independent state remains clearer.

## Boundaries

- Do not change measurement calculations, provider calls, polling cadence, provenance, persistence, or thesis terminology.
- Do not trigger a live or paid provider in ordinary tests.
- Do not alter chart values, dates, units, colors, accessibility labels, or unavailable/error wording.

## Verification

- `npm run verify`
- Use fixtures for every job state and verify no state is mislabeled as measured.
- On a phone, test navigation away during polling, return, retry, chart interaction, history scrolling, loading, unavailable, and error presentation.
