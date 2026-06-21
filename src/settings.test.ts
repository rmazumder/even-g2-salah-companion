import { describe, expect, it } from 'vitest'
import {
  calcParamsFor,
  DEFAULT_SETTINGS,
  MENU_ITEMS,
  methodShort,
  resolveLocation,
  sanitizeSettings,
  type Settings,
} from './settings'

describe('calcParamsFor', () => {
  it('maps madhab to adhan correctly', () => {
    expect(calcParamsFor({ ...DEFAULT_SETTINGS, madhab: 'Hanafi' }).madhab).toBe('hanafi')
    expect(calcParamsFor({ ...DEFAULT_SETTINGS, madhab: 'Shafi' }).madhab).toBe('shafi')
  })

  it('applies the chosen method (distinct Isha angles)', () => {
    const mwl = calcParamsFor({ ...DEFAULT_SETTINGS, method: 'MuslimWorldLeague' })
    const egypt = calcParamsFor({ ...DEFAULT_SETTINGS, method: 'Egyptian' })
    expect(mwl.ishaAngle).not.toEqual(egypt.ishaAngle)
  })
})

describe('sanitizeSettings', () => {
  it('falls back to defaults for unknown/empty values', () => {
    expect(sanitizeSettings(null)).toEqual(DEFAULT_SETTINGS)
    expect(sanitizeSettings({ cityId: 'atlantis', method: 'Bogus' as any, madhab: 'x' as any })).toEqual(
      DEFAULT_SETTINGS,
    )
  })

  it('keeps valid values', () => {
    const s: Settings = {
      ...DEFAULT_SETTINGS,
      cityId: 'london',
      method: 'Karachi',
      madhab: 'Shafi',
    }
    expect(sanitizeSettings(s)).toEqual(s)
  })
})

describe('resolveLocation', () => {
  it('returns the city when mode is city', () => {
    const s: Settings = { ...DEFAULT_SETTINGS, locationMode: 'city', cityId: 'dhaka' }
    expect(resolveLocation(s).name).toBe('Dhaka')
  })

  it('returns the auto coords when mode is auto and present', () => {
    const s: Settings = {
      ...DEFAULT_SETTINGS,
      locationMode: 'auto',
      autoLocation: { latitude: 1, longitude: 2, timeZone: 'Asia/Dhaka', label: 'Current location' },
    }
    const loc = resolveLocation(s)
    expect(loc.name).toBe('Current location')
    expect(loc.latitude).toBe(1)
    expect(loc.timeZone).toBe('Asia/Dhaka')
  })

  it('falls back to the city when mode is auto but coords are missing', () => {
    const s: Settings = { ...DEFAULT_SETTINGS, locationMode: 'auto', autoLocation: null, cityId: 'mecca' }
    expect(resolveLocation(s).name).toBe('Mecca')
  })
})

describe('sanitizeSettings location handling', () => {
  it('defaults locationMode to city and autoLocation to null', () => {
    const s = sanitizeSettings({ cityId: 'dhaka', method: 'Karachi', madhab: 'Hanafi' } as never)
    expect(s.locationMode).toBe('city')
    expect(s.autoLocation).toBeNull()
  })

  it('keeps a valid auto location', () => {
    const s = sanitizeSettings({
      locationMode: 'auto',
      cityId: 'mecca',
      autoLocation: { latitude: 10, longitude: 20, timeZone: 'Asia/Dhaka', label: 'Current location' },
      method: 'MuslimWorldLeague',
      madhab: 'Hanafi',
    } as never)
    expect(s.locationMode).toBe('auto')
    expect(s.autoLocation?.latitude).toBe(10)
  })

  it('downgrades to city when auto coords are invalid', () => {
    const s = sanitizeSettings({
      locationMode: 'auto',
      cityId: 'mecca',
      autoLocation: { latitude: NaN, longitude: 20, timeZone: '', label: '' },
      method: 'MuslimWorldLeague',
      madhab: 'Hanafi',
    } as never)
    expect(s.locationMode).toBe('city')
    expect(s.autoLocation).toBeNull()
  })
})

describe('MENU_ITEMS', () => {
  it('get/set round-trips for every setting', () => {
    for (const item of MENU_ITEMS) {
      const target = item.options.at(-1)!.id
      const updated = item.set(DEFAULT_SETTINGS, target)
      expect(item.get(updated)).toBe(target)
    }
  })

  it('exposes city, method, and madhab', () => {
    expect(MENU_ITEMS.map((m) => m.key)).toEqual(['city', 'method', 'madhab'])
  })
})

describe('methodShort', () => {
  it('returns a compact label', () => {
    expect(methodShort('MuslimWorldLeague')).toBe('MWL')
    expect(methodShort('NorthAmerica')).toBe('ISNA')
  })
})
