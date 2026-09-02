# 001 — Prevent stale selected-field weather commits

- **Status**: IMPLEMENTED — PHONE CHECK PENDING
- **Commit**: `e9a2173`
- **Severity**: HIGH
- **Category**: Bugs & correctness
- **Rule**: `react-doctor/no-set-state-after-await-in-effect`
- **Estimated scope**: 1 source file, 1 focused test update

## Problem

`app/(tabs)/index.tsx:1047-1129` starts an asynchronous selected-lahan weather request whenever `selectedLahanId` or `savedLahan` changes, but it has no cleanup or request identity. A slow request for field A can finish after field B and overwrite B's weather or clear B's loading state.

```tsx
// app/(tabs)/index.tsx:1047 — current
useEffect(() => {
  const updateWeatherForLahan = async () => {
    const lahanDetail = await lahanService.getLahanDetail(selectedLahanId);
    const geocoded = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
    const weather = await fetchWeatherData(lat, lon);
    setWeatherData(/* result */);
  };

  updateWeatherForLahan();
}, [selectedLahanId, savedLahan]);
```

The other scanner occurrences are already guarded and are not part of the code change: `app/(tabs)/explore.tsx:619-655` uses `isCancelled`; `app/(tabs)/profile.tsx:96-161` uses `isMounted`. The loading diagnostics at `profile.tsx:144` and `detail-lahan-page.tsx:310` already have `finally` protection.

## Target

React Doctor's canonical recipe requires cancelling or ignoring stale asynchronous work before every post-await state update. The APIs here do not all accept `AbortSignal`, so use the equivalent active-request guard:

```tsx
useEffect(() => {
  let active = true;

  const updateWeatherForLahan = async () => {
    try {
      const lahanDetail = await lahanService.getLahanDetail(selectedLahanId);
      if (!active) return;
      // resolve coordinates
      const geocoded = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
      if (!active) return;
      const weather = await fetchWeatherData(lat, lon);
      if (!active) return;
      // commit weather/error state
    } catch (error) {
      if (!active) return;
      // preserve the current sanitized error handling
    } finally {
      if (active) setLoading(false);
    }
  };

  void updateWeatherForLahan();
  return () => {
    active = false;
  };
}, [selectedLahanId, savedLahan]);
```

## Repo conventions to follow

- Imitate the cancellation style in `app/(tabs)/explore.tsx:619-655` and `app/(tabs)/profile.tsx:96-161`.
- Preserve `fetchWeatherData` fallback/error behavior and all Indonesian copy.
- Do not change provider order, coordinates, geocoding, or the selected-lahan contract.

## Steps

1. Add an effect-local active flag and cleanup at `app/(tabs)/index.tsx:1047`.
2. Gate state writes after `getLahanDetail`, reverse geocoding, and weather fetch.
3. Gate `catch` and `finally`; a stale request must not overwrite an active request's error/loading state.
4. Add the smallest test that models two deferred requests resolving out of order and proves only the newest selection commits.
5. Re-read the diff and remove unrelated formatting or comment churn.

## Boundaries

- Do not change the weather provider, request payload, UI, copy, or loading-state design.
- Do not parallelize API fallback candidates.
- Do not alter the already-safe Explore/Profile effects merely to clear duplicate warnings.
- Stop if Home weather ownership has moved since `e9a2173`.

## Verification

- **Mechanical**: targeted React Doctor finding clears; `npm run verify`; `git diff --check`.
- **Behavior check**: on a phone, rapidly select A → B → A under slow connectivity. The final label/data must belong to A, no B data may flash afterward, and loading must settle. Navigate away mid-request and confirm no stale alert or update appears.
- **Done when**: only the newest selected-field request can commit and all existing Home states look unchanged.
