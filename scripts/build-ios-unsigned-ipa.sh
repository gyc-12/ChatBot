#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IOS_GEN_DIR="$ROOT_DIR/src-tauri/gen/apple"
DERIVED_DATA_PATH="$IOS_GEN_DIR/build/unsigned-iphoneos"
APP_PATH="$DERIVED_DATA_PATH/Build/Products/release-iphoneos/ChatBot.app"
LIB_SOURCE="$ROOT_DIR/src-tauri/target/aarch64-apple-ios/release/libChatBot_lib.a"
LIB_TARGET_DIR="$IOS_GEN_DIR/Externals/arm64/release"
DEFAULT_OUTPUT="$ROOT_DIR/src-tauri/target/release/bundle/ios/ChatBot-unsigned.ipa"
OUTPUT_PATH="${1:-$DEFAULT_OUTPUT}"
REAL_NPM_BIN="$(command -v npm)"
FAKEBIN_DIR="$(mktemp -d "${TMPDIR:-/tmp}/chatbot-ios-fakebin.XXXXXX")"
CACHE_DIR="$(mktemp -d "${TMPDIR:-/tmp}/chatbot-ios-cache.XXXXXX")"

cleanup() {
  rm -rf "$FAKEBIN_DIR" "$CACHE_DIR"
}

trap cleanup EXIT

if [ ! -d "$IOS_GEN_DIR/ChatBot.xcodeproj" ]; then
  (cd "$ROOT_DIR" && npx tauri ios init --ci)
fi

mkdir -p "$CACHE_DIR/clang" "$CACHE_DIR/swiftpm"

(
  cd "$ROOT_DIR"
  npm run build
  CLANG_MODULE_CACHE_PATH="$CACHE_DIR/clang" \
  SWIFTPM_MODULECACHE_OVERRIDE="$CACHE_DIR/swiftpm" \
  cargo build \
    --manifest-path src-tauri/Cargo.toml \
    --target aarch64-apple-ios \
    --lib \
    --release \
    --features custom-protocol
)

mkdir -p "$LIB_TARGET_DIR" "$(dirname "$OUTPUT_PATH")"
cp "$LIB_SOURCE" "$LIB_TARGET_DIR/libapp.a"

cat > "$FAKEBIN_DIR/npm" <<EOF
#!/bin/zsh
if [ "\$1" = "run" ] && [ "\$2" = "--" ] && [ "\$3" = "tauri" ] && [ "\$4" = "ios" ] && [ "\$5" = "xcode-script" ]; then
  exit 0
fi
exec "$REAL_NPM_BIN" "\$@"
EOF

chmod +x "$FAKEBIN_DIR/npm"

rm -rf "$DERIVED_DATA_PATH"
mkdir -p "$DERIVED_DATA_PATH"

PATH="$FAKEBIN_DIR:$PATH" \
xcodebuild \
  -project "$IOS_GEN_DIR/ChatBot.xcodeproj" \
  -scheme ChatBot_iOS \
  -configuration release \
  -sdk iphoneos \
  -derivedDataPath "$DERIVED_DATA_PATH" \
  CODE_SIGNING_ALLOWED=NO \
  CODE_SIGNING_REQUIRED=NO \
  CODE_SIGN_IDENTITY="" \
  DEVELOPMENT_TEAM="" \
  build

if [ ! -d "$APP_PATH" ]; then
  echo "Unsigned iOS app bundle not found at: $APP_PATH" >&2
  exit 1
fi

PAYLOAD_DIR="$DERIVED_DATA_PATH/Payload"
rm -rf "$PAYLOAD_DIR"
mkdir -p "$PAYLOAD_DIR"
ditto "$APP_PATH" "$PAYLOAD_DIR/ChatBot.app"

rm -f "$OUTPUT_PATH"
(
  cd "$DERIVED_DATA_PATH"
  zip -qry "$OUTPUT_PATH" Payload
)

echo "Created unsigned IPA at: $OUTPUT_PATH"
