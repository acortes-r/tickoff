const query = '(prefers-color-scheme: dark)'

let override: 'light' | 'dark' | null = null

function apply() {
  const dark = override ? override === 'dark' : window.matchMedia(query).matches
  document.documentElement.classList.toggle('dark', dark)
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', dark ? '#0a0a0a' : '#ffffff')
}

/** Sigue el tema del sistema. Llamar una vez al arrancar. */
export function followSystemTheme() {
  apply()
  window.matchMedia(query).addEventListener('change', apply)
}

/** Solo para /showcase: fuerza claro u oscuro; null vuelve al sistema. */
export function setThemeOverride(mode: 'light' | 'dark' | null) {
  override = mode
  apply()
}
