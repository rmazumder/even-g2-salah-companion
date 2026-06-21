/**
 * SDK glue for the Even G2. This is the ONLY file that touches the Even Hub
 * bridge; all logic lives in the pure, unit-tested modules it imports.
 *
 * Flow: await bridge → restore saved settings → create the single text
 * container → subscribe to events → route them (input.ts) → feed the reducer →
 * push updated content. A 1s tick keeps the countdown live.
 */
import {
  CreateStartUpPageContainer,
  StartUpPageCreateResult,
  TextContainerProperty,
  TextContainerUpgrade,
  waitForEvenAppBridge,
} from '@evenrealities/even_hub_sdk'

import { buildMainView, buildMenuView, buildPickerView } from './format'
import { FOREGROUND_ENTER, gestureFromEvent, lifecycleFromEvent } from './input'
import { mountPhoneUI, type PhoneUI } from './phone'
import './phone.css'
import { computeSchedule } from './prayer'
import { DEFAULT_SETTINGS, menuItemByKey, resolveLocation, sanitizeSettings, type Settings } from './settings'
import { reduce, type AppState } from './state'

const CONTAINER_ID = 1
const CONTAINER_NAME = 'main'
const STORAGE_KEY = 'settings'
const TICK_MS = 1000

/** Build the content string for the current state. */
function renderContent(state: AppState): string {
  switch (state.mode) {
    case 'menu':
      return buildMenuView(state.settings, state.menuIndex)
    case 'picker': {
      const item = menuItemByKey(state.activeKey!)
      return buildPickerView(item.label, item.options, state.pickerIndex)
    }
    default:
      return buildMainView(
        computeSchedule(resolveLocation(state.settings), new Date(), state.settings),
        state.settings,
      )
  }
}

async function loadSettings(getLocalStorage: (k: string) => Promise<string>): Promise<Settings> {
  try {
    const raw = await getLocalStorage(STORAGE_KEY)
    return sanitizeSettings(raw ? (JSON.parse(raw) as Partial<Settings>) : null)
  } catch {
    return DEFAULT_SETTINGS
  }
}

async function main() {
  const bridge = await waitForEvenAppBridge() // always await before any other SDK call

  const settings = await loadSettings((k) => bridge.getLocalStorage(k))
  let state: AppState = { mode: 'main', settings, menuIndex: 0, activeKey: null, pickerIndex: 0 }

  let country: string | undefined
  try {
    const userInfo = await bridge.getUserInfo()
    country = userInfo?.country || undefined
  } catch {
    country = undefined
  }

  const startup = await bridge.createStartUpPageContainer(
    new CreateStartUpPageContainer({
      containerTotalNum: 1,
      textObject: [
        new TextContainerProperty({
          xPosition: 0,
          yPosition: 0,
          width: 576,
          height: 288,
          borderWidth: 0,
          borderColor: 5,
          paddingLength: 4,
          containerID: CONTAINER_ID,
          containerName: CONTAINER_NAME,
          content: renderContent(state),
          isEventCapture: 1, // this container receives all input
        }),
      ],
    }),
  )

  if (startup !== StartUpPageCreateResult.success) {
    console.error('createStartUpPageContainer failed:', startup)
    return
  }

  // Flicker-free in-place text update. A simple guard avoids overlapping sends.
  let painting = false
  async function paint() {
    if (painting) return
    painting = true
    try {
      await bridge.textContainerUpgrade(
        new TextContainerUpgrade({
          containerID: CONTAINER_ID,
          containerName: CONTAINER_NAME,
          content: renderContent(state),
        }),
      )
    } finally {
      painting = false
    }
  }

  // Live countdown + day rollover (only the main view changes over time).
  setInterval(() => {
    if (state.mode === 'main') void paint()
  }, TICK_MS)

  // Single source of truth: any settings change (from phone UI or glasses)
  // persists once and refreshes both surfaces.
  let phoneUI: PhoneUI | null = null
  function applySettings(next: Settings) {
    state = { ...state, settings: next }
    void bridge.setLocalStorage(STORAGE_KEY, JSON.stringify(next))
    void paint() // glasses
    phoneUI?.refresh() // phone DOM
  }

  // Phone-side settings page (the HTML the Even app shows on the phone).
  const appRoot = document.getElementById('app')
  if (appRoot) {
    phoneUI = mountPhoneUI(appRoot, () => state.settings, applySettings, () => country)
  }

  bridge.onEvenHubEvent((event) => {
    // Lifecycle: refresh on resume; nothing to clean up otherwise (no hardware
    // in use, and settings are persisted on every change).
    if (lifecycleFromEvent(event) === FOREGROUND_ENTER) {
      void paint()
      phoneUI?.refresh()
      return
    }

    const gesture = gestureFromEvent(event)
    if (!gesture) return

    const { state: next, effect } = reduce(state, gesture)
    state = next

    if (effect?.type === 'save') {
      applySettings(state.settings) // persists + repaints glasses + refreshes phone
      return
    }
    if (effect?.type === 'exit') {
      void bridge.shutDownPageContainer(1) // mode 1 = required confirm dialog on root
      return
    }

    void paint()
  })
}

void main()
