/**
 * Integration: replays the REAL event path a user takes to reach the City
 * picker — single-press events as the glasses actually deliver them (sysEvent,
 * eventType undefined) — proving the wiring from event → gesture → state →
 * rendered content works end to end. This guards the bug where clicks (sysEvent)
 * were dropped because only textEvent was handled.
 */
import { describe, expect, it } from 'vitest'
import { buildMenuView, buildPickerView } from './format'
import { gestureFromEvent, type GlassesEvent } from './input'
import { DEFAULT_SETTINGS, menuItemByKey } from './settings'
import { reduce, type AppState } from './state'

// Mirror of main.ts: route event → gesture → reduce.
function dispatch(state: AppState, event: GlassesEvent): AppState {
  const gesture = gestureFromEvent(event)
  if (!gesture) return state
  return reduce(state, gesture).state
}

// Mirror of main.ts renderContent for the menu/picker modes.
function render(state: AppState): string {
  if (state.mode === 'menu') return buildMenuView(state.settings, state.menuIndex)
  if (state.mode === 'picker') {
    const item = menuItemByKey(state.activeKey!)
    return buildPickerView(item.label, item.options, state.pickerIndex)
  }
  return '(main)'
}

// How the glasses actually deliver a single press on a text container.
const SINGLE_PRESS: GlassesEvent = { sysEvent: {} } // eventType 0 omitted by protobuf

describe('path: main → (press) Settings → (press) City picker', () => {
  it('a single press opens Settings, another opens a non-empty city list', () => {
    let state: AppState = {
      mode: 'main',
      settings: DEFAULT_SETTINGS,
      menuIndex: 0,
      activeKey: null,
      pickerIndex: 0,
    }

    state = dispatch(state, SINGLE_PRESS) // → Settings menu
    expect(state.mode).toBe('menu')

    state = dispatch(state, SINGLE_PRESS) // City is row 0 → city picker
    expect(state.mode).toBe('picker')
    expect(state.activeKey).toBe('city')

    const content = render(state)
    expect(content).toContain('City')
    expect(content).toContain('Mecca')
  })
})
