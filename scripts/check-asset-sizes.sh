#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ASSET_DIR="$ROOT_DIR/assets"

WARN_IMAGE_BYTES=$((5 * 1024 * 1024))
FAIL_IMAGE_BYTES=$((25 * 1024 * 1024))
WARN_VIDEO_BYTES=$((20 * 1024 * 1024))
FAIL_GENERIC_BYTES=$((95 * 1024 * 1024))

warn_count=0
fail_count=0

get_size_bytes() {
  local file_path="$1"
  if stat -c%s "$file_path" >/dev/null 2>&1; then
    stat -c%s "$file_path"
  else
    stat -f%z "$file_path"
  fi
}

format_megabytes() {
  local byte_count="$1"
  awk -v bytes="$byte_count" 'BEGIN { printf "%.1f MB", bytes / 1024 / 1024 }'
}

classify_file() {
  local lower_name="$1"
  case "$lower_name" in
    *.jpg|*.jpeg|*.png|*.webp|*.gif|*.avif)
      echo "image"
      ;;
    *.mp4|*.mov|*.m4v|*.webm)
      echo "video"
      ;;
    *)
      echo "generic"
      ;;
  esac
}

if [ ! -d "$ASSET_DIR" ]; then
  echo "No assets directory found at $ASSET_DIR"
  exit 0
fi

while IFS= read -r -d '' file_path; do
  relative_path="${file_path#"$ROOT_DIR"/}"
  lower_name="$(printf '%s' "$relative_path" | tr '[:upper:]' '[:lower:]')"
  size_bytes="$(get_size_bytes "$file_path")"
  file_type="$(classify_file "$lower_name")"

  if [ "$size_bytes" -ge "$FAIL_GENERIC_BYTES" ]; then
    echo "FAIL: $relative_path is $(format_megabytes "$size_bytes"), above the 95 MB repository safety limit."
    fail_count=$((fail_count + 1))
    continue
  fi

  case "$file_type" in
    image)
      if [ "$size_bytes" -ge "$FAIL_IMAGE_BYTES" ]; then
        echo "FAIL: $relative_path is $(format_megabytes "$size_bytes"), above the 25 MB image limit."
        fail_count=$((fail_count + 1))
      elif [ "$size_bytes" -ge "$WARN_IMAGE_BYTES" ]; then
        echo "WARN: $relative_path is $(format_megabytes "$size_bytes"), consider compressing or converting it."
        warn_count=$((warn_count + 1))
      fi
      ;;
    video)
      if [ "$size_bytes" -ge "$WARN_VIDEO_BYTES" ]; then
        echo "WARN: $relative_path is $(format_megabytes "$size_bytes"), verify it is web-optimized."
        warn_count=$((warn_count + 1))
      fi
      ;;
  esac
done < <(find "$ASSET_DIR" -type f -print0)

if [ "$fail_count" -gt 0 ]; then
  echo "Asset size check failed with $fail_count blocking issue(s)."
  exit 1
fi

if [ "$warn_count" -gt 0 ]; then
  echo "Asset size check passed with $warn_count warning(s)."
else
  echo "Asset size check passed with no warnings."
fi
