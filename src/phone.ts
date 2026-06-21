/**
 * Phone-side settings UI — the HTML the Even companion app shows on the phone.
 * Location (auto-detect via browser geolocation, or search for a city),
 * calculation method, and Asr madhab. Prayer times themselves are shown only on
 * the glasses HUD, not here. Pure view layer (no SDK): on change it calls
 * `onChange` with new Settings.
 */
import { detectLocation, deviceTimeZone } from './location'
import { searchCities, type GeocodeResult } from './geocode'
import {
  MADHABS,
  METHODS,
  resolveLocation,
  type MadhabId,
  type MethodId,
  type Settings,
} from './settings'

export interface PhoneUI {
  /** Re-render to reflect settings changed elsewhere (e.g. on the glasses). */
  refresh(): void
}

function option(value: string, label: string, selected: boolean): string {
  return `<option value="${value}"${selected ? ' selected' : ''}>${label}</option>`
}

export function mountPhoneUI(
  root: HTMLElement,
  getSettings: () => Settings,
  onChange: (s: Settings) => void,
  /** Optional country code (from getUserInfo) used in the auto label. */
  getCountry: () => string | undefined = () => undefined,
): PhoneUI {
  let status = '' // transient message under the location toggle
  let searchStatus = '' // transient message under the city search box
  let searchResults: GeocodeResult[] = []
  let searchTimer: ReturnType<typeof setTimeout> | null = null
  let searchSeq = 0 // guards against out-of-order async responses

  function render() {
    const s = getSettings()
    const location = resolveLocation(s)
    const isAuto = s.locationMode === 'auto'

    root.innerHTML = `
      <h1 class="title">Salah Companion</h1>
      <p class="subtitle">Prayer times show on your glasses · ${location.name}</p>

      <h2 class="section-title">Settings</h2>
      <div class="card">
        <div class="field">
          <span class="label">Location</span>
          <div class="segment" id="locmode">
            <button type="button" data-mode="auto" class="${isAuto ? 'active' : ''}">Use my location</button>
            <button type="button" data-mode="city" class="${isAuto ? '' : 'active'}">Choose a city</button>
          </div>
          <p class="loc-status" id="loc-status"${status ? '' : ' hidden'}>${status}</p>
        </div>
        <div class="field"${isAuto ? ' hidden' : ''}>
          <label class="label" for="city-search">Search for a city</label>
          <input id="city-search" type="search" placeholder="Type a city name…" autocomplete="off" />
          <p class="loc-status" id="search-status"${searchStatus ? '' : ' hidden'}>${searchStatus}</p>
          <div class="search-results" id="search-results">
            ${searchResults
              .map(
                (r, i) =>
                  `<button type="button" class="search-result" data-idx="${i}">${r.name}, ${r.country}</button>`,
              )
              .join('')}
          </div>
        </div>
        <div class="field">
          <label class="label" for="method">Calculation method</label>
          <select id="method">
            ${METHODS.map((m) => option(m.id, m.label, m.id === s.method)).join('')}
          </select>
        </div>
        <div class="field">
          <span class="label">Asr madhab</span>
          <div class="segment" id="madhab">
            ${MADHABS.map(
              (m) =>
                `<button type="button" data-id="${m.id}" class="${m.id === s.madhab ? 'active' : ''}">${m.label}</button>`,
            ).join('')}
          </div>
        </div>
      </div>`

    root.querySelectorAll<HTMLButtonElement>('#locmode button').forEach((btn) => {
      btn.onclick = () => {
        const mode = btn.dataset.mode
        if (mode === 'city') {
          status = ''
          onChange({ ...getSettings(), locationMode: 'city' })
        } else {
          void useMyLocation()
        }
      }
    })

    const searchInput = root.querySelector<HTMLInputElement>('#city-search')
    if (searchInput) {
      searchInput.oninput = () => {
        const query = searchInput.value
        if (searchTimer) clearTimeout(searchTimer)
        searchTimer = setTimeout(() => void runSearch(query), 300)
      }
    }

    root.querySelectorAll<HTMLButtonElement>('.search-result').forEach((btn) => {
      btn.onclick = () => {
        const idx = Number(btn.dataset.idx)
        const r = searchResults[idx]
        if (!r) return
        searchStatus = ''
        searchResults = []
        onChange({
          ...getSettings(),
          locationMode: 'search',
          searchLocation: {
            latitude: r.latitude,
            longitude: r.longitude,
            timeZone: r.timeZone,
            label: `${r.name}, ${r.country}`,
          },
        })
      }
    })

    root.querySelector<HTMLSelectElement>('#method')!.onchange = (e) =>
      onChange({ ...getSettings(), method: (e.target as HTMLSelectElement).value as MethodId })

    root.querySelectorAll<HTMLButtonElement>('#madhab button').forEach((btn) => {
      btn.onclick = () => onChange({ ...getSettings(), madhab: btn.dataset.id as MadhabId })
    })
  }

  async function useMyLocation() {
    status = 'Detecting location…'
    render()
    try {
      const geo = typeof navigator !== 'undefined' ? navigator.geolocation : null
      const auto = await detectLocation(geo, deviceTimeZone, getCountry())
      status = ''
      onChange({ ...getSettings(), locationMode: 'auto', autoLocation: auto })
    } catch (err) {
      status = `Couldn't get location — using city. (${(err as Error).message})`
      onChange({ ...getSettings(), locationMode: 'city' })
    }
  }

  async function runSearch(query: string) {
    const q = query.trim()
    if (q.length < 2) {
      searchResults = []
      searchStatus = ''
      render()
      restoreSearchFocus(q)
      return
    }
    const seq = ++searchSeq
    searchStatus = 'Searching…'
    render()
    restoreSearchFocus(q)
    const results = await searchCities(q)
    if (seq !== searchSeq) return // a newer search superseded this one
    searchResults = results
    searchStatus = results.length ? '' : 'No matches found'
    render()
    restoreSearchFocus(q)
  }

  /** Re-rendering replaces the input node; restore its value + caret. */
  function restoreSearchFocus(value: string) {
    const input = root.querySelector<HTMLInputElement>('#city-search')
    if (!input) return
    input.value = value
    input.focus()
    const end = value.length
    input.setSelectionRange(end, end)
  }

  render()
  return { refresh: render }
}
