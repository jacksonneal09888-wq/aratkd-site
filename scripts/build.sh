#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD_DIR="$ROOT_DIR/dist"

echo "Building static site into $BUILD_DIR"
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

rsync -a \
  --exclude ".git" \
  --exclude "dist" \
  --exclude "node_modules" \
  --exclude "scripts" \
  --exclude ".DS_Store" \
  "$ROOT_DIR"/ "$BUILD_DIR"/

echo "Static assets copied to dist/"
