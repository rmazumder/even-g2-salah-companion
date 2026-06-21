import { describe, expect, it } from 'vitest'
import { cityById } from './cities'
import { computeSchedule, buildPreview, PRAYER_NAMES, type PrayerLocation } from './prayer'
import { DEFAULT_SETTINGS, type Settings } from './settings'

const london = cityById('london')
const dhaka = cityById('dhaka')

// MWL + Hanafi — the convention the canonical values below were generated with.
const mwlHanafi: Settings = { cityId: 'london', method: 'MuslimWorldLeague', madhab: 'Hanafi' }

/** Format an instant in a timezone as HH:mm for assertions. */
function hhmm(instant: Date, tz: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(instant)
}

describe('computeSchedule', () => {
  it('produces all five prayers in chronological order', () => {
    const s = computeSchedule(london, new Date('2026-06-18T10:00:00Z'), mwlHanafi)
    expect(s.entries.map((e) => e.name)).toEqual([...PRAYER_NAMES])
    const ms = s.entries.map((e) => e.time.getTime())
    expect(ms).toEqual([...ms].sort((a, b) => a - b))
  })

  it('matches canonical MWL + Hanafi times for London on 2026-06-18', () => {
    const s = computeSchedule(london, new Date('2026-06-18T10:00:00Z'), mwlHanafi)
    const t = Object.fromEntries(s.entries.map((e) => [e.name, hhmm(e.time, london.timeZone)]))
    expect(t).toEqual({
      Fajr: '01:02',
      Dhuhr: '13:03',
      Asr: '18:39',
      Maghrib: '21:21',
      Isha: '01:02',
    })
  })

  it('matches canonical times for Dhaka (different timezone) on 2026-06-18', () => {
    const s = computeSchedule(dhaka, new Date('2026-06-18T10:00:00Z'), mwlHanafi)
    const t = Object.fromEntries(s.entries.map((e) => [e.name, hhmm(e.time, dhaka.timeZone)]))
    expect(t).toEqual({
      Fajr: '03:43',
      Dhuhr: '12:00',
      Asr: '16:40',
      Maghrib: '18:48',
      Isha: '20:10',
    })
  })

  it('Hanafi Asr is later than Shafi Asr (madhab actually applied)', () => {
    const now = new Date('2026-06-18T10:00:00Z')
    const hanafi = computeSchedule(dhaka, now, { ...mwlHanafi, cityId: 'dhaka', madhab: 'Hanafi' })
    const shafi = computeSchedule(dhaka, now, { ...mwlHanafi, cityId: 'dhaka', madhab: 'Shafi' })
    const asrH = hanafi.entries.find((e) => e.name === 'Asr')!.time.getTime()
    const asrS = shafi.entries.find((e) => e.name === 'Asr')!.time.getTime()
    expect(asrH).toBeGreaterThan(asrS)
  })

  it('different methods yield different Isha (method actually applied)', () => {
    const now = new Date('2026-06-18T10:00:00Z')
    const mwl = computeSchedule(dhaka, now, { cityId: 'dhaka', method: 'MuslimWorldLeague', madhab: 'Hanafi' })
    const karachi = computeSchedule(dhaka, now, { cityId: 'dhaka', method: 'Karachi', madhab: 'Hanafi' })
    const ishaMwl = mwl.entries.find((e) => e.name === 'Isha')!.time.getTime()
    const ishaKar = karachi.entries.find((e) => e.name === 'Isha')!.time.getTime()
    expect(ishaMwl).not.toEqual(ishaKar)
  })

  it('selects the next upcoming prayer before Fajr', () => {
    const s = computeSchedule(dhaka, new Date('2026-06-17T20:00:00Z'), { ...mwlHanafi, cityId: 'dhaka' })
    expect(s.nextName).toBe('Fajr')
    expect(s.msUntilNext).toBeGreaterThan(0)
  })

  it('selects the next prayer mid-day', () => {
    const s = computeSchedule(dhaka, new Date('2026-06-18T07:00:00Z'), { ...mwlHanafi, cityId: 'dhaka' })
    expect(s.nextName).toBe('Asr')
  })

  it('rolls over to tomorrow Fajr after Isha', () => {
    const now = new Date('2026-06-18T16:00:00Z')
    const s = computeSchedule(dhaka, now, { ...mwlHanafi, cityId: 'dhaka' })
    expect(s.nextName).toBe('Fajr')
    expect(s.nextTime.getTime()).toBeGreaterThan(now.getTime())
    expect(s.msUntilNext).toBeLessThan(24 * 60 * 60 * 1000)
    expect(s.nextTime.getTime()).toBeGreaterThan(s.entries[0].time.getTime())
  })

  it('never returns a negative countdown', () => {
    const s = computeSchedule(london, new Date('2026-06-18T23:59:59Z'), mwlHanafi)
    expect(s.msUntilNext).toBeGreaterThanOrEqual(0)
  })
})

describe('computeSchedule with a plain PrayerLocation', () => {
  it('accepts any object with name/lat/long/timeZone', () => {
    const loc: PrayerLocation = {
      name: 'Current location',
      latitude: 23.8103,
      longitude: 90.4125,
      timeZone: 'Asia/Dhaka',
    }
    const s = computeSchedule(loc, new Date('2026-06-20T08:00:00Z'), DEFAULT_SETTINGS)
    expect(s.location.name).toBe('Current location')
    expect(s.entries).toHaveLength(5)
  })
})

describe('buildPreview', () => {
  it('returns five formatted rows with exactly one marked next', () => {
    const rows = buildPreview(london, new Date('2026-06-18T15:00:00Z'), mwlHanafi)
    expect(rows.map((r) => r.name)).toEqual([...PRAYER_NAMES])
    expect(rows.find((r) => r.name === 'Fajr')!.time).toBe('01:02')
    expect(rows.filter((r) => r.isNext)).toHaveLength(1)
    // At 16:00 BST the next prayer is Asr.
    expect(rows.find((r) => r.isNext)!.name).toBe('Asr')
  })
})
