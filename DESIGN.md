# tickoff — Diseño visual

Fuente de verdad del diseño visual. Si un patrón nuevo no está aquí, se agrega aquí antes de usarlo en el código. Base: skill `shadcn` (`.claude/skills/shadcn`), adaptada a una PWA móvil, en español y que funciona sin señal.

**Intención:** una herramienta tranquila y rápida; la jerarquía sale de la tipografía y el espacio, no del color.

## 1. Principios

- Minimalista, con mucho espacio en blanco. Una acción principal por pantalla.
- Jerarquía por tamaño, peso y espacio. El color se reserva para estados.
- **No:** degradados, sombras fuertes, glassmorphism, emojis como íconos, color decorativo.
- Componentes de shadcn/ui primero (`src/components/ui/`); un componente propio solo si shadcn no tiene uno.
- Íconos: `lucide-react`, siempre con `aria-label` o texto visible junto a ellos.

## 2. Color

Tokens en `src/index.css` (`:root` claro, `.dark` oscuro), como variables CSS y utilidades de Tailwind (`bg-background`, `text-muted-foreground`, `text-success`…). En código se usan los tokens, nunca hex sueltos.

| Token | Uso | Claro |
|---|---|---|
| `background` / `foreground` | Fondo y texto | blanco / casi negro |
| `primary` | Botón principal | `#171717` aprox. |
| `muted` / `muted-foreground` | Fondos secundarios, texto de apoyo | grises |
| `border`, `input`, `ring` | Bordes y foco | grises |
| `success` | Confirmaciones | `#16a34a` |
| `warning` | Advertencias | `#d97706` |
| `destructive` | Errores y acciones destructivas | `#dc2626` |
| `info` | Avisos neutros | neutro (igual a `primary`) |

**Excepción:** tonos apagados `--tone-1…8` y `--tone-1-fg…8-fg` (claro y oscuro), **solo** en el chip del ícono de una categoría. Se eligen de `CATEGORY_TONES` (`src/lib/tones.ts`). Contraste fg/bg ≥ 6.9:1 en ambos temas.

## 3. Tipografía

- Geist Variable (texto) y Geist Mono Variable (cantidades, códigos), con `@fontsource-variable/*`: viajan con la app y funcionan sin señal.
- Escala (px): 12, 14, 16, 18, 20, 24, 30, 36 → `text-xs`, `text-sm`, `text-base`, `text-lg`, `text-xl`, `text-2xl`, `text-3xl`, `text-4xl`.
- Texto de cuerpo 14–16. Inputs siempre ≥16 px en móvil (evita el zoom de iOS; el `Input` ya usa `text-base`).
- Pesos: 400 normal, 500 etiquetas y botones, 600 títulos. Nada más pesado.

## 4. Espacio y radios

- Base 4/8 px: `gap-1`, `gap-2`, `gap-4`, `gap-6`, `gap-8`, `gap-10`.
- Radios del preset (`--radius` = 10 px): `rounded-md` en chips, `rounded-lg` en botones e inputs, `rounded-xl` en tarjetas y modales. Sin radios a mano.
- Layout: mobile-first; en escritorio el contenido va centrado con `max-w-[480px]` y `px-4`.

## 5. Componentes

Todos tienen los estados default, hover (solo con puntero fino), focus-visible, active, disabled y, si aplica, loading y error.

**Botones** (`Button`)
- Variantes: `default` (principal, una por vista), `secondary`, `outline`, `ghost`, `destructive`, `link`.
- Tamaños: `sm`, `default`, `lg`, `icon*`. En pantallas táctiles miden al menos 44 px (`pointer-coarse:min-h-11`).
- Loading: `disabled` + `Loader2Icon` girando + texto en gerundio ("Guardando…").
- Al presionar: `scale(0.97)`, 150 ms.

**Formularios** (`Field`, `FieldLabel`, `FieldError`, `FieldDescription`, `Input`, `Textarea`, `Select`, `Checkbox`, `RadioGroup`, `Switch`)
- Se usa `field`, no `form`: en el registro actual de shadcn `form` ya no trae archivos.
- Etiqueta siempre visible. Ayuda debajo del campo con `FieldDescription`.
- Validación al salir del campo (blur); el error va debajo con `FieldError`, el campo lleva `aria-invalid` y el `Field` `data-invalid`.
- Marca de opcional: "(opcional)" en gris junto a la etiqueta. Los obligatorios no llevan marca.
- **Excepción:** la barra de captura rápida valida al presionar Enter, no en blur.

**Alertas en línea** (`Alert`)
- Variantes: `default` (info), `success`, `warning`, `destructive`.
- Anatomía: ícono + `AlertTitle` + `AlertDescription`; acción opcional con `AlertAction`.

**Avisos (toasts)** (Sonner, `<Toaster visibleToasts={2} />` montado una vez en `App`)
- Máximo 2 visibles. Mensajes cortos en pasado: "Compra cerrada".
- Deshacer: `toast(mensaje, { duration: 10_000, action: { label: "Deshacer", onClick } })`.

**Modales**
- `Dialog` para contenido (renombrar, elegir categoría). `AlertDialog` para confirmar algo destructivo.
- Atrapan el foco; Esc cierra. En `AlertDialog` el botón destructivo usa `variant="destructive"` y va a la derecha de "Cancelar".
- El título dice qué se borra ("¿Borrar “Despensa”?"); la descripción, la consecuencia.

**Componentes de tickoff → primitivas**

| Componente | Primitivas |
|---|---|
| CaptureBar | `Input` + `Command` (autocompletado) |
| TabBar (Comprar / Hacer) | `Tabs` |
| StoreChips | `Button` `size="sm"` (outline / default al estar activo) |
| ItemRow | fila completa tocable + `Checkbox` |
| NotificationBell | `Button` `size="icon"` + `Sheet` |
| SyncBadge | `Badge` |
| Chip de categoría | ícono lucide sobre `CATEGORY_TONES[n]` |

## 6. Movimiento

Según `emil-design-eng`:

- Solo `transform` y `opacity`. Nunca `transition: all`.
- Interacciones del usuario: 150–250 ms. Entrar con ease-out (`--ease-out`, `cubic-bezier(0.23, 1, 0.32, 1)`); salir más rápido que entrar. Sin `ease-in`, sin rebote.
- Sin animación en acciones de teclado repetidas (Enter en la captura rápida, navegar con flechas).
- Modal: fade + scale 0.96 → 1 (el CSS de shadcn ya lo hace). Toast: deslizamiento corto (Sonner). Botón: `scale(0.97)` al presionar.
- CSS por defecto. `motion` (Motion) solo para la entrada y salida de elementos de una lista y el resaltado de elementos nuevos.
- `prefers-reduced-motion: reduce` apaga animaciones y transiciones (`src/index.css`); con Motion, usar `useReducedMotion`.

## 7. Móvil y PWA

- Áreas táctiles ≥ 44 × 44 px, con al menos 8 px (`gap-2`) entre una y otra.
- `touch-action: manipulation` (sin retraso de toque) y `overscroll-behavior-y: contain` (sin recargar por accidente al jalar) en `html`.
- `viewport-fit=cover` y padding `env(safe-area-inset-*)` en `body` para notch e indicador de inicio.
- `<meta name="theme-color">` se actualiza con el tema (`src/lib/theme.ts`).
- Nada que dependa de hover: todo lo que aparece en hover también se ve o se alcanza con un toque.
- Hover solo con `@media (hover: hover) and (pointer: fine)`.

## 8. Modo oscuro

- Sigue `prefers-color-scheme` (`followSystemTheme()` en `src/main.tsx` pone la clase `.dark` en `<html>`).
- Sin interruptor en la app. Solo `/showcase` (desarrollo) tiene uno, con `setThemeOverride`.

## 9. Accesibilidad

- WCAG 2.2 AA: texto ≥ 4.5:1, texto grande e íconos ≥ 3:1.
- Foco siempre visible (`focus-visible:ring-3 ring-ring/50`); nunca `outline: none` sin reemplazo.
- `aria-*` correctos: `aria-invalid` en errores, `aria-label` en botones de solo ícono, `role="alert"` en alertas.
- Todo se usa con teclado: orden de Tab lógico, Esc cierra modales y paneles.
- Idioma `es-MX` en `<html>`.

## 10. No se hace

- Colores fuera de los tokens; tonos de categoría fuera del chip de categoría.
- Degradados, sombras grandes, blur de fondo, emojis como íconos.
- `transition: all`, animaciones > 300 ms en UI, `ease-in`, rebotes, animar desde `scale(0)`.
- Animar acciones de teclado repetidas.
- Placeholder como única etiqueta.
- Botones de solo ícono sin `aria-label`.
- Áreas táctiles menores a 44 px.
- Confirmar algo destructivo con un `Dialog` normal o con `window.confirm`.
- Más de un botón `default` (principal) por vista.

## QA en revisión

- [ ] Solo tokens; nada de hex en componentes.
- [ ] Tab recorre todo con foco visible; Esc cierra modales.
- [ ] Contraste AA en claro y oscuro.
- [ ] Con movimiento reducido no hay animaciones de posición.
- [ ] Áreas táctiles ≥ 44 px en móvil.
- [ ] Copy en español (México), corto y concreto.
