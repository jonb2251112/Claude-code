#!/usr/bin/env bash
#
# Generates the Android and iOS platform folders and applies this project's
# patches to them.
#
# The platform folders are not checked in because `flutter create` produces
# them to match your exact Flutter and Gradle versions — a checked-in
# Runner.xcodeproj or build.gradle from another machine is a reliable source of
# build failures. This script generates them, then layers our changes on top.
#
# Safe to re-run: it never overwrites your Dart code, and it will not clobber
# platform files that already carry our patches.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="$REPO_ROOT/app"
PATCH_DIR="$APP_DIR/platform_patches"

info()  { printf '\033[1;34m==>\033[0m %s\n' "$1"; }
warn()  { printf '\033[1;33mwarning:\033[0m %s\n' "$1"; }
die()   { printf '\033[1;31merror:\033[0m %s\n' "$1" >&2; exit 1; }

command -v flutter >/dev/null 2>&1 || die "flutter is not on your PATH. Install it from https://docs.flutter.dev/get-started/install"

info "Flutter version"
flutter --version

cd "$APP_DIR"

info "Generating Android and iOS platform folders"
# `flutter create` on an existing project fills in only what is missing.
flutter create --platforms=android,ios --project-name zip_tools --org com.example .

info "Fetching packages"
flutter pub get

# ---------------------------------------------------------------------------
# Android
# ---------------------------------------------------------------------------
ANDROID_MANIFEST="$APP_DIR/android/app/src/main/AndroidManifest.xml"
if [ -f "$ANDROID_MANIFEST" ]; then
  if grep -q "ZIP Tools" "$ANDROID_MANIFEST"; then
    info "Android manifest already patched, leaving it alone"
  else
    cp "$ANDROID_MANIFEST" "$ANDROID_MANIFEST.generated.bak"
    cp "$PATCH_DIR/AndroidManifest.xml" "$ANDROID_MANIFEST"
    info "Applied AndroidManifest.xml (original saved as .generated.bak)"
  fi
else
  warn "Android manifest not found; skipping"
fi

# Every plugin here needs minSdk 21 or lower. Flutter's own default
# (flutter.minSdkVersion) is well above that, so the generated Gradle config
# needs no changes — only flag a project that has pinned something older.
for gradle_file in "$APP_DIR/android/app/build.gradle.kts" "$APP_DIR/android/app/build.gradle"; do
  [ -f "$gradle_file" ] || continue
  pinned=$(grep -oE 'minSdk(Version)?\s*=?\s*([0-9]+)' "$gradle_file" | grep -oE '[0-9]+$' || true)
  if [ -n "$pinned" ] && [ "$pinned" -lt 21 ]; then
    warn "$gradle_file pins minSdk $pinned; this plugin set needs at least 21."
  fi
done

# ---------------------------------------------------------------------------
# iOS
# ---------------------------------------------------------------------------
INFO_PLIST="$APP_DIR/ios/Runner/Info.plist"
if [ -f "$INFO_PLIST" ]; then
  if /usr/libexec/PlistBuddy -c "Print :UIFileSharingEnabled" "$INFO_PLIST" >/dev/null 2>&1; then
    info "Info.plist already patched, leaving it alone"
  elif command -v /usr/libexec/PlistBuddy >/dev/null 2>&1; then
    /usr/libexec/PlistBuddy -c "Add :UIFileSharingEnabled bool true" "$INFO_PLIST"
    /usr/libexec/PlistBuddy -c "Add :LSSupportsOpeningDocumentsInPlace bool true" "$INFO_PLIST"
    info "Added Files-app keys to Info.plist"
    warn "CFBundleDocumentTypes was not added automatically. Copy it from"
    warn "  $PATCH_DIR/ios_info_plist_additions.xml"
    warn "if you want the app to appear in other apps' \"Open in\" menus."
  else
    warn "PlistBuddy not available (not on macOS?). Apply the keys in"
    warn "  $PATCH_DIR/ios_info_plist_additions.xml by hand."
  fi
else
  warn "Info.plist not found; skipping"
fi

if [ -f "$APP_DIR/ios/Podfile" ]; then
  if grep -q "PERMISSION_CAMERA=0" "$APP_DIR/ios/Podfile"; then
    info "Podfile already patched, leaving it alone"
  else
    warn "Update ios/Podfile's post_install block using"
    warn "  $PATCH_DIR/ios_podfile_snippet.rb"
    warn "App Review rejects builds without it (permission_handler pulls in"
    warn "APIs that have no usage description)."
  fi
fi

# ---------------------------------------------------------------------------
# CI builds only need the platform folders patched; they run the tests as a
# separate job. Set SKIP_TESTS=1 to stop here.
if [ "${SKIP_TESTS:-0}" = "1" ]; then
  info "SKIP_TESTS=1 — platform setup done, not running tests"
  exit 0
fi

info "Running the test suites"
"$REPO_ROOT/tool/ci_test.sh"

cat <<'EOF'

Setup complete.

  Run on a connected device:   cd app && flutter run
  Build an Android release:    cd app && flutter build apk --release
  Build for iOS:               cd app && flutter build ipa

If you changed the iOS Podfile, run `cd app/ios && pod install` before building.
EOF
