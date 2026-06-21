import { describe, expect, it } from 'vitest'
import { cityById } from './cities'
import {
  buildMainView,
  buildMenuView,
  buildPickerView,
  formatCountdown,
  formatTime,
} from './format'
import { computeSchedule } from './prayer'
import { DEFAULT_SETTINGS, METHODS, type Settings } from './settings'

const london = cityById('london')
const settings: Settings = { ...DEFAULT_SETTINGS, cityId: 'london', method: 'MuslimWorldLeague', madhab: 'Hanafi' }

describe('formatTime', () => {
  it('formats in the city timezone, 24-hour', () => {
    expect(formatTime(new Date('2026-06-18T17:39:00Z'), 'Europe/London')).toBe('18:39')
  })
  it('formats the same instant differently per timezone', () => {
    const inst = new Date('2026-06-18T12:00:00Z')
    expect(formatTime(inst, 'Asia/Dhaka')).toBe('18:00')
    expect(formatTime(inst, 'Europe/London')).toBe('13:00')
  })
})

describe('formatCountdown', () => {
  it('shows hours and minutes', () => expect(formatCountdown(80 * 60_000)).toBe('1h 20m'))
  it('shows minutes only under an hour', () => expect(formatCountdown(5 * 60_000)).toBe('5m'))
  it('floors negatives at 0', () => expect(formatCountdown(-1000)).toBe('0m'))
})

describe('buildMainView', () => {
  it('renders five aligned rows, marks the next prayer, and a settings-driven footer', () => {
    const s = computeSchedule(london, new Date('2026-06-18T15:00:00Z'), settings)
    const lines = buildMainView(s, settings).split('\n')
    expect(lines).toHaveLength(8) // 5 prayers + blank + footer + hint
    expect(lines[0]).toBe(' Fajr      01:02')
    expect(lines[2]).toMatch(/^▶Asr {7}18:39 {4}in /)
    expect(lines[6]).toBe(' London · MWL · Hanafi')
    expect(lines[7]).toBe(' tap for settings')
    expect(lines.filter((l) => l.startsWith('▶'))).toHaveLength(1)
  })

  it('reflects a different method/madhab in the footer', () => {
    const alt: Settings = { ...DEFAULT_SETTINGS, cityId: 'london', method: 'Karachi', madhab: 'Shafi' }
    const s = computeSchedule(london, new Date('2026-06-18T15:00:00Z'), alt)
    const lines = buildMainView(s, alt).split('\n')
    expect(lines[6]).toBe(' London · Krch · Shafi')
  })
})

describe('buildMenuView', () => {
  it('lists settings with current values and marks the highlighted row', () => {
    const lines = buildMenuView(settings, 1).split('\n')
    expect(lines[0]).toBe(' Settings')
    expect(lines).toContain(' City      London')
    expect(lines).toContain('▶Method    MWL')
    expect(lines).toContain(' Asr       Hanafi')
    expect(lines.filter((l) => l.startsWith('▶'))).toHaveLength(1)
  })
})

describe('buildPickerView', () => {
  const methodOpts = METHODS.map((m) => ({ id: m.id, label: m.label }))

  it('shows the title, marks the selection, and keeps it within the window', () => {
    const lines = buildPickerView('Method', methodOpts, 0).split('\n')
    expect(lines[0]).toBe(' Method')
    expect(lines).toContain('▶Muslim World League')
    expect(lines.filter((l) => l.startsWith('▶'))).toHaveLength(1)
  })

  it('windows around a deep selection so it stays visible', () => {
    const last = methodOpts.length - 1
    const lines = buildPickerView('Method', methodOpts, last).split('\n')
    expect(lines).toContain('▶' + methodOpts[last].label)
  })
})
