# 002 — Hoist stable Indonesian date formatters

- **Status**: IMPLEMENTED — DEVICE CHECK PENDING
- **Commit**: `e9a2173`
- **Severity**: MEDIUM
- **Category**: Performance
- **Rule**: `react-doctor/js-hoist-intl`
- **Estimated scope**: 3 source files, about 20 lines

## Problem

Three formatting helpers construct the same locale formatter on every call: `app/(tabs)/explore.tsx:194`, `app/(tabs)/index.tsx:135`, and `app/detail-lahan-page.tsx:81`. These helpers run across field, note, and timeline collections.

```tsx
// current representative pattern
const formatDisplayDate = (value?: string | null) => {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(time);
};
```

## Target

The canonical recipe is to hoist formatters whose locale/options are static:

```tsx
const displayDateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const formatDisplayDate = (value?: string | null) => {
  // preserve the current validation and fallback
  return displayDateFormatter.format(time);
};
```

Use separate module-scope constants where options differ (`numeric` versus `2-digit`). Do not force all screens through one formatter or change output.

## Repo conventions to follow

- Keep constants beside the existing module-scope helpers.
- Preserve each helper's current invalid, absent, and exception fallback.
- Do not introduce a shared date utility; three constants are smaller and safer.

## Steps

1. Hoist the exact formatter from each reported helper without changing its options.
2. Replace only the constructor call with the local constant.
3. Add or extend a focused artifact/unit check for valid, invalid, and absent dates if the file already has coverage.
4. Compare displayed strings before and after on the same locale/device.

## Boundaries

- No copy, timezone, locale, date-source, or acquisition-date semantic changes.
- No dependency or cross-file abstraction.
- Preserve `try/catch` behavior where present.

## Verification

- **Mechanical**: three `js-hoist-intl` diagnostics clear; `npm run verify`; `git diff --check`.
- **Behavior check**: Home field/note dates, Ladang dates, and Detail chart endpoint dates are character-for-character unchanged for real, absent, and invalid values.
- **Done when**: constructors run at module load and all date output remains identical.
