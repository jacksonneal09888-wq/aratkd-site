#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD_DIR="$ROOT_DIR/dist"
PUBLIC_DIR="$ROOT_DIR/public"

echo "Building static site into $BUILD_DIR"
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

copy_with_fallback() {
  local source_dir="$1"
  local destination_dir="$2"
  shift 2
  local patterns=("$@")

  if command -v rsync >/dev/null 2>&1; then
    local rsync_excludes=()
    for pattern in "${patterns[@]}"; do
      rsync_excludes+=(--exclude "$pattern")
    done
    rsync -a "${rsync_excludes[@]}" "$source_dir"/ "$destination_dir"/
  else
    echo "rsync not available; using tar fallback"
    local tar_excludes=()
    for pattern in "${patterns[@]}"; do
      tar_excludes+=(--exclude="./$pattern")
    done
    tar -C "$source_dir" "${tar_excludes[@]}" -cf - . | tar -C "$destination_dir" -xf -
  fi
}

copy_with_fallback "$ROOT_DIR" "$BUILD_DIR" \
  ".git" \
  "dist" \
  "node_modules" \
  "scripts" \
  ".DS_Store"

if [ -d "$PUBLIC_DIR" ]; then
  echo "Copying additional public assets"
  copy_with_fallback "$PUBLIC_DIR" "$BUILD_DIR"
fi

echo "Static assets copied to dist/"
