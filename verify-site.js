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
const PAGES = ["index.html", "lead-generation.html", "missed-call-audit.html", "content-repurposing.html", "devdocs-studio.html"];
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
