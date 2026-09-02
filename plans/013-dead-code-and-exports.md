# Dead files and exports verification

- Status: TODO
- Baseline commit: `e9a2173`
- Severity: Low
- Category: Maintainability
- React Doctor rules: `unused-file`, `unused-export`
- Scope: 8 files and 6 exports reported by React Doctor

## Problem

Static reachability can miss Expo platform resolution, Vercel entrypoints, scripts, dynamic imports, and thesis/research consumers. Deleting every reported item would risk deployment or research workflows.

## Target

Delete only items proven unreachable from source, package scripts, Expo routing/platform resolution, backend deployment, tests, and thesis tooling. Keep or defer anything with a runtime or research contract.

Current candidates to verify:

- Likely removable template UI: `components/empty-state-lahan.tsx`, `components/external-link.tsx`, `components/hello-wave.tsx`, `components/parallax-scroll-view.tsx`, `components/ui/collapsible.tsx`, and the paired icon-symbol platform files.
- Protect pending build proof: `backend/index.ts`.
- Keep Vercel entrypoint: the default export in `backend/app.js`.
- Verify separately: the default fallback router in `backend/api/measurements/route.js`.
- Defer unused research/study exports until thesis artifacts are frozen.

## Steps

1. Save the exact scanner location list.
2. Search each symbol and basename with `rg`, including package scripts, config, backend imports, tests, and `.agent` references.
3. Check Expo route and `.ios`/`.android` resolution before deleting platform files.
4. Check Vercel/backend entry configuration before touching default exports.
5. Delete only one proven dead group per change and re-run builds.
6. Record protected and deferred findings so a persistent warning is not repeatedly chased.

## Boundaries

- Do not remove deployment entrypoints, research contracts, fixtures still used by tests, or platform counterparts based only on scanner output.
- No barrel-file reorganization or export renaming.
- No live provider calls.

## Verification

- `rg` shows no consumer for every removed item.
- `npm run verify`
- Run the existing Expo export/build and deployment checks only when their required local credentials and tooling are available; report them as unverified otherwise.
- Launch on a phone and open every tab plus authentication, onboarding, field detail, and measurement fixture flows.
