#!/usr/bin/env bash
# Reviewer: reviews the libs/** + apps/** diff of muzakit in a separate `claude -p` process.
# Ported from so-platform's review-insights.sh. Manual only -- not wired into settings.json.
# Logs every finding to .claude/review/log.jsonl for FP-rate measurement.
set -uo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || exit 0
cd "$REPO_ROOT" || exit 0

RULES=".claude/review/rules.muzakit.md"
PROMPT=".claude/review/reviewer-prompt.md"
LOG=".claude/review/log.jsonl"
# What is reviewed. REVIEW_PATHS narrows it (space-separated pathspecs), e.g. to split a
# REVIEW_MODE=all audit into parallel runs: REVIEW_PATHS="libs/ui/src/components/table".
read -r -a SCOPE <<<"${REVIEW_PATHS:-libs apps}"
MODEL="${REVIEW_MODEL:-sonnet}"

# What gets reviewed.
#
#   block   (default) -- the staged index. `git add` is what declares the block boundary,
#                        so unrelated uncommitted work in the tree is excluded by
#                        construction. New files appear here too once added (or `git add -N`),
#                        which is why there is no separate untracked-file handling.
#   feature            -- the whole branch against merge-base with REVIEW_BASE.
#                        Used once, at handoff, when the blocks are already committed.
#   all                -- every tracked line at HEAD, diffed against the empty tree. A full
#                        audit of the codebase rather than of a change; no spec pass.
#
#   REVIEW_MODE=feature .claude/hooks/review.sh <<< '{}'
MODE="${REVIEW_MODE:-block}"
BASE="${REVIEW_BASE:-main}"
MINLINES="${REVIEW_MINLINES:-15}"

# Chunking. A diff larger than one chunk is not skipped and not truncated -- it is split by
# file into several reviewer calls whose findings are merged. See "gate 4" for why.
CHUNKLINES="${REVIEW_CHUNKLINES:-600}"
CHUNKFILES="${REVIEW_CHUNKFILES:-25}"
MAXCHUNKS="${REVIEW_MAXCHUNKS:-40}"

# --- the task text -----------------------------------------------------------
# Where the plan lives. REVIEW_TASK accepts either:
#
#   * a DIRECTORY -- an OpenSpec change, the default way of keeping a plan in this repo:
#
#       REVIEW_TASK=openspec/changes/<change> \
#         REVIEW_MODE=feature .claude/hooks/review.sh <<< '{}'
#
#     It must contain proposal.md or tasks.md. The task text is built by concatenating
#     proposal.md, design.md (if present), every specs/**/spec.md (sorted) and tasks.md, each
#     under a `### <path relative to the change>` header.
#   * a FILE -- a single plan document, used as is. Fallback for work that has no OpenSpec
#     change. The default, when REVIEW_TASK is unset, is `.claude/review/task.md` (gitignored).
#
# Absence is handled ASYMMETRICALLY on purpose:
#
#   * default path missing        -> no group J pass, silently. A normal case: not every run
#                                   has a plan, and this is the state the pipeline started in.
#   * REVIEW_TASK given and bad   -> refuse loudly, exit non-zero, review nothing.
#
# Without that asymmetry a typo in a hand-typed path looks exactly like "no plan provided":
# group J never runs and the run reports clean. That is the class of silent loss this hook
# spent two review rounds removing, and a path typed by hand is the likeliest way to get it
# back. An empty file counts as bad for the same reason -- `-f` is true for it, `TASK` comes
# out empty, and the spec pass is skipped without a word. A directory without proposal.md or
# tasks.md, or one that assembles to nothing, is bad for the same reason.
TASK_FILE="${REVIEW_TASK:-.claude/review/task.md}"
TASK_FILE="${TASK_FILE%/}"
TASK=""
TASK_TMP=""

# Pathspecs are repo-relative, so an absolute REVIEW_TASK is converted first. Computed from the
# path as given, before a directory is replaced by its assembled temp file below.
TASK_REL="${TASK_FILE#"$REPO_ROOT"/}"

if [ -n "${REVIEW_TASK:-}" ] && [ -d "$TASK_FILE" ]; then
  if [ ! -f "$TASK_FILE/proposal.md" ] && [ ! -f "$TASK_FILE/tasks.md" ]; then
    echo "review: REVIEW_TASK=$TASK_FILE is a directory with neither proposal.md nor tasks.md." >&2
    echo "  Not an OpenSpec change. Refusing to run: group J would switch off silently." >&2
    exit 1
  fi
  TASK_TMP=$(mktemp)
  trap 'rm -f "$TASK_TMP"' EXIT
  {
    emit_task_part() {
      [ -f "$TASK_FILE/$1" ] || return 0
      printf '### %s\n\n' "$1"
      cat "$TASK_FILE/$1"
      printf '\n\n'
    }
    emit_task_part proposal.md
    emit_task_part design.md
    if [ -d "$TASK_FILE/specs" ]; then
      while IFS= read -r spec; do
        [ -n "$spec" ] && emit_task_part "${spec#"$TASK_FILE"/}"
      done <<<"$(find "$TASK_FILE/specs" -type f -name spec.md | sort)"
    fi
    emit_task_part tasks.md
  } > "$TASK_TMP"
  TASK_FILE="$TASK_TMP"
fi

if [ -n "${REVIEW_TASK:-}" ]; then
  if [ ! -f "$TASK_FILE" ]; then
    echo "review: REVIEW_TASK=$TASK_FILE — no such file or directory. Refusing to run: an" >&2
    echo "  unreadable task path is indistinguishable from 'no plan', and group J would switch" >&2
    echo "  off silently. Fix the path, or unset REVIEW_TASK to use the default." >&2
    exit 1
  fi
  if [ ! -s "$TASK_FILE" ]; then
    echo "review: REVIEW_TASK=${TASK_REL} is empty. Refusing to run — see above." >&2
    exit 1
  fi
fi

[ -f "$TASK_FILE" ] && TASK=$(cat "$TASK_FILE")

EXCL=( ':(exclude)*.spec.ts' ':(exclude)*/tests/*' ':(exclude)*.md' ':(exclude)*/dist/*'
       ':(exclude)*.svg' ':(exclude)*.png' ':(exclude)*.jpg' ':(exclude)*.woff2'
       ':(exclude)pnpm-lock.yaml' ':(exclude)*/package.json' )

# A plan kept inside the feature folder sits inside SCOPE, so without this it would be
# reviewed as part of the diff: counted in the added lines, packed into a chunk, and handed to
# the reviewer twice -- once as <task>, once as diff text. For a directory the pathspec excludes
# everything under it. An OpenSpec change lives under openspec/, outside SCOPE, so it is never
# in the diff to begin with and needs no exclusion -- the SCOPE pathspecs below already keep it out.
for s in "${SCOPE[@]}"; do
  case "$TASK_REL" in
    "$s"/*) EXCL+=( ":(exclude)$TASK_REL" ) ;;
  esac
done

INPUT=$(cat)
SESSION=$(jq -r '.session_id // "nosession"' <<<"$INPUT" 2>/dev/null || echo nosession)

# --- gate 1: loop protection -------------------------------------------------
[ "$(jq -r '.stop_hook_active // false' <<<"$INPUT" 2>/dev/null)" = "true" ] && exit 0

# --- gate 2: infrastructure present ------------------------------------------
for f in "$RULES" "$PROMPT"; do
  [ -f "$f" ] || { echo "review: missing $f" >&2; exit 0; }
done
command -v jq >/dev/null || { echo "review: jq is required" >&2; exit 0; }
command -v claude >/dev/null || exit 0

# --- gate 3: is there anything to review -------------------------------------
if [ "$MODE" = "all" ]; then
  EMPTY_TREE=$(git hash-object -t tree /dev/null)
  DIFF_ARGS=( "$EMPTY_TREE" HEAD )
  BASE_LABEL="empty tree (full audit of $(git rev-parse --short HEAD))"
elif [ "$MODE" = "feature" ]; then
  MERGE_BASE=$(git merge-base "$BASE" HEAD 2>/dev/null) \
    || { echo "review: cannot resolve base '$BASE'" >&2; exit 0; }
  DIFF_ARGS=( "$MERGE_BASE" )
  BASE_LABEL="$BASE ($(git rev-parse --short "$MERGE_BASE"))"
else
  DIFF_ARGS=( --cached )
  BASE_LABEL="staged index"
fi

CHANGED=$(git diff "${DIFF_ARGS[@]}" --name-only -- "${SCOPE[@]}" "${EXCL[@]}")
ALL_FILES=$(sed '/^$/d' <<<"$CHANGED" | sort -u)

# `git add -N` records intent-to-add as the EMPTY blob in the index, so the file is absent
# from `git diff --cached` entirely -- not shown as empty, shown not at all. Its content
# would be reviewed as if it did not exist. Detect it via ls-files (the only place the entry
# is visible) and refuse loudly; a silent pass is the failure mode this whole mode change
# was meant to remove.
if [ "$MODE" = "block" ]; then
  EMPTY_BLOB=e69de29bb2d1d6434b8b29ae775ad8c2e48c5391
  MISSING=""
  while IFS= read -r f; do
    [ -n "$f" ] && [ -s "$f" ] && MISSING+="  $f"$'\n'
  done <<<"$(git ls-files -s -- "${SCOPE[@]}" | grep " $EMPTY_BLOB " | cut -f2 || true)"
  if [ -n "$MISSING" ]; then
    echo "review: staged with 'git add -N' (empty blob in the index), content invisible to" >&2
    echo "'git diff --cached'. Run a full 'git add' on:" >&2
    printf '%s' "$MISSING" >&2
    exit 0
  fi
fi

[ -z "$ALL_FILES" ] && exit 0

NFILES=$(wc -l <<<"$ALL_FILES" | tr -d ' ')
DIFF=$(git diff "${DIFF_ARGS[@]}" -- "${SCOPE[@]}" "${EXCL[@]}")

# `grep -c` prints 0 AND exits 1 when there is no match, so `|| echo 0` would append a
# second zero and the comparison below would die with "integer expression expected".
DIFF_LINES=$(grep -cE '^\+[^+]' <<<"$DIFF" || true)
DIFF_LINES=${DIFF_LINES:-0}

echo "Review: $BASE_LABEL — $NFILES files, $DIFF_LINES added lines" >&2

# --- gate 4: size ------------------------------------------------------------
# Too small: not worth the tokens. Skipped in feature mode -- the measured distribution starts
# at 6 added lines, and a 6-line feature below MINLINES would silently lose its group J check.
# There is one feature run per feature, so there is nothing to economise on there.
if [ "$MODE" = "block" ] && [ "$DIFF_LINES" -lt "$MINLINES" ]; then exit 0; fi

# Large diffs are CHUNKED, not skipped and not sent whole. Both alternatives lose coverage
# silently, which is the one outcome a review must never produce:
#
#   * Sending it whole does not work at feature scale. Measured on this repo's own history,
#     (so-platform measurement) a 7398-added-line feature = 474906 bytes of diff,
#     roughly 128k tokens; 15000 added lines would be ~950 KB, past the model's context. The
#     CLI does not warn -- the run comes back empty or truncated and is logged as a clean
#     review. On top of that, reviewer-prompt.md caps output at 7 critical + 10 warnings, so
#     one call over a whole feature returns a sample of the defects, not the set of them.
#   * Skipping ("split the block") reviews nothing at all. On a feature split into ten
#     2000-line blocks that is the entire feature.
#
# So the diff is packed by file into groups of at most CHUNKLINES added lines / CHUNKFILES
# files, each group is reviewed on its own, and the findings are merged. Coverage no longer
# depends on feature size; the per-chunk finding cap replaces a per-feature one; every call
# stays in the size range the reviewer was measured at. Cost is linear -- about $0.11 per
# cold chunk, so ~$2.75 for a 15k-line feature, once, at handoff.
#
# Files are never split. A single file above CHUNKLINES becomes its own oversized chunk: a
# half-file diff would strip the very context (the composable's other half, the rest of the
# setup block) the rules are checked against.
FILE_LINES=$(while IFS= read -r f; do
  n=$(git diff "${DIFF_ARGS[@]}" -- "$f" | grep -cE '^\+[^+]' || true)
  echo "${n:-0} $f"
done <<<"$ALL_FILES")

CHUNKS=()
cur=""; cur_lines=0; cur_n=0
while read -r n f; do
  [ -z "$f" ] && continue
  # A file with no added lines is a pure deletion or rename. Check 1 in reviewer-prompt.md
  # only ever reports on an added or modified line, so such a file can produce nothing --
  # packing it in buys a larger payload and, when a whole chunk is made of them, a paid call
  # whose empty result was known in advance. Measured on 7c10091b: drops 15 chunks to 14 and
  # takes 62 KB out of another.
  [ "$n" -eq 0 ] && continue
  if [ -n "$cur" ] && { [ $((cur_lines + n)) -gt "$CHUNKLINES" ] || [ "$cur_n" -ge "$CHUNKFILES" ]; }; then
    CHUNKS+=( "$cur" ); cur=""; cur_lines=0; cur_n=0
  fi
  cur+="$f"$'\n'; cur_lines=$((cur_lines + n)); cur_n=$((cur_n + 1))
done <<<"$FILE_LINES"
[ -n "$cur" ] && CHUNKS+=( "$cur" )

NCHUNKS=${#CHUNKS[@]}

# Reachable in feature mode with a deletion-only branch. Expanding "${CHUNKS[@]}" when the
# array is empty aborts the script under `set -u` on bash 3.2, which is what macOS ships.
if [ "$NCHUNKS" -eq 0 ]; then
  echo "review: no added lines to review (deletions and renames only)" >&2
  exit 0
fi

# Above MAXCHUNKS the line-level pass is dropped on cost -- but ONLY that. The group J pass is
# one call of about ten cents whose payload does not grow with the diff, so killing it here
# would reintroduce a silent loss at exactly the size where forgetting a plan item is likeliest.
SKIP_CHUNKS=0
if [ "$NCHUNKS" -gt "$MAXCHUNKS" ]; then
  SKIP_CHUNKS=1
  echo "review: $NCHUNKS chunks needed, above REVIEW_MAXCHUNKS=$MAXCHUNKS — line-level review" >&2
  echo "  skipped on cost (~\$0.11 per chunk). Raise it deliberately, or review in two halves." >&2
fi

MODE_LABEL="$MODE"
if [ "$SKIP_CHUNKS" = "1" ]; then
  MODE_LABEL="$MODE/spec-only"
elif [ "$NCHUNKS" -gt 1 ]; then
  MODE_LABEL="$MODE/chunked"
  echo "Review: split into $NCHUNKS chunks of <= $CHUNKLINES added lines" >&2
fi

# --- gate 5: has this exact diff already been reviewed twice ------------------
# Keyed by diff content, not by session: a new diff gets a fresh counter, so the per-block
# loop is never throttled, while a genuine re-review loop over an unchanged diff still is.
HASHER=$(command -v shasum || command -v sha1sum) || { echo "review: no sha tool" >&2; exit 0; }
DIFF_HASH=$(printf '%s' "$DIFF" | "$HASHER" | cut -c1-12)
COUNTER="/tmp/review-count-$DIFF_HASH"
COUNT=$(cat "$COUNTER" 2>/dev/null || echo 0)
if [ "$COUNT" -ge 2 ]; then
  echo "review: this exact diff was already reviewed $COUNT times, skipping" >&2
  exit 0
fi
echo $((COUNT + 1)) > "$COUNTER"

# --- review in a separate process, clean context -----------------------------
# The reviewer is a single-pass text task: everything it may use is in the prompt, and the
# rules say a rule absent from the rules file does not exist. So it gets no tools, no MCP
# servers, no project instructions, and a minimal system prompt.
#
# This is not only about the prompt's purity -- it is where the cost is. Measured on this
# repo, cache_creation_input_tokens per run and the resulting price:
#
#   repo cwd, full CLAUDE.md chain, tools, MCP   62045   $0.377   <- as originally installed
#   clean cwd, no MCP, no tools                  20463   $0.123
#   + minimal system prompt                       5526   $0.037
#   same again, within the 1h cache TTL               0   $0.0056
#
# The driver was this repo's own CLAUDE.md and its 11 imports (~33k tokens) being loaded into
# every reviewer subprocess. Hence the clean working directory: `claude` must not find a
# CLAUDE.md above it. All git work above already happened in the repo, so nothing is lost.
REVIEW_CWD=$(mktemp -d)
RESULTS=$(mktemp)
R_OUT=$(mktemp)
R_META=$(mktemp)
trap 'rm -rf "$REVIEW_CWD" "$RESULTS" "$R_OUT" "$R_META" "$TASK_TMP"' EXIT

# run_reviewer <diff-text> <extra-note>
#   Writes the parsed JSON to $R_OUT and {cost,usage,model} to $R_META. Returns non-zero on
#   failure. It reports through files rather than stdout because the caller would otherwise
#   have to capture it with $( ), which runs the function in a subshell -- the cost and usage
#   assignments would be lost and every run would log cost_usd: 0. (It did.)
run_reviewer() {
  local diff_text="$1" note="$2" req envelope raw clean cost usage model
  : > "$R_OUT"
  printf '%s' '{"cost":0,"usage":{},"model":{}}' > "$R_META"

  req=$(cat <<EOF
$(cat "$PROMPT")

<rules>
$(cat "$RULES")
</rules>

<task>
${TASK:-(no task text provided - skip group J and leave spec_gaps empty)}
</task>

$note

<diff>
$diff_text
</diff>
EOF
)

  envelope=$(printf '%s' "$req" | (cd "$REVIEW_CWD" && claude -p \
    --model "$MODEL" \
    --output-format json \
    --system-prompt "You are a code reviewer. Follow the user message exactly." \
    --exclude-dynamic-system-prompt-sections \
    --strict-mcp-config \
    --disallowed-tools Read Grep Glob Bash Edit Write WebFetch WebSearch Task \
    2>/dev/null))

  raw=$(jq -r '.result // empty' <<<"$envelope" 2>/dev/null || true)
  usage=$(jq -c '.usage // {}' <<<"$envelope" 2>/dev/null || echo '{}')
  cost=$(jq -r '.total_cost_usd // 0' <<<"$envelope" 2>/dev/null || echo 0)
  model=$(jq -c '.modelUsage // {}' <<<"$envelope" 2>/dev/null || echo '{}')

  # Written before the failure branches below: a call that errors after the API round-trip
  # was still paid for, and a cost the log silently drops is a cost the pilot cannot see.
  jq -nc --argjson c "${cost:-0}" --argjson u "${usage:-\{\}}" --argjson m "${model:-\{\}}" \
    '{cost:$c, usage:$u, model:$m}' > "$R_META" 2>/dev/null \
    || printf '%s' '{"cost":0,"usage":{},"model":{}}' > "$R_META"

  # Verified envelope keys (claude -p --output-format json): .result is a string, .usage
  # carries input_tokens/output_tokens/cache_*, .total_cost_usd is the run cost,
  # .is_error/.subtype report failure. Keep the fallback anyway -- the CLI shape is not a
  # contract we control.
  if [ "$(jq -r '.is_error // false' <<<"$envelope" 2>/dev/null)" = "true" ]; then
    echo "review: claude CLI reported an error ($(jq -r '.subtype // "unknown"' <<<"$envelope"))" >&2
    return 1
  fi

  [ -z "$raw" ] && raw="$envelope"
  if [ -z "$raw" ]; then
    echo "review: claude CLI returned nothing" >&2
    return 1
  fi

  clean=$(sed -e 's/^```json//' -e 's/^```//' <<<"$raw" | sed '/^```$/d')
  if ! jq -e . >/dev/null 2>&1 <<<"$clean"; then
    echo "review: reviewer returned non-JSON. First lines:" >&2
    head -5 <<<"$raw" >&2
    return 1
  fi

  printf '%s' "$clean" > "$R_OUT"
}

TOTAL_COST=0
FAILED=0
TOTAL_USAGE='{}'
LAST_MODEL='{}'

# collect_result -- fold $R_OUT / $R_META into the accumulators. Called after every
# run_reviewer, on success and failure alike, so a paid-but-failed call still books its cost.
collect_result() {
  local ok="$1"
  TOTAL_COST=$(jq -n --argjson a "$TOTAL_COST" --argjson b "$(jq '.cost' "$R_META")" '$a + $b')
  # Token counts are summed across chunks, not overwritten: a chunked run's cost is the sum,
  # so a `usage` holding only the last chunk would make cost_usd and usage disagree by a
  # factor of NCHUNKS and quietly poison the cost table in PIPELINE.md.
  TOTAL_USAGE=$(jq -nc --argjson a "$TOTAL_USAGE" --argjson b "$(jq -c '.usage' "$R_META")" \
    'reduce ($b | keys_unsorted[]) as $k ($a;
       if ($b[$k] | type) == "number" then .[$k] = ((.[$k] // 0) + $b[$k]) else . end)')
  LAST_MODEL=$(jq -c '.model' "$R_META")
  if [ "$ok" = "0" ] && [ -s "$R_OUT" ]; then
    cat "$R_OUT" >> "$RESULTS"
    echo >> "$RESULTS"
  else
    FAILED=$((FAILED + 1))
  fi
}

i=0
for chunk in "${CHUNKS[@]}"; do
  [ "$SKIP_CHUNKS" = "1" ] && break
  i=$((i + 1))
  # No `mapfile` here: macOS ships bash 3.2, where it does not exist -- and `bash -n` cannot
  # catch a missing builtin, so it would fail only at run time, inside a hook whose output
  # nobody reads closely.
  chunk_files=()
  while IFS= read -r cf; do
    [ -n "$cf" ] && chunk_files+=( "$cf" )
  done <<<"$chunk"
  [ ${#chunk_files[@]} -eq 0 ] && continue

  chunk_diff=$(git diff "${DIFF_ARGS[@]}" -- "${chunk_files[@]}")

  # Group J is suppressed on EVERY chunk pass, including a single-chunk one. A chunk holds a
  # fraction of the files and the whole task text, so the formally correct answer to R-SPEC-01
  # from chunk 3 of 14 is "13 of the 14 plan items are missing" -- and `unique` cannot save the
  # merge, because a spec_gap is a bare string with no file or line, so the rule+file+line key
  # does not apply to it at all. The suppression is unconditional rather than `NCHUNKS > 1`:
  # at exactly one chunk the diff is whole, but the dedicated spec pass below still runs, and
  # two passes answering group J means the same gap is reported twice or, worse, once each way.
  note="Leave \"spec_gaps\" as an empty array. A separate pass covers rule group J; anything
you report there will be discarded."
  if [ "$NCHUNKS" -gt 1 ]; then
    note="This is part $i of $NCHUNKS of one change set, split by file so that each part fits.
You see only these files. Do NOT report that something is missing, undefined, or never used
just because it is not in this part -- it is very likely in another part.

$note"
    echo "Review: chunk $i/$NCHUNKS — ${#chunk_files[@]} files" >&2
  fi

  run_reviewer "$chunk_diff" "$note" && ok=0 || ok=1

  # The suppression above is an instruction, not a guarantee. If a chunk returns spec_gaps
  # anyway, that is the failure mode this whole arrangement exists to prevent, and it must be
  # visible rather than inferred later from an inflated gap count.
  if [ -s "$R_OUT" ]; then
    leaked=$(jq '.spec_gaps | length' "$R_OUT" 2>/dev/null || echo 0)
    if [ "${leaked:-0}" -gt 0 ]; then
      echo "review: chunk $i returned $leaked spec_gaps despite suppression — discarded" >&2
      jq -c '.spec_gaps = []' "$R_OUT" > "$R_OUT.tmp" && mv "$R_OUT.tmp" "$R_OUT"
    fi
  fi

  collect_result "$ok"
done

# Group J needs the whole feature in one view -- it asks what the task called for and the
# change set does not contain, which no single chunk can answer. It is also not a line-level
# check, so it gets the file list and the commit messages rather than a diff, and costs one
# small extra call. Feature mode only: on a block the task text describes work spread over
# many other blocks, so every gap it reports would be a false positive.
if [ "$MODE" = "feature" ] && [ -n "$TASK" ]; then
  echo "Review: spec pass (group J) over the whole feature" >&2
  spec_payload="Changed files:
$CHANGED

Commits:
$(git log --format='%s%n%b' "$MERGE_BASE"..HEAD -- "${SCOPE[@]}")"

  spec_note="IMPORTANT - this run is SPEC-ONLY. You are given the changed-file list and the
commit messages INSTEAD of a diff. Evaluate ONLY rule group J (R-SPEC-01, R-SPEC-02) against
the task text. Return spec_gaps and leave \"critical\" and \"warnings\" as empty arrays. Do
not report any line-level rule: you cannot see the lines, so any such finding would be
unfounded."

  # The spec pass is run REVIEW_SPEC_PASSES times and the gaps are decided by majority.
  #
  # A single pass is close to a coin flip. Measured on this repo against a three-item synthetic
  # plan whose answer was known (two items genuinely absent), five independent passes over a
  # byte-identical payload returned: 2, 2, 0, 0, 2 gaps. When it fires it names exactly the
  # right items; the failure mode is missing all of them, not inventing any. Group J is also
  # the only axis no chunk and no block run can cover, so a ~40% miss here is a 40% chance of
  # shipping a feature with a forgotten plan item and a clean review to show for it.
  #
  # Majority rather than union: union would also rescue the misses, but it admits any one
  # pass's false positive, while majority needs two passes to agree. Given the observed
  # distribution -- items appear together or not at all -- majority strictly dominates.
  #
  # Matching is on the exact gap string. The reviewer quotes plan items verbatim, and in every
  # observed pass the strings were byte-identical; a reworded near-duplicate would fall below
  # the threshold and be dropped, which is the safe direction.
  SPEC_PASSES="${REVIEW_SPEC_PASSES:-3}"
  SPEC_ACC=$(mktemp)
  spec_ok_count=0
  for p in $(seq 1 "$SPEC_PASSES"); do
    run_reviewer "$spec_payload" "$spec_note" && ok=0 || ok=1
    if [ "$ok" = "0" ] && [ -s "$R_OUT" ]; then
      jq -c '[.spec_gaps[]?] | unique' "$R_OUT" >> "$SPEC_ACC"
      spec_ok_count=$((spec_ok_count + 1))
      echo "Review:   spec pass $p/$SPEC_PASSES — $(jq '.spec_gaps | length' "$R_OUT") gaps" >&2
    fi
    # Only the cost and the line-level arrays (always empty here) go through the normal path.
    [ -s "$R_OUT" ] && { jq -c '.spec_gaps = []' "$R_OUT" > "$R_OUT.tmp" && mv "$R_OUT.tmp" "$R_OUT"; }
    collect_result "$ok"
  done

  if [ "$spec_ok_count" -gt 0 ]; then
    SPEC_MAJORITY=$(jq -s --argjson n "$spec_ok_count" '
      [.[][]] | group_by(.) | map(select(length * 2 > $n) | .[0])' "$SPEC_ACC")
    printf '%s\n' "$(jq -nc --argjson g "$SPEC_MAJORITY" \
      '{critical:[], warnings:[], spec_gaps:$g}')" >> "$RESULTS"
    echo "Review:   spec majority ($spec_ok_count passes) — $(jq 'length' <<<"$SPEC_MAJORITY") gaps" >&2
  fi
  rm -f "$SPEC_ACC"
fi

if [ ! -s "$RESULTS" ]; then
  echo "review: every reviewer call failed ($FAILED), nothing to report" >&2
  exit 0
fi

# Merge. Findings are deduplicated on rule+file+line: chunk boundaries are per file, so a
# genuine duplicate can only come from the spec pass overlapping a chunk.
CLEAN=$(jq -s '{
  critical:  ([.[].critical[]?]  | unique_by([.rule, .file, .line])),
  warnings:  ([.[].warnings[]?]  | unique_by([.rule, .file, .line])),
  spec_gaps: ([.[].spec_gaps[]?] | unique)
}' "$RESULTS")

CRIT=$(jq '.critical | length' <<<"$CLEAN")
WARN=$(jq '.warnings | length' <<<"$CLEAN")
GAPS=$(jq '.spec_gaps | length' <<<"$CLEAN")

# --- second cap, on the merged report ----------------------------------------
# reviewer-prompt.md caps each call at 7 critical / 10 warnings, which was a limit on what a
# person will read. Chunking silently removed it: 14 chunks x 7 is up to 98 blocking findings,
# and a wall that size is not read at all -- the important items drown, and the conclusion
# "the reviewer is noisy" gets drawn from the format rather than from the rules.
#
# So the merged report is capped again. Ranking is by how many DISTINCT FILES the rule fired
# in: files never repeat across chunks, so that count is a direct measure of how systemic the
# violation is, and a rule broken in nine files outranks one broken once. Nothing is lost --
# the log below is written from $CLEAN, before this cut, so the FP-rate measurement still sees
# every finding.
REPORT_CRIT="${REVIEW_REPORT_CRIT:-7}"
REPORT_WARN="${REVIEW_REPORT_WARN:-10}"

# One instance per rule comes first, then the repeats. Ranking by frequency alone fills the
# whole quota with the single most systemic rule and hides every other broken rule behind it:
# on a 5-finding set capped at 3, plain frequency reported R-A three times and dropped R-B and
# R-C entirely. Breadth of rules first, depth second.
RANKED=$(jq --argjson kc "$REPORT_CRIT" --argjson kw "$REPORT_WARN" '
  def rank($items):
    ($items | group_by(.rule) | map({rule: .[0].rule, n: (map(.file) | unique | length)})
            | INDEX(.rule) | map_values(.n)) as $freq
    | ($items | sort_by(-($freq[.rule] // 1))) as $sorted
    | ($sorted | unique_by(.rule) | sort_by(-($freq[.rule] // 1))) as $heads
    | $heads + ($sorted - $heads);
  {
    critical:  (rank(.critical)  | .[:$kc]),
    warnings:  (rank(.warnings)  | .[:$kw]),
    spec_gaps: .spec_gaps
  }' <<<"$CLEAN")

CRIT_SHOWN=$(jq '.critical | length' <<<"$RANKED")
WARN_SHOWN=$(jq '.warnings | length' <<<"$RANKED")
OVERFLOW=""
if [ "$CRIT" -gt "$CRIT_SHOWN" ] || [ "$WARN" -gt "$WARN_SHOWN" ]; then
  OVERFLOW="
Showing the $CRIT_SHOWN most systemic of $CRIT critical and $WARN_SHOWN of $WARN warnings, ranked by how many
files each rule fired in. The full set is in .claude/review/log.jsonl for this run."
  echo "review: report capped — $CRIT critical / $WARN warnings found, $CRIT_SHOWN / $WARN_SHOWN shown" >&2
fi

# --- log for FP-rate measurement ---------------------------------------------
mkdir -p "$(dirname "$LOG")"
TS=$(date -u +%FT%TZ)
SHA=$(git rev-parse --short HEAD)

# One row per run, always -- including zero-finding runs. Without it the denominator of the
# FP rate is unknown, and "the rule never fired" is indistinguishable from "no review ran".
# `chunks` and `failed_chunks` matter for the same reason: three findings out of eight chunks
# with two of them failed is not the same measurement as three out of eight clean.
jq -nc --arg ts "$TS" --arg sha "$SHA" --arg s "$SESSION" --arg base "$BASE_LABEL" \
       --arg mode "$MODE_LABEL" --argjson nf "$NFILES" --argjson dl "$DIFF_LINES" \
       --argjson crit "$CRIT" --argjson warn "$WARN" --argjson gaps "$GAPS" \
       --argjson usage "$TOTAL_USAGE" --argjson cost "$TOTAL_COST" --argjson mu "$LAST_MODEL" \
       --argjson chunks "$NCHUNKS" --argjson failed "$FAILED" \
       --arg cfg "stripped" \
  '{kind:"run", ts:$ts, sha:$sha, session:$s, base:$base, mode:$mode,
    nfiles:$nf, difflines:$dl, chunks:$chunks, failed_chunks:$failed,
    critical:$crit, warnings:$warn, spec_gaps:$gaps,
    cost_usd:$cost, reviewer_cfg:$cfg, model_usage:$mu, usage:$usage}' >> "$LOG"

jq -c --arg ts "$TS" --arg sha "$SHA" --arg s "$SESSION" --arg base "$BASE_LABEL" \
      --arg mode "$MODE_LABEL" --argjson nf "$NFILES" --argjson dl "$DIFF_LINES" \
  '[.critical[] + {severity:"critical"}, .warnings[] + {severity:"warning"}][]
   | . + {kind:"finding", ts:$ts, sha:$sha, session:$s, base:$base, mode:$mode,
          nfiles:$nf, difflines:$dl, verdict:null}' <<<"$CLEAN" >> "$LOG"

# --- decision ----------------------------------------------------------------
FAIL_NOTE=""
[ "$FAILED" -gt 0 ] && FAIL_NOTE="
WARNING: $FAILED of $NCHUNKS reviewer calls failed. Part of the diff was NOT reviewed."

[ "$SKIP_CHUNKS" = "1" ] && FAIL_NOTE="$FAIL_NOTE
WARNING: line-level review was skipped on cost ($NCHUNKS chunks > REVIEW_MAXCHUNKS=$MAXCHUNKS).
Only conformance to the task was checked."

# The old behaviour refused an oversized block outright, which also served as a nudge to split
# blocks. Chunking removed the refusal, so the nudge has to be said explicitly -- otherwise a
# 2000-line block quietly passes in four calls and the habit erodes.
BLOCK_NOTE=""
if [ "$MODE" = "block" ] && [ "$NCHUNKS" -gt 1 ]; then
  BLOCK_NOTE="
Note: this block is $DIFF_LINES added lines across $NFILES files and needed $NCHUNKS reviewer calls.
It was reviewed in full, but a block this size should be split -- smaller blocks are cheaper
to review and far easier to revert."
fi

if [ "$CRIT" -gt 0 ] || [ "$GAPS" -gt 0 ]; then
  jq -n --arg r "$(jq -r '{critical, spec_gaps}' <<<"$RANKED")" --arg f "$FAIL_NOTE" \
        --arg o "$OVERFLOW" --arg b "$BLOCK_NOTE" \
    '{decision:"block", reason:
      ("Review found blocking issues. Fix each one, or explain why it is a false positive - do not ignore silently.\n" + $r + $o + $f + $b)}'
else
  jq -n --arg w "$(jq -r '.warnings' <<<"$RANKED")" --arg n "$WARN" --arg f "$FAIL_NOTE" \
        --arg o "$OVERFLOW" --arg b "$BLOCK_NOTE" \
    '{hookSpecificOutput:{additionalContext:
      ("Review: no critical findings. Warnings (\($n)) for information, non-blocking:\n" + $w + $o + $f + $b)}}'
fi
