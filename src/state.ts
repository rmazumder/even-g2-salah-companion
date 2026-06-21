/**
 * Pure UI state machine: main view → settings menu → option picker.
 * Maps input gestures to state transitions and side-effects. No SDK —
 * `main.ts` interprets the returned effects.
 */
import { MENU_ITEMS, menuItemByKey, type SettingKey, type Settings } from './settings'

export type Mode = 'main' | 'menu' | 'picker'

export interface AppState {
  mode: Mode
  settings: Settings
  /** Highlighted row in the settings menu. */
  menuIndex: number
  /** Which setting is being edited while in picker mode. */
  activeKey: SettingKey | null
  /** Highlighted option while in picker mode. */
  pickerIndex: number
}

/** Normalized input gestures (from G2 touchpad or R1 ring). */
export type InputGesture = 'click' | 'double' | 'up' | 'down'

export type Effect = { type: 'save'; settings: Settings } | { type: 'exit' }

export interface ReduceResult {
  state: AppState
  effect?: Effect
}

export function reduce(state: AppState, gesture: InputGesture): ReduceResult {
  if (state.mode === 'main') {
    switch (gesture) {
      case 'click':
        return { state: { ...state, mode: 'menu', menuIndex: 0 } }
      case 'double':
        return { state, effect: { type: 'exit' } }
      default:
        return { state } // swipes are no-ops on the main view
    }
  }

  if (state.mode === 'menu') {
    const n = MENU_ITEMS.length
    switch (gesture) {
      case 'up':
        return { state: { ...state, menuIndex: (state.menuIndex - 1 + n) % n } }
      case 'down':
        return { state: { ...state, menuIndex: (state.menuIndex + 1) % n } }
      case 'click': {
        // Open the picker for the highlighted setting, pre-selecting its value.
        const item = MENU_ITEMS[state.menuIndex]
        const cur = item.options.findIndex((o) => o.id === item.get(state.settings))
        return {
          state: { ...state, mode: 'picker', activeKey: item.key, pickerIndex: Math.max(0, cur) },
        }
      }
      case 'double':
        return { state: { ...state, mode: 'main' } }
      default:
        return { state }
    }
  }

  // picker mode
  const item = menuItemByKey(state.activeKey!)
  const n = item.options.length
  switch (gesture) {
    case 'up':
      return { state: { ...state, pickerIndex: (state.pickerIndex - 1 + n) % n } }
    case 'down':
      return { state: { ...state, pickerIndex: (state.pickerIndex + 1) % n } }
    case 'click': {
      const id = item.options[state.pickerIndex].id
      const settings = item.set(state.settings, id)
      return {
        state: { ...state, mode: 'menu', settings, activeKey: null },
        effect: { type: 'save', settings },
      }
    }
    case 'double':
      return { state: { ...state, mode: 'menu', activeKey: null } } // cancel — unchanged
    default:
      return { state }
  }
}
