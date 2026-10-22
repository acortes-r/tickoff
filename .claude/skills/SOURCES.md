# Skills de diseño (vendorizadas)

Copiadas a mano desde su repo de origen y revisadas antes de entrar (sin acceso a red, sin secretos, sin escrituras fuera de su carpeta). Viven solo en este repo; no se instalan en `~/.claude`.

| Skill | Repo | Ruta de origen | Commit |
|---|---|---|---|
| `shadcn` | https://github.com/bergside/awesome-design-skills | `skills/shadcn` | `f631a09b4fcc0166f2e2c1a8c81906ef680c57e8` |
| `ui-ux-pro-max` | https://github.com/nextlevelbuilder/ui-ux-pro-max-skill | `.claude/skills/ui-ux-pro-max` | `076a2b3a31394ad788afaa71f55d0bf789e7b3ec` |
| `emil-design-eng` | https://github.com/emilkowalski/skills | `skills/emil-design-eng` | `2d228630ba1446365f614a108cb8252f1feda202` |
| `motion-framer` | https://github.com/freshtechbro/claudedesignskills | `plugins/individual/motion-framer/skills/motion-framer` | `1da73febff0c3e1dfefc07f8a5ef8f7d1dfdb6cd` |

## Cambios respecto al origen

- `ui-ux-pro-max`: sin `scripts/tests/` (algunos tests ejecutan scripts que encuentren en carpetas superiores). En `SKILL.md`, `${CLAUDE_PLUGIN_ROOT}/.claude/skills/...` cambió a `.claude/skills/...` (relativo a la raíz del repo) y `python` a `python3 -I`.
- `motion-framer`: solo `SKILL.md` y `references/api_reference.md`. Sin `scripts/` ni `assets/starter_motion/` (React 18 y framer-motion 11, no aplican a este repo).
- `motion-framer`: la sección "Bundled Resources" de `SKILL.md` lista solo lo que sí se copió.
