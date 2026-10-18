# Website deployment — approval request, 2026-10-18

**Nothing has been pushed.** Pushing this repository publishes to GitHub Pages, which is a
publication and needs the owner's authorization.

**This document no longer states how many commits are in the queue, on purpose.** It said "two",
then "three", and by the time that was corrected a concurrent session had added a fifth. Any number
written here is stale the moment another session commits -- the same claim-versus-artifact drift this
project keeps paying for. The authoritative list is one command, run at the moment you deploy:

```
git log --oneline origin/main..HEAD
```

What IS stable is the rollback anchor: `e89df2598161d86df4675c99aef24ee79e3da3c5` is the commit
currently live, and reverting to it undoes everything in the queue however long it has grown.

## Destination

| | |
|---|---|
| Repository | `https://github.com/devdocsstudio-debug/verity-works.git` |
| Branch | `main` → `origin/main` |
| Public result | `https://devdocsstudio-debug.github.io/verity-works/` (GitHub Pages, builds from `main`) |
| Current live commit | `e89df2598161d86df4675c99aef24ee79e3da3c5` |
| Would become | whatever `origin/main..HEAD` lists when you push -- see above |

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
git log --oneline origin/main..HEAD   # READ THIS LIST -- it is the authoritative delta
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
# revert every commit now in the queue, whatever it contains:
git revert --no-edit $(git log --format=%H origin/main..HEAD | tr '\n' ' ')
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

---

## Addendum — f0229b0's claims, substantiated by the session that wrote it

The section above correctly says *"I did not write that commit and cannot vouch for its claims."*
That was the right flag, and this answers it. Verification run 2026-10-18 by the session that made
`f0229b0`, after the owner asked for exactly this check. **Two problems were found in it and fixed;
the commit was amended rather than defended.**

### Corrected before any deploy

| Claim as first committed | Problem | Now reads |
|---|---|---|
| "3 video hooks **with beat outlines**" | **Scope expansion.** `OFFER_SPEC.md` has **zero** mentions of beat outlines in the $300 Starter Pack. We do deliver them, but putting them on a public page widens the published offer without approval | "3 **short-form video hooks**" — the exact words of the approved offer |
| "The difference is what happens to the facts." | **Universal claim** from a single internal observation | Removed. Now: "Either may be the right call for you… That's one observation, not a verdict on those tools." |
| "if one ever states something your source didn't" | Looser than the published guarantee | "if it **materially misrepresents your source, a claim your material never made**" — the exact wording already live in `terms.html` |

### Substantiated as-is

- **"6 pieces"** — `OFFER_SPEC.md` Starter Pack row: *"1 LinkedIn post + 1 X/Twitter thread + 1
  newsletter blurb + 3 short-form video hooks"* = 1+1+1+3 = **6**. The previous copy said "4
  formats", which undersold the same deliverable. No scope change, only accurate counting.
- **The transcript comparison** — traceable to `EDITORIAL_STANDARD.md` and
  `retainer-sim/SEMANTIC_RELIABILITY_RESULTS.md`: a blind comparison on one real transcript in which
  the AI-default version was rejected for inventing two figures and a unit of measurement the
  speaker never used. The page now states its scope ("on a single transcript") and its limits
  explicitly.
- **"Works best with 1,500+ words or 20+ minutes"** — advisory, not a requirement, and deliberately
  so: the approved offer sets no minimum length. Grounded in a real measurement — a 335-word source
  produced delivery figures that were wrong by about 2x. Phrased as guidance so it cannot read as a
  gate on an order.

### Checks run on the corrected page

- `node verify-site.js` → **ALL CHECKS PASSED** (before and after).
- Six claim-tracing assertions, each confirming a page claim against `OFFER_SPEC.md` or
  `terms.html`, and confirming the removed phrases are actually gone → **6/6 pass**.
- HTML tag balance (ul/li/p/div/strong) → balanced.
- Mobile overflow checked in CSS rather than assumed: `.tier-grid` collapses to a single column
  under 560px, so the longer list item gets *more* width on mobile, not less. No `nowrap`, no fixed
  pixel widths, no `overflow-x`.

### ⚠ Still outstanding on this commit

**Not visually rendered.** Playwright was held by a concurrent session on both attempts and the
Chrome extension is not connected. The structural checks above are a mitigation, not a substitute.
**Render `content-repurposing.html` at mobile and desktop widths before or immediately after
deploying** — the one real risk is the longer "6 pieces" list item wrapping awkwardly inside the
tier card.

**The order-brief block changed visibly but the machine-read `mailto:` body did not** — which the
other session verified independently with `tests/run-verity-order-intake-tests.js`. That check
stands and is not duplicated here.

---

## Visual verification — COMPLETE (2026-10-18)

The outstanding item above is now closed. The MCP browser stayed held by a concurrent session all
cycle, so this was run against **our own Playwright instance with real device emulation**, which
never touches that browser.

**Result: the release queue is visually clean at mobile (390×844, DPR 2, touch) and desktop
(1280×900).**

| Page | Mobile | Desktop |
|---|---|---|
| `content-repurposing.html` | `scrollWidth=390`, **0** elements past viewport, no horizontal scroll | clean |
| `index.html` | clean | clean |
| `terms.html` | clean | clean |
| `lead-generation.html` | **see note** | clean |

**`content-repurposing.html` order card, inspected directly:** the new "1 source → **6 pieces**:
LinkedIn post, X thread, newsletter blurb, 3 short-form video hooks" wraps cleanly over three lines
inside the card, the tier grid collapses to a single column as intended, and nothing is clipped.
The `.honest` paragraph and hero wrap correctly.

**`lead-generation.html` — investigated, NOT a defect.** The detector counted 33 elements past the
viewport on mobile. The cause is the 705px data-sample table, and it sits inside
`div.exhibit-scroll` with `overflow-x: auto` (clientWidth 304, scrollWidth 705) — a deliberate
horizontal scroll container, which is the correct pattern for a wide table on a phone. The document
itself does not scroll horizontally (`scrollWidth === innerWidth === 390`). **No change
recommended.**

**Smallest rendered body font:** 10.5px on `index.html`, 11px on the two service pages, 12.5px on
`terms.html`. Legible, though 10.5px is at the low end — worth a future look, **not** a release
blocker and deliberately not changed here.

### A false alarm worth recording, because it nearly became a reported defect

A first pass used raw headless Chrome with `--window-size=390,1400` and showed text clipped at the
right edge on mobile. **That was an artifact**: headless Chrome at a narrow window does not apply
mobile viewport emulation, so it renders the desktop layout into a 390px frame. Proper emulation
shows zero overflow. This is the same failure shape as the YouTube "zero Shorts" reading retracted
earlier the same day — **a tool returning something that looks like evidence when it is really
reporting its own rendering.** Measure, then report.

### Release recommendation

**All six queued commits are, from this session's side, ready to publish.** Scope is four files
(`content-repurposing.html`, `lead-generation.html`, `assets/ref-tracking.js`, `verify-site.js`)
plus this approval document. `verify-site.js` passes, claims are traced to `OFFER_SPEC.md` and
`terms.html`, and both sizes render correctly.

**Still requires explicit owner approval to push. Nothing has been deployed.**
