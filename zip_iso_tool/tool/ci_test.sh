#!/usr/bin/env bash
#
# Analyzes and tests both packages. Used by Replit, GitHub Actions, Codemagic
# and tool/setup.sh, so there is exactly one definition of "the tests pass".
#
# Needs `dart` and `flutter` on PATH. The ISO validation tests additionally use
# `isoinfo` and `7z`; they skip cleanly when those are missing, so this script
# still passes without them — with weaker coverage. See README.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

info() { printf '\n\033[1;34m==> %s\033[0m\n' "$1"; }
warn() { printf '\033[1;33mwarning:\033[0m %s\n' "$1"; }

command -v dart >/dev/null 2>&1 || { echo "dart is not on PATH" >&2; exit 1; }

for tool in isoinfo 7z zip; do
  command -v "$tool" >/dev/null 2>&1 || \
    warn "$tool not found — some tests will skip. Install genisoimage / p7zip-full / zip for full coverage."
done

info "disc_core: dependencies"
cd "$REPO_ROOT/packages/disc_core"
dart pub get

info "disc_core: analyze"
dart analyze --fatal-infos --fatal-warnings

info "disc_core: test"
dart test --reporter expanded

if command -v flutter >/dev/null 2>&1; then
  info "app: dependencies"
  cd "$REPO_ROOT/app"
  flutter pub get

  info "app: analyze"
  flutter analyze --fatal-infos --fatal-warnings

  info "app: test"
  flutter test --reporter expanded
else
  warn "flutter is not on PATH — skipped the app's analyze and test steps."
  warn "The core suite above covers all ZIP and ISO logic."
fi

printf '\n\033[1;32mAll checks passed.\033[0m\n'
