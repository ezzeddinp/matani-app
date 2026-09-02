# Explore screen component boundaries

- Status: TODO
- Baseline commit: `e9a2173`
- Severity: Medium
- Category: Maintainability
- React Doctor rules: `no-giant-component`, `prefer-useReducer`
- Scope: `app/(tabs)/explore.tsx`
- Milestone: M4 only

## Problem

`ExploreScreen` and its surrounding module own map interaction, drawing, field selection, reverse geocoding, forms, notes, modal state, and presentation in one roughly 3,300-line file. React Doctor flags the component size and the number of state setters, but size alone does not justify moving behavior or introducing a reducer.

## Target

First protect current behavior with characterization checks. Then extract only cohesive presentational leaves while keeping provider calls, map orchestration, drawing transactions, and navigation in the screen. Co-locate one-use components unless an existing shared component already fits.

Consider a reducer only for the drawing transaction if its add/undo/redo/reset transitions remain difficult to reason about after `006-drawing-vertex-identity.md`. Keep independent modal and editing IDs as state.

## Steps

1. Complete plans 001, 003, 005, and 006 first so the boundaries reflect corrected behavior.
2. Record the props and callbacks for the field list/card section, map controls, note modal, and edit modal.
3. Extract one presentational section per change; do not move effects or service calls.
4. Re-run the full Explore phone flow after every extraction.
5. Add a drawing reducer only if it removes real invalid transitions with fewer moving parts than the current state.

## Boundaries

- No visual redesign, renamed UI text, new dependency, provider change, or API change.
- Preserve reverse-geocoding rate limits and ordered provider fallback.
- Preserve keyboard dismissal, nested press behavior, map gestures, disabled states, accessibility, and modal stacking.
- Preserve fixture/prototype/measured/unavailable wording and padi-only scope.

## Verification

- `npm run verify`
- On both compact and large phones: open the map, select a lahan, draw/edit/save a polygon, undo/redo, create/edit/delete a note, open/close every modal, dismiss the keyboard, and switch tabs.
- Compare before/after screenshots for default, selected-field, drawing, form, loading, empty, and error states.
