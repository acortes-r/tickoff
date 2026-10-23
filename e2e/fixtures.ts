import { test as base, expect, type Page } from '@playwright/test'

const PROJECT = 'demo-tickoff'

/** Borra todos los datos y cuentas de los emuladores. */
export async function resetEmulators(): Promise<void> {
  const firestore = await fetch(
    `http://127.0.0.1:8080/emulator/v1/projects/${PROJECT}/databases/(default)/documents`,
    { method: 'DELETE' },
  )
  const auth = await fetch(`http://127.0.0.1:9099/emulator/v1/projects/${PROJECT}/accounts`, { method: 'DELETE' })
  if (!firestore.ok || !auth.ok) throw new Error('No se pudieron limpiar los emuladores')
}

/** Entra con una cuenta nueva del emulador de Auth (la ventana de cuentas de prueba). */
export async function signIn(page: Page, user: { email: string; name: string }): Promise<void> {
  await page.goto('/')
  const popupPromise = page.waitForEvent('popup')
  await page.getByRole('button', { name: 'Entrar con Google' }).click()
  const popup = await popupPromise
  // Si se hace clic antes de que cargue, el formulario de cuenta nueva no aparece.
  await popup.waitForLoadState('load')
  await popup.getByRole('button', { name: /Add new account/ }).click()
  await expect(popup.locator('#email-input')).toBeVisible()
  await popup.locator('#email-input').fill(user.email)
  await popup.locator('#display-name-input').fill(user.name)
  await popup.getByRole('button', { name: 'Sign in with Google.com' }).click()
  await popup.waitForEvent('close')
}

export const ANA = { email: 'ana.prueba@example.com', name: 'Ana Prueba' }
export const BETO = { email: 'beto.prueba@example.com', name: 'Beto Prueba' }

export const test = base.extend({
  // Cada prueba arranca con emuladores vacíos.
  // El segundo argumento se llama `use` en la doc de Playwright; aquí `run` para
  // que el lint de hooks de React no lo confunda con React.use.
  page: async ({ page }, run) => {
    await resetEmulators()
    await run(page)
  },
})

export { expect }
