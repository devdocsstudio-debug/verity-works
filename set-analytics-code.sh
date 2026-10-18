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
  # ANCHORED to the GoatCounter block. The previous version deleted ANY line that was exactly
  # "-->", which is safe only by coincidence -- today each page happens to have exactly one, and it
  # is this block's terminator. Demonstrated 2026-10-18 on a throwaway copy: add one unrelated
  # commented block and the script deletes ITS "-->" too, leaving an unterminated <!-- that swallows
  # the rest of the document. That is page corruption, on buyer-facing pages, from a script the
  # owner is told to run once by hand.
  #
  # `/data-goatcounter/{n;...}` moves to the line AFTER the script tag and removes the terminator
  # only if that is what it actually finds there.
  sed -i \
    -e "s#GOATCOUNTER_CODE_PLACEHOLDER#${CODE}#g" \
    -e "/GoatCounter disabled until a real account exists/d" \
    -e "/data-goatcounter/{n;/^-->\$/d;}" \
    "$f"
  echo "updated: $f"
done
echo "Done. Review the diff (git diff) before committing and pushing."
