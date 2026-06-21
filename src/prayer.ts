/**
 * Pure prayer-time computation. No SDK, no DOM, no globals — fully testable.
 *
 * Convention is fixed by product decision: Muslim World League + Hanafi Asr.
 * `adhan` returns absolute `Date` instants; the calculation day is pinned to the
 * *city's* local calendar date (not the runtime's) so cities in other timezones
 * resolve to the correct day.
 */
import { Coordinates, PrayerTimes } from 'adhan'
import { calcParamsFor, type Settings } from './settings'

/** Anywhere prayer times can be computed for: a city or detected coordinates. */
export interface PrayerLocation {
  name: string
  latitude: number
  longitude: number
  timeZone: string
}

export type PrayerName = 'Fajr' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha'

export const PRAYER_NAMES: readonly PrayerName[] = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']

export interface PrayerEntry {
  name: PrayerName
  /** Absolute instant of this prayer today. */
  time: Date
}

export interface Schedule {
  location: PrayerLocation
  /** Today's five prayers in order. */
  entries: PrayerEntry[]
  /** The next upcoming prayer (one of the five names; rolls to tomorrow's Fajr after Isha). */
  nextName: PrayerName
  /** Absolute instant of the next prayer (may be tomorrow's Fajr). */
  nextTime: Date
  /** Milliseconds from `now` to `nextTime` (never negative). */
  msUntilNext: number
}

/** Calendar Y/M/D of `instant` as seen in `timeZone`. */
function civilDate(instant: Date, timeZone: string): { y: number; m: number; d: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant)
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value)
  return { y: get('year'), m: get('month'), d: get('day') }
}

/**
 * adhan derives the prayer day from the Date's calendar Y/M/D (ignoring its
 * time-of-day and offset). Constructing the day at local noon with the desired
 * Y/M/D yields the correct, timezone-independent prayer instants.
 */
function prayerTimesForDay(location: PrayerLocation, day: Date, settings: Settings): PrayerTimes {
  return new PrayerTimes(
    new Coordinates(location.latitude, location.longitude),
    day,
    calcParamsFor(settings),
  )
}

export function computeSchedule(location: PrayerLocation, now: Date, settings: Settings): Schedule {
  const { y, m, d } = civilDate(now, location.timeZone)
  const today = prayerTimesForDay(location, new Date(y, m - 1, d, 12), settings)

  const entries: PrayerEntry[] = [
    { name: 'Fajr', time: today.fajr },
    { name: 'Dhuhr', time: today.dhuhr },
    { name: 'Asr', time: today.asr },
    { name: 'Maghrib', time: today.maghrib },
    { name: 'Isha', time: today.isha },
  ]

  const nowMs = now.getTime()
  const upcoming = entries.find((e) => e.time.getTime() > nowMs)

  let nextName: PrayerName
  let nextTime: Date
  if (upcoming) {
    nextName = upcoming.name
    nextTime = upcoming.time
  } else {
    // After Isha → tomorrow's Fajr. new Date(...d+1...) normalizes month/year.
    const tomorrow = prayerTimesForDay(location, new Date(y, m - 1, d + 1, 12), settings)
    nextName = 'Fajr'
    nextTime = tomorrow.fajr
  }

  return {
    location,
    entries,
    nextName,
    nextTime,
    msUntilNext: Math.max(0, nextTime.getTime() - nowMs),
  }
}

export interface PreviewRow {
  name: PrayerName
  /** HH:mm in the city's timezone. */
  time: string
  isNext: boolean
}

/** Flattened, formatted schedule for the phone-side preview UI. */
export function buildPreview(location: PrayerLocation, now: Date, settings: Settings): PreviewRow[] {
  const schedule = computeSchedule(location, now, settings)
  const fmt = (d: Date) =>
    new Intl.DateTimeFormat('en-GB', {
      timeZone: location.timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d)
  return schedule.entries.map((e) => ({
    name: e.name,
    time: fmt(e.time),
    isNext: e.name === schedule.nextName,
  }))
}
