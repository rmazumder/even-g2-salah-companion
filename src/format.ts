/**
 * Pure rendering of glasses content strings. No SDK — returns the exact text
 * that gets pushed into the single Text container. Layout is space-padded
 * because the firmware font offers no alignment/size controls.
 */
import type { Schedule } from './prayer'
import { MENU_ITEMS, methodShort, madhabShort, type Option, type Settings } from './settings'

const NAME_COLUMN = 10
/** How many rows to show at once in a picker (keeps the highlight on-screen). */
export const PICKER_WINDOW = 5

/** Absolute instant → "HH:mm" in the given IANA timezone. */
export function formatTime(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(instant)
}

/** Milliseconds → "1h 20m" / "5m". Rounds to the nearest minute, floored at 0. */
export function formatCountdown(ms: number): string {
  const totalMin = Math.max(0, Math.round(ms / 60000))
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

/** The main prayer-list view (all five prayers, next one marked + countdown). */
export function buildMainView(s: Schedule, settings: Settings): string {
  const rows = s.entries.map((e) => {
    const marker = e.name === s.nextName ? '▶' : ' '
    let row = marker + e.name.padEnd(NAME_COLUMN) + formatTime(e.time, s.location.timeZone)
    if (e.name === s.nextName) {
      row += '    in ' + formatCountdown(s.msUntilNext)
    }
    return row
  })
  const footer = ` ${s.location.name} · ${methodShort(settings.method)} · ${madhabShort(settings.madhab)}`
  return [...rows, '', footer, ' tap for settings'].join('\n')
}

/** The settings menu — each row shows the setting and its current value. */
export function buildMenuView(settings: Settings, menuIndex: number): string {
  const rows = MENU_ITEMS.map((item, i) => {
    const marker = i === menuIndex ? '▶' : ' '
    return marker + item.label.padEnd(NAME_COLUMN) + item.short(settings)
  })
  return [' Settings', '', ...rows, '', ' tap open · 2x back'].join('\n')
}

/**
 * A generic option picker (city, method, madhab). Shows a window of options
 * around `index` so the highlighted one is always visible.
 */
export function buildPickerView(title: string, options: Option[], index: number): string {
  const total = options.length
  const windowSize = Math.min(PICKER_WINDOW, total)
  let start = index - Math.floor(windowSize / 2)
  start = Math.max(0, Math.min(start, total - windowSize))

  const rows: string[] = []
  for (let i = start; i < start + windowSize; i++) {
    rows.push((i === index ? '▶' : ' ') + options[i].label)
  }
  return [` ${title}`, '', ...rows, '', ' tap select · 2x back'].join('\n')
}
