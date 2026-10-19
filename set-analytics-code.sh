#!/usr/bin/env bash
# Enable Umami Cloud analytics. Run this ONCE, after the owner has created the Umami Cloud site and
# it has issued a website-id (a UUID shown in Umami Cloud under Settings -> Websites).
#
# Usage:
#   ./set-analytics-code.sh 123e4567-e89b-12d3-a456-426614174000
#
# It fills in the real website-id AND uncomments the script tag, which ships commented out so that
# no tracking script loads until analytics has actually been authorised.
#
# IMPORTANT, and the reason this is not a one-liner: enabling analytics makes the PUBLISHED PRIVACY
# POLICY INACCURATE. privacy-policy/index.html currently states, truthfully and measurably, that the
# site runs no analytics and sets no cookies, and it promises "If we ever add analytics, this page
# changes before it goes live, and we will say which tool it is." The replacement wording is already
# drafted in that file's own `analytics-draft` comment block. This script refuses to run until that
# draft has been applied, so the two can never ship out of step.
#
# This rewrites the HAND-WRITTEN pages. The three generated sample pages come from
# build-samples.js -- run `node build-samples.js` afterwards, which this script reminds you to do.
set -euo pipefail

if [ -z "${1:-}" ]; then
  echo "Usage: ./set-analytics-code.sh <umami-website-id>" >&2
  exit 1
fi
ID="$1"

# A website-id is a UUID. Refusing anything else stops a GoatCounter-style code or a pasted URL
# from being silently baked into every page.
if ! printf '%s' "$ID" | grep -Eq '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'; then
  echo "ERROR: '$ID' is not a UUID. Umami's website-id looks like" >&2
  echo "       123e4567-e89b-12d3-a456-426614174000 (Settings -> Websites in Umami Cloud)." >&2
  exit 1
fi

# The privacy-policy gate. The live page must already describe analytics before any tag goes live.
if grep -q "runs no analytics" privacy-policy/index.html || grep -q "No visitor analytics" privacy-policy/index.html; then
  echo "REFUSING: privacy-policy/index.html still says the site runs no analytics." >&2
  echo "          Apply the drafted replacement wording in that file first (search for" >&2
  echo "          'analytics-draft'), then re-run. The policy must never lag the tracking." >&2
  exit 1
fi

CHANGED=0
for f in *.html; do
  if grep -q "UMAMI_WEBSITE_ID_PLACEHOLDER" "$f"; then
    # Anchored to the Umami tag specifically. The previous GoatCounter version of this script had a
    # real near-miss here: it deleted ANY line that was exactly "-->", which is safe only while each
    # page happens to contain exactly one. Add a second commented block and it would delete that
    # block's terminator too, leaving an unterminated <!-- that swallows the rest of the document --
    # page corruption on buyer-facing pages, from a script the owner runs by hand.
    #
    # `/data-website-id/{n;/^-->$/d;}` moves to the line AFTER the script tag and removes the
    # terminator only if that is actually what is there.
    sed -i \
      -e "s#UMAMI_WEBSITE_ID_PLACEHOLDER#${ID}#g" \
      -e "/ANALYTICS: Umami Cloud, selected by the owner/,/Enable with:/d" \
      -e "/data-website-id/{n;/^-->$/d;}" \
      "$f"
    echo "  enabled: $f"
    CHANGED=$((CHANGED+1))
  fi
done

# build-samples.js carries its own copy of the tag, because it OWNS the three sample pages. Patch
# the generator too, or the very next `node build-samples.js` would helpfully re-insert the
# commented-out placeholder and silently switch analytics back off for those pages.
if grep -q "UMAMI_WEBSITE_ID_PLACEHOLDER" build-samples.js; then
  sed -i     -e "s#UMAMI_WEBSITE_ID_PLACEHOLDER#${ID}#g"     -e "/ANALYTICS: Umami Cloud, selected by the owner/,/Enable with:/d"     -e "/data-website-id/{n;/^-->$/d;}"     build-samples.js
  echo "  enabled: build-samples.js (generator for the 3 sample pages)"
  CHANGED=$((CHANGED+1))
fi

echo ""
echo "$CHANGED file(s) updated."
echo ""
echo "NEXT, both required:"
echo "  1. node build-samples.js        # regenerate the 3 sample pages from the patched generator"
echo "  2. node verify-site.js         # confirm nothing was corrupted"
echo ""
echo "Then review the diff before deploying. Deployment still needs owner approval."
