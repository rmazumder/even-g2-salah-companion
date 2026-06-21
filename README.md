# Salah — Even Realities G2 plugin

Shows today's five prayer (salah) times for a city you pick on the glasses, with
the next prayer highlighted and a live countdown. Prayer times are computed
**fully offline** on-device — no network, no location hardware, no microphone.

- **Configurable** on-glasses: city, calculation method (12 options), and Asr madhab
- **Defaults:** Mecca · Muslim World League · Hanafi
- **Display:** a single Even Hub text container, updated flicker-free

See the design spec: `../docs/superpowers/specs/2026-06-18-even-namaz-design.md`

## How it looks

```
 Fajr      01:02
 Dhuhr     13:03
▶Asr       18:39    in 2h 39m
 Maghrib   21:21
 Isha      01:02

 London · MWL · Hanafi
```

Settings menu (single press from the main view):

```
 Settings

 City      London
▶Method    MWL
 Asr       Hanafi

 tap open · 2x back
```

## Controls

| View        | Gesture       | Action                                  |
| ----------- | ------------- | --------------------------------------- |
| Prayer list | single press  | open settings                           |
| Prayer list | double press  | exit app                                |
| Settings    | swipe up/down | move between settings                   |
| Settings    | single press  | open the picker for that setting        |
| Settings    | double press  | back to prayer list                     |
| Picker      | swipe up/down | move selection                          |
| Picker      | single press  | select (saved for next time) → settings |
| Picker      | double press  | cancel → settings                       |

Works on the G2 temple touchpad or the optional R1 ring (same gestures).

## Project layout

```
src/
  cities.ts        seed city list (coords + IANA timezone) — add more here
  settings.ts      Settings type, method/madhab catalogs, adhan params, menu table
  prayer.ts        pure: computeSchedule(city, now, settings) — next prayer, rollover
  format.ts        pure: time/countdown formatting + main/menu/picker view strings
  state.ts         pure: gesture → state reducer (main → menu → picker)
  main.ts          SDK glue (the only file that touches the Even Hub bridge)
app.json           Even Hub manifest
public/icon.png    24×24 greyscale app icon
```

All logic is pure and unit-tested in Node; the SDK is isolated to `main.ts`.

## Calculation methods

Muslim World League, ISNA (N. America), Umm al-Qura, Egyptian, Karachi, Dubai,
Qatar, Kuwait, Singapore, Turkey, Tehran, Moonsighting. Asr madhab: Standard
(Shafi) or Hanafi. All computed offline by `adhan`.

## Develop

Requires Node 20 LTS or 22+.

```bash
npm install

npm test            # run the unit suite (vitest)
npm run typecheck   # tsc --noEmit
npm run dev         # vite dev server on :5173

# preview in the simulator (separate package)
npx evenhub-simulator http://localhost:5173

# test on real glasses: scan the QR with the Even Realities app
npm run qr
```

## Ship

```bash
npm run build                 # tsc && vite build  → dist/
npm run pack                  # → salah.ehpk
# then upload salah.ehpk via the dev portal at hub.evenrealities.com
```

## Extending

- **Add a city:** append to `CITIES` in `src/cities.ts` (needs `latitude`,
  `longitude`, IANA `timeZone`).
- **Add a setting:** add an entry to `MENU_ITEMS` in `src/settings.ts` — the
  menu, picker, and persistence pick it up automatically.
