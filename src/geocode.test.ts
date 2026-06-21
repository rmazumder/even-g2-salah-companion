import { describe, expect, it, vi } from 'vitest'
import { searchCities } from './geocode'

function jsonFetch(body: unknown, ok = true): typeof fetch {
  return vi.fn(async () => ({ ok, json: async () => body }) as Response) as unknown as typeof fetch
}

const SAMPLE = {
  results: [
    { name: 'Dhaka', latitude: 23.7104, longitude: 90.4074, timezone: 'Asia/Dhaka', country: 'Bangladesh', country_code: 'BD' },
    { name: 'Dhaka', latitude: 24.0, longitude: 90.0, timezone: 'Asia/Dhaka', country: 'Bangladesh', country_code: 'BD', admin1: 'Other' },
  ],
}

describe('searchCities', () => {
  it('maps API results to GeocodeResult[]', async () => {
    const f = jsonFetch(SAMPLE)
    const out = await searchCities('dhaka', f)
    expect(out).toHaveLength(2)
    expect(out[0]).toEqual({
      name: 'Dhaka',
      country: 'BD',
      latitude: 23.7104,
      longitude: 90.4074,
      timeZone: 'Asia/Dhaka',
    })
    expect(f).toHaveBeenCalledOnce()
  })

  it('returns [] for empty or short queries without calling fetch', async () => {
    const f = jsonFetch(SAMPLE)
    expect(await searchCities('', f)).toEqual([])
    expect(await searchCities(' a ', f)).toEqual([])
    expect(f).not.toHaveBeenCalled()
  })

  it('returns [] when the API has no results', async () => {
    expect(await searchCities('zzzzzz', jsonFetch({}))).toEqual([])
  })

  it('returns [] on a non-ok response', async () => {
    expect(await searchCities('dhaka', jsonFetch(SAMPLE, false))).toEqual([])
  })

  it('returns [] when fetch throws', async () => {
    const f = vi.fn(async () => {
      throw new Error('network')
    }) as unknown as typeof fetch
    expect(await searchCities('dhaka', f)).toEqual([])
  })

  it('drops entries missing coordinates or timezone', async () => {
    const body = {
      results: [
        { name: 'Good', latitude: 1, longitude: 2, timezone: 'Asia/Dhaka', country_code: 'BD' },
        { name: 'NoTz', latitude: 1, longitude: 2, country_code: 'BD' },
        { name: 'NoLat', longitude: 2, timezone: 'Asia/Dhaka', country_code: 'BD' },
      ],
    }
    const out = await searchCities('xx', jsonFetch(body))
    expect(out).toHaveLength(1)
    expect(out[0].name).toBe('Good')
  })
})
