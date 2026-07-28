# Suggested commit message

```text
feat(matani): align thesis, harden M0/M1 foundation, and target Expo SDK 54

- align the revised point-21 thesis with canonical .agent rules and the
  Matani Notion target-vs-implementation boundary
- correct Section E/F so the current bbox prototype is not described as
  polygon-exact or provenance-complete measurement
- label fixture, prototype, measured, and unavailable states consistently
  across mobile UI, backend prompts, research outputs, and documentation
- add authenticated backend boundaries, CORS allowlisting, request bounds,
  rate/quota controls, concurrency rejection, structured logs, and safe errors
- attach Supabase bearer tokens to satellite, weather, and AI mobile requests
  and keep generative summaries disabled by default
- add ordered Supabase migrations, RLS policies, pgTAP coverage, generated
  database types, fixture-first tests, and CI verification
- add the M1 feasibility workspace, versioned measurement-contract draft, and
  bounded exact-polygon CDSE pilot runner while withholding measured cadence
  until the representative-site study
- downgrade Expo 57 to Expo SDK 54 with React Native 0.81 and React 19.1,
  switch to SDK-compatible navigation imports, remove unused @expo/ui and
  expo-dev-client, and make Expo Go the default start workflow
- document local verification, unresolved M0/M1 gates, Expo Go physical-iOS
  limitations, and the current dependency-audit findings

Verification:
- npm run verify
- npx expo install --check
- npx expo-doctor@latest (18/18)
- iOS and Android Metro exports
- Expo Go start smoke test
- two clean Supabase resets and pgTAP 10/10

Remaining gates:
- developer-controlled secret rotation/restrictions and hosted checks
- remote CI execution
- measured M1 Indonesia feasibility study and cadence decision
- M2 exact-polygon, quality-gated, provenance-complete persistence pipeline
```
