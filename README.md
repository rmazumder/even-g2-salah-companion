# Salah Companion — Even Realities G2 plugin

Shows today's five prayer (salah) times **on the glasses HUD**, with the next
prayer highlighted, a live countdown, and today's Hijri date — all inside a
full-screen framed view. The paired phone companion app is for **settings only**;
it never shows the times themselves.

Pick your location three ways:

- **Use my location** — auto-detect via the phone's GPS (browser geolocation).
- **Search for a city** — type any city name; looked up online via the
  Open-Meteo geocoding API (returns coordinates + timezone).
- **On-glasses presets** — a built-in city list selectable from the glasses
  settings menu (works with no phone and no network).

Prayer times are computed on-device by [`adhan`](https://github.com/batoulapps/adhan-js);
only location detection / city search use GPS / network. Settings persist across
restarts via Even Hub storage.

- **Configurable:** location, calculation method (12 options), Asr madhab, and an
  idle **auto-close** timer for the glasses view
- **Defaults:** Mecca · Muslim World League · Hanafi · auto-close 5s
- **Glasses display:** a single full-screen, framed Even Hub text container,
  updated flicker-free

## Glasses HUD

A full-screen view enclosed by a rectangle frame:

```
 Mecca · Sun 21 Jun
 6 Muharram 1448 AH
──────────────────────
 Fajr       04:14
▶Dhuhr      12:23   in 2h 22m
 Asr        17:02
 Maghrib    19:06
 Isha       20:26

 MWL · Hanafi · tap for settings
```

On-glasses settings menu (single press from the main view):

```
 Settings

 City      London
▶Method    MWL
 Asr       Hanafi

 tap open · 2x back
```

The on-glasses City picker selects from the built-in presets (you can't type on
the touchpad). Auto-location, city search, and the auto-close timer live in the
phone companion.

## Companion app (phone)

Settings only — **no prayer times shown here** (those are on the glasses):

- **Location** toggle: *Use my location* (GPS) or *Choose a city*.
- **Search for a city** — debounced online lookup; tap a result to select it.
- **Calculation method** and **Asr madhab** selectors.
- **Auto-close on glasses** — Off · 5s · 10s · 30s · 1 min · 5 min. The glasses
  view dismisses after this much inactivity; any tap/swipe resets the timer.

## Controls (glasses)

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

Works on the G2 temple touchpad or the optional R1 ring (same gestures). The app
also auto-closes after the configured idle period.

## Project layout

```
src/
  cities.ts        built-in preset city list (coords + IANA timezone)
  settings.ts      Settings type (location mode, method, madhab, auto-close),
                   adhan params, resolveLocation, sanitize, on-glasses menu table
  location.ts      pure: browser-geolocation wrapper (injectable, tested)
  geocode.ts       pure: Open-Meteo city search (injectable fetch, tested)
  prayer.ts        pure: computeSchedule(location, now, settings)
  format.ts        pure: time/countdown/date formatting + glasses view strings
  state.ts         pure: gesture → state reducer (main → menu → picker)
  phone.ts         phone companion settings UI (DOM view layer, no SDK)
  phone.css        companion styling
  main.ts          SDK glue (the only file that touches the Even Hub bridge)
app.json           Even Hub manifest
public/icon.png    24×24 greyscale mosque app icon
publish/           store assets: cover, screenshots, STORE_LISTING.md
```

All logic is pure and unit-tested in Node; the SDK is isolated to `main.ts`, and
the phone view (`phone.ts`) uses only browser APIs (`fetch`, `navigator`).

## Permissions (`app.json`)

- `location` — detect the current location for accurate prayer times.
- `network` — city search, whitelisted to `https://geocoding-api.open-meteo.com`.

Without these granted on-device, auto-location and search are unavailable; the
on-glasses presets still work offline.

## Calculation methods

Muslim World League, ISNA (N. America), Umm al-Qura, Egyptian, Karachi, Dubai,
Qatar, Kuwait, Singapore, Turkey, Tehran, Moonsighting. Asr madhab: Standard
(Shafi) or Hanafi. All computed on-device by `adhan`.

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
```

Then install `salah.ehpk` via the Even Realities app or upload it to the dev
portal at hub.evenrealities.com. Store assets (cover, screenshots, listing copy)
live in [`publish/`](publish/).

> **Updating an existing install:** the app is identified by `package_id`
> (`com.ruhul.salahcompanion`). A direct `.ehpk` import won't overwrite an app
> already installed under the same `package_id` — bump `version` in `app.json`
> and uninstall the old build first, or publish via the dev portal (which
> handles version updates).

## Extending

- **Add a preset city:** append to `CITIES` in `src/cities.ts` (needs
  `latitude`, `longitude`, IANA `timeZone`).
- **Add a setting:** add an entry to `MENU_ITEMS` in `src/settings.ts` — the
  on-glasses menu, picker, and persistence pick it up automatically.
