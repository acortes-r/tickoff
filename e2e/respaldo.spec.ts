import { readFile } from 'node:fs/promises'
import { ANA, addItemNamed, expect, signIn, test } from './fixtures'

const DATE = /\d{4}-\d{2}-\d{2}/

test('without a Google client id, export downloads JSON and two CSVs', async ({ page }) => {
  await signIn(page, ANA)
  await addItemNamed(page, 'Leche, entera')
  await page.getByRole('link', { name: 'Inicio' }).click()
  await page.getByRole('link', { name: 'Ajustes' }).click()
  await expect(page.getByText('Se descarga a este dispositivo.', { exact: false })).toBeVisible()

  const jsonDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportar JSON' }).click()
  const json = await jsonDownload
  expect(json.suggestedFilename()).toMatch(new RegExp(`^tickoff-${DATE.source}\\.json$`))
  const data = JSON.parse(await readFile(await json.path(), 'utf8'))
  expect(data.lists.map((l: { name: string }) => l.name)).toContain('Despensa')
  const despensa = data.lists.find((l: { name: string }) => l.name === 'Despensa')
  expect(despensa.items.map((i: { name: string }) => i.name)).toEqual(['Leche, entera'])

  const csvDownloads: Promise<import('@playwright/test').Download>[] = [
    page.waitForEvent('download', (d) => d.suggestedFilename().startsWith('tickoff-elementos-')),
    page.waitForEvent('download', (d) => d.suggestedFilename().startsWith('tickoff-historial-')),
  ]
  await page.getByRole('button', { name: 'Exportar CSV' }).click()
  const [items, history] = await Promise.all(csvDownloads)
  const itemsCsv = await readFile(await items.path(), 'utf8')
  expect(itemsCsv).toContain('Despensa,Comprar,"Leche, entera"')
  expect(history.suggestedFilename()).toMatch(/\.csv$/)
  await page.screenshot({ path: 'test-results/screens/ajustes-respaldo.png' })
})
