# Stable drawing vertex identity

- Status: IMPLEMENTED — PHONE CHECK PENDING
- Baseline commit: `e9a2173`
- Severity: Low
- Category: Correctness / React reconciliation
- React Doctor rule: `no-array-index-as-key`
- Scope: `app/(tabs)/explore.tsx`

## Problem

The map renders drawing vertices with a key derived from the array index near `app/(tabs)/explore.tsx:1405`. Coordinates alone are not unique because a user can tap the same point twice, while undo and redo reorder the active sequence. Index-based identity can therefore associate a rendered marker with the wrong logical vertex.

## Target

Give each newly drawn vertex a stable local ID and retain that ID through undo and redo. Keep persistence and API geometry as coordinates only; the ID is UI identity, not measurement provenance.

Use the smallest local representation that fits the existing flow:

```ts
type DrawingVertex = {
  id: string;
  coordinate: LatLng;
};
```

Generate IDs with a component-local monotonic ref. Do not add a UUID dependency. Derive coordinate arrays only at the existing map and submission boundaries.

## Steps

1. Characterize add, undo, redo, reset, validation, and submission behavior.
2. Change only the in-progress and redo drawing state to retain stable IDs.
3. Render markers with `vertex.id` and pass `vertex.coordinate` to the map.
4. Convert to the existing coordinate payload before validation or submission.
5. Confirm duplicate coordinates remain representable and produce distinct keys.

## Boundaries

- Do not change polygon validation, area calculation, coordinate precision, saved geometry, or API contracts.
- Do not persist local drawing IDs.
- Do not combine this with the Explore component-boundary work.

## Verification

- `npm run verify`
- On a phone, add at least five vertices including two at the same location; undo twice, redo twice, then add another vertex.
- Confirm marker order, polygon path, area feedback, reset, validation, and save behavior are unchanged.
