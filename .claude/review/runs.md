# Run journal — muzakit review pipeline

One run = one feature taken through the stages in `PIPELINE.md`.
Filled in by Claude **after the owner answers**, at the end of each stage. Analysis in 2–3 weeks.

This is the second measurement channel, complementing `log.jsonl`. Division of labour:

| File | What it measures | Who writes it |
|---|---|---|
| `log.jsonl` | every reviewer finding individually, with a tp/fp/noise `verdict` | the hook, automatically |
| `runs.md` (this file) | stages 1 and 2 — tests and refactor, which `log.jsonl` does not cover at all | Claude, from the owner's words |

The Phase 2 thresholds from `PIPELINE.md` (rejected-test rate < 20 %, revert rate < 10 %,
FP rate < 40 %) are computed **from this file only** — `log.jsonl` holds no data on stages 1 and 2.

---

## Filling rules — do not break them, or the data is unusable

1. **Claude's own assessment never enters the table.** Only the owner's numbers and wording go
   into the columns. If the owner named no number, the cell is `—`, never a guess.
2. **One row per run**, appended at the end. Existing rows are not rewritten: if a finding later
   turns out to be false, that is an edit to the `Reviewer` column of the same row plus a note in
   its answer block — not a deletion.
3. **A skipped stage is data.** If a stage did not run, the `Skipped` column says which and why
   ("hook exited: <15 lines", "refused: 31 files", "owner skipped the refactor"). An empty column
   means "every stage ran", not "I don't remember".
4. **The owner's long-form answer goes in verbatim**, in the `### R-<n>` block below. Do not
   paraphrase and do not shorten: "the test checks the wrong thing" and "the test is green but
   useless" are two different defect classes, and the difference survives only in the original
   words. **Verbatim includes the language it was said in** — a quote is not translated, because
   translation is paraphrase. Add a gloss beside it if the journal is being read in another
   language.
5. **Do not apply the thresholds below 8 runs.** A 10 % revert rate over three runs is not a
   measurement. Until then the table only accumulates and no conclusions are drawn.

---

## Runs

| # | Date | Feature / commit #1 | Files / +lines | Tests: written → rejected by owner | Refactor: applied → reverted | Reviewer: critical / warnings → ruled FP | Skipped |
|---|---|---|---|---|---|---|---|

<!-- Row template, copy and fill:
| R-1 | 2026-11-11 | feat(ui): VProgressBar redraw · a1b2c3d | 6 / 214 | 4 → 1 | 3 (T1,T3,T5) → 0 | 2 / 5 → 1 | — |
-->

---
