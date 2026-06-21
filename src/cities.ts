/**
 * Seed list of cities the user can pick from on-glasses.
 *
 * Each city carries its IANA `timeZone` so prayer times can be formatted in the
 * city's local wall-clock even when the device runtime is in another zone.
 * This is a plain array — add more cities by appending entries.
 */
export interface City {
  id: string
  name: string
  country: string
  latitude: number
  longitude: number
  timeZone: string
}

export const CITIES: City[] = [
  { id: 'mecca', name: 'Mecca', country: 'SA', latitude: 21.4225, longitude: 39.8262, timeZone: 'Asia/Riyadh' },
  { id: 'medina', name: 'Medina', country: 'SA', latitude: 24.4709, longitude: 39.6121, timeZone: 'Asia/Riyadh' },
  { id: 'istanbul', name: 'Istanbul', country: 'TR', latitude: 41.0082, longitude: 28.9784, timeZone: 'Europe/Istanbul' },
  { id: 'cairo', name: 'Cairo', country: 'EG', latitude: 30.0444, longitude: 31.2357, timeZone: 'Africa/Cairo' },
  { id: 'dubai', name: 'Dubai', country: 'AE', latitude: 25.2048, longitude: 55.2708, timeZone: 'Asia/Dubai' },
  { id: 'karachi', name: 'Karachi', country: 'PK', latitude: 24.8607, longitude: 67.0011, timeZone: 'Asia/Karachi' },
  { id: 'dhaka', name: 'Dhaka', country: 'BD', latitude: 23.8103, longitude: 90.4125, timeZone: 'Asia/Dhaka' },
  { id: 'london', name: 'London', country: 'GB', latitude: 51.5074, longitude: -0.1278, timeZone: 'Europe/London' },
  { id: 'newyork', name: 'New York', country: 'US', latitude: 40.7128, longitude: -74.006, timeZone: 'America/New_York' },
  { id: 'toronto', name: 'Toronto', country: 'CA', latitude: 43.6532, longitude: -79.3832, timeZone: 'America/Toronto' },
  { id: 'kualalumpur', name: 'Kuala Lumpur', country: 'MY', latitude: 3.139, longitude: 101.6869, timeZone: 'Asia/Kuala_Lumpur' },
  { id: 'jakarta', name: 'Jakarta', country: 'ID', latitude: -6.2088, longitude: 106.8456, timeZone: 'Asia/Jakarta' },
]

export const DEFAULT_CITY_ID = 'mecca'

export function cityById(id: string): City {
  return CITIES.find((c) => c.id === id) ?? CITIES.find((c) => c.id === DEFAULT_CITY_ID)!
}
