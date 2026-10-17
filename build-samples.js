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
// `pkg` drives the footer's non-affiliation disclaimer. It used to be one hardcoded string listing
// better-sqlite3, pdf-lib AND jsonwebtoken on every page -- copied from devdocs-studio.html, where
// it is correct -- so the Zod page disclaimed a library that appears nowhere on it and failed to
// disclaim the one it actually documents. A disclaimer naming the wrong package is worse than none.
const SAMPLES = [
  {
    src: "API_DOCS_PORTFOLIO_SAMPLE.md",
    out: "sample-better-sqlite3.html",
    pkg: "better-sqlite3",
    title: "better-sqlite3 Common Patterns — Writing Sample — Verity Works",
    description: "A writing sample: the five better-sqlite3 patterns that come up in almost every real project, with examples run against the real package.",
    ogTitle: "better-sqlite3 Common Patterns (writing sample)",
  },
  {
    src: "API_DOCS_PORTFOLIO_SAMPLE_2.md",
    out: "sample-pdf-lib.html",
    pkg: "pdf-lib",
    title: "pdf-lib Quick Reference — Writing Sample — Verity Works",
    description: "A writing sample: a task-oriented pdf-lib reference covering the five operations every project needs, with examples run against the real package.",
    ogTitle: "pdf-lib Quick Reference (writing sample)",
    label: "pdf-lib quick reference",
  },
  {
    src: "API_DOCS_PORTFOLIO_SAMPLE_3.md",
    out: "sample-zod-v4.html",
    pkg: "zod",
    title: "Zod v4 Validation Behavior — Writing Sample — Verity Works",
    description: "A writing sample: the five Zod v4 behaviors that surprise people — parse vs safeParse, unknown keys, coercion, optionality, and transform/refine ordering.",
    ogTitle: "Zod v4 Validation Behavior (writing sample)",
    label: "Zod v4 validation behavior",
  },
];
// Cross-links are generated from SAMPLES, so adding a fourth sample needs no edit here.
SAMPLES[0].label = SAMPLES[0].label || "better-sqlite3 patterns";

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

/** A deliberately small markdown subset -- exactly what these samples use: headings, fenced
 *  code, blockquotes, hr, paragraphs, and inline code/links/emphasis.
 *
 *  An unsupported construct now THROWS, naming the line. The previous comment here claimed it
 *  "becomes a paragraph rather than being silently dropped," which was true but worse than it
 *  sounds: a bullet list came out as a mangled run-on sentence that looked fine to the generator
 *  and broken to a reader. Verified 2026-10-16 by running this function directly --
 *  "- first\n- second\n  - nested" produced "<p>- first - second   - nested</p>", and a pipe
 *  table produced "<p>| a | b | |---|---| | 1 | 2 |</p>". None of the three current samples use
 *  either construct, so this is a guard for the next deliverable, not a fix for a live defect.
 *  Add real list/table support when a sample actually needs one -- loud failure until then. */
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
      // tabindex + an accessible name because .sample pre scrolls horizontally: a scrollable
      // region that only a mouse can scroll hides real content from keyboard users (WCAG 2.1.1).
      out.push(`<pre tabindex="0" role="region" aria-label="Code sample"><code${lang ? ` class="language-${lang}"` : ""}>${esc(body.join("\n"))}</code></pre>`);
      continue;
    }
    if (/^#{1,6}\s/.test(line)) {
      const level = line.match(/^#+/)[0].length;
      // Emitted at the source's own level. This relies on each source having exactly one `#`,
      // which verify-site.js enforces as a hard check (one h1 per page) rather than this
      // generator silently renumbering headings.
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
    // HTML comments pass through verbatim rather than becoming escaped visible text. This matters
    // for anchored deliverables (see ventures/devdocs-studio/build-guide.js): those guides carry a
    // `<!-- verified: script.js#anchor -->` line above each code block recording which executed
    // script the snippet came from. Verified 2026-10-17 by running mdToHtml directly -- without
    // this branch that line rendered as a visible paragraph reading "<!-- verified: ... -->" above
    // every code block. Passing it through keeps it invisible on the page while leaving the
    // provenance readable in the page source, which is evidence for the claim the service sells.
    if (/^\s*<!--/.test(line)) {
      const body = [];
      while (i < lines.length) { body.push(lines[i]); if (/-->/.test(lines[i++])) break; }
      out.push(body.join("\n"));
      continue;
    }
    if (/^\s*([-*+]|\d+\.)\s/.test(line)) {
      throw new Error(`markdown line ${i + 1} is a list item, which this generator does not ` +
        `support and would render as a run-on paragraph: ${JSON.stringify(line)}`);
    }
    if (/^\s*\|/.test(line)) {
      throw new Error(`markdown line ${i + 1} is a table row, which this generator does not ` +
        `support and would render as a run-on paragraph: ${JSON.stringify(line)}`);
    }
    const para = [];
    // The list/table patterns are repeated here, not just guarded above: without them a list
    // following a prose line is absorbed into that paragraph and never reaches the throw.
    while (i < lines.length && !/^\s*$/.test(lines[i]) && !/^```/.test(lines[i]) && !/^#{1,6}\s/.test(lines[i]) && !/^>/.test(lines[i]) && !/^---+\s*$/.test(lines[i]) && !/^\s*([-*+]|\d+\.)\s/.test(lines[i]) && !/^\s*\|/.test(lines[i]) && !/^\s*<!--/.test(lines[i])) {
      para.push(lines[i++]);
    }
    out.push(`<p>${inline(para.join(" "))}</p>`);
  }
  return out.join("\n");
}

function page(sample, bodyHtml) {
  const url = BASE + sample.out;
  // Every sample links to the others, so each one is a route into the rest of the portfolio --
  // which is what an application reviewer following a single link actually needs.
  const others = SAMPLES.filter((s) => s.out !== sample.out)
    .map((s) => `<a href="${s.out}">${s.label}</a>`).join(" · ");
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
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap">
<link rel="stylesheet" href="assets/base.css">
<style>
  /* Palette comes from base.css tokens, not from a generic code-highlighting theme. The first
     version of this block was GitHub-dark (#12161c blue-grey, 6px radii) against a site whose
     background is warm near-black with 2px radii -- it read as a panel borrowed from another
     site. These values match .code-sample on devdocs-studio.html, the page these samples sell. */
  .sample pre { overflow-x: auto; padding: 14px 16px; border-radius: 2px; background: #050402; color: #E4C878; border: 1px solid var(--rule); font-family: "JetBrains Mono", ui-monospace, monospace; font-size: 13.5px; line-height: 1.55; }
  /* Ligatures OFF deliberately. JetBrains Mono renders => as an arrow glyph and -> as a single
     arrow, and on the Zod sample that is genuinely ambiguous: z.prettifyError's real output
     contains a literal arrow, so a reader could not tell observed output from rendered source.
     For a document whose pitch is "this is the real output," that distinction has to survive. */
  .sample pre, .sample code { font-variant-ligatures: none; font-feature-settings: "liga" 0, "calt" 0; }
  .sample code { font-family: "JetBrains Mono", ui-monospace, monospace; font-size: 0.93em; }
  .sample :not(pre) > code { background: var(--surface-2); padding: .12em .35em; border-radius: 2px; }
  /* --stamp is the bronze token base.css defines for quoted/evidence content, which is exactly
     what the scope note is. It was var(--rule) at a 1.32:1 contrast, i.e. invisible -- so the
     one paragraph that frames the whole page as an independent sample read as grey filler. */
  .sample blockquote { margin: 18px 0; padding: 12px 16px; border-left: 3px solid var(--stamp); color: var(--ink-soft); font-size: 14.5px; }
  .sample h2 { margin-top: 32px; }
  /* base.css gives the serif to h1/h2/.mark only, so an h3 fell back to the body sans-serif and
     the closing section -- the last thing a reviewer reads -- looked like a bolded paragraph. */
  .sample h3 { font-family: 'Fraunces', Georgia, serif; font-size: 20px; margin-top: 30px; }
  .sample p { max-width: 68ch; }
  /* A scrollable region has to be reachable without a mouse (WCAG 2.1.1), and once <pre> is
     focusable it needs a visible focus ring -- base.css's rule covers only a, button, input. */
  .sample pre:focus-visible { outline: 3px solid var(--focus); outline-offset: 2px; }
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
example is run against the real package before it is published. Other samples: ${others}</p>
</main>

<footer class="site-footer">
  <div class="wrap">DevDocs Studio — independent technical writing. Not affiliated with ${sample.pkg} or its maintainers.<span class="sep"><a href="mailto:devdocsstudio@gmail.com">devdocsstudio@gmail.com</a></span></div>
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
