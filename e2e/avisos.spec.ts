import { ANA, addItemNamed, expect, inviteLink, joinWith, signIn, test } from './fixtures'

test('Beto’s changes reach Ana as a dot, a bell notice and an opening summary', async ({ page, browser }) => {
  await signIn(page, ANA)
  const beto = await joinWith(browser, await inviteLink(page))
  await page.goto('/')

  for (const name of ['Leche', 'Pan', 'Huevo']) await addItemNamed(beto, name)
  await beto.getByRole('checkbox', { name: 'Pan' }).click()

  await expect(page.getByLabel('Con cambios')).toBeVisible()
  // Se unió, agregó (3) y tachó: tres avisos agrupados.
  await expect(page.getByRole('button', { name: 'Avisos, 3 sin leer' })).toBeVisible()
  await page.waitForTimeout(300)
  await page.screenshot({ path: 'test-results/screens/avisos-inicio.png' })

  await page.getByRole('button', { name: /Avisos/ }).click()
  await expect(page.getByText('Beto Prueba agregó 3 elementos a Despensa')).toBeVisible()
  await expect(page.getByText('Beto Prueba tachó Pan en Despensa')).toBeVisible()
  await page.waitForTimeout(300)
  await page.screenshot({ path: 'test-results/screens/avisos-campana.png' })
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Avisos' })).toBeVisible()

  // Una sesión nueva (reabrir la app) muestra el resumen.
  const reopened = await page.context().newPage()
  await reopened.goto('/')
  await expect(reopened.getByText('Beto Prueba actualizó Despensa: 3 agregados, 1 tachado')).toBeVisible()
  await reopened.waitForTimeout(300)
  await reopened.screenshot({ path: 'test-results/screens/avisos-abrir.png' })
})

test('opening the list clears the dot after leaving it, and my own changes never notify me', async ({ page, browser }) => {
  await signIn(page, ANA)
  const beto = await joinWith(browser, await inviteLink(page))
  await addItemNamed(beto, 'Tortillas')
  await page.goto('/')
  await expect(page.getByLabel('Con cambios')).toBeVisible()

  await page.getByRole('link', { name: /Despensa/ }).click()
  await addItemNamed(page, 'Café')
  await page.getByRole('link', { name: 'Inicio' }).click()
  await expect(page.getByLabel('Con cambios')).toBeHidden()

  await beto.getByRole('button', { name: /Avisos/ }).click()
  await expect(beto.getByText('Ana Prueba agregó Café a Despensa')).toBeVisible()
  await expect(beto.getByText(/Beto Prueba/)).toHaveCount(0)
})

test('undoing a purchase removes its notice', async ({ page, browser }) => {
  await signIn(page, ANA)
  const beto = await joinWith(browser, await inviteLink(page))
  await addItemNamed(beto, 'Leche')
  await beto.getByRole('checkbox', { name: 'Leche' }).click()
  await beto.getByRole('button', { name: 'Terminar compra' }).click()
  await page.goto('/')
  await page.getByRole('button', { name: /Avisos/ }).click()
  await expect(page.getByText('Beto Prueba terminó una compra de 1 elemento en Despensa')).toBeVisible()

  await beto.getByRole('button', { name: 'Deshacer' }).click()
  await expect(page.getByText('Beto Prueba terminó una compra de 1 elemento en Despensa')).toBeHidden()
})

test('only what others added since my last visit is highlighted', async ({ page, browser }) => {
  await signIn(page, ANA)
  const beto = await joinWith(browser, await inviteLink(page))
  await addItemNamed(beto, 'Leche')
  const row = page.locator('li').filter({ has: page.getByRole('checkbox', { name: 'Leche' }) })

  await page.goto('/')
  await page.getByRole('link', { name: /Despensa/ }).click()
  await expect(row).toHaveClass(/bg-muted/)
  await page.waitForTimeout(1500)
  await page.getByRole('link', { name: 'Inicio' }).click()

  await page.getByRole('link', { name: /Despensa/ }).click()
  await expect(page.getByRole('checkbox', { name: 'Leche' })).toBeVisible()
  await page.waitForTimeout(500)
  // Lectura puntual: un toHaveClass reintentaría hasta que el resaltado (4 s) se apague solo.
  expect(await row.getAttribute('class')).not.toContain('bg-muted')
})

test('jumping from one list to another through the bell opens the other list fresh', async ({ page, browser }) => {
  await signIn(page, ANA)
  const beto = await joinWith(browser, await inviteLink(page))

  // Ana crea "Casa", invita a Beto y él agrega algo ahí.
  await page.goto('/')
  await page.getByRole('button', { name: 'Nueva lista' }).click()
  await page.getByLabel('Nombre').fill('Casa')
  await page.getByRole('button', { name: 'Crear lista' }).click()
  await expect(page.getByRole('heading', { name: 'Casa' })).toBeVisible()
  const casaUrl = await inviteLink(page)
  await beto.goto(casaUrl)
  await beto.getByRole('button', { name: 'Unirme' }).click()
  await expect(beto.getByRole('heading', { name: 'Casa' })).toBeVisible()
  await addItemNamed(beto, 'Focos')

  // Ana está en Despensa, en la pestaña Hacer, y salta a Casa desde la campana.
  await page.goto('/')
  await page.getByRole('link', { name: /Despensa/ }).click()
  await page.getByRole('tab', { name: /Hacer/ }).click()
  await page.getByRole('button', { name: /Avisos/ }).click()
  await page.getByText('Beto Prueba agregó Focos a Casa').click()
  await expect(page.getByRole('heading', { name: 'Casa' })).toBeVisible()
  await expect(page.getByRole('tab', { name: /Comprar/ })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('checkbox', { name: 'Focos' })).toBeVisible()
})
