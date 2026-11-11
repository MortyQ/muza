# Muzakit — Copilot Instructions

Vue 3.5 + TypeScript pnpm monorepo: `@muzakit/ui` (component library, BEM SCSS + `--ui-*`
tokens), `@muzakit/utils`, `@muzakit/config`, and two apps (`muzakit-dashboard`,
`muzakit-starter-without-tailwind`).

All guidelines live in `.agents/`. Before generating any code, read the relevant files listed
below. Each section tells you **when** to read **which file**.

---

## Always Read

- `.agents/instructions/project.md` — project structure, packages, workspace rules
- `.agents/instructions/conventions.md` — naming, file structure, import order, code style
- `.agents/instructions/typescript.instructions.md` — strict TS rules (`**/*.ts`, `**/*.vue`)
- `.agents/instructions/vue-syntax.instructions.md` — Vue 3.5+ rules (`**/*.vue`)
- `.agents/instructions/workflow.md` — pnpm commands, git conventions, CI
- `.agents/copilot/behavior.md` — how to behave and what not to suggest

## Read When Working On

| Area | File |
|---|---|
| Composables, `api/use*.ts`, request wiring | `.agents/instructions/composables.instructions.md` |
| A component in `libs/ui` (new, ported or restyled) | `.agents/instructions/ui-component-migration.md` |
| Tests in `libs/ui/tests` | `.agents/instructions/testing.md` |
| Evaluating an idea or choosing between approaches | `.agents/instructions/brainstorm-council.md` |

## Planning — OpenSpec

New features and behaviour changes are planned with OpenSpec before code. Specs live in
`openspec/specs/` (capabilities prefixed `ui-`, `utils-`, `dashboard-`; read the relevant one
before changing it); in-flight work lives in `openspec/changes/<change>/`. Bug fixes, small
tweaks, pure refactors and chores need no spec. The CLI is `pnpm openspec`. Never hand-edit
generated OpenSpec files — `pnpm openspec:update` regenerates them. Rules: `openspec/config.yaml`.

---

## Skills — Read When Triggered

Skills are in `.agents/skills/`. Read a skill file when its trigger conditions match.

| Trigger | Read this skill |
|---|---|
| `useApiPost`, `useApiGet`, any `useApi*`, imports from `@ametie/vue-muza-use` | `.agents/skills/use-api/SKILL.md` |
| Creating or editing a file in `*/api/use*.ts` | `.agents/skills/use-api/SKILL.md` |
| Fetching data, adding a request, wrapping an endpoint, creating an API composable | `.agents/skills/use-api/SKILL.md` |
| A component calls `useApi*` directly — flag as violation and suggest a wrapper | `.agents/skills/use-api/SKILL.md` |
| Rendering, configuring or debugging a `VTable`; TS4104 on `:data`; editing `libs/ui/src/components/table/**` | `.agents/skills/vtable/SKILL.md` |
| UI polish, component design, animation, layout | `.agents/skills/emil-design-eng/SKILL.md` |
| Faux product UI, product demos, marketing illustrations | `.agents/skills/stageshow/SKILL.md` |

When a new skill is added to `.agents/skills/`, check its triggers and apply the same logic.
