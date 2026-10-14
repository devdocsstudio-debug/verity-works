#!/usr/bin/env bash
# Run this ONCE, after you create a free account at https://www.goatcounter.com/ and it gives you
# your site code (the part before ".goatcounter.com"). Fills in the real code AND uncomments the
# tag (it ships commented-out so no tracking script loads until you've actually activated it).
# Usage:
#   ./set-analytics-code.sh your-site-code
set -euo pipefail
if [ -z "${1:-}" ]; then
  echo "Usage: ./set-analytics-code.sh your-goatcounter-site-code" >&2
  exit 1
fi
CODE="$1"
grep -rl "GOATCOUNTER_CODE_PLACEHOLDER" . --include="*.html" | while read -r f; do
  sed -i \
    -e "s#GOATCOUNTER_CODE_PLACEHOLDER#${CODE}#g" \
    -e "/GoatCounter disabled until a real account exists/d" \
    -e "/^-->\$/d" \
    "$f"
  echo "updated: $f"
done
echo "Done. Review the diff (git diff) before committing and pushing."
