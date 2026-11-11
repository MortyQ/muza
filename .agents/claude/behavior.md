# Claude Behavior — muzakit

How Claude should operate in this project.

---

## Before Writing Any Code

1. **The relevant rules must be in context.** `typescript`, `vue-syntax`, `conventions` and
   `composables` are imported by `CLAUDE.md`; `ui-component-migration.md` and `testing.md` too.
   Read the file before editing it.
2. **Invoke skills before acting, not after** — see Skills Reference below. Each skill file has an
   **Auto-Activation Triggers** section (or a trigger `description`); if any trigger matches, apply
   that skill's patterns and rules without waiting to be asked. While a skill is active, follow its
   output style and naming rules, use its file structure and composable architecture, and flag
   violations of its forbidden patterns.
3. **Before implementing in `libs/ui`, read `.claude/review/rules.muzakit.md`** — the reviewer
   checks against it (Review Pipeline below).

---

## OpenSpec — Spec-Driven Planning

OpenSpec is the planning and spec system for every package. One root `openspec/` serves the
monorepo; capability folders under `openspec/specs/` are prefixed by package (`ui-*`, `utils-*`,
`dashboard-*`). Invoke the skills yourself — the owner does not type `/opsx:*`.

**When it applies — a new feature or a behaviour change in any package.** Before any code:

1. `openspec-explore` — think the idea through (the council format in `brainstorm-council.md`
   is used here).
2. `openspec-propose` — creates `openspec/changes/<change>/` with proposal, design, delta specs
   and tasks.
3. **The owner reviews the proposal before apply starts.** Do not begin implementing on an
   unreviewed proposal.
4. `openspec-apply-change` — implement the tasks; each task group is one block and one commit.
5. `openspec-archive-change` — when the change is done, merged or committed, and its specs are
   synced (`openspec-sync-specs`). Never earlier.

`openspec-update-change` revises an existing change's artifacts when the plan shifts.

**When it does not apply — no spec:** bug fixes, small tweaks, pure refactors, dependency
bumps, chores, docs.

**`openspec/specs/` is the living source of truth.** Read the relevant capability spec before
changing an existing one.

**The CLI is `pnpm openspec`, never bare `openspec`.** It is a pinned root devDependency, not a
global install, so `openspec` is not on PATH. Wherever an OpenSpec skill says to run
`openspec <args>`, run `pnpm openspec <args>` from the repo root instead.

Generated OpenSpec files are never edited by hand (list in `workflow.md`); `pnpm openspec:update`
regenerates them. Project-specific guidance goes in `openspec/config.yaml`. Updating the OpenSpec
version is the owner's manual step — never bump it or run `openspec:update` unprompted.

---

## Constraints

- **No `@ts-ignore`** without an explanatory comment.
- **No synchroniser watchers** — Rule 10a in `vue-syntax.instructions.md`.
- **No page-level loaders.** A `v-if="loading"` that replaces a screen's or a block's content with
  a loader or skeleton is banned: every block stays mounted and carries its own `:loading`
  (`VTable` draws its own overlay). A drawer whose identity changes swaps on *staleness*
  (`detail?.id !== requestedId`), not on `loading`. Full rule: Rule 13 in
  `composables.instructions.md`. Existing code that still swaps on `loading` is not rewritten
  proactively — new and touched code follows the rule.
- **No direct `useApi*` calls in components** — go through a feature request wrapper (`use-api`
  skill).
- **`libs/ui` stays BEM + `--ui-*` tokens** — no Tailwind utilities in its templates, no raw
  colour values in its SCSS (`ui-component-migration.md`).

---

## Code Structure and Quality

The structure rules in `conventions.md` (arrow functions, decomposition, subfolders) and
`vue-syntax` Rule 18 (script setup order) apply **at planning time too** — a proposed design is
already structured by them, not refactored into them later.

- Read the file before editing it.
- Do not refactor code that wasn't asked about.
- Do not add comments, docstrings, or type annotations to untouched code.
- Do not add error handling for impossible scenarios or duplicate what the global request error
  handler already does.
- Do not create abstractions for one-off operations or premature generalisation — solve the task
  at hand.

---

## Review Pipeline

The staged review pipeline is described in `.claude/review/PIPELINE.md`. The reviewer is
`.claude/hooks/review.sh`, run manually on the staged block (it is not wired into settings);
at handoff run it once more with `REVIEW_MODE=feature`. `/rev-tests` writes characterization
tests and `/rev-refactor` applies the closed list of refactors. The rules it checks are in
`.claude/review/rules.muzakit.md` — read them before implementing in `libs/ui`.

```bash
.claude/hooks/review.sh <<< '{}'                        # staged block
REVIEW_MODE=feature .claude/hooks/review.sh <<< '{}'    # whole feature, at handoff
```

---

## Shell Commands — Keep Them Simple and Approvable

Permission rules in `.claude/settings.local.json` match on a **command prefix**. `grep`, `find`,
`wc`, `ls`, `cat` and friends are already allowed there, so a single plain invocation runs without
interrupting the user.

A **compound** command cannot match any prefix rule and always prompts — no settings entry can fix
that. So don't build them for what a plain command or a tool call already does:

```bash
# ✅ single command — matches Bash(grep:*), no prompt
grep -rn "useTablePage" libs/ui/src/components/table

# ❌ loops, chained cd, multi-file sweeps — prompts every time
cd libs/ui/src/components && for f in A B C; do echo "== $f =="; grep -n "x" $f.vue; done
```

Rules:

- **Reading a file → use the `Read` tool**, never `sed -n '10,40p'` or `head`/`tail`. Read takes
  `offset`/`limit` for partial reads.
- **Inspecting several files → issue several tool calls in one message** (they run in parallel),
  never a shell `for` loop.
- Keep `cd` out of it — pass absolute or repo-relative paths to the command instead. The working
  directory persists between Bash calls anyway.
- Chaining with `&&` is fine for a genuine sequence you'd otherwise run as separate steps
  (`pnpm --filter @muzakit/ui type-check && pnpm exec eslint libs`), not as a way to bundle
  unrelated inspection.
- If a search tool (`Grep`/`Glob`) is available in the session, prefer it over shell `grep` —
  it never prompts. Availability varies, so fall back to a single plain `grep` when it is absent.

---

## Response Style

- Be concise — no filler, no preamble. Lead with the action or answer, not the explanation.
- Use markdown only when it adds clarity. No trailing summaries of what was just done.
- Reference file paths with line numbers when pointing to code:
  `libs/ui/src/components/table/VTable.vue:332`.

## When Uncertain

- Ask one focused question, not a list.
- Prefer making a reasonable assumption and stating it, over asking.

## File Creation

- Prefer editing existing files over creating new ones.
- Never create README or documentation files unless explicitly asked.

---

## Skills Reference

Skills live in `.agents/skills/` (the `openspec-*` ones are generated into `.claude/skills/`).

| Skill | When to invoke |
|-------|---------------|
| `emil-design-eng` | Any UI/UX task — Vue files, templates, styling, layout, animation, **and any brainstorm/discussion involving components or visual design**, before presenting mockups or layout options. Also for visual and interaction changes to `VTable` |
| `vtable` | **Any VTable work** — rendering, configuring or debugging a table (columns, pagination, sort, `row-height`, TS4104), and changing VTable itself. Load it before advising on any VTable prop; never answer from memory |
| `use-api` | Any request work — `api/use*.ts` wrappers, `useApi*` / `useApiBatch`, `@ametie/vue-muza-use` |
| `stageshow` | Faux product UI — product shots, animated demos, cursor walkthroughs, marketing illustrations of the dashboard |
| `find-skills` | The user asks whether a skill exists for something, or wants to install one |
| `openspec-explore` / `openspec-propose` | Any new feature or behaviour change — before code. Replaces superpowers `brainstorming` / `writing-plans` |
| `openspec-apply-change` | Implementing the tasks of an approved change |
| `openspec-update-change` | Revising an existing change's artifacts when the plan shifts |
| `openspec-sync-specs` | Syncing a change's delta specs into `openspec/specs/` |
| `openspec-archive-change` | The change is done, merged or committed, specs synced |
