#!/usr/bin/env bash
# Build and sign locally. Installation happens ONLY when an explicit target is given.
# Usage: ./build.sh <security-profile> [sdb-target-name]
set -euo pipefail
PROFILE="${1:?usage: build.sh <security-profile> [sdb-target-name]}"
TARGET="${2:-}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TH="${TIZEN_HOME:-$HOME/tizen-studio}"
if [[ -z "${TIZEN_HOME:-}" && -d /c/tizen-studio ]]; then TH=/c/tizen-studio; fi
CLI="${TIZEN_CLI:-$TH/tools/ide/bin/tizen}"
if [[ -f "$CLI.bat" ]]; then CLI="$CLI.bat"; fi
if [[ ! -f "$CLI" ]]; then
  echo 'Tizen CLI missing. Install Tizen Studio + TV Extension + Samsung Certificate Extension.' >&2
  echo 'Set TIZEN_HOME or TIZEN_CLI to the installed SDK.' >&2
  exit 1
fi
sdkpath() { if [[ "$CLI" == *.bat ]]; then cygpath -w "$1"; else printf '%s\n' "$1"; fi; }
rm -rf "$ROOT/build/web" "$ROOT/build/out"
mkdir -p "$ROOT/build" "$ROOT/dist"
cp -R "$ROOT/tizen-app" "$ROOT/build/web"
rm -rf "$ROOT/build/web/tools"
if [[ ! -f "$ROOT/build/web/js/tmdb-token.js" ]]; then
  printf '%s\n' '/* Optional TMDB integration is disabled. */' > "$ROOT/build/web/js/tmdb-token.js"
fi
"$CLI" build-web -out "$(sdkpath "$ROOT/build/out")" -- "$(sdkpath "$ROOT/build/web")"
"$CLI" package -t wgt -s "$PROFILE" -o "$(sdkpath "$ROOT/dist")" -- "$(sdkpath "$ROOT/build/out")"
WGT=$(ls -t "$ROOT"/dist/*.wgt | head -1)
echo "Signed package: $WGT"
if [[ -n "$TARGET" ]]; then
  "$CLI" install -n "$(basename "$WGT")" -t "$TARGET" -- "$(sdkpath "$ROOT/dist")"
  "$CLI" run -p Nama30TvAp.Nama30TV -t "$TARGET"
fi
