import type { Page } from '@playwright/test'
import { ANA, expect, signIn, test } from './fixtures'

async function add(page: Page, name: string) {
  const capture = page.getByRole('textbox', { name: 'Agregar' })
  await capture.fill(name)
  await capture.press('Enter')
  await expect(page.getByRole('checkbox', { name })).toBeVisible()
}

async function closePurchase(page: Page, names: string[]) {
  for (const name of names) await add(page, name)
  for (const name of names) await page.getByRole('checkbox', { name }).click()
  await page.getByRole('button', { name: 'Terminar compra' }).click()
  await expect(page.getByText('Nada por comprar.')).toBeVisible()
}

async function openHistoryEntry(page: Page) {
  await page.getByRole('link', { name: 'Historial' }).click()
  await page.getByRole('button', { name: /Compra · / }).click()
}

test('re-adds chosen products as pending and keeps the entry', async ({ page }) => {
  await signIn(page, ANA)
  await closePurchase(page, ['Leche', 'Pan'])
  await openHistoryEntry(page)
  await page.getByRole('checkbox', { name: 'Elegir Leche' }).click()
  await page.getByRole('button', { name: 'Volver a agregar (1)' }).click()
  await expect(page.getByText('1 agregado a la lista')).toBeVisible()
  await page.waitForTimeout(400)
  await page.screenshot({ path: 'test-results/screens/historial.png' })
  await expect(page.getByRole('button', { name: /Compra · 2 elementos/ })).toBeVisible()

  await page.getByRole('link', { name: 'Despensa' }).click()
  await expect(page.getByRole('checkbox', { name: 'Leche' })).not.toBeChecked()
  await expect(page.getByRole('checkbox', { name: 'Pan' })).toBeHidden()
})

test('returns one item to the list and reopens the rest', async ({ page }) => {
  await signIn(page, ANA)
  await closePurchase(page, ['Leche', 'Pan'])
  await openHistoryEntry(page)
  await page.getByRole('button', { name: 'Regresar Leche' }).click()
  await expect(page.getByText('Leche regresó a la lista')).toBeVisible()
  await expect(page.getByRole('button', { name: /Compra · 1 elemento/ })).toBeVisible()

  await page.getByRole('button', { name: 'Reabrir' }).click()
  await expect(page.getByText('Todavía no hay nada aquí.')).toBeVisible()

  await page.getByRole('link', { name: 'Despensa' }).click()
  await expect(page.getByRole('checkbox', { name: 'Leche' })).not.toBeChecked()
  await expect(page.getByRole('checkbox', { name: 'Pan' })).toBeChecked()
})

test('returning something already pending points to the existing one', async ({ page }) => {
  await signIn(page, ANA)
  await closePurchase(page, ['Leche'])
  await add(page, 'Leche')
  await openHistoryEntry(page)
  await page.getByRole('button', { name: 'Regresar Leche' }).click()
  await page.getByRole('button', { name: 'Ver' }).click()
  await expect(page.getByRole('heading', { name: 'Despensa' })).toBeVisible()
  await expect(page.getByRole('checkbox', { name: 'Leche' })).toHaveCount(1)
})
