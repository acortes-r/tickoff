import { defineConfig, devices } from '@playwright/test'

const PORT = 5174

// Corre dentro de `firebase emulators:exec` (ver `pnpm test:e2e`): los emuladores
// ya están arriba y Playwright levanta Vite contra ellos en un puerto propio.
export default defineConfig({
  testDir: 'e2e',
  // Un solo emulador compartido: las pruebas se limpian entre sí, así que van en serie.
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: 'es-MX',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'android', use: { ...devices['Pixel 7'] } },
    // WebKit (motor de Safari) es opcional: en macOS 14 Playwright solo ofrece un
    // WebKit congelado que ya no es compatible. Actívalo con E2E_WEBKIT=1.
    ...(process.env.E2E_WEBKIT ? [{ name: 'iphone', use: { ...devices['iPhone 14'] } }] : []),
  ],
  webServer: {
    command: `vite --port ${PORT} --strictPort`,
    env: { VITE_USE_EMULATORS: 'true' },
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
  },
})
