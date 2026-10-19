#!/usr/bin/env node
// Pre-deployment verification for the Verity Works static site. Built 2026-10-14, informed by
// github.com/moalsayed95/cookbook's pre-deployment-checklist (adapted to what actually applies to
// a static, backend-free site: no auth/DB/CORS/rate-limiting surface exists here, so those
// checklist items are genuinely not applicable -- what DOES apply is translated into real,
// automated checks below instead of a one-time manual read-through.
//
// Usage: node verify-site.js
"use strict";
const fs = require("fs");
const path = require("path");

const DIR = __dirname;
const PAGES = ["index.html", "lead-generation.html", "missed-call-audit.html", "content-repurposing.html", "devdocs-studio.html",
  // Service terms (2026-10-17). A buyer deciding on a $250 order reads this before paying, and
  // every page footer links to it, so it is a real page under the same meta/canonical/a11y rules.
  "terms.html",
  // Published writing samples (2026-10-16). These are real pages that must be indexable and
  // linkable: every technical-writing agency and writer-program application asks for links to
  // samples online, so they are load-bearing for acquisition, not decoration. Generated from their
  // markdown sources by build-samples.js -- run `node build-samples.js --check` to confirm the
  // committed pages still match.
  "sample-better-sqlite3.html", "sample-pdf-lib.html", "sample-zod-v4.html"];
const REQUIRED_META = ["meta charset", "name=\"viewport\"", "meta name=\"description\"", "rel=\"canonical\"", "og:title", "twitter:card", "name=\"robots\""];

let failed = 0;
function fail(msg) { console.log("  FAIL: " + msg); failed++; }
function ok(msg) { console.log("  OK:   " + msg); }

// 1. Every page that should exist, exists -- and 404.html, robots.txt, sitemap.xml too.
for (const p of [...PAGES, "404.html", "robots.txt", "sitemap.xml"]) {
  if (fs.existsSync(path.join(DIR, p))) ok(`${p} exists`);
  else fail(`${p} is missing`);
}

// 2. Every internal link/asset reference across all pages resolves to a real file.
const hrefPattern = /(?:href|src)="([a-zA-Z0-9_\-./]+\.(?:html|css|js|svg|png|jpg|jpeg|ico))"/g;
for (const page of PAGES) {
  const fp = path.join(DIR, page);
  if (!fs.existsSync(fp)) continue;
  const text = fs.readFileSync(fp, "utf8");
  let m;
  while ((m = hrefPattern.exec(text))) {
    const ref = m[1];
    if (ref.startsWith("http") || ref.startsWith("//")) continue; // external (incl. protocol-relative, e.g. analytics), not this check's job
    const target = path.join(DIR, ref);
    if (fs.existsSync(target)) ok(`${page}: ${ref} resolves`);
    else fail(`${page}: broken reference to "${ref}" -- file does not exist`);
  }
}

// 3. Every page carries the required meta-tag set (SEO/sharing/crawlability baseline).
for (const page of PAGES) {
  const fp = path.join(DIR, page);
  if (!fs.existsSync(fp)) continue;
  const text = fs.readFileSync(fp, "utf8");
  for (const tag of REQUIRED_META) {
    if (text.includes(tag)) ok(`${page}: has ${tag}`);
    else fail(`${page}: missing "${tag}"`);
  }
}

// 4. sitemap.xml agrees with each page's OWN robots directive -- checked in both directions.
// Was "every page must be listed", which is wrong and fired on correct work: a noindex page in the
// sitemap is a real defect (we ask Google to crawl a URL we then tell it not to index), and
// removing missed-call-audit.html when its service was paused made this gate FAIL on the fix.
// A sitemap is a list of URLs we want indexed, so the page's robots tag is the authority.
const sitemapPath = path.join(DIR, "sitemap.xml");
if (fs.existsSync(sitemapPath)) {
  const sitemap = fs.readFileSync(sitemapPath, "utf8");
  const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  for (const page of PAGES) {
    const fp = path.join(DIR, page);
    if (!fs.existsSync(fp)) continue;
    const robots = (fs.readFileSync(fp, "utf8").match(/name="robots"\s+content="([^"]*)"/) || [])[1] || "";
    const noindex = /noindex/i.test(robots);
    const listed = locs.some((l) => l.endsWith(page) || (page === "index.html" && l.endsWith("/")));
    if (noindex && listed) fail(`sitemap.xml lists ${page}, but that page is noindex -- remove it`);
    else if (noindex) ok(`sitemap.xml correctly omits ${page} (noindex)`);
    else if (listed) ok(`sitemap.xml lists ${page}`);
    else fail(`sitemap.xml is missing ${page} (which is index,follow)`);
  }
}

// 4b. Each canonical points at ITS OWN page (added 2026-10-16 during a full technical SEO audit).
// Check 3 only proves the string rel="canonical" appears somewhere. That passes happily when a
// canonical is copy-pasted between pages -- the single highest-impact silent SEO defect available
// to a static site, because Google then treats four service pages as duplicates of the homepage
// and drops them from the index. Presence was already checked; correctness was not.
//
// BASE is read from sitemap.xml rather than hardcoded, so set-live-url.sh stays the one place the
// production URL is configured and this check cannot drift from it.
if (fs.existsSync(sitemapPath)) {
  const homeLoc = [...fs.readFileSync(sitemapPath, "utf8").matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((m) => m[1]).find((l) => l.endsWith("/"));
  if (!homeLoc) {
    fail("sitemap.xml has no root <loc> ending in / -- cannot determine the canonical base URL");
  } else {
    for (const page of PAGES) {
      const fp = path.join(DIR, page);
      if (!fs.existsSync(fp)) continue;
      const found = (fs.readFileSync(fp, "utf8").match(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/) || [])[1];
      const expected = page === "index.html" ? homeLoc : homeLoc + page;
      if (found === expected) ok(`${page}: canonical is self-referential`);
      else fail(`${page}: canonical is "${found}" but should be "${expected}" -- a wrong canonical de-indexes this page`);
    }
  }
}

// 4c. Exactly one h1, and every image has alt text. Both are cheap, both are real: multiple or
// missing h1s muddy the page's topic, and a missing alt is an accessibility failure that no
// amount of meta-tag correctness compensates for. 404.html is included -- it is a real page a
// person can land on, even though it is noindex and out of the sitemap by design.
for (const page of [...PAGES, "404.html"]) {
  const fp = path.join(DIR, page);
  if (!fs.existsSync(fp)) continue;
  const text = fs.readFileSync(fp, "utf8");
  const h1s = (text.match(/<h1[\s>]/g) || []).length;
  if (h1s === 1) ok(`${page}: exactly one h1`);
  else fail(`${page}: ${h1s} h1 elements (want exactly 1)`);
  const imgsWithoutAlt = (text.match(/<img\b[^>]*>/g) || []).filter((t) => !/\balt\s*=/.test(t));
  if (imgsWithoutAlt.length === 0) ok(`${page}: every img has alt text`);
  else fail(`${page}: ${imgsWithoutAlt.length} img without alt (${imgsWithoutAlt[0].slice(0, 60)})`);
}

// 4d. Every webfont a page REQUESTS is a font some stylesheet actually uses, and every page that
// requests fonts at all requests the one the shared stylesheet needs. Added 2026-10-16 after a
// measured defect: devdocs-studio.html and all three sample pages asked Google Fonts for
// "Source Serif 4", which no selector anywhere references, and never asked for Fraunces, which
// base.css applies to h1, h2 and .mark on EVERY page. The result was a live service page whose
// headings and brand mark silently fell back to Georgia while the home page it links to rendered
// in Fraunces -- a visible identity break, plus a wasted font download, and nothing failed.
//
// A missing font never errors; it just renders in a fallback, which is exactly why this needs a
// machine check rather than a careful eye. 404.html deliberately requests no webfonts at all (a
// fast, dependency-free error page), so pages with no font link are skipped rather than failed.
const cssText = ["assets/base.css"]
  .map((f) => (fs.existsSync(path.join(DIR, f)) ? fs.readFileSync(path.join(DIR, f), "utf8") : ""))
  .join("\n");
for (const page of [...PAGES, "404.html"]) {
  const fp = path.join(DIR, page);
  if (!fs.existsSync(fp)) continue;
  const text = fs.readFileSync(fp, "utf8");
  const link = (text.match(/fonts\.googleapis\.com\/css2\?([^"']+)/) || [])[1];
  if (!link) { ok(`${page}: requests no webfonts (nothing to mismatch)`); continue; }

  // "Fraunces:opsz,wght@9..144,500" -> "Fraunces"; "JetBrains+Mono" -> "JetBrains Mono".
  const requested = [...link.matchAll(/family=([^:&]+)/g)]
    .map((m) => decodeURIComponent(m[1]).replace(/\+/g, " "));
  // A page's own <style> block counts as "used" -- the samples set JetBrains Mono inline.
  const usedIn = cssText + text;
  const unused = requested.filter((f) => !usedIn.includes(f));
  if (unused.length === 0) ok(`${page}: every requested webfont (${requested.join(", ")}) is used`);
  else fail(`${page}: requests webfont(s) nothing uses: ${unused.join(", ")} -- wasted download, and ` +
    `usually a sign the page is falling back for a font it should have asked for instead`);

  if (requested.includes("Fraunces")) ok(`${page}: requests Fraunces, which base.css needs for h1/h2/.mark`);
  else fail(`${page}: does not request Fraunces, but base.css styles h1, h2 and .mark with it -- ` +
    `headings and the brand mark will silently fall back to Georgia`);
}

// 4e. THE OTHER DIRECTION. 4d catches a page requesting a font nothing uses. It cannot catch the
// reverse -- a page USING a class whose stylesheet rule names a webfont the page never requested
// -- and the reverse is the one that actually degrades the rendering. Measured 2026-10-17:
// index.html has been using .card-tag, which base.css sets in IBM Plex Mono, while requesting only
// Fraunces and Inter, so every card tag on the home page rendered in whatever monospace the
// visitor's OS defaults to. Nothing failed, and 4d passed, because the font that was missing was
// never asked for in the first place.
//
// Deliberately narrow: single-class selectors in base.css only. That is what this stylesheet
// actually uses for font-bearing rules, and a narrow check that is right beats a general one that
// guesses at selector matching.
const CLASS_FONT_RULES = [...cssText.matchAll(/\.([a-z0-9-]+)\s*(?:,[^{]*)?\{([^}]*)\}/gi)]
  .flatMap(([, cls, body]) => {
    const fam = (body.match(/font-family:\s*['"]([^'"]+)['"]/) || [])[1];
    return fam ? [{ cls, fam }] : [];
  });
for (const page of [...PAGES, "404.html"]) {
  const fp = path.join(DIR, page);
  if (!fs.existsSync(fp)) continue;
  const text = fs.readFileSync(fp, "utf8");
  const link = (text.match(/fonts\.googleapis\.com\/css2\?([^"']+)/) || [])[1] || "";
  const requested = [...link.matchAll(/family=([^:&]+)/g)].map((m) => decodeURIComponent(m[1]).replace(/\+/g, " "));
  for (const { cls, fam } of CLASS_FONT_RULES) {
    // Generic families (ui-monospace, Georgia, -apple-system) are not webfonts and need no request.
    if (!/^(Fraunces|Inter|IBM Plex Mono|JetBrains Mono|Source Serif)/i.test(fam)) continue;
    // `\\b` and not `\b`: inside a template literal `\b` is the backspace character, which matches
    // nothing and silently turns this whole check into a no-op. It did exactly that on first run.
    if (!new RegExp(`class="[^"]*\\b${cls}\\b`).test(text)) continue;
    if (requested.includes(fam)) ok(`${page}: uses .${cls} and requests its font (${fam})`);
    else fail(`${page}: uses .${cls}, which base.css sets in "${fam}", but never requests that ` +
      `font -- it renders in a fallback face and nothing else reports it`);
  }
}

// 5. No accidentally-committed secret-shaped strings (a cheap, real safety net -- not a
// substitute for not committing secrets in the first place, but catches an honest mistake).
const SECRET_PATTERNS = [/client_secret["\s:=]+["'][A-Za-z0-9_\-]{10,}/i, /-----BEGIN (RSA |EC )?PRIVATE KEY-----/, /AKIA[0-9A-Z]{16}/];
for (const page of [...PAGES, "404.html"]) {
  const fp = path.join(DIR, page);
  if (!fs.existsSync(fp)) continue;
  const text = fs.readFileSync(fp, "utf8");
  const hit = SECRET_PATTERNS.find((p) => p.test(text));
  if (hit) fail(`${page}: text matching a secret-shaped pattern found (${hit}) -- review before deploying`);
  else ok(`${page}: no secret-shaped strings found`);
}

// 6. THE PUBLISHED SAMPLE MUST MATCH WHAT WE WOULD ACTUALLY SHIP (added 2026-10-18).
//
// lead-generation.html publishes a row count and five real rows under the heading "Real output,
// unredacted source". That is the page's single strongest proof element, and until now nothing
// compared it to the data. It had drifted: the page said 277 rows from a 2026-10-08 capture while
// the deliverable we would actually produce was 860 rows from 2026-10-17 -- and ONE of those 277
// was "TWF Colorado LLC, Dissolved October 5, 2026", a company the state records as dissolved.
//
// This is the recurring defect in this project stated plainly: a public claim and the real artifact
// drift apart because nothing mechanical compares them. So this compares them.
//
// Cross-repo and optional on purpose: the data lives in the maintenance-engine checkout. When that
// is not present this reports SKIP rather than failing, because a missing sibling repo is not a
// reason to block a deploy -- but when it IS present, a mismatch is.
(function checkPublishedSampleAgainstData() {
  const ENGINE = path.join(DIR, "..", "..", "..", "..", ".claude", "maintenance-engine");
  let exporter = null;
  try { exporter = require(path.join(ENGINE, "bin", "export-filing-data-csv.js")); } catch { /* sibling repo absent */ }
  if (!exporter) { console.log("  SKIP: lead-generation.html sample not cross-checked (maintenance-engine checkout not found)"); return; }

  const leadsDir = path.join(ENGINE, "state", "filing-leads");
  let newest = null;
  try {
    newest = fs.readdirSync(leadsDir)
      .filter((f) => /^colorado-filing-segmented-.*\.json$/.test(f))
      .map((f) => ({ f, m: fs.statSync(path.join(leadsDir, f)).mtimeMs }))
      .sort((a, b) => b.m - a.m)[0];
  } catch { /* no data dir */ }
  if (!newest) { console.log("  SKIP: lead-generation.html sample not cross-checked (no segmented source found)"); return; }

  const entries = JSON.parse(fs.readFileSync(path.join(leadsDir, newest.f), "utf8")).entries;
  const rows = exporter.filterRows(entries, { city: "Denver" });
  const csv = exporter.toCsv(rows);
  const page = fs.readFileSync(path.join(DIR, "lead-generation.html"), "utf8");

  const claimed = page.match(/\(5 of ([\d,]+) rows shown\)/);
  if (!claimed) {
    fail("lead-generation.html: no '(5 of N rows shown)' claim found -- this check can no longer verify the page's row count, which is worse than a wrong number");
  } else if (Number(claimed[1].replace(/,/g, "")) !== rows.length) {
    fail(`lead-generation.html claims ${claimed[1]} rows; the current deliverable (${newest.f}) has ${rows.length}`);
  } else {
    ok(`lead-generation.html's claimed row count (${rows.length}) matches the current deliverable`);
  }

  // Every published sample row must exist in that deliverable -- by company name, since the page
  // title-cases names for presentation ("AM Towing LLC" vs the source's "AM towing LLC") and that
  // is a rendering choice, not a claim about the data.
  const sampleNames = [...page.matchAll(/<tr><td>([^<]+)<\/td><td>D[A-Z]+<\/td>/g)].map((m) => m[1].trim());
  if (sampleNames.length === 0) {
    fail("lead-generation.html: no sample rows parsed -- the published exhibit is no longer being verified");
  } else {
    const missing = sampleNames.filter((n) => !csv.toLowerCase().includes(n.toLowerCase() + ","));
    if (missing.length) fail(`lead-generation.html publishes ${missing.length} sample row(s) absent from the current deliverable: ${missing.join("; ")}`);
    else ok(`all ${sampleNames.length} published sample rows are present in the current deliverable`);
  }
})();

console.log(`\n${failed === 0 ? "ALL CHECKS PASSED" : failed + " CHECK(S) FAILED"} -- ${failed === 0 ? "safe to deploy from a static-site standpoint" : "do not deploy until these are resolved"}.`);
process.exitCode = failed > 0 ? 1 : 0;
