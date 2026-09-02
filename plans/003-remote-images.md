# 003 — Cache remote images without changing layout

- **Status**: TODO
- **Commit**: `e9a2173`
- **Severity**: MEDIUM
- **Category**: Performance
- **Rule**: `react-doctor/rn-prefer-expo-image`
- **Estimated scope**: 2–4 source files, no new dependency

## Problem

`expo-image` is already installed, but remote field thumbnails and the onboarding hero use React Native `Image`/`ImageBackground`. Confirmed remote paths are `app/(tabs)/explore.tsx:939,1597` and `app/onboarding.tsx:8,30`. Bundled Home/weather icons are not network-caching problems and should remain unchanged unless an import split is required.

```tsx
// app/(tabs)/explore.tsx:1597 — current
<ImageBackground
  source={card.thumbnailUrl ? { uri: card.thumbnailUrl } : DEFAULT_LAHAN_IMAGE}
  style={styles.lahanImage}
  resizeMode="cover"
>
  {/* overlay children */}
</ImageBackground>
```

## Target

React Doctor's canonical recipe requires deliberate migration. For background images, preserve children with an outer container and positioned Expo image:

```tsx
<View style={styles.lahanImage}>
  <ExpoImage
    source={card.thumbnailUrl ? { uri: card.thumbnailUrl } : DEFAULT_LAHAN_IMAGE}
    style={StyleSheet.absoluteFill}
    contentFit="cover"
    cachePolicy="memory-disk"
  />
  {/* the same overlay children, in the same order */}
</View>
```

For a normal remote image, import `Image as ExpoImage` from `expo-image` and preserve sizing, accessibility, callbacks, and `resizeMode` semantics via `contentFit` only when equivalent. `Image.resolveAssetSource` in Explore is not supplied by `expo-image`; retain a React Native alias for that operation or use an already-installed compatible asset resolver only if type-checking proves it necessary.

## Repo conventions to follow

- Preserve the existing fallback asset, URI persistence, rounded corners, clipping, gradient overlay, and card dimensions.
- Do not touch `app/detail-lahan-page.tsx` because it has no diagnostic in this pass.
- Treat bundled weather/home icons as Rejected unless an observed reload problem exists.

## Steps

1. Migrate the Explore remote/dynamic thumbnail background while retaining the asset-resolution path.
2. Migrate only the remote onboarding hero; keep the bundled logo behavior unchanged.
3. Inspect Home and Weather uses. Record Rejected for bundled-only imports unless a non-static source is proven.
4. Add failure/fallback checks without changing the visible empty-image design.
5. Execute this plan before list virtualization so recycled card behavior is tested once.

## Boundaries

- No dependency, native config, image source, crop, dimension, overlay, or copy changes.
- No childless replacement for `ImageBackground`.
- Do not claim offline cache behavior until demonstrated on a phone.

## Verification

- **Mechanical**: confirmed remote-image diagnostics clear without new type/lint errors; `npm run verify`; `git diff --check`.
- **Behavior check**: test cold load, warm revisit, airplane-mode revisit, broken URL, fallback asset, rounded clipping, gradient/text overlay, and card scrolling on the same phone. Capture before/after screenshots.
- **Done when**: remote images cache/recycle correctly and layout is visually equivalent.

