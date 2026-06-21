/**
 * Phone-side geolocation detection. The glasses SDK has no GPS, so real
 * location comes from the companion webview's browser geolocation. Kept
 * injectable (GeolocationLike + getTimeZone) so it is unit-testable without a
 * real device. Returns an AutoLocation ready to store in Settings.
 */
import type { AutoLocation } from './settings'

/** Structural subset of the browser Geolocation API we depend on. */
export interface GeolocationLike {
  getCurrentPosition(
    success: (position: GeolocationPosition) => void,
    error?: (err: GeolocationPositionError) => void,
    options?: PositionOptions,
  ): void
}

const BASE_LABEL = 'Current location'

/**
 * Detect the current location. `getTimeZone` defaults to the device timezone.
 * `countrySuffix`, when provided, is appended to the label (e.g. "· BD").
 */
export function detectLocation(
  geo: GeolocationLike | null | undefined,
  getTimeZone: () => string,
  countrySuffix?: string,
): Promise<AutoLocation> {
  if (!geo) return Promise.reject(new Error('Geolocation unavailable'))
  return new Promise<AutoLocation>((resolve, reject) => {
    geo.getCurrentPosition(
      (pos) => {
        const label = countrySuffix ? `${BASE_LABEL} · ${countrySuffix}` : BASE_LABEL
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          timeZone: getTimeZone(),
          label,
        })
      },
      (err) => reject(new Error(err?.message || 'Geolocation failed')),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    )
  })
}

/** The device's current IANA timezone (helper for callers). */
export function deviceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}
