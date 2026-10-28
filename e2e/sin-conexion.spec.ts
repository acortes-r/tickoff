import { ANA, addItemNamed, expect, inviteLink, joinWith, secondPhone, signIn, test } from './fixtures'

test('shows "Sin conexión" offline and syncs what was done once back', async ({ page, context, browser }) => {
  await signIn(page, ANA)
  const capture = page.getByRole('textbox', { name: 'Agregar' })
  await expect(capture).toBeVisible()
  await expect(page.getByRole('status').filter({ hasText: 'Sin conexión' })).toHaveCount(0)

  await context.setOffline(true)
  await expect(page.getByText('Sin conexión')).toBeVisible()
  await capture.fill('Tortillas')
  await capture.press('Enter')
  await expect(page.getByRole('checkbox', { name: 'Tortillas' })).toBeVisible()
  await page.screenshot({ path: 'test-results/screens/sin-conexion.png' })

  await context.setOffline(false)
  await expect(page.getByText('Sin conexión')).toBeHidden()
  await expect(page.getByText('Guardando…')).toBeHidden({ timeout: 10_000 })

  // Otro celular de la misma cuenta ve lo que se agregó sin señal.
  const phone = await secondPhone(browser)
  await signIn(phone, ANA)
  await expect(phone.getByRole('checkbox', { name: 'Tortillas' })).toBeVisible()
})

test('changes made offline after losing access are reported once', async ({ page, browser }) => {
  await signIn(page, ANA)
  const url = await inviteLink(page)
  const beto = await joinWith(browser, url)

  await beto.context().setOffline(true)
  await addItemNamed(beto, 'Café')
  await addItemNamed(beto, 'Azúcar')

  await page.goto(url.replace(/\/join\/([^/]+)\/.*/, '/l/$1/share'))
  await page.getByRole('button', { name: /Sacar a Beto/ }).click()
  await page.getByRole('button', { name: 'Sacar' }).click()
  await expect(page.getByRole('button', { name: /Sacar a Beto/ })).toBeHidden()

  await beto.context().setOffline(false)
  await expect(beto.getByText('Algunos cambios no se guardaron porque ya no tienes acceso a esta lista')).toHaveCount(1)
  await expect(beto.getByText('Esta lista ya no existe o ya no tienes acceso.')).toBeVisible({ timeout: 15_000 })
})
