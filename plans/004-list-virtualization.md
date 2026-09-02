# 004 — Virtualize only lists that can grow

- **Status**: TODO
- **Commit**: `e9a2173`
- **Severity**: MEDIUM
- **Category**: Performance
- **Rule**: `react-doctor/rn-no-scrollview-mapped-list`
- **Estimated scope**: 1–3 source files, no new dependency

## Problem

Six `ScrollView` + `.map()` sites eagerly mount rows:

- `app/(tabs)/education.tsx:160-185` — fixed five-category horizontal selector; reject unless the category count becomes unbounded.
- `app/(tabs)/explore.tsx:2005-2012,2112-2119` — bounded-height lahan pickers.
- `app/(tabs)/index.tsx:1200-1251,1481-1503` — lahan pickers.
- `app/(tabs)/index.tsx:1352-1380` — horizontal saved-field cards, currently unbounded and the first confirmed candidate.

```tsx
// app/(tabs)/index.tsx:1352 — current
<ScrollView horizontal showsHorizontalScrollIndicator={false}>
  {savedLahan.map((item) => (
    <LahanCard key={item.id} item={item} />
  ))}
</ScrollView>
```

## Target

The canonical recipe defaults to the already-installed React Native `FlatList` and preserves keys, headers, footers, empty/refresh states, scrolling APIs, accessibility, and row semantics:

```tsx
<FlatList
  horizontal
  data={savedLahan}
  keyExtractor={(item) => item.id}
  renderItem={({ item }) => <LahanCard item={item} />}
  showsHorizontalScrollIndicator={false}
  contentContainerStyle={styles.existingContainer}
/>
```

Do not add FlashList/LegendList. Do not virtualize short fixed lists where overhead is worse. Picker conversion requires a measured large-field fixture and must preserve `keyboardShouldPersistTaps="handled"`.

## Repo conventions to follow

- Start with Home's horizontal saved-field cards only.
- Use existing database IDs and current ordering.
- Preserve item width, gap, padding, snapping/scroll behavior, selection state, and the outer vertical Home scroll.

## Steps

1. Create a deterministic development/test dataset of at least 50 fields without presenting it as measured data.
2. Profile the Home horizontal list before changing it; retain the change only if mount/scroll behavior improves.
3. Convert the Home list to `FlatList` and preserve exact layout and navigation.
4. Measure each picker with the same dataset. Convert only those showing a real mount/scroll problem; otherwise record Rejected/Needs evidence.
5. Record the education category list as Rejected while it remains under ten fixed rows.

## Boundaries

- No new list dependency.
- No same-direction virtualized list nested inside another virtualized list.
- No changes to field limits, ordering, empty states, copy, keyboard policy, or selection behavior.

## Verification

- **Mechanical**: confirmed diagnostics clear; no nested-list runtime warnings; `npm run verify`; `git diff --check`.
- **Behavior check**: on a phone, test 0, 1, 10, and 50 fields; Home vertical + horizontal scrolling; correct card navigation; picker keyboard persistence, selection checkmark, closing, and max height; narrow-screen category access.
- **Performance check**: record React DevTools Profiler before/after and retain only measured improvements.
- **Done when**: growing lists are virtualized without any visible or interaction regression, and short fixed lists have recorded rejection evidence.

