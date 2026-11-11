# Review pipeline — muzakit

Ported from so-platform's insights-client pipeline. Same stages, same reviewer contract,
scoped to `libs/**` and `apps/**`.

## Layout

```
.claude/
  commands/
    rev-tests.md          /rev-tests    — characterization tests, never edits source
    rev-refactor.md       /rev-refactor — closed list of transformations T1–T9, flags S1–S7
  hooks/
    review.sh             the reviewer — manual only, not wired into settings.json
  review/
    PIPELINE.md           this file
    rules.muzakit.md      the rules, with IDs — read before implementing in libs/ui
    reviewer-prompt.md    the reviewer's role and output contract (hook only)
    runs.md               per-run journal, filled from the owner's answers
    task.md               fallback plan when there is no OpenSpec change (gitignored)
    log.jsonl             every run and finding, written by the hook (gitignored)
```

## How the reviewer works

`review.sh` builds a diff, packs it **by file** into chunks of at most 600 added lines /
25 files, and sends each chunk to a separate `claude -p --model sonnet` process with no
tools, no MCP and no project instructions — only `reviewer-prompt.md`, `rules.muzakit.md`,
the task text and the diff. Findings are merged, deduplicated on `rule + file + line`,
capped at 7 critical / 10 warnings (ranked by how many files a rule fired in), and logged to
`log.jsonl` before the cap.

| Mode | Diff | When |
|---|---|---|
| `block` (default) | `git diff --cached` — what you staged | before each block's commit |
| `feature` | branch vs `merge-base main HEAD` + a 3-pass majority spec check (group J) | once, at handoff |
| `all` | every tracked line at `HEAD` vs the empty tree | a full audit of the codebase |

```bash
.claude/hooks/review.sh <<< '{}'
REVIEW_MODE=feature REVIEW_TASK=openspec/changes/<change> .claude/hooks/review.sh <<< '{}'
REVIEW_MODE=all REVIEW_MAXCHUNKS=200 .claude/hooks/review.sh <<< '{}'
REVIEW_MODE=all REVIEW_PATHS="libs/ui/src/components/table" .claude/hooks/review.sh <<< '{}'
```

Environment knobs: `REVIEW_PATHS` (pathspecs, default `libs apps`), `REVIEW_MODEL`
(`sonnet`), `REVIEW_BASE` (`main`), `REVIEW_MINLINES` (15, block mode only),
`REVIEW_CHUNKLINES` (600), `REVIEW_CHUNKFILES` (25), `REVIEW_MAXCHUNKS` (40 — above it the
line-level pass is skipped on cost), `REVIEW_SPEC_PASSES` (3), `REVIEW_REPORT_CRIT` /
`REVIEW_REPORT_WARN` (7 / 10). Cost is roughly $0.10 per chunk.

Output is JSON on stdout: `{decision:"block", reason}` when there are critical findings or
spec gaps, otherwise `{hookSpecificOutput:{additionalContext}}` with the warnings. Review is
**advisory** — nothing enforces `block`; committing past it is the owner's call and is
recorded in `runs.md`.

Two traps carried over from so-platform:

- **`git add -N` hides a file from the review.** Intent-to-add stores the empty blob, so
  `git diff --cached` does not see it. The hook refuses with the file list; run a full
  `git add`.
- **A bad `REVIEW_TASK` refuses loudly** (exit 1) rather than silently skipping group J. With
  no `REVIEW_TASK` and no `task.md`, group J is skipped — say so when offering the review.

## Stages

| Observed state | Next stage to offer (ask, never run unprompted) |
|---|---|
| Uncommitted changes, checks not run | **Checks** — `pnpm --filter @muzakit/ui type-check`, `pnpm --filter @muzakit/dashboard exec vue-tsc --noEmit`, `pnpm exec eslint libs apps`, `pnpm --filter @muzakit/ui test:unit` |
| Checks green, block not staged | **Stage the block** — `git add -- <the block's files>` (full add) |
| Block staged, ≥ 15 added lines | **Reviewer on the block** — `.claude/hooks/review.sh <<< '{}'` |
| Reviewer returned `critical` | **Fix** each one or explicitly call it a false positive; re-stage, re-run |
| Reviewer clean | **Commit the block** — `feat(<scope>): <block>` |
| All blocks committed | **`/rev-tests`** — base is `git merge-base main HEAD` |
| Characterization tests written | **Owner's 30-second check**, then `test(<scope>): characterization` |
| Tests committed | **`/rev-refactor`** — its own `refactor(<scope>)` commit with `Refactor-*` footers |
| Refactor done or nothing applicable | **Final pass** — `REVIEW_MODE=feature REVIEW_TASK=openspec/changes/<change> .claude/hooks/review.sh <<< '{}'` |
| No critical, no spec gaps | **Done** |

## Measurement

`log.jsonl` holds one `run` row per invocation (including zero-finding runs — the
denominator) and one `finding` row per finding with `verdict: null`. Set `verdict` to
`tp` / `fp` / `noise` when the owner rules on it. A rule whose FP rate stays above 40 % over
8+ runs is rewritten or removed. A rule that stays silent because code complies is a
success, not a dead rule — check `log.jsonl` for runs that covered matching code before
removing it.
