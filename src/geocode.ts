/**
 * Online city lookup via the Open-Meteo Geocoding API (free, no key, CORS-OK).
 * Pure + injectable (`fetchFn`) so it is unit-testable without a network. Never
 * rejects — on any failure it returns [] so the UI degrades to "no results".
 */
export interface GeocodeResult {
  name: string
  /** ISO country code, e.g. "BD". */
  country: string
  latitude: number
  longitude: number
  timeZone: string
}

const ENDPOINT = 'https://geocoding-api.open-meteo.com/v1/search'
const MIN_QUERY_LENGTH = 2

interface RawResult {
  name?: string
  latitude?: number
  longitude?: number
  timezone?: string
  country?: string
  country_code?: string
}

export async function searchCities(
  query: string,
  fetchFn: typeof fetch = fetch,
): Promise<GeocodeResult[]> {
  const q = query.trim()
  if (q.length < MIN_QUERY_LENGTH) return []

  try {
    const url = `${ENDPOINT}?name=${encodeURIComponent(q)}&count=8&language=en&format=json`
    const res = await fetchFn(url)
    if (!res.ok) return []
    const body = (await res.json()) as { results?: RawResult[] }
    const results = body.results ?? []
    return results
      .filter(
        (r): r is RawResult & { latitude: number; longitude: number; timezone: string } =>
          typeof r.latitude === 'number' &&
          typeof r.longitude === 'number' &&
          typeof r.timezone === 'string' &&
          r.timezone.length > 0,
      )
      .map((r) => ({
        name: r.name ?? 'Unknown',
        country: r.country_code ?? r.country ?? '',
        latitude: r.latitude,
        longitude: r.longitude,
        timeZone: r.timezone,
      }))
  } catch {
    return []
  }
}
