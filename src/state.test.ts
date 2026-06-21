import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, MENU_ITEMS, type Settings } from './settings'
import { reduce, type AppState } from './state'

const base: Settings = { ...DEFAULT_SETTINGS, cityId: 'mecca', method: 'MuslimWorldLeague', madhab: 'Hanafi' }

const main: AppState = { mode: 'main', settings: base, menuIndex: 0, activeKey: null, pickerIndex: 0 }

describe('reduce — main mode', () => {
  it('click opens the settings menu', () => {
    const r = reduce(main, 'click')
    expect(r.state.mode).toBe('menu')
    expect(r.state.menuIndex).toBe(0)
    expect(r.effect).toBeUndefined()
  })
  it('double press requests exit', () => {
    expect(reduce(main, 'double').effect).toEqual({ type: 'exit' })
  })
  it('swipes are no-ops', () => {
    expect(reduce(main, 'up').state).toEqual(main)
    expect(reduce(main, 'down').state).toEqual(main)
  })
})

describe('reduce — menu mode', () => {
  const menu: AppState = { ...main, mode: 'menu', menuIndex: 0 }
  const n = MENU_ITEMS.length

  it('down/up move the highlight with wrap', () => {
    expect(reduce(menu, 'down').state.menuIndex).toBe(1)
    expect(reduce({ ...menu, menuIndex: n - 1 }, 'down').state.menuIndex).toBe(0)
    expect(reduce(menu, 'up').state.menuIndex).toBe(n - 1)
  })

  it('click opens the picker for the highlighted setting, pre-selecting its value', () => {
    // menuIndex 2 = Asr; current madhab Hanafi is index 1 in MADHABS.
    const r = reduce({ ...menu, menuIndex: 2 }, 'click')
    expect(r.state.mode).toBe('picker')
    expect(r.state.activeKey).toBe('madhab')
    expect(r.state.pickerIndex).toBe(1)
  })

  it('double press returns to main', () => {
    expect(reduce(menu, 'double').state.mode).toBe('main')
  })
})

describe('reduce — picker mode', () => {
  const picker: AppState = { ...main, mode: 'picker', activeKey: 'madhab', pickerIndex: 1 }

  it('up/down move within the option list with wrap', () => {
    expect(reduce(picker, 'up').state.pickerIndex).toBe(0)
    expect(reduce({ ...picker, pickerIndex: 0 }, 'up').state.pickerIndex).toBe(1) // 2 madhabs
  })

  it('click applies the selection, saves, and returns to menu', () => {
    const r = reduce({ ...picker, pickerIndex: 0 }, 'click') // Shafi
    expect(r.state.mode).toBe('menu')
    expect(r.state.settings.madhab).toBe('Shafi')
    expect(r.state.activeKey).toBeNull()
    expect(r.effect).toEqual({ type: 'save', settings: r.state.settings })
  })

  it('double press cancels back to menu without changing settings', () => {
    const r = reduce({ ...picker, pickerIndex: 0 }, 'double')
    expect(r.state.mode).toBe('menu')
    expect(r.state.settings.madhab).toBe('Hanafi') // unchanged
    expect(r.effect).toBeUndefined()
  })

  it('city picker selection updates cityId', () => {
    const cityPicker: AppState = { ...main, mode: 'picker', activeKey: 'city', pickerIndex: 0 }
    const firstCityId = MENU_ITEMS[0].options[0].id
    const r = reduce(cityPicker, 'click')
    expect(r.state.settings.cityId).toBe(firstCityId)
    expect(r.effect?.type).toBe('save')
  })
})
