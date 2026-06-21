# Namaz Times (Even G2) — Implementation Plan

Spec: `docs/superpowers/specs/2026-06-18-even-namaz-design.md`

## Tasks
- [x] Scaffold `even_namaz/` (package.json, tsconfig, vite, index.html, app.json, vitest config)
- [x] Install deps (adhan, SDK, cli, vite, vitest, typescript) and verify `adhan` API
- [x] `src/cities.ts` — seed city list with coords + IANA timezone
- [x] `src/prayer.ts` + test — `computeSchedule(city, now)` (MWL + Hanafi, next + countdown, rollover)
- [x] `src/format.ts` + test — time/countdown formatting (TZ-correct), main & picker view strings
- [x] `src/state.ts` + test — pure gesture reducer (main/picker modes, effects)
- [x] `src/main.ts` — SDK glue (bridge, lifecycle, events, tick, persistence)
- [x] `public/icon.png` — 24×24 greyscale icon
- [x] Run full test suite green; typecheck; build
- [x] Review section

## Review

Implemented as designed. Verification evidence:
- **Tests:** 22/22 passing (`vitest run`) across prayer/format/state.
- **Typecheck:** `tsc --noEmit` clean (strict, noUnusedLocals/Parameters).
- **Build:** `tsc && vite build` succeeds → `dist/` (87 kB JS).
- **Package:** `evenhub pack` → valid `namaz.ehpk` (36.5 kB).
- **Visual:** rendered `buildMainView`/`buildPickerView` match the spec layout.

Key correctness decisions proven in tests:
- Prayer instants pinned to the **city's** civil date (timezone-correct for
  cities outside the runtime zone) — verified against canonical adhan output
  for London and Dhaka.
- Next-prayer selection across pre-Fajr / mid-day / post-Isha rollover.
- Reducer transitions and effects for every gesture in both modes.

The Even Hub SDK turned out to be public on npm, so `main.ts` is written against
the real, installed type definitions (verified enum values and method
signatures) rather than guessed.

Not done (out of scope per spec): qibla, athan audio (no speaker), notifications,
multi-day view, phone-GPS auto-location.

## Follow-up: Settings page + rename to "Salah" (done)

User requests: add on-glasses settings (city, calculation method, Asr madhab),
ignore GPS, rename app to "Salah".

- [x] `src/settings.ts` — Settings type, 12-method + madhab catalogs, `calcParamsFor`,
      `sanitizeSettings`, table-driven `MENU_ITEMS`
- [x] `prayer.ts` — `computeSchedule(city, now, settings)` (method/madhab now selectable)
- [x] `format.ts` — dynamic footer + `buildMenuView` + generic `buildPickerView`
- [x] `state.ts` — expanded reducer: main → menu → picker
- [x] `main.ts` — settings persistence (one JSON key), three-view render
- [x] Rename: app.json `name`→"Salah", `package_id`→com.ruhul.salah, package.json, README
- [x] Tests updated + added (settings, menu, picker) — 36/36 pass
- [x] Typecheck (bumped to ES2022 lib for `.at`), build, pack → salah.ehpk

**Note on widgets:** user asked for a dashboard *widget*. Verified the widget
surface is NOT yet available to developers (docs list it as "coming"; SDK 0.0.10
has no widget-authoring API, only an auto-injected `widgetId`; no widget manifest
or CLI). Shipped the launchable plugin instead; code is structured to convert
easily when the widget surface lands.

Verification: 36/36 tests pass, typecheck clean, build OK (90 kB JS),
salah.ehpk packs (37.4 kB).
