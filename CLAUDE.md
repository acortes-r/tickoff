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
- `pnpm test:e2e`: Playwright en `e2e/` (perfil Pixel 7) contra los emuladores, con Vite en el puerto 5174. Cada prueba limpia los emuladores y entra con `signIn` de `e2e/fixtures.ts`. Úsalo para probar flujos en el navegador sin esperar al usuario; las capturas quedan en `test-results/`.
- Desarrollo y tests usan el proyecto de emulador `demo-tickoff`; no hace falta un proyecto real de Firebase.

## Diseño — jerarquía de fuentes
- `DESIGN.md` es la fuente de verdad del diseño visual. Un patrón nuevo se agrega ahí antes de usarse en el código.
- `shadcn` (`.claude/skills/shadcn`): estilo visual.
- `ui-ux-pro-max`: solo UX (flujos, accesibilidad, interacción). Nunca para paletas, fuentes ni estilos.
- `emil-design-eng`: movimiento y animación.
- Usa componentes de shadcn/ui antes de crear uno propio.
- Si chocan, gana en este orden: `DESIGN.md` > `shadcn` > `ui-ux-pro-max` > `emil-design-eng`.
