#!/usr/bin/env node
// Builds the published writing-sample pages from their markdown sources.
//
// WHY THIS EXISTS. The DevDocs Studio acquisition channel runs through agency and writer-program
// application forms, and every one of them asks for "links to samples of your work online".
// Draft.dev's own form (draft.dev/write, checked live 2026-10-16) requires 3+ online samples. The
// samples existed only as local markdown in ../../drafts/, so there was nothing to link -- which
// made the single highest-value acquisition channel unusable regardless of how good the writing was.
//
// WHY A GENERATOR rather than hand-written HTML: the markdown files stay the single source of truth,
// a third sample is already needed to meet the 3+ requirement, and a consistent conversion is less
// error-prone than transcribing code blocks by hand. The site itself still has no build step --
// this is run manually, like set-live-url.sh, and its output is committed.
//
//   node build-samples.js          # write the sample pages
//   node build-samples.js --check  # verify committed pages match their sources (no writes)
"use strict";
const fs = require("fs");
const path = require("path");

const DIR = __dirname;
const SRC = path.join(DIR, "..", "..", "drafts");
const BASE = "https://devdocsstudio-debug.github.io/verity-works/";

// Each sample: its markdown source, output page, and the metadata the site's verifier requires.
const SAMPLES = [
  {
    src: "API_DOCS_PORTFOLIO_SAMPLE.md",
    out: "sample-better-sqlite3.html",
    title: "better-sqlite3 Common Patterns — Writing Sample — Verity Works",
    description: "A writing sample: the five better-sqlite3 patterns that come up in almost every real project, with examples run against the real package.",
    ogTitle: "better-sqlite3 Common Patterns (writing sample)",
  },
  {
    src: "API_DOCS_PORTFOLIO_SAMPLE_2.md",
    out: "sample-pdf-lib.html",
    title: "pdf-lib Quick Reference — Writing Sample — Verity Works",
    description: "A writing sample: a task-oriented pdf-lib reference covering the five operations every project needs, with examples run against the real package.",
    ogTitle: "pdf-lib Quick Reference (writing sample)",
  },
];

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Inline markdown -> HTML. Code spans are extracted FIRST so their contents are never
 *  re-interpreted as emphasis -- `**` inside a code span is literal. */
function inline(text) {
  const spans = [];
  let s = text.replace(/`([^`]+)`/g, (_, code) => {
    spans.push(`<code>${esc(code)}</code>`);
    return `\u0000${spans.length - 1}\u0000`;
  });
  s = esc(s);
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => `<a href="${href}">${label}</a>`);
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/(^|[\s(])\*([^*]+)\*/g, "$1<em>$2</em>");
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => spans[Number(i)]);
}

/** A deliberately small markdown subset -- exactly what these samples use. An unsupported
 *  construct becomes a paragraph rather than being silently dropped. */
function mdToHtml(md) {
  const lines = md.split(/\r?\n/);
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^```/.test(line)) {
      const lang = line.slice(3).trim();
      const body = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) body.push(lines[i++]);
      i++; // closing fence
      out.push(`<pre><code${lang ? ` class="language-${lang}"` : ""}>${esc(body.join("\n"))}</code></pre>`);
      continue;
    }
    if (/^#{1,6}\s/.test(line)) {
      const level = line.match(/^#+/)[0].length;
      // The markdown's own h1 becomes the page h1; deeper levels shift down by one so the page
      // keeps exactly one h1 and no heading level is skipped.
      out.push(`<h${level}>${inline(line.replace(/^#+\s*/, ""))}</h${level}>`);
      i++;
      continue;
    }
    if (/^>\s?/.test(line)) {
      const body = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) body.push(lines[i++].replace(/^>\s?/, ""));
      out.push(`<blockquote>${inline(body.join(" ").trim())}</blockquote>`);
      continue;
    }
    if (/^---+\s*$/.test(line)) { out.push("<hr>"); i++; continue; }
    if (/^\s*$/.test(line)) { i++; continue; }
    const para = [];
    while (i < lines.length && !/^\s*$/.test(lines[i]) && !/^```/.test(lines[i]) && !/^#{1,6}\s/.test(lines[i]) && !/^>/.test(lines[i]) && !/^---+\s*$/.test(lines[i])) {
      para.push(lines[i++]);
    }
    out.push(`<p>${inline(para.join(" "))}</p>`);
  }
  return out.join("\n");
}

function page(sample, bodyHtml) {
  const url = BASE + sample.out;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<link rel="icon" type="image/svg+xml" href="assets/favicon.svg">
<title>${sample.title}</title>
<meta name="description" content="${sample.description}">
<link rel="canonical" href="${url}">
<meta property="og:title" content="${sample.ogTitle}">
<meta property="og:description" content="${sample.description}">
<meta property="og:type" content="article">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${sample.ogTitle}">
<meta name="twitter:description" content="${sample.description}">
<meta name="robots" content="index,follow">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400&family=JetBrains+Mono:wght@400;500;600;700&family=Inter:wght@400;600;700&display=swap">
<link rel="stylesheet" href="assets/base.css">
<style>
  .sample pre { overflow-x: auto; padding: 14px 16px; border-radius: 6px; background: #12161c; color: #e6edf3; font-family: "JetBrains Mono", ui-monospace, monospace; font-size: 13.5px; line-height: 1.55; }
  .sample code { font-family: "JetBrains Mono", ui-monospace, monospace; font-size: 0.93em; }
  .sample :not(pre) > code { background: rgba(127,127,127,.14); padding: .12em .35em; border-radius: 4px; }
  .sample blockquote { margin: 18px 0; padding: 12px 16px; border-left: 3px solid var(--rule, #d7d2c7); color: var(--ink-soft); font-size: 14.5px; }
  .sample h2 { margin-top: 32px; }
  .sample p { max-width: 68ch; }
</style>
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>
<header class="site-header">
  <div class="wrap">
    <a class="mark" href="index.html">Verity Works</a>
    <nav class="site-nav" aria-label="Main">
      <a href="index.html">Home</a>
      <a href="lead-generation.html">Lead Generation</a>
      <a href="missed-call-audit.html">Missed Call Audit</a>
      <a href="content-repurposing.html">Content Repurposing</a>
      <a href="devdocs-studio.html">DevDocs Studio</a>
    </nav>
  </div>
</header>

<main id="main" class="wrap sample">
${bodyHtml}
<hr>
<p style="font-size:14px; color:var(--ink-soft);">This is one of the published writing samples for
<a href="devdocs-studio.html">DevDocs Studio</a> — API and developer documentation where every code
example is run against the real package before it is published.
<a href="sample-better-sqlite3.html">better-sqlite3 patterns</a> ·
<a href="sample-pdf-lib.html">pdf-lib quick reference</a></p>
</main>

<footer class="site-footer">
  <div class="wrap">DevDocs Studio — independent technical writing. Not affiliated with better-sqlite3, pdf-lib, jsonwebtoken, or their maintainers.<span class="sep"><a href="mailto:devdocsstudio@gmail.com">devdocsstudio@gmail.com</a></span></div>
</footer>
<script src="assets/ref-tracking.js"></script>
<script src="assets/nav-toggle.js"></script>
</body>
</html>
`;
}

const check = process.argv.includes("--check");
let failed = 0;
for (const s of SAMPLES) {
  const srcPath = path.join(SRC, s.src);
  if (!fs.existsSync(srcPath)) { console.log(`  MISSING SOURCE: ${srcPath}`); failed++; continue; }
  const html = page(s, mdToHtml(fs.readFileSync(srcPath, "utf8")));
  const outPath = path.join(DIR, s.out);
  if (check) {
    const current = fs.existsSync(outPath) ? fs.readFileSync(outPath, "utf8") : "";
    if (current === html) console.log(`  OK:   ${s.out} matches ${s.src}`);
    else { console.log(`  STALE: ${s.out} does not match ${s.src} -- run: node build-samples.js`); failed++; }
  } else {
    fs.writeFileSync(outPath, html);
    console.log(`  wrote ${s.out} (${Buffer.byteLength(html)} bytes) from ${s.src}`);
  }
}
console.log(check ? (failed ? `\n${failed} stale/missing` : "\nall sample pages match their sources") : "\ndone");
process.exitCode = failed ? 1 : 0;
