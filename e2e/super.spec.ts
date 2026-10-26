import type { Page } from '@playwright/test'
import { ANA, expect, signIn, test } from './fixtures'

async function addStore(page: Page, name: string) {
  await page.goto('/settings/stores')
  await page.getByRole('button', { name: 'Nueva tienda' }).click()
  await page.getByLabel('Nombre').fill(name)
  await page.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByText(name, { exact: true })).toBeVisible()
}

async function openDespensa(page: Page) {
  await page.goto('/')
  await page.getByRole('link', { name: /Despensa/ }).click()
  await expect(page.getByRole('heading', { name: 'Despensa' })).toBeVisible()
}

async function add(page: Page, name: string, store?: string) {
  if (store) {
    await page.getByRole('combobox', { name: 'Tienda' }).click()
    await page.getByRole('option', { name: store }).click()
  }
  const capture = page.getByRole('textbox', { name: 'Agregar' })
  await capture.fill(name)
  await capture.press('Enter')
  await expect(page.getByRole('checkbox', { name })).toBeVisible()
}

test('filters by store, closes only that store and undoes it', async ({ page }) => {
  await signIn(page, ANA)
  await addStore(page, 'Mercado')
  await openDespensa(page)
  await add(page, 'Leche')
  await add(page, 'Jamón', 'Mercado')
  await page.getByRole('checkbox', { name: 'Leche' }).click()
  await page.getByRole('checkbox', { name: 'Jamón' }).click()

  const filter = page.getByRole('group', { name: 'Filtrar por tienda' })
  await filter.getByRole('button', { name: 'Mercado' }).click()
  await expect(page.getByRole('checkbox', { name: 'Leche' })).toBeHidden()
  // Las capturas esperan a que terminen las transiciones de color (150 ms).
  await page.waitForTimeout(400)
  await page.screenshot({ path: 'test-results/screens/super-filtro.png' })

  await page.getByRole('button', { name: 'Terminar compra' }).click()
  await expect(page.getByText('Compra cerrada')).toBeVisible()
  await expect(page.getByRole('checkbox', { name: 'Jamón' })).toBeHidden()
  await page.waitForTimeout(400)
  await page.screenshot({ path: 'test-results/screens/super-deshacer.png' })

  await page.getByRole('button', { name: 'Deshacer' }).click()
  await expect(page.getByRole('checkbox', { name: 'Jamón' })).toBeChecked()

  await filter.getByRole('button', { name: 'Todas' }).click()
  await page.getByRole('button', { name: 'Terminar compra' }).click()
  await expect(page.getByRole('checkbox', { name: 'Leche' })).toBeHidden()
  await expect(page.getByRole('checkbox', { name: 'Jamón' })).toBeHidden()
  await expect(page.getByText('Nada por comprar.')).toBeVisible()
})

test('archives done tasks on Hacer', async ({ page }) => {
  await signIn(page, ANA)
  await page.getByRole('tab', { name: /Hacer/ }).click()
  await add(page, 'Barrer el patio')
  await add(page, 'Pagar la luz')
  await page.getByRole('checkbox', { name: 'Barrer el patio' }).click()
  await page.getByRole('button', { name: 'Archivar hechos' }).click()
  await expect(page.getByText('Hechos archivados')).toBeVisible()
  await expect(page.getByRole('checkbox', { name: 'Barrer el patio' })).toBeHidden()
  await expect(page.getByRole('checkbox', { name: 'Pagar la luz' })).toBeVisible()
})

test('closing a purchase and undoing it work without signal', async ({ page, context }) => {
  await signIn(page, ANA)
  await add(page, 'Tortillas')
  await page.getByRole('checkbox', { name: 'Tortillas' }).click()
  await context.setOffline(true)
  await page.getByRole('button', { name: 'Terminar compra' }).click()
  await expect(page.getByRole('checkbox', { name: 'Tortillas' })).toBeHidden()
  await page.getByRole('button', { name: 'Deshacer' }).click()
  await expect(page.getByRole('checkbox', { name: 'Tortillas' })).toBeChecked()
  await context.setOffline(false)
})
