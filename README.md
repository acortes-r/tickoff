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
```
