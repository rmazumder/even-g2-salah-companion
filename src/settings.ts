/**
 * User settings: which city, calculation method, and Asr madhab.
 *
 * Table-driven (`MENU_ITEMS`) so the reducer and views stay generic — adding a
 * new setting is a single entry here. Pure except for `calcParamsFor`, which
 * builds an adhan parameter object.
 */
import { CalculationMethod, CalculationParameters, Madhab } from 'adhan'
import { CITIES, cityById } from './cities'
import type { PrayerLocation } from './prayer'

export type MethodId =
  | 'MuslimWorldLeague'
  | 'NorthAmerica'
  | 'UmmAlQura'
  | 'Egyptian'
  | 'Karachi'
  | 'Dubai'
  | 'Qatar'
  | 'Kuwait'
  | 'Singapore'
  | 'Turkey'
  | 'Tehran'
  | 'MoonsightingCommittee'

export type MadhabId = 'Shafi' | 'Hanafi'

export interface AutoLocation {
  latitude: number
  longitude: number
  timeZone: string
  label: string
}

export type LocationMode = 'auto' | 'city' | 'search'

export interface Settings {
  locationMode: LocationMode
  cityId: string
  autoLocation: AutoLocation | null
  searchLocation: AutoLocation | null
  method: MethodId
  madhab: MadhabId
}

export interface Option {
  id: string
  label: string
}

/** Curated adhan methods. `label` shows in the picker, `short` in the footer. */
export const METHODS: { id: MethodId; label: string; short: string }[] = [
  { id: 'MuslimWorldLeague', label: 'Muslim World League', short: 'MWL' },
  { id: 'NorthAmerica', label: 'ISNA (N. America)', short: 'ISNA' },
  { id: 'UmmAlQura', label: 'Umm al-Qura', short: 'UmmQ' },
  { id: 'Egyptian', label: 'Egyptian', short: 'Egypt' },
  { id: 'Karachi', label: 'Karachi', short: 'Krch' },
  { id: 'Dubai', label: 'Dubai', short: 'Dubai' },
  { id: 'Qatar', label: 'Qatar', short: 'Qatar' },
  { id: 'Kuwait', label: 'Kuwait', short: 'Kwt' },
  { id: 'Singapore', label: 'Singapore', short: 'Sgp' },
  { id: 'Turkey', label: 'Turkey', short: 'Turk' },
  { id: 'Tehran', label: 'Tehran', short: 'Thrn' },
  { id: 'MoonsightingCommittee', label: 'Moonsighting', short: 'Moon' },
]

export const MADHABS: { id: MadhabId; label: string; short: string }[] = [
  { id: 'Shafi', label: 'Standard (Shafi)', short: 'Shafi' },
  { id: 'Hanafi', label: 'Hanafi', short: 'Hanafi' },
]

export const DEFAULT_SETTINGS: Settings = {
  locationMode: 'city',
  cityId: 'mecca',
  autoLocation: null,
  searchLocation: null,
  method: 'MuslimWorldLeague',
  madhab: 'Hanafi',
}

/** Resolve the effective prayer location from settings. */
export function resolveLocation(s: Settings): PrayerLocation {
  if (s.locationMode === 'auto' && s.autoLocation) {
    const a = s.autoLocation
    return { name: a.label, latitude: a.latitude, longitude: a.longitude, timeZone: a.timeZone }
  }
  if (s.locationMode === 'search' && s.searchLocation) {
    const a = s.searchLocation
    return { name: a.label, latitude: a.latitude, longitude: a.longitude, timeZone: a.timeZone }
  }
  const c = cityById(s.cityId)
  return { name: c.name, latitude: c.latitude, longitude: c.longitude, timeZone: c.timeZone }
}

/** True when an AutoLocation has usable, finite coordinates and a timezone. */
function isValidAutoLocation(a: unknown): a is AutoLocation {
  if (!a || typeof a !== 'object') return false
  const o = a as Record<string, unknown>
  return (
    typeof o.latitude === 'number' &&
    Number.isFinite(o.latitude) &&
    typeof o.longitude === 'number' &&
    Number.isFinite(o.longitude) &&
    typeof o.timeZone === 'string' &&
    o.timeZone.length > 0 &&
    typeof o.label === 'string'
  )
}

export function methodShort(id: MethodId): string {
  return METHODS.find((m) => m.id === id)?.short ?? id
}

export function madhabShort(id: MadhabId): string {
  return MADHABS.find((m) => m.id === id)?.short ?? id
}

/**
 * adhan method factories. Wrapped in arrows so `this` stays bound to
 * CalculationMethod regardless of how they're invoked.
 */
const METHOD_FACTORY: Record<MethodId, () => CalculationParameters> = {
  MuslimWorldLeague: () => CalculationMethod.MuslimWorldLeague(),
  NorthAmerica: () => CalculationMethod.NorthAmerica(),
  UmmAlQura: () => CalculationMethod.UmmAlQura(),
  Egyptian: () => CalculationMethod.Egyptian(),
  Karachi: () => CalculationMethod.Karachi(),
  Dubai: () => CalculationMethod.Dubai(),
  Qatar: () => CalculationMethod.Qatar(),
  Kuwait: () => CalculationMethod.Kuwait(),
  Singapore: () => CalculationMethod.Singapore(),
  Turkey: () => CalculationMethod.Turkey(),
  Tehran: () => CalculationMethod.Tehran(),
  MoonsightingCommittee: () => CalculationMethod.MoonsightingCommittee(),
}

export function calcParamsFor(s: Settings): CalculationParameters {
  const factory = METHOD_FACTORY[s.method] ?? METHOD_FACTORY.MuslimWorldLeague
  const params = factory()
  params.madhab = s.madhab === 'Hanafi' ? Madhab.Hanafi : Madhab.Shafi
  return params
}

/** Drop unknown values back to defaults (e.g. stale persisted settings). */
export function sanitizeSettings(s: Partial<Settings> | null | undefined): Settings {
  const cityId = CITIES.some((c) => c.id === s?.cityId) ? s!.cityId! : DEFAULT_SETTINGS.cityId
  const method = METHODS.some((m) => m.id === s?.method) ? s!.method! : DEFAULT_SETTINGS.method
  const madhab = MADHABS.some((m) => m.id === s?.madhab) ? s!.madhab! : DEFAULT_SETTINGS.madhab
  const autoLocation = isValidAutoLocation(s?.autoLocation) ? s!.autoLocation! : null
  const searchLocation = isValidAutoLocation(s?.searchLocation) ? s!.searchLocation! : null

  let locationMode: LocationMode = 'city'
  if (s?.locationMode === 'auto' && autoLocation) locationMode = 'auto'
  else if (s?.locationMode === 'search' && searchLocation) locationMode = 'search'

  return { locationMode, cityId, autoLocation, searchLocation, method, madhab }
}

// ---- Settings menu catalog -------------------------------------------------

export type SettingKey = 'city' | 'method' | 'madhab'

export interface MenuItem {
  key: SettingKey
  label: string
  options: Option[]
  /** Current option id for this setting. */
  get(s: Settings): string
  /** Return a new Settings with this setting changed to `id`. */
  set(s: Settings, id: string): Settings
  /** Short value label for the menu row / footer. */
  short(s: Settings): string
}

export const MENU_ITEMS: MenuItem[] = [
  {
    key: 'city',
    label: 'City',
    options: CITIES.map((c) => ({ id: c.id, label: c.name })),
    get: (s) => s.cityId,
    set: (s, id) => ({ ...s, cityId: id, locationMode: 'city' }),
    short: (s) => {
      if (s.locationMode === 'auto' && s.autoLocation) return s.autoLocation.label
      if (s.locationMode === 'search' && s.searchLocation) return s.searchLocation.label
      return CITIES.find((c) => c.id === s.cityId)?.name ?? s.cityId
    },
  },
  {
    key: 'method',
    label: 'Method',
    options: METHODS.map((m) => ({ id: m.id, label: m.label })),
    get: (s) => s.method,
    set: (s, id) => ({ ...s, method: id as MethodId }),
    short: (s) => methodShort(s.method),
  },
  {
    key: 'madhab',
    label: 'Asr',
    options: MADHABS.map((m) => ({ id: m.id, label: m.label })),
    get: (s) => s.madhab,
    set: (s, id) => ({ ...s, madhab: id as MadhabId }),
    short: (s) => madhabShort(s.madhab),
  },
]

export function menuItemByKey(key: SettingKey): MenuItem {
  return MENU_ITEMS.find((m) => m.key === key)!
}
