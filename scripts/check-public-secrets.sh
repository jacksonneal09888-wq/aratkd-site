#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

patterns=(
  'data-kiosk-key='
  'ADMIN_MASTER_PASSWORD'
  'ADMIN_MASTER_PIN'
  'ADMIN_PORTAL_KEY'
  'KIOSK_PORTAL_KEY'
  'PORTAL_JWT_SECRET'
  'X-Kiosk-Key:[[:space:]]*[A-Za-z0-9._-]+'
)

scan_paths=(
  "*.html"
  "assets/js"
  "components"
  "js"
  "panels"
)

failures=0

for pattern in "${patterns[@]}"; do
  if rg -n --hidden --glob '!node_modules/**' --glob '!dist/**' --glob '!.git/**' "$pattern" "${scan_paths[@]}" >/tmp/ara_secret_scan.txt 2>/dev/null; then
    echo "FAIL: Potential public secret exposure matched pattern: $pattern"
    cat /tmp/ara_secret_scan.txt
    failures=$((failures + 1))
  fi
done

rm -f /tmp/ara_secret_scan.txt

if [ "$failures" -gt 0 ]; then
  echo "Public secret scan failed with $failures issue(s)."
  exit 1
fi

echo "Public secret scan passed."
