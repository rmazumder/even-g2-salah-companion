/**
 * Maps raw Even Hub events to app gestures and lifecycle signals.
 *
 * CRITICAL routing rule (per Even Hub docs, when a TEXT container is active):
 *   - Scroll gestures (swipe up/down) arrive on `event.textEvent` (eventType 1/2).
 *   - Single/double PRESS arrive on `event.sysEvent`, NOT textEvent.
 *   - Protobuf omits zero values, so a single click's eventType is `undefined`
 *     (semantically 0). Always read `eventType ?? 0`.
 *
 * Kept free of SDK runtime imports so it can be unit-tested in plain Node.
 */
export type InputGesture = 'click' | 'double' | 'up' | 'down'

/** Structural subset of the SDK's EvenHubEvent that we read. */
export interface GlassesEvent {
  textEvent?: { eventType?: number; containerID?: number }
  sysEvent?: { eventType?: number }
  listEvent?: { eventType?: number }
}

// OsEventTypeList values (inlined to avoid importing the SDK into tests).
const SCROLL_TOP = 1
const SCROLL_BOTTOM = 2
const SINGLE_CLICK = 0
const DOUBLE_CLICK = 3
export const FOREGROUND_ENTER = 4
export const FOREGROUND_EXIT = 5
export const ABNORMAL_EXIT = 6
export const SYSTEM_EXIT = 7

export function gestureFromEvent(event: GlassesEvent): InputGesture | null {
  // Scroll gestures fire on the text container. Clicks never come here.
  if (event.textEvent) {
    const t = event.textEvent.eventType ?? 0
    if (t === SCROLL_TOP) return 'up'
    if (t === SCROLL_BOTTOM) return 'down'
    return null
  }
  // Clicks on a text container fire on sysEvent. Single = 0/undefined, double = 3.
  if (event.sysEvent) {
    const t = event.sysEvent.eventType ?? 0
    if (t === SINGLE_CLICK) return 'click'
    if (t === DOUBLE_CLICK) return 'double'
    return null // lifecycle (4-7) handled by lifecycleFromEvent
  }
  return null
}

/** Returns the lifecycle eventType (4-7) if this is a lifecycle event, else null. */
export function lifecycleFromEvent(event: GlassesEvent): number | null {
  if (!event.sysEvent) return null
  const t = event.sysEvent.eventType ?? 0
  return t === FOREGROUND_ENTER || t === FOREGROUND_EXIT || t === ABNORMAL_EXIT || t === SYSTEM_EXIT
    ? t
    : null
}
