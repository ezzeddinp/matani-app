# Iteration performance evidence review

- Status: TODO
- Baseline commit: `e9a2173`
- Severity: Low
- Category: Performance
- React Doctor rules: `async-await-in-loop`, `js-combine-iterations`, `js-flatmap-filter`, `js-set-map-lookups`, `js-cache-property-access`
- Scope: 25 reported iteration sites

## Problem

The scanner reports sequential awaits and multi-pass array work. Current sequential awaits include reverse-geocoding rate limiting and ordered provider fallbacks; parallelizing them would change request volume, ordering, and fallback semantics. The remaining collection warnings have no demonstrated phone bottleneck.

## Target

Measure before changing code. Keep ordered and rate-limited async loops. For a measured hot path only, use the smallest readable native construct: one plain loop for combined transforms, a `Set` for repeated membership checks, or one cached property read. Use `Promise.all` only when calls are proven independent and safe to issue concurrently.

## Steps

1. Inventory each reported location from the saved React Doctor JSON and label it ordered, rate-limited, independent, or synchronous collection work.
2. Record the current input size and phone timing for any suspected hot path.
3. Mark Explore reverse geocoding and Home/Explore/Weather provider fallback loops as retained unless their contracts change explicitly.
4. Change only a site with reproducible user-visible cost; keep readable cold-path research and formatting code.
5. Compare results, request counts, ordering, failure behavior, and timing.

## Boundaries

- Do not parallelize provider fallback, retry, quota-sensitive, or rate-limited calls.
- Do not add a cache, worker, dependency, or generalized collection helper.
- Preserve result order, partial-failure handling, fixtures, and honest unavailable states.

## Verification

- `npm run verify`
- Verify request logs show unchanged ordering and count for reverse geocoding and every fallback chain.
- On a lower-end phone, compare the measured interaction before and after; reject changes without a repeatable improvement.
