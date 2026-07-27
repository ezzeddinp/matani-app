# Matani · Design Guidelines

**Document type:** Design guidelines
**Audience:** The developer, thesis advisor, reviewers, and AI agents working in this repo
**Status:** Active
**Updated:** 2026-07-27
**Canonical for:** Design tokens, the screen map, component patterns, and data-state presentation rules
**Companion documents:** [`product-requirements.md`](product-requirements.md), [`product-brief.md`](product-brief.md), [`project-architecture.md`](project-architecture.md), [`context-dump.md`](context-dump.md)

---

## How to read this document

There is **no pre-existing formal design system** in this repository. Every token, pattern, and rule below is **reverse-engineered from the as-built code** and carries a `file:line` citation (a `CODE-*` fact per [`../AGENTS.md`](../AGENTS.md) § Provenance taxonomy). This document formalizes what the code already does; it does not invent tokens.

Read it this way:

- **As-built vs. normative.** Sections tagged **[As-built]** describe verifiable current code (cited). Sections or clauses tagged **[Thesis]** are *normative guidance* — rules the interface should follow to satisfy the honesty constraints, distinct from what the code does today. Never read a [Thesis] rule as a description of the current UI.
- **A token is code.** Because there is no token layer yet, a "token" here is a literal value repeated across `StyleSheet` blocks. Changing a token means editing the code **and** this document in the same change (a documentation update is part of "done" — [`../AGENTS.md`](../AGENTS.md) § Working rules). Consolidating these repeated literals into a real constants layer is **M4** work (roadmap: [`implementation-plan.md`](implementation-plan.md)).
- **Thresholds are not colors.** In the NDVI scale, the numeric **thresholds** are unvalidated heuristics (**HYP-04**, per `research-protocol.md`; decision **DEC-11**). The **colors and labels** are design tokens. They are governed separately — do not treat a threshold as calibrated science because its color is fixed.
- **Honesty is a design requirement, not a disclaimer.** Data-state presentation (§ 5) is normative and inherited from [`../AGENTS.md`](../AGENTS.md) § Honesty constraints. An *unavailable* state is a first-class designed state, not an error afterthought.

---

## 1 · Design direction [As-built]

Matani presents as a **green agricultural brand with a card-based dashboard and Indonesian-language UI**. The dominant pattern is white rounded cards floating on a light neutral background, topped by a saturated-green hero header, with a five-tab bottom navigation (`app/(tabs)/_layout.tsx:54-102`). Copy is farmer-facing Indonesian throughout ("Beranda", "Ladang", "Belum Ada Lahan"; e.g. `components/empty-state-lahan.tsx:15`). The visual language is recognizably Material-adjacent (Material green ramp, elevation shadows, pill badges) but was assembled per-screen during a hackathon, so it is **coherent in feel but not yet systematized** — greens, radii, and type sizes are re-declared locally in each screen's `StyleSheet` rather than drawn from shared tokens.

The load-bearing design principle, inherited from [`../AGENTS.md`](../AGENTS.md) § Honesty constraints and adopted as **DEC-10**: **honesty is a design requirement.** The four data states — *fixture*, *prototype*, *measured*, *unavailable* (glossary: [`context-dump.md`](context-dump.md) § 7) — **must be visually distinguishable**. In particular, an *unavailable* state ("no cloud-free acquisition", "quota exhausted") is a **designed, first-class state** that states *why* data is absent — never a blank, a spinner that never resolves, or a silently synthesized number. The current build does **not** yet meet this bar (§ 5); closing that gap is roadmap **M2**.

---

## 2 · Color system [As-built, CODE-cited]

### 2.1 Brand green — and its inconsistency

The canonical brand accent is **`#2E7D32`** (Material Green 800), asserted as the tab-bar active tint and active-icon color in `app/(tabs)/_layout.tsx:50,57`. It recurs as the primary accent across the detail screen (active tab-switch `app/detail-lahan-page.tsx:1249`; ~20 text/icon uses `detail-lahan-page.tsx:1317-1581`), the profile screen (`app/(tabs)/profile.tsx:882,927,932`), and the drawn-polygon stroke on the map (`app/(tabs)/explore.tsx:210`).

**Honest caveat — the greens are not unified.** At least three distinct green families coexist:

| Green family | Example values | Where | Cite |
|---|---|---|---|
| **Material 800 brand** | `#2E7D32`, dark `#1B5E20` | tab bar, detail, profile, severity | `_layout.tsx:57`; `ndvi.ts:17` |
| **Material 500 bright** | `#4CAF50` | home header gradient, home badges, empty-state CTA | `index.tsx:1230,1240,1809`; `empty-state-lahan.tsx:100,145` |
| **Tailwind green ramp** | `#166534`, `#15803D`, `#16A34A`, `#0E5229`, `#0A3D1F`, `#062B14` | Ladang (explore) hero + gradients | `explore.tsx:1598,1885,2090` |

The home header uses a flat `#4CAF50→#4CAF50` gradient (`app/(tabs)/index.tsx:1230`), while the Ladang tab uses dark forest Tailwind-scale gradients (`app/(tabs)/explore.tsx:1598` `["#062B14","#0A3D1F","#0E5229"]`). Unifying these onto one brand ramp is **M4** work. **[Thesis]** recommendation: adopt `#2E7D32` as the single brand primary with `#1B5E20` as its dark and one intentional bright tint, and retire the ad-hoc Tailwind/Material mixing.

### 2.2 NDVI prototype-interpretation scale (verbatim from `constants/ndvi.ts`)

The severity scale is the one genuinely shared color token set. Reproduced verbatim from `constants/ndvi.ts:12-54`. **The `range` thresholds are HYP-04 heuristics** (unvalidated for Indonesian smallholder conditions; DEC-11, `research-protocol.md`) — the classifier boundaries live at `constants/ndvi.ts:69-80`. **The `color` / `background` values are design tokens.**

| Key | Title (ID) | Color | Background (tint) | Range (**HYP-04**) | Cite |
|---|---|---|---|---|---|
| `darkGreen` | Kehijauan Tinggi | `#1B5E20` | `rgba(27, 94, 32, 0.18)` | `0.60 – 1.00` | `ndvi.ts:13-20` |
| `yellowGreen` | Kehijauan Sedang | `#F9A825` | `rgba(249, 168, 37, 0.18)` | `0.20 – 0.59` | `ndvi.ts:21-28` |
| `orange` | Kehijauan Rendah | `#FB8C00` | `rgba(251, 140, 0, 0.18)` | `0.00 – 0.19` | `ndvi.ts:29-36` |
| `red` | NDVI Negatif | `#D32F2F` | `rgba(211, 47, 47, 0.18)` | `-1.00 – -0.01` | `ndvi.ts:37-44` |
| `unknown` | Data Tidak Tersedia | `#546E7A` | `rgba(84, 110, 122, 0.14)` | `–` | `ndvi.ts:47-54` |

The `unknown` token ("Data Tidak Tersedia") anchors the designed *unavailable* state. Note the **detail screen defines a *second, parallel* severity palette** (`heroGradientPalette`, `app/detail-lahan-page.tsx:99-103`) keyed by `success`/`warning`/`danger` with different hexes (`#FFB74D`/`#F57C00` for warning, `#EF5350`/`#C62828` for danger) — a duplication that should collapse into `constants/ndvi.ts` in M4.

### 2.3 Recurring neutrals & surfaces (sampled)

Sampled from the four representative screens' `StyleSheet` blocks. These are **not** centralized — each value is re-declared per screen.

| Role | Values seen | Cite (example) |
|---|---|---|
| App background | `#f5f5f5` (home), `#F5F7FB` (weather), `#f0f2ed` (detail) | `index.tsx:1628`; `weather.tsx:791`; `detail-lahan-page.tsx:1135` |
| Card surface | `#FFFFFF` (most frequent hex in `app/`, 61 uses) | `index.tsx:1770`; `weather.tsx:887` |
| Primary text | `#1A1A1A`, `#1a1a1a`, `#333`, `#111827`, `#1F2937` | `index.tsx:1798,1853`; `weather.tsx:912` |
| Secondary text | `#666`, `#6B7280`, `#4B5563`, `#374151` | `index.tsx:1793,1842`; `weather.tsx:873,958` |
| Tertiary / muted | `#999`, `#9CA3AF`, `#8f8f8f` | `index.tsx:1906,2024` |
| Hairline / border | `#E6E6E6`, `#E5E7EB`, `#F0F0F0`, `rgba(0,0,0,0.08)` | `_layout.tsx:110`; `index.tsx:1710,1881` |
| Success tint surface | `#E8F5E9`, `#C8E6C9` | `index.tsx:1802`; `weather.tsx:869,984` |
| Warning / amber accent | `#D97706`, `#F59E0B`, `#FEF3C7`; notes gradient `#78350F→#92400E` | `explore.tsx:2262` |
| Alert / danger | `#F44336`, `#C62828`, `#B71C1C`, `#FF5722` (drawing banner) | `index.tsx:1923`; `drawing-mode-indicator.tsx:36` |

`constants/theme.ts` is **untouched Expo boilerplate** — its `Colors.light.tint = #0a7ea4` (teal) and dark palette (`constants/theme.ts:8-28`) are **not used by any Matani screen** (no screen imports the brand green from it; every screen hardcodes hexes). It is slated for cleanup in **M4** (roadmap: [`implementation-plan.md`](implementation-plan.md)).

### 2.4 Contrast audit (WCAG 2.2, computed) [As-built]

Ratios computed with the standard relative-luminance formula (sRGB, `≤0.03928` linear branch). WCAG 2.2 targets: **4.5:1** normal text, **3:1** large text (≥18.66px bold / ≥24px) and non-text graphics/UI. Tint backgrounds are the `rgba` value composited over white.

**Documented deficiencies — the amber/orange severity band fails badly:**

| Pair | Ratio | Target | Result |
|---|---|---|---|
| `yellowGreen #F9A825` text on white | **1.97:1** | 4.5 | ❌ FAIL |
| `orange #FB8C00` text on white | **2.37:1** | 4.5 | ❌ FAIL |
| White text on `#F9A825` chip | **1.97:1** | 4.5 | ❌ FAIL |
| White text on `#FB8C00` chip | **2.37:1** | 4.5 | ❌ FAIL |
| `yellowGreen` on its 0.18 tint | **1.74:1** | 4.5 | ❌ FAIL |
| `orange` on its 0.18 tint | **2.02:1** | 4.5 | ❌ FAIL |
| `red #D32F2F` on its 0.18 tint | **3.79:1** | 4.5 (3 large) | ❌ FAIL normal / ✅ large |
| `#4CAF50` badge text on `#E8F5E9` (home NDVI badge, `index.tsx:1809`) | **2.47:1** | 4.5 | ❌ FAIL |
| White on `#FF5722` drawing banner (`drawing-mode-indicator.tsx:36`, 14px/600) | **3.16:1** | 4.5 (3 graphic) | ❌ FAIL text / ✅ graphic |
| `#999` metric label on white (`index.tsx:1906`) | **2.85:1** | 4.5 | ❌ FAIL |
| `#8f8f8f` field note on `#f5f5f5` (`index.tsx:2024`) | **2.97:1** | 4.5 | ❌ FAIL |

**Passing pairs (for reference):**

| Pair | Ratio | Result |
|---|---|---|
| `darkGreen #1B5E20` text on white | 7.87:1 | ✅ |
| White text on `#1B5E20` chip | 7.87:1 | ✅ |
| `red #D32F2F` text on white | 4.98:1 | ✅ (normal) |
| White on `#D32F2F` chip | 4.98:1 | ✅ (normal) |
| `unknown #546E7A` on white / 0.14 tint | 5.40 / 4.50:1 | ✅ |
| `#2E7D32` brand on white | 5.13:1 | ✅ |
| `#666` secondary on white | 5.74:1 | ✅ |

**Finding:** the two mid-severity colors (`#F9A825`, `#FB8C00`) are unusable for text at any of their current placements — they meet neither the text nor the graphic threshold in most pairings. This is a real, not cosmetic, deficiency: severity is exactly the information a farmer must read reliably. **[Thesis]** fix (M4): darken the amber band (e.g. toward `#B26A00`/`#8A5A00` for text) or pair the tint with a dark-green/near-black text token instead of the saturated hue or white; never rely on white-on-amber. Do not treat color as the sole severity carrier — pair with the text label (already present) and an icon.

---

## 3 · Typography & spacing [As-built]

### 3.1 Fonts — system only

**No custom font is loaded.** `expo-font` is installed (`package.json:20`) but **never imported anywhere in `app/`, `components/`, or `hooks/`** (verified: the only references are the dependency declarations in `package.json` / `package-lock.json`; no `useFonts`, `Font.loadAsync`, or `expo-font` import exists in source). Screens rely on the platform system font (React Native default). `constants/theme.ts:30-53` defines a `Fonts` map (system-ui / ui-serif / ui-rounded / ui-monospace) but, like the rest of that file, it is unused boilerplate. **[Thesis]:** if a brand typeface is ever adopted it must be wired through a single loader; until then, "system font" is the intentional, documented choice and `expo-font` can be removed in M4.

### 3.2 Type scale (sampled, not tokenized)

Discrete `fontSize` values found across the four sampled screens. These are per-screen literals, **not** a scale — the same semantic role uses different sizes on different screens.

| px | Typical role | Cite (example) |
|---|---|---|
| 9–10 | micro labels, units, badge text | `index.tsx:1911,1977`; `index.tsx:2008` |
| 11 | tab label, small caption | `_layout.tsx:119`; `index.tsx:1792` |
| 12–13 | secondary / meta | `index.tsx:1737,1808` |
| 14–15 | body, list rows, buttons | `index.tsx:1670`; `weather.tsx:834` |
| 16 | emphasis body / card value | `index.tsx:1797,2015` |
| 18 | section titles, stat values | `index.tsx:1929,1917` |
| 24–26 | screen titles / field name | `weather.tsx:809`; `detail-lahan-page.tsx:1198` |
| 32 | weather temperature | `weather.tsx:910` |
| 56 | home hero temperature | `index.tsx:1851` |

Weights in use: `"400"`, `"500"`, `"600"`, `"700"`, and the string `"bold"` (mixed with numeric weights, e.g. `index.tsx:1750,1930`). `letterSpacing` appears ad hoc (`-2` on the 56px temp `index.tsx:1854`; `0.5` uppercase CTA `empty-state-lahan.tsx:116`).

### 3.3 Spacing & radius (sampled)

Spacing is **roughly** but not strictly a 4-pt system. Recurring paddings: `4, 6, 8, 10, 12, 14, 16, 18, 20, 24`; recurring vertical rhythm `marginBottom: 16 / 20 / 24`; header top-padding varies per screen (`76` home `index.tsx:1644`, `50` weather `weather.tsx:795`).

Border-radius values in use: `8, 11, 12, 13, 14, 16, 18, 20, 24, 26` (26 = the circular tab icon slot `_layout.tsx:137`). Card radius clusters at **20** (`index.tsx:1771`, `weather.tsx:888`) and **24** (`detail-lahan-page.tsx:1147`); chips/badges at **12** (`index.tsx:1805`). Elevation is a repeated shadow recipe: `shadowColor:#000, shadowOffset:{0,2}, shadowOpacity:0.06–0.1, shadowRadius:8, elevation:2` (e.g. `weather.tsx:940-945`).

**This section is the reference for M4 tokenization.** The values above are the empirical set a `constants/` spacing/radius/type token module should encode; the goal is to collapse the duplication, not to invent new values.

---

## 4 · Screen map [As-built]

Derived from `app/` file-based routing (`expo-router`). Ordered by user flow.

| # | Route | Screen | Purpose |
|---|---|---|---|
| 0 | `app/index.tsx` | Root redirect | Redirects to `/splash` (`app/index.tsx:4`). |
| 1 | `app/splash.tsx` | Splash | Branded launch screen; routes onward via `useRouter` (`splash.tsx:13`). |
| 2 | `app/onboarding.tsx` | Onboarding | Single welcome screen — "Selamat Datang di MATANI" + "Mulai Sekarang" CTA (`onboarding.tsx:23,48`). |
| 3 | `app/auth/index.tsx` | Auth redirect | Redirects to `/auth/login` (`auth/index.tsx:3`). |
| 4 | `app/auth/login.tsx` | Login | Supabase email/password sign-in. |
| 5 | `app/auth/signup.tsx` | Sign-up | Supabase account creation. |
| 6 | `app/(tabs)/index.tsx` | **Beranda** (Home) | Dashboard: NDVI status card, weather card, field carousel (`_layout.tsx:67-73`). |
| 7 | `app/(tabs)/explore.tsx` | **Ladang** (Fields) | Map-based field list + interactive polygon drawing; per-field NDVI (`_layout.tsx:74-80`). |
| 8 | `app/(tabs)/education.tsx` | **Edukasi** (Education) | Article list with filter/sort (`_layout.tsx:81-87`). |
| 9 | `app/(tabs)/weather.tsx` | **Cuaca** (Weather) | Current conditions, metric grid, risk alert (`_layout.tsx:88-94`). |
| 10 | `app/(tabs)/profile.tsx` | **Profil** (Profile) | Account and saved-field facts, sign-out, explicit unavailable notification/metric states, and preview-only achievements (`_layout.tsx:95-101`; DEC-20). |
| 11 | `app/detail-lahan-page.tsx` | Field detail | Per-field hero, NDVI history chart, advisory tabs. **NDVI history is fully synthetic** (§ 5). |
| 12 | `app/detail-education-page.tsx` | Article detail | Full education article view. |
| 13 | `app/notifications.tsx` | Notifications | Explicit unavailable state: no generation, storage, or delivery system exists (`notifications.tsx`, DEC-20). |
| 14 | `app/modal.tsx` | Modal | **Expo starter boilerplate** ("This is a modal", `modal.tsx:10`) — not a real Matani surface; M4 removal candidate. |

---

## 5 · Data-state presentation rules [Thesis — normative]

These rules are **normative guidance**, inherited from [`../AGENTS.md`](../AGENTS.md) § Honesty constraints (DEC-10) and the vocabulary in [`context-dump.md`](context-dump.md) § 7. They describe how the interface **must** present each data state — not what it does today. The canonical description of the *current* (non-compliant) provenance lives in [`project-architecture.md`](project-architecture.md) § Current measurement provenance; do not restate it here — link to it.

| State | Presentation rule (normative) |
|---|---|
| **measured** | Show the value **with its acquisition date** and a quality/valid-pixel indication (e.g. cloud-masked valid-pixel fraction). A measured NDVI/NDMI number never appears without provenance. |
| **unavailable** | A **first-class designed state** that states the *reason* — "no cloud-free acquisition in window", "no acquisition", "quota exhausted" — without fabricating a number. The `unknown` token (`constants/ndvi.ts:47-54`, "Data Tidak Tersedia") is the anchor for this state, but must still be extended to carry provider rejection reasons in M2. |
| **prototype** | Partially-wired, non-provenance-safe values must be **visibly marked as not measured** — never rendered identically to a measured value. |
| **fixture** | Test data must always be **labeled as test data** and never presented as live/measured. |

**Current presentation (as-built, 2026-07-27).** The Ladang surface still seeds and falls back to synthetic NDVI, but its record is tagged `fixture` and its card says “Simulasi demo” / “Bukan pengukuran satelit” (`app/(tabs)/explore.tsx:320-343,2050-2072`). The fully synthetic detail screen displays a persistent fixture banner that scopes all graph/date/estimate/risk/recommendation output as non-measured and non-diagnostic (`app/detail-lahan-page.tsx:710-723`). This closes the indistinguishable-presentation defect; it does **not** close the M2 requirement to remove production fixture substitution and show reason-bearing `unavailable` outcomes (canonical provenance wording: [`project-architecture.md`](project-architecture.md) § Current measurement provenance).

The Profile and Notifications surfaces also follow the unavailable/preview rule after the
same-day cross-check: no functional-looking alert switches, activity counters, NDVI
average, productivity/health scores, or expertise claims are shown without a real writer.
Actual account/field facts remain visible; unsupported capabilities are labeled
unavailable and achievement cards are labeled preview-only (`app/(tabs)/profile.tsx`,
`app/notifications.tsx`; DEC-20).

---

## 6 · Component inventory [As-built]

### 6.1 Real Matani components

| Component | Role | Cite |
|---|---|---|
| `components/drawing-mode-indicator.tsx` | Floating banner during polygon drawing ("Mode Menggambar Aktif • N titik"), orange `#FF5722` | `drawing-mode-indicator.tsx:9-27` |
| `components/empty-state-lahan.tsx` | Empty-fields onboarding: leaf icon, CTA, 3-step how-to | `empty-state-lahan.tsx:8-69` |
| `components/haptic-tab.tsx` | Tab-bar button wrapper adding iOS haptic feedback on press | `haptic-tab.tsx:5-18` |
| NDVI history chart | Rendered inline in the detail screen via `react-native-svg` (`Svg`/`Path`/`SvgLinearGradient`), **not** a shared component | `detail-lahan-page.tsx:16-21,381-394` |
| Weather-icon mapping | `utils/weather-icons.ts` maps provider codes → 12 custom PNGs in `assets/weather-icons/` | `weather-icons.ts:18-32,43-68` |

The weather-icon set is a real design asset: 12 PNGs (`Icon=Sunny.png`, `Icon=Cloudy.png`, `Icon=Rainy.png`, `…Thunderstorm`, `…Snowfall`, `…Night`, etc.), keyed by `WeatherIconKey` with a `default` → Cloudy fallback (`weather-icons.ts:31,40`). **Honest caveat:** the code mapping is **AccuWeather-coded** (`mapAccuWeatherCodeToIconKey`, `weather-icons.ts:43`), but the default weather provider is now **Open-Meteo** (DEC-07); the code-to-icon map will need remapping to WMO codes when the provider swap lands — the PNG assets themselves are provider-agnostic.

### 6.2 Icon system

- **`@expo/vector-icons` — Ionicons** is the dominant icon set (≈122 uses across `app/` + `components/`; e.g. `drawing-mode-indicator.tsx:1`, `empty-state-lahan.tsx:1`).
- **Feather** is used only for the five tab-bar icons (`app/(tabs)/_layout.tsx:1,50`).
- **MaterialIcons** appears in a few places (≈5 uses).
- Custom **weather PNGs** (§ 6.1) are the only raster icon set.

**[Thesis]:** standardize on one vector family (Ionicons is the incumbent) plus the weather PNGs; the Feather/Ionicons/MaterialIcons mix is incidental, not intentional.

### 6.3 Expo starter boilerplate (M4 removal candidates)

Leftover from the Expo template. **Honest status — not all are safely deletable yet:**

| Component | Imported by real screens? | Status |
|---|---|---|
| `components/hello-wave.tsx` | No (0) | Unused — safe to remove |
| `components/parallax-scroll-view.tsx` | No (0) | Unused — safe to remove |
| `components/ui/collapsible.tsx` | No (0) | Unused — safe to remove |
| `components/external-link.tsx` | No (0) | Unused — safe to remove |
| `components/ui/icon-symbol.tsx` (+ `.ios.tsx`) | 1 (via themed/ui only) | Boilerplate — remove with themed set |
| `components/themed-text.tsx` | **Yes** — education, explore, profile, weather, detail-education, modal | ⚠️ **Still entangled** — cannot delete without refactor |
| `components/themed-view.tsx` | **Yes** — 8 real screens | ⚠️ **Still entangled** — cannot delete without refactor |
| `app/modal.tsx` | (route) | Boilerplate "This is a modal" screen (`modal.tsx:10`) |
| `constants/theme.ts` | No brand usage (§ 2.3) | Unused boilerplate |

`ThemedText` / `ThemedView` are Expo-starter components but are **actively imported by several real Matani screens** (verified above), so M4 must *refactor them out*, not merely delete them. This is a genuine bit of code debt, not a clean removal.

---

## 7 · Voice & copy

### 7.1 As-built

UI copy is **Indonesian throughout** (DEC-02 retains ID as the product's own words; glossary: [`context-dump.md`](context-dump.md) § 7). Tone is **plain, farmer-facing, minimal jargon**: tab labels are everyday words ("Beranda", "Ladang", "Cuaca"); onboarding is warm ("Selamat Datang di MATANI", "Solusi Pertanian Cerdas", `onboarding.tsx:23,38`); the empty state coaches step-by-step in second person ("Ketuk pada peta untuk menandai sudut-sudut lahan Anda", `empty-state-lahan.tsx:51`). The NDVI titles now describe **greenness ranges**, not diagnosed health ("Kehijauan Tinggi/Sedang/Rendah", "NDVI Negatif", `ndvi.ts:15-44`), and the detail screen explains HYP-04 before showing its fixture demonstration (`detail-lahan-page.tsx:105-109,710-723`).

### 7.2 Normative honesty copy [Thesis]

Data-state copy (§ 5) must state absence and provenance plainly, in the same farmer-facing register — **proposed patterns, not current strings:**

- *Unavailable:* "Data satelit belum tersedia" + reason, e.g. "tertutup awan pada tanggal terakhir" (cloud), "belum ada pemotretan baru" (no acquisition), "kuota pemantauan habis" (quota).
- *Measured:* always paired with an acquisition date — e.g. "Diukur 17 Jul 2026" — and a quality note.
- *Prototype / fixture:* explicitly flagged. Current strings are "Data prototipe", "Simulasi demo", and "Bukan pengukuran satelit" (`explore.tsx:145-153,2050-2072`), plus the persistent detail-screen fixture banner (`detail-lahan-page.tsx:710-723`).

The current `unknown` string "Belum ada nilai NDVI dengan provenance pengukuran yang lengkap" (`ndvi.ts:50`) is the right register — extend it to name the provider/quality rejection *reason* in M2, per § 5. The current code does not yet contain reason-bearing unavailable copy.

---

*End of design guidelines. All [As-built] claims are CODE-cited; all [Thesis] clauses are normative guidance distinct from current code. Token consolidation, green unification, contrast fixes, and boilerplate removal are M4; honest data-state presentation is M2 ([`implementation-plan.md`](implementation-plan.md)).*
