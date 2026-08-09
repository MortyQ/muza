#!/usr/bin/env bash
#
# Run the browser test project inside the same Playwright image CI uses, so the
# screenshot baselines it writes are the ones CI will compare against.
#
# The image tag MUST match the `playwright` version in pnpm-lock.yaml. A newer
# Chromium renders text differently and invalidates every baseline at once.
set -euo pipefail

IMAGE="mcr.microsoft.com/playwright:v1.62.1-noble"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"

# The host's node_modules hold darwin-native binaries (esbuild, rollup,
# sass-embedded) that cannot run under Linux. Named volumes shadow every
# workspace's node_modules with a container-local install, and persist between
# runs so only the first one pays for the install.
VOLUMES=(
  -v muzakit-nm-root:/w/node_modules
  -v muzakit-nm-ui:/w/libs/ui/node_modules
  -v muzakit-nm-utils:/w/libs/utils/node_modules
  -v muzakit-nm-config:/w/libs/config/node_modules
  -v muzakit-nm-dashboard:/w/apps/muzakit-dashboard/node_modules
  -v muzakit-nm-starter:/w/apps/muzakit-starter-without-tailwind/node_modules
)

exec docker run --rm -it \
  -v "$REPO_ROOT":/w \
  "${VOLUMES[@]}" \
  -w /w \
  --ipc=host \
  "$IMAGE" \
  bash -lc "corepack enable && pnpm install --frozen-lockfile && pnpm --filter @muzakit/ui exec vitest run --project browser $*"
