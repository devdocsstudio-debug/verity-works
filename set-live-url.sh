#!/usr/bin/env bash
# Run this ONCE, after GitHub Pages gives you the real URL (Settings -> Pages, after enabling it).
# Replaces every example.invalid placeholder across the whole site in one pass -- no manual
# find-and-replace across 7 files. Usage:
#   ./set-live-url.sh https://yourusername.github.io/verity-works-site
set -euo pipefail
if [ -z "${1:-}" ]; then
  echo "Usage: ./set-live-url.sh https://yourusername.github.io/your-repo-name" >&2
  exit 1
fi
REAL_URL="${1%/}"  # strip a trailing slash if given, so we never produce a double slash
grep -rl "example.invalid" . --include="*.html" --include="*.xml" --include="*.txt" | while read -r f; do
  sed -i "s#https://example.invalid#${REAL_URL}#g" "$f"
  echo "updated: $f"
done
echo "Done. Review the diff (git diff) before committing and pushing."
