import { ANA, expect, signIn, test } from './fixtures'

test('first login seeds data and opens Despensa', async ({ page }) => {
  await signIn(page, ANA)
  await expect(page.getByRole('heading', { name: 'Despensa' })).toBeVisible()
  await expect(page.getByRole('tab', { name: /Comprar/ })).toHaveAttribute('aria-selected', 'true')
  await page.getByRole('link', { name: 'Inicio' }).click()
  await expect(page.getByRole('heading', { name: 'tickoff' })).toBeVisible()
  await expect(page.getByRole('link', { name: /Despensa/ })).toBeVisible()
})

test('adds, ticks and moves items between tabs', async ({ page }) => {
  await signIn(page, ANA)
  const capture = page.getByRole('textbox', { name: 'Agregar' })
  await capture.fill('Leche')
  await capture.press('Enter')
  await expect(capture).toBeFocused()
  await capture.fill('Pan')
  await capture.press('Enter')
  await expect(page.getByRole('checkbox', { name: 'Leche' })).toBeVisible()
  await expect(page.getByRole('tab', { name: /Comprar/ })).toContainText('2')

  await page.getByRole('checkbox', { name: 'Leche' }).click()
  await expect(page.getByRole('checkbox', { name: 'Leche' })).toBeChecked()
  await expect(page.getByRole('tab', { name: /Comprar/ })).toContainText('1')

  await capture.fill('pan ')
  await capture.press('Enter')
  await expect(page.getByText('Ya está en la lista')).toBeVisible()

  await page.getByRole('tab', { name: /Hacer/ }).click()
  await capture.fill('Lavar el auto')
  await capture.press('Enter')
  await expect(page.getByRole('checkbox', { name: 'Lavar el auto' })).toBeVisible()
  await page.screenshot({ path: 'test-results/screens/mi-lista-hacer.png' })
})

test('adding and ticking keep working without signal', async ({ page, context }) => {
  await signIn(page, ANA)
  const capture = page.getByRole('textbox', { name: 'Agregar' })
  await expect(capture).toBeVisible()
  await context.setOffline(true)
  await capture.fill('Tortillas')
  await capture.press('Enter')
  await capture.fill('Huevo')
  await capture.press('Enter')
  await page.getByRole('checkbox', { name: 'Tortillas' }).click()
  await expect(page.getByRole('checkbox', { name: 'Tortillas' })).toBeChecked()
  await expect(page.getByRole('checkbox', { name: 'Huevo' })).toBeVisible()
  await page.screenshot({ path: 'test-results/screens/mi-lista-offline.png' })
  await context.setOffline(false)
})

test('a new list opens right away and shows up on Home', async ({ page }) => {
  await signIn(page, ANA)
  await page.getByRole('link', { name: 'Inicio' }).click()
  await page.getByRole('button', { name: 'Nueva lista' }).click()
  await page.getByLabel('Nombre').fill('Jardín')
  await page.getByRole('button', { name: 'Crear lista' }).click()
  await expect(page.getByRole('heading', { name: 'Jardín' })).toBeVisible()
  // Recién creada (el servidor aún puede no tenerla): agregar debe verse igual.
  const capture = page.getByRole('textbox', { name: 'Agregar' })
  await capture.fill('Tierra')
  await capture.press('Enter')
  await expect(page.getByRole('checkbox', { name: 'Tierra' })).toBeVisible()
  await page.getByRole('link', { name: 'Inicio' }).click()
  await expect(page.getByRole('link', { name: /Jardín/ })).toBeVisible()
  await page.screenshot({ path: 'test-results/screens/home.png', fullPage: true })
})
