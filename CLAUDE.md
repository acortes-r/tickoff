# tickoff

PWA de listas personales y compartidas (compras y pendientes). React 19 + Vite + TypeScript.

## Versiones con mise
- Node y pnpm se fijan en `mise.toml`. No uses el Node ni el pnpm globales del sistema.
- Corre todo con mise activo en el repo (`mise install` la primera vez).
- Para cambiar la versión de una herramienta, edita `mise.toml` y `engines` en `package.json` en el mismo commit.
- Usa pnpm, no npm ni yarn.

## Alcance
- No implementes features hasta que el documento de diseño en `docs/superpowers/specs/` esté aprobado y se pida empezar.

## Tests
- `pnpm test`: unitarios (Vitest, jsdom), junto al código como `*.test.ts(x)`.
- `pnpm test:emu`: reglas y datos contra los emuladores de Firebase; viven en `tests/emulator/`.
- Desarrollo y tests usan el proyecto de emulador `demo-tickoff`; no hace falta un proyecto real de Firebase.
