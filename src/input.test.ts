import { describe, expect, it } from 'vitest'
import { gestureFromEvent, lifecycleFromEvent } from './input'

describe('gestureFromEvent', () => {
  // Scroll gestures arrive on textEvent.
  it('maps textEvent eventType 1 to swipe up', () => {
    expect(gestureFromEvent({ textEvent: { eventType: 1, containerID: 1 } })).toBe('up')
  })
  it('maps textEvent eventType 2 to swipe down', () => {
    expect(gestureFromEvent({ textEvent: { eventType: 2, containerID: 1 } })).toBe('down')
  })

  // The bug that broke Settings: clicks come on sysEvent, NOT textEvent.
  it('maps sysEvent single click (eventType 0) to click', () => {
    expect(gestureFromEvent({ sysEvent: { eventType: 0 } })).toBe('click')
  })
  it('maps sysEvent single click sent as undefined (protobuf zero-omission) to click', () => {
    expect(gestureFromEvent({ sysEvent: {} })).toBe('click')
  })
  it('maps sysEvent eventType 3 to double press', () => {
    expect(gestureFromEvent({ sysEvent: { eventType: 3 } })).toBe('double')
  })

  // A textEvent never carries a click; must not be misread as one.
  it('does not treat a click-less textEvent as a gesture', () => {
    expect(gestureFromEvent({ textEvent: { containerID: 1 } })).toBeNull()
  })

  it('ignores lifecycle sysEvents as gestures', () => {
    expect(gestureFromEvent({ sysEvent: { eventType: 4 } })).toBeNull()
    expect(gestureFromEvent({ sysEvent: { eventType: 7 } })).toBeNull()
  })

  it('ignores empty events', () => {
    expect(gestureFromEvent({})).toBeNull()
  })
})

describe('lifecycleFromEvent', () => {
  it('detects foreground/exit/abnormal/system events', () => {
    expect(lifecycleFromEvent({ sysEvent: { eventType: 4 } })).toBe(4)
    expect(lifecycleFromEvent({ sysEvent: { eventType: 5 } })).toBe(5)
    expect(lifecycleFromEvent({ sysEvent: { eventType: 6 } })).toBe(6)
    expect(lifecycleFromEvent({ sysEvent: { eventType: 7 } })).toBe(7)
  })
  it('returns null for clicks and scrolls', () => {
    expect(lifecycleFromEvent({ sysEvent: { eventType: 0 } })).toBeNull()
    expect(lifecycleFromEvent({ sysEvent: { eventType: 3 } })).toBeNull()
    expect(lifecycleFromEvent({ textEvent: { eventType: 1 } })).toBeNull()
  })
})
