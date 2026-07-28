# Thesis Section E/F alignment cross-check

**Checked:** 2026-07-28  
**Scope:** the quoted Section E/F text, the current revised DOCX, canonical `.agent/`
documents, the as-built satellite route, and the Matani Notion knowledge base  
**Verdict:** the quoted older wording is misaligned; the current clean DOCX is aligned
with the documented and implemented prototype boundary.

## Objective finding

The quoted wording is internally contradictory. It says in present tense that the
backend sends exact GeoJSON polygon geometry, excludes pixels outside the polygon, and
receives `geometryPixelCount`. Its final paragraph then correctly says that the current
request uses a bbox, lacks a versioned SCL rule and pixel accounting, and does not
persist provenance-complete measurements. Both statements cannot describe the same
as-built request.

The first claim is the **M2 target**, not the current implementation. Treating it as
current behavior conflicts with:

- `.agent/project-architecture.md` section 2, the canonical current-measurement
  provenance wording;
- `.agent/data-evaluation-plan.md`, which keeps polygon-exact quality-gated measurement
  behind the M2 gate;
- `.agent/implementation-plan.md`, which keeps M2 after the unfinished measured M1
  feasibility gate;
- `backend/api/ndvi/utils.js`, whose current prototype request consumes a bbox;
- the [Matani centralized knowledge base](https://app.notion.com/p/3a9434da822c80e9b8c7ee920b1e94dc),
  which explicitly separates target from implementation and describes exact polygon
  measurement as future work.

## Before and after

| Topic | Incorrect older wording | Corrected wording / state |
|---|---|---|
| Field geometry | Exact polygon is sent and used for current satellite statistics. | The user stores a polygon, but the current prototype constructs the satellite request from its bbox. Exact-polygon statistics are a thesis-target requirement. |
| Bbox meaning | Bbox only defines a grid while polygon constrains the current analysis. | Bbox is the current implementation envelope and must not be interpreted as a validated field boundary. |
| Outside-polygon pixels | Claimed to be excluded by current request geometry and `dataMask`. | No such current guarantee is made because the exact polygon is not sent by the prototype request. |
| Pixel accounting | Claimed current `sampleCount`, `noDataCount`, and `geometryPixelCount` support field coverage. | Provenance-complete, per-index valid-pixel accounting remains target work. |
| Data state | Mixed target behavior with current behavior, then admitted prototype limitations. | Current output remains `prototype`, `fixture`, or `unavailable`; it is not `measured`. |

## Corrected Section E

> Users define agricultural fields by drawing polygon boundaries on the mobile map
> interface. Each polygon is stored in the WGS84 coordinate reference system. The
> database derives a geography-based field area, while a centroid is used only as a
> representative coordinate for location-based weather retrieval. In the current
> prototype, the satellite request is constructed from the polygon's bounding box
> rather than from the exact polygon geometry. A bounding box is an implementation
> envelope and must not be interpreted as the field boundary used for a validated
> field-level measurement. Polygon-exact satellite statistics are a required target of
> the thesis measurement pipeline.

## Corrected Section F boundary

The first paragraph now says that the current prototype queries Sentinel Hub with a
bbox derived from the user-drawn field. It also distinguishes the 10 m native
resolution of B04/B08 from B11's 20 m native resolution and states that resampling B11
does not create genuine 10 m spatial detail.

The concluding paragraph retains the full honesty boundary: the fixed 1–5 September
2025 demonstration window, no versioned SCL cloud/shadow rule, bbox instead of exact
polygon, Jakarta fallback, labeled synthetic field-list fallback, simulated
field-detail history, and no provenance-complete persistence. Polygon-exact geometry,
dynamic acquisition policy, versioned masking, per-index accounting, provenance,
persistence, and `passed`/`rejected`/`unavailable` decisions remain target work.

## Artifact validation

The clean canonical source was copied to both:

- `.agent/thesis-revised-point-21.docx`
- `.agent/thesis-revised-point-21-aligned-2026-07-28.docx`

Both files:

- have SHA-256
  `E32095594638F8CAD08356272F1051468FA8D0063C0551358DD656E331B7BD6B`;
- contain the required DOCX content-types and `word/document.xml`;
- parse as valid XML;
- contain 136 non-empty body paragraphs;
- contain zero occurrences of the three contradicted claims checked:
  “The backend sends both…”, `geometryPixelCount`, and
  “Pixels located within the bounding box…are excluded”.

This validation proves document integrity and wording alignment. It does not turn the
current satellite prototype into a measured pipeline or close M1/M2.
