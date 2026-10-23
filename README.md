# tickoff

Listas de compras y pendientes, personales o compartidas, instalables como PWA en Android y iOS.

## Requisitos
- [mise](https://mise.jdx.dev) (instala Node, pnpm y Java para los emuladores de Firebase)

## Arranque
```sh
mise install
pnpm install
pnpm dev        # Vite + emuladores de Auth y Firestore (proyecto demo-tickoff)
```

## Tests
```sh
pnpm test       # unitarios (jsdom)
pnpm test:emu   # reglas y datos contra los emuladores de Firebase
pnpm test:e2e   # navegador (Playwright, perfil Android) contra los emuladores
```

La primera vez, descarga el navegador: `pnpm exec playwright install chromium`
(queda en `~/Library/Caches/ms-playwright`, fuera del repo). Para probar también
con WebKit (motor de Safari): `pnpm exec playwright install webkit` y
`E2E_WEBKIT=1 pnpm test:e2e`. En macOS 14 Playwright solo ofrece un WebKit
congelado que ya no es compatible.
