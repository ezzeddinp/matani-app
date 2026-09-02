# React Doctor cleanup plans

Baseline: commit `e9a2173`, React Doctor `0.9.12`, Expo SDK 54, React Native 0.81, React 19.1, React Compiler enabled. The planning scan found **0 errors and 187 warnings across 20 rule families**.

These plans optimize for a working thesis app, not a cosmetic score. React Doctor diagnostics are hypotheses. Each occurrence must close as **Fixed**, **Rejected**, **Needs evidence**, **Unavailable**, or **Waived with evidence**. A warning whose canonical recipe says to keep the current implementation is complete when the evidence and outcome are recorded; do not rewrite working code or add suppressions merely to reach zero warnings.

The application source was already dirty when these plans were written (`app/(tabs)/explore.tsx`, `package.json`, `package-lock.json`, and `doctor.config.json`). Executors must preserve those changes and stop if the stamped code has drifted materially.

## Execution order

| Order | Plan | Status | Depends on | Why here |
|---|---|---|---|---|
| 1 | [001-home-weather-race.md](001-home-weather-race.md) | IMPLEMENTED — PHONE CHECK PENDING | — | Confirmed stale-response correctness risk |
| 2 | [002-intl-formatters.md](002-intl-formatters.md) | IMPLEMENTED — DEVICE CHECK PENDING | — | Small, behavior-preserving hot-path cleanup |
| 3 | [003-remote-images.md](003-remote-images.md) | IMPLEMENTED — CACHE/DEVICE CHECK PENDING | — | Bounded caching improvement with visual checks |
| 4 | [004-list-virtualization.md](004-list-virtualization.md) | IMPLEMENTED — PROFILER/DEVICE CHECK PENDING | — | Start with the unbounded horizontal field list |
| 5 | [005-pressable-migration.md](005-pressable-migration.md) | IMPLEMENTED — PHONE/SCREEN READER CHECK PENDING | — | Accessibility-sensitive; execute in three phone-tested batches |
| 6 | [006-drawing-vertex-identity.md](006-drawing-vertex-identity.md) | TODO | 001–005 stable | Small state-contract change requiring map regression tests |
| 7 | [007-explore-boundaries.md](007-explore-boundaries.md) | TODO | 006 | Highest-risk large-screen decomposition |
| 8 | [008-home-boundaries.md](008-home-boundaries.md) | TODO | 001, 004 | Preserve weather, field cards, and notes behavior |
| 9 | [009-detail-boundaries.md](009-detail-boundaries.md) | TODO | 001 | Thesis-critical polling and measurement UI |
| 10 | [010-profile-weather-boundaries.md](010-profile-weather-boundaries.md) | TODO | 001 | Lower-risk screen ownership cleanup |
| 11 | [011-manual-memoization.md](011-manual-memoization.md) | TODO | 007–010 | Run last because earlier extraction invalidates locations |
| 12 | [012-iteration-performance.md](012-iteration-performance.md) | TODO | — | Measurement-gated micro-optimizations and intentional sequential loops |
| 13 | [013-dead-code-and-exports.md](013-dead-code-and-exports.md) | TODO | thesis artifacts frozen for research exports | Remove only proven dead code |
| 14 | [014-splash-animation.md](014-splash-animation.md) | TODO | — | Evidence gate; current native-driver animation may be retained |
| 15 | [015-shadow-compatibility.md](015-shadow-compatibility.md) | TODO | UI batches stable | Canonical rule is duplicate/advisory; avoid visual churn |

## Global behavior and UI/UX gate

Every implementation plan must preserve:

- Authentication, guest mode, session routing, and double-submit prevention.
- Home weather, field cards, note creation, loading/error/empty states, and selected-field behavior.
- Ladang map pan/zoom/recenter, location search, drawing, undo/redo, cancel/save, edit/delete, notes, summaries, keyboard dismissal, modal backdrops, and measurement request handoff.
- Field-detail metadata, queued/processing/rejected/unavailable states, polling, retry, NDVI/NDMI toggle, dates, quality, valid-pixel counts, and chart rendering.
- Weather permission denial, current/preset locations, forecast, and the existing HYP-07 prototype wording/calculation.
- Profile authenticated/guest states, tabs, retry, and sign-out.
- Education search/category ordering and article navigation.
- Exact user-visible copy, spacing, colors, touch targets, accessibility labels/states, scroll position, safe areas, modal layering, and dark/light OS behavior unless a plan explicitly changes one diagnostic-backed defect.

Before each UI batch, capture screenshots and a short screen recording on the same phone. After the batch, repeat the same flow and compare. If Android or iOS is unavailable, report it; do not claim cross-platform proof.

## Mechanical gate

Run after every plan:

```sh
npm run doctor -- --scope changed --base HEAD --include-untracked --no-score --no-cache -y
npm run verify
git diff --check
```

Run an unfiltered `npm run doctor -- --no-score --no-cache -y` before closing a plan. React Doctor must have no new error and no unrelated warning regression. Backend tests may need permission to bind a temporary localhost server.
