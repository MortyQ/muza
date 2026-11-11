# Workflow — muzakit

Git conventions, package manager commands, and CI/CD reference.

---

## Package Manager: pnpm

pnpm v10+, Node 22+. Run from the **repo root** with `--filter`, or `cd` into the package and drop
the filter.

```bash
# Install all dependencies
pnpm install

# Dev server (the dashboard)
pnpm dev                                   # = pnpm --filter @muzakit/dashboard dev

# Build
pnpm build:libs                            # @muzakit/utils, then @muzakit/ui
pnpm build                                 # libs, then the dashboard
pnpm --filter @muzakit/ui build

# Type-check
pnpm --filter @muzakit/ui type-check
pnpm --filter @muzakit/dashboard exec vue-tsc --noEmit

# Lint
pnpm exec eslint libs apps

# Tests — @muzakit/ui only (see testing.md)
pnpm --filter @muzakit/ui test:unit        # jsdom
pnpm --filter @muzakit/ui test:tokens      # token contracts, real Chromium
pnpm --filter @muzakit/ui test:coverage    # unit + thresholds
pnpm --filter @muzakit/ui test:visual:docker
```

Verifying a `libs/ui` change on a cold build is in `ui-component-migration.md` § Verify.

---

## Adding Dependencies

```bash
# add to a specific package
pnpm --filter @muzakit/ui add some-lib

# add to root (dev tool)
pnpm add -D some-tool -w
```

A new runtime dependency of `libs/ui` also goes into `rollupOptions.external` in its
`vite.config.ts` (`ui-component-migration.md` Step 9).

---

## OpenSpec

Planning and specs live in OpenSpec; the trigger rule is in `.agents/claude/behavior.md`.

The CLI is a root devDependency (`@fission-ai/openspec`, exact version) — `pnpm install` is the
whole installation. No global install; always call it through pnpm.

```bash
pnpm openspec list       # active changes
pnpm openspec show       # show a change or spec
pnpm openspec validate   # validate changes and specs (--all for everything)
pnpm openspec view       # interactive dashboard
pnpm openspec:update     # regenerate skills/commands/prompts for the installed version
```

- **Updating is manual, on purpose.** Check what is new with
  `pnpm outdated -w @fission-ai/openspec`, then in one PR:
  `pnpm add -Dw --save-exact @fission-ai/openspec@<version>` → `pnpm openspec:update` → review
  the diff of the generated files. Commit as `chore(deps): update openspec to <version>`.
- **Telemetry off:** the `openspec:update` script sets `OPENSPEC_TELEMETRY=0`; for ad-hoc
  terminal use run `pnpm openspec config set telemetry.enabled false` once.
- **Layout:** one root `openspec/` — `config.yaml`, `specs/<package>-<capability>/spec.md`
  (living specs, prefixed `ui-`, `utils-`, `dashboard-`), `changes/<change>/` (proposal, design,
  delta specs, tasks), `changes/archive/`.
- **Generated, never hand-edited:** `.claude/skills/openspec-*`, `.claude/commands/opsx/`, and
  any `.github/skills/openspec-*` / `.github/prompts/opsx-*`.
- **Commits:** a spec-only change uses `docs(openspec): <description>`; implementation commits
  keep `feat(<scope>): <block>`.

---

## Git Hooks

Husky runs three hooks automatically:

- **pre-commit** → `lint-staged` (`eslint --fix` on staged `*.{ts,vue,js,mjs}`)
- **commit-msg** → `commitlint` (validates commit message format)
- **pre-push** → `@muzakit/ui` unit tests, plus the token contracts when a Chromium is installed

**Never use `--no-verify`** unless explicitly told to. Fix lint, test or commit format errors
instead.

---

## Conventional Commits — Required

commitlint (`@commitlint/config-conventional`) enforces the format on every commit. Violations
block the commit.

```
<type>(<scope>): <description>

feat(ui): add BaseModal component
fix(dashboard): correct table pagination offset
refactor(utils): simplify date formatting logic
chore(deps): update vue to 3.5.25
docs: update workflow instructions
```

### Types

| Type | When to use |
|------|------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `refactor` | Code change without feature/fix |
| `perf` | Performance improvement |
| `docs` | Documentation only |
| `style` | Formatting, whitespace (no logic change) |
| `test` | Adding or updating tests |
| `chore` | Build, deps, config changes |
| `ci` | CI/CD configuration |

A breaking change is marked `feat!` / `fix!` or with a `BREAKING CHANGE:` footer.

### Scope

Optional but recommended. Use the package or area: `ui`, `utils`, `config`, `dashboard`,
`starter`, `deps`, `openspec`.

---

## Branches and Pull Requests

- `main` — stable, production-ready
- Feature branches: `feat/<description>` — `feat/ui-refresh`
- Bug fixes: `fix/<description>`
- One PR = one logical change; the PR title follows the Conventional Commits format.
- Always test locally before opening a PR.

---

## CI Checks

`.github/workflows/ci.yml` runs on every pull request and every push to `main`:

1. `pnpm build:libs`
2. `pnpm --filter @muzakit/ui type-check`
3. `pnpm --filter @muzakit/dashboard exec vue-tsc --noEmit`
4. `pnpm exec eslint libs apps`
5. `pnpm --filter @muzakit/ui test:coverage`
6. Token contracts — `pnpm --filter @muzakit/ui test:tokens`, in its own job

All must pass before merge. Fix errors locally before pushing.

---

## Deployment

`.github/workflows/deploy-pages.yml` builds the dashboard (`pnpm build`) on every push to `main`
and publishes it to GitHub Pages.
