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

/** 4-char row prefix: indent + cursor or indent + blanks. Keeps every row's label aligned. */
const CURSOR_ON = '  ▶ '
const CURSOR_OFF = '    '
/** Indented horizontal divider that visually frames each view. */
const RULE = '─'.repeat(22)
/** Approximate target width for left/right footer alignment (font isn't monospaced). */
const FOOTER_WIDTH = 32

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

/** Today's Gregorian date in the given timezone, e.g. "Sun 21 Jun". */
export function formatGregorianDate(instant: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).formatToParts(instant)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  return `${get('weekday')} ${get('day')} ${get('month')}`
}

/** Today's Hijri (Umm al-Qura) date, e.g. "23 Ramadan 1447 AH". */
export function formatHijriDate(instant: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-US-u-ca-islamic-umalqura', {
    timeZone,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).formatToParts(instant)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  return `${get('day')} ${get('month')} ${get('year')} AH`
}

/** Hijri "day MonthName" (no year), e.g. "8 Muharram" — fits the consolidated header. */
export function formatHijriShort(instant: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-US-u-ca-islamic-umalqura', {
    timeZone,
    day: 'numeric',
    month: 'long',
  }).formatToParts(instant)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  return `${get('day')} ${get('month')}`
}

function padBetween(left: string, right: string, total: number): string {
  const gap = Math.max(1, total - left.length - right.length)
  return left + ' '.repeat(gap) + right
}

/** The main prayer-list view: dated header, top rule, five prayers, bottom rule, footer. */
export function buildMainView(s: Schedule, settings: Settings): string {
  const today = s.entries[0]?.time ?? s.nextTime
  const tz = s.location.timeZone
  const greg = formatGregorianDate(today, tz)
  const hijri = formatHijriShort(today, tz)
  const header = ` ${s.location.name} · ${greg} · ${hijri}`

  const rows = s.entries.map((e) => {
    const cursor = e.name === s.nextName ? CURSOR_ON : CURSOR_OFF
    let row = cursor + e.name.padEnd(NAME_COLUMN) + formatTime(e.time, tz)
    if (e.name === s.nextName) {
      row += '    in ' + formatCountdown(s.msUntilNext)
    }
    return row
  })

  const footer = padBetween(
    ` ${methodShort(settings.method)} · ${madhabShort(settings.madhab)}`,
    'tap ▷',
    FOOTER_WIDTH,
  )
  return [header, RULE, ...rows, RULE, footer].join('\n')
}

/** The settings menu — each row shows the setting and its current value. */
export function buildMenuView(settings: Settings, menuIndex: number): string {
  const rows = MENU_ITEMS.map((item, i) => {
    const cursor = i === menuIndex ? CURSOR_ON : CURSOR_OFF
    return cursor + item.label.padEnd(NAME_COLUMN) + item.short(settings)
  })
  return [' Settings', RULE, ...rows, RULE, ' tap open · 2x back'].join('\n')
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
    rows.push((i === index ? CURSOR_ON : CURSOR_OFF) + options[i].label)
  }
  return [` ${title}`, RULE, ...rows, RULE, ' tap select · 2x back'].join('\n')
}
