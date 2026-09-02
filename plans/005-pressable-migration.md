# 005 — Migrate touchables without losing interaction semantics

- **Status**: TODO
- **Commit**: `e9a2173`
- **Severity**: MEDIUM
- **Category**: Accessibility
- **Rule**: `react-doctor/rn-prefer-pressable`
- **Estimated scope**: 14 source files, 84 controls, three separately verified batches

## Problem

React Doctor emits 15 import-level diagnostics covering 81 `TouchableOpacity` and 3 `TouchableWithoutFeedback` controls. A mechanical import swap would remove opacity feedback, alter nested responder behavior, break map/keyboard/modal interactions, and miss accessible names.

Affected imports: `app/(tabs)/education.tsx:12`, `explore.tsx:37-38`, `index.tsx:23`, `profile.tsx:19`, `weather.tsx:24`, `app/auth/login.tsx:11`, `signup.tsx:11`, `app/detail-education-page.tsx:11`, `detail-lahan-page.tsx:11`, `notifications.tsx:9`, `onboarding.tsx:4`, `components/drawing-mode-indicator.tsx:2`, `empty-state-lahan.tsx:2`, and `components/ui/collapsible.tsx:2`.

```tsx
// representative current control
<TouchableOpacity
  style={styles.button}
  activeOpacity={0.85}
  disabled={disabled}
  onPress={onPress}
>
  {children}
</TouchableOpacity>
```

## Target

The canonical recipe migrates only when `Pressable` can preserve the contract, recreating opacity, ripple/underlay behavior, callback timing, cancellation, disabled behavior, hit slop, accessibility, TV focus, layout, and gesture coordination:

```tsx
<Pressable
  style={({ pressed }) => [
    styles.button,
    pressed && !disabled && { opacity: 0.85 },
  ]}
  disabled={disabled}
  accessibilityRole="button"
  accessibilityState={{ disabled }}
  onPress={onPress}
>
  {children}
</Pressable>
```

Controls without explicit `activeOpacity` must reproduce TouchableOpacity's current default feedback. Keep a Touchable when equivalent behavior cannot be demonstrated.

## Repo conventions to follow

- Preserve existing styles; do not create a new shared Button abstraction.
- Keep icon hit slop and add accurate labels/states where missing.
- Convert nested Education article/arrow interaction into one semantic interactive card only if both currently navigate identically.
- No-op controls (`login.tsx` forgotten-password and Profile support/privacy) remain no-op; do not invent features.

## Steps

1. **Batch A**: shared components, onboarding, auth, detail, and notifications. Verify before continuing.
2. **Batch B**: Education, Home, Profile, and Weather. Preserve selected/expanded/disabled states and exact opacity values (`0.7`, `0.8`, `0.85`, `0.88`, `0.92`).
3. **Batch C**: Explore alone. Inventory all 41 controls and three `TouchableWithoutFeedback` uses before editing.
4. For Explore's screen keyboard-dismiss wrapper and nested modal backdrops, prove map pan/draw, scroll, keyboard, input focus, backdrop dismissal, and modal-content taps remain equivalent. Retain the existing primitive if they do not.
5. Add `accessibilityRole`, accurate labels, and `accessibilityState` for icon-only, disabled, selected, checked, or expanded controls.
6. Run full mechanical and phone verification after each batch; do not combine batches into one unreviewed diff.

## Boundaries

- No visual redesign, new button abstraction, invented action, copy change, navigation change, or dependency.
- Do not reduce touch targets or hit slop.
- Do not allow nested Pressables to trigger two actions.
- Stop a batch at the first unresolved responder/gesture regression.

## Verification

- **Mechanical**: only the batch's diagnostics clear; `npm run verify`; unfiltered React Doctor scan; `git diff --check`.
- **Behavior check**: use a phone and screen reader to test every changed control, including long/rapid taps, disabled actions, auth password visibility, Home navigation, Education cards, Detail retry/back, and all Explore map/modal/keyboard flows.
- **Visual check**: compare pressed/unpressed screenshots or recordings; opacity, layout, color, and shadow must match.
- **Done when**: every migrated control preserves its interaction contract and every retained Touchable has a recorded evidence-based reason.

