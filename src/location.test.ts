import { describe, expect, it } from 'vitest'
import { detectLocation, type GeolocationLike } from './location'

function fakeGeo(result: { coords?: { latitude: number; longitude: number }; error?: unknown }): GeolocationLike {
  return {
    getCurrentPosition(success, error) {
      if (result.coords) success({ coords: result.coords } as GeolocationPosition)
      else error?.(result.error as GeolocationPositionError)
    },
  }
}

describe('detectLocation', () => {
  it('resolves an AutoLocation from coords + timezone', async () => {
    const geo = fakeGeo({ coords: { latitude: 23.8103, longitude: 90.4125 } })
    const loc = await detectLocation(geo, () => 'Asia/Dhaka')
    expect(loc.latitude).toBe(23.8103)
    expect(loc.longitude).toBe(90.4125)
    expect(loc.timeZone).toBe('Asia/Dhaka')
    expect(loc.label).toBe('Current location')
  })

  it('applies an optional label suffix', async () => {
    const geo = fakeGeo({ coords: { latitude: 1, longitude: 2 } })
    const loc = await detectLocation(geo, () => 'Asia/Dhaka', 'BD')
    expect(loc.label).toBe('Current location · BD')
  })

  it('rejects when geolocation errors', async () => {
    const geo = fakeGeo({ error: { code: 1, message: 'denied' } })
    await expect(detectLocation(geo, () => 'Asia/Dhaka')).rejects.toThrow()
  })

  it('rejects when geolocation is unavailable', async () => {
    await expect(detectLocation(null, () => 'Asia/Dhaka')).rejects.toThrow(/unavailable/i)
  })
})
