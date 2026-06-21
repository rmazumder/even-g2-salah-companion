/**
 * Phone-side settings UI — the HTML the Even companion app shows on the phone.
 * Location (auto-detect via browser geolocation, or pick a city), calculation
 * method, and Asr madhab, with a live preview of today's times. Pure view
 * layer (no SDK): on change it calls `onChange` with new Settings.
 */
import { CITIES } from './cities'
import { detectLocation, deviceTimeZone } from './location'
import { buildPreview } from './prayer'
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

  function render() {
    const s = getSettings()
    const location = resolveLocation(s)
    const preview = buildPreview(location, new Date(), s)
    const isAuto = s.locationMode === 'auto'

    const previewRows = preview
      .map(
        (p) => `
        <div class="row${p.isNext ? ' next' : ''}">
          <span class="prayer-name">${p.name}${p.isNext ? '<span class="next-badge">next</span>' : ''}</span>
          <span class="prayer-time">${p.time}</span>
        </div>`,
      )
      .join('')

    root.innerHTML = `
      <h1 class="title">Salah Companion</h1>
      <p class="subtitle">Prayer times · ${location.name}</p>

      <div class="card" id="preview">${previewRows}</div>

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
          <label class="label" for="city">City</label>
          <select id="city">
            ${CITIES.map((c) => option(c.id, `${c.name} (${c.country})`, c.id === s.cityId)).join('')}
          </select>
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

    const citySelect = root.querySelector<HTMLSelectElement>('#city')
    if (citySelect) {
      citySelect.onchange = (e) =>
        onChange({
          ...getSettings(),
          locationMode: 'city',
          cityId: (e.target as HTMLSelectElement).value,
        })
    }

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

  render()
  return { refresh: render }
}
