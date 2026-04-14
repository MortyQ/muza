# Muzakit — Copilot Instructions

## How to use this file

Before generating any code, read the relevant files listed below from `.agents/`.
Each section tells you **when** to read **which file**.

---

## Always read

- `.agents/instructions/project.md` — project structure, packages, workspace rules
- `.agents/instructions/conventions.md` — naming, import order, general rules
- `.agents/instructions/vue-syntax.instructions.md` — Vue 3 component patterns
- `.agents/instructions/typescript.instructions.md` — TypeScript rules
- `.agents/instructions/workflow.md` — git, commits, pnpm commands
- `.agents/copilot/behavior.md` — how to behave and what not to suggest

---

## Skills — read when triggered

Skills are in `.agents/skills/`. Read a skill file when its trigger conditions match.

| Trigger | Read this skill |
|---|---|
| Working with `useApiPost`, `useApiGet`, or any `useApi*` | `.agents/skills/use-api.skill.md` |
| Importing from `@ametie/vue-muza-use` | `.agents/skills/use-api.skill.md` |
| Creating or editing a file in `*/api/use*.ts` | `.agents/skills/use-api.skill.md` |
| User asks to fetch data, add a request, wrap an endpoint, create an API composable | `.agents/skills/use-api.skill.md` |
| Component calls `useApi*` directly — flag as violation and suggest fix | `.agents/skills/use-api.skill.md` |

When a new skill is added to `.agents/skills/`, check its **Auto-Activation Triggers** section and apply the same logic.
