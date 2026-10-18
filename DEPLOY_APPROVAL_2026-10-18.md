# Website deployment — approval request, 2026-10-18

**Nothing has been pushed.** Three commits exist locally and are not on the remote — two mine, one
from a concurrent session (see the warning below). Pushing this repository publishes to GitHub Pages,
which is a publication and needs the owner's authorization.

## Destination

| | |
|---|---|
| Repository | `https://github.com/devdocsstudio-debug/verity-works.git` |
| Branch | `main` → `origin/main` |
| Public result | `https://devdocsstudio-debug.github.io/verity-works/` (GitHub Pages, builds from `main`) |
| Current live commit | `e89df2598161d86df4675c99aef24ee79e3da3c5` |
| Would become | `f0229b0` (**three** commits ahead) |

## ⚠ A third commit entered this queue from another session

This document first described **two** commits. While it was being written, a concurrent Claude Code
session committed `f0229b0` to the same branch — a buyer-facing change to
`content-repurposing.html`. A push sends all three, so it is listed here rather than left to be
discovered after the fact.

`f0229b0` — *"Sharpen the $300 Starter Pack page"*, 1 file, +5/−3:

- Replaces the competitive paragraph with a measured finding (a one-line-prompt comparison on a real
  transcript that invented two figures and a unit the speaker never used), and adds a free-fix
  promise for any statement the source does not support.
- States the deliverable as **6 pieces** (LinkedIn post, X thread, newsletter blurb, 3 video hooks
  with beat outlines) where it previously said "4 formats".
- Adds a source-length expectation (works best with 1,500+ words or 20+ minutes).

**Checked by me, because it touches the order-brief block the inquiry parser reads:** the mailto
template on that page is unchanged, and `node tests/run-verity-order-intake-tests.js` passes —
including the test asserting every prompt on every live page parses as its own field. The visible
`<pre class="order-brief">` text changed; the machine-read `mailto:` body did not.

**I did not write that commit and cannot vouch for its claims.** The "6 pieces" figure and the
transcript comparison are assertions about the service that the owner should confirm are true before
they go on a public page, the same way the lead-generation numbers below were confirmed against the
real dataset.

## Exactly what changes

Four files across three commits. Three are buyer-facing; one is a local-only gate script that is
never served.

### 1. `assets/ref-tracking.js` — one character of substance

```diff
-  var note = "Source%3A+" + encodeURIComponent(ref);
+  var note = "Source%3A%20" + encodeURIComponent(ref);
```

**Why.** A mailto body is percent-encoded (RFC 6068), not form-encoded, so the literal `+` stays a
plus sign in the email a visitor sends. Measured in a real browser against the live page: the body
read `Source:+camp-3e40de03928dfc33`. The engine's intake pattern now tolerates both forms forever
(links already published cannot be edited), so **this deploy is not required for attribution to
work** — it just stops new links carrying the wrong separator.

### 2. `lead-generation.html` — two claims corrected

```diff
-  Colorado new-business filings — Denver, Oct 2026 (5 of 277 rows shown)
+  Colorado new-business filings — Denver, 3–16 Oct 2026 (5 of 860 rows shown)
-  captured 2026-10-08
+  captured 2026-10-17
```

**Why.** The page advertised 277 rows from a 2026-10-08 capture. The file we would actually ship has
860 rows from 2026-10-17. One of the original 277 was a company the state records as *Voluntarily
Dissolved*, so the honest count for that older file was 276 — it was corrected forward to the
current dataset rather than back-dated.

### 3. `verify-site.js` — a new pre-deploy check (not served to anyone)

Compares the page's claimed row count and every published sample row against the current
deliverable, and reports SKIP rather than failing when the engine checkout is absent.

## Verification already performed

| Check | Result |
|---|---|
| `node verify-site.js` | **ALL CHECKS PASSED** (includes the new sample/row-count cross-check) |
| Row count on page vs deliverable | 860 vs 860 |
| Capture date on page vs provenance file | 2026-10-17 vs 2026-10-17 |
| Coverage window on page vs file | 3–16 Oct vs 2026-10-03 … 2026-10-16 |
| "house numbers withheld" promise | 0 violations across 860 rows |
| Every row Good Standing (implied by the sample) | 0 violations |
| All 5 published sample rows present in the deliverable | all present, byte for byte |
| No dissolved company in the deliverable | 0 found |
| Price on page vs service catalogue | $25–50 vs $25 starting |
| Negative control on the new check | fails correctly on a wrong count AND on a fabricated sample row |

## How to deploy

```
cd C:\Users\Noam9\Projects\commercial-discovery\ventures\website
node verify-site.js          # must print ALL CHECKS PASSED
git log --oneline origin/main..HEAD   # must show exactly the THREE commits above
git push origin main
```

## Verification after deploying

GitHub Pages takes a minute or two to rebuild.

```
curl -s https://devdocsstudio-debug.github.io/verity-works/lead-generation.html | grep "rows shown"
# expect: 5 of 860 rows shown

curl -s https://devdocsstudio-debug.github.io/verity-works/assets/ref-tracking.js | grep "Source%3A"
# expect: Source%3A%20
```

Then load `…/lead-generation.html?ref=test-deploy-check` in a browser and confirm a mailto link's
body begins `Source: test-deploy-check` with a space rather than a plus.

## Rollback

Both changes are content-only; there is no build step, no data migration and no state to unwind.

```
git revert --no-edit f0229b0 c5ac5cb 1686810
git push origin main
```

Or reset to the exact commit that is live today:

```
git reset --hard e89df2598161d86df4675c99aef24ee79e3da3c5
git push --force-with-lease origin main
```

Prefer the revert: it keeps the history honest about what was tried. `--force-with-lease` is only
appropriate if nothing else has been pushed in between.

## What this deploy does NOT do

It does not put the page in front of anybody. A deployed landing page is not an audience-facing
campaign — reach still needs a channel that has an audience. Treating a deploy as distribution would
be the same category error as treating a prepared campaign as a published one.
