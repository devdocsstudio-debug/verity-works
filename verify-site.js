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

// 4. sitemap.xml lists exactly the real pages that exist -- no stale/missing entries.
const sitemapPath = path.join(DIR, "sitemap.xml");
if (fs.existsSync(sitemapPath)) {
  const sitemap = fs.readFileSync(sitemapPath, "utf8");
  const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  for (const page of PAGES) {
    const matches = locs.some((l) => l.endsWith(page) || (page === "index.html" && l.endsWith("/")));
    if (matches) ok(`sitemap.xml lists ${page}`);
    else fail(`sitemap.xml is missing ${page}`);
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

console.log(`\n${failed === 0 ? "ALL CHECKS PASSED" : failed + " CHECK(S) FAILED"} -- ${failed === 0 ? "safe to deploy from a static-site standpoint" : "do not deploy until these are resolved"}.`);
process.exitCode = failed > 0 ? 1 : 0;
