import { devices, type Browser, type Page } from '@playwright/test'
import { ANA, BETO, expect, signIn, test } from './fixtures'

/** Segundo celular: otro contexto de navegador, con su propia sesión. */
async function secondPhone(browser: Browser): Promise<Page> {
  const context = await browser.newContext({ ...devices['Pixel 7'], locale: 'es-MX' })
  return context.newPage()
}

/** Ana crea una invitación y devuelve el link (sin Web Share, se copia al portapapeles). */
async function inviteLink(page: Page): Promise<string> {
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true })
  })
  await page.getByRole('link', { name: 'Compartir' }).click()
  await page.getByRole('button', { name: 'Compartir' }).click()
  await expect(page.getByText('Link copiado')).toBeVisible()
  return page.evaluate(() => navigator.clipboard.readText())
}

async function add(page: Page, name: string) {
  const capture = page.getByRole('textbox', { name: 'Agregar' })
  await capture.fill(name)
  await capture.press('Enter')
}

test('Beto joins with Ana’s link and both see each other’s changes live', async ({ page, browser }) => {
  await signIn(page, ANA)
  const url = await inviteLink(page)
  expect(url).toMatch(/\/join\/[^/]+\/[A-Za-z0-9_-]{32}$/)

  const beto = await secondPhone(browser)
  await signIn(beto, BETO)
  await beto.goto(url)
  await expect(beto.getByText('Ana Prueba te invita a “Despensa”.')).toBeVisible()
  await beto.waitForTimeout(300)
  await beto.screenshot({ path: 'test-results/screens/unirse.png' })
  await beto.getByRole('button', { name: 'Unirme' }).click()
  await expect(beto.getByRole('heading', { name: 'Despensa' })).toBeVisible()

  await page.getByRole('link', { name: 'Despensa' }).click()
  await add(page, 'Leche')
  await expect(beto.getByRole('checkbox', { name: 'Leche' })).toBeVisible()
  await beto.getByRole('checkbox', { name: 'Leche' }).click()
  await expect(page.getByRole('checkbox', { name: 'Leche' })).toBeChecked()

  await page.getByRole('link', { name: 'Compartir' }).click()
  await expect(page.getByText('Beto Prueba')).toBeVisible()
  await page.waitForTimeout(300)
  await page.screenshot({ path: 'test-results/screens/compartir.png' })

  await beto.goto('/')
  await expect(beto.getByLabel('Compartida')).toBeVisible()
})

test('a used link cannot be used again', async ({ page, browser }) => {
  await signIn(page, ANA)
  const url = await inviteLink(page)
  const beto = await secondPhone(browser)
  await signIn(beto, BETO)
  await beto.goto(url)
  await beto.getByRole('button', { name: 'Unirme' }).click()
  await expect(beto.getByRole('heading', { name: 'Despensa' })).toBeVisible()

  const caro = await secondPhone(browser)
  await signIn(caro, { email: 'caro.prueba@example.com', name: 'Caro Prueba' })
  await caro.goto(url)
  await expect(caro.getByText('Este link ya se usó')).toBeVisible()
})

test('Ana removes Beto and he stops seeing the list', async ({ page, browser }) => {
  await signIn(page, ANA)
  const url = await inviteLink(page)
  const beto = await secondPhone(browser)
  await signIn(beto, BETO)
  await beto.goto(url)
  await beto.getByRole('button', { name: 'Unirme' }).click()
  await expect(beto.getByRole('heading', { name: 'Despensa' })).toBeVisible()

  await page.reload()
  await page.getByRole('button', { name: 'Sacar a Beto Prueba' }).click()
  await page.getByRole('button', { name: 'Sacar' }).click()
  await expect(page.getByRole('button', { name: 'Sacar a Beto Prueba' })).toBeHidden()
  await expect(beto.getByText('Esta lista ya no existe o ya no tienes acceso.')).toBeVisible()
})

test('Beto leaves the list and it disappears from his Home', async ({ page, browser }) => {
  await signIn(page, ANA)
  const url = await inviteLink(page)
  const beto = await secondPhone(browser)
  await signIn(beto, BETO)
  await beto.goto(url)
  await beto.getByRole('button', { name: 'Unirme' }).click()
  await beto.getByRole('link', { name: 'Compartir' }).click()
  await beto.getByRole('button', { name: 'Salir de la lista' }).click()
  await beto.getByRole('button', { name: 'Salir' }).click()
  await expect(beto.getByRole('heading', { name: 'tickoff' })).toBeVisible()
  await expect(beto.getByRole('link', { name: /Despensa/ })).toHaveCount(1)
})
