"use strict";
/* THE BRAND SYSTEM — decided, refined and rendered.
 *
 * DIRECTION CHOSEN: PROOF, refined. Reviewed against the other four explored on 2026-11-08:
 *   DIFF  — rejected: at 36px it is three bars, indistinguishable from a hamburger menu.
 *   RUN   — rejected: on a light ground the counter-form triangle is ink-on-ink and vanishes.
 *   PROMPT— workable but `>_` is the single most-used device in developer branding. Safe, not ownable.
 *   BRACKETS — strong and legible, kept as the fallback; its accent core nearly disappears at 36px.
 *   PROOF — chosen. It is the only one that says what the business actually sells: the chevron is
 *           the prompt, the tick is the verification, and the promise is "every example executed
 *           before it ships". Form follows the claim rather than decorating it.
 *
 * REFINEMENTS over the exploration version, each for a measured reason:
 *   - the tick's long arm was lengthened and its angle opened, so at 36px it no longer reads as a
 *     "W" alongside the chevron;
 *   - the chevron was made slightly lighter in weight than the tick, so the eye reads tick-first;
 *   - optical centring: the pair is nudged left, because a right-leaning tick drags the visual
 *     centre right of the geometric one.
 *
 * THE TWO-BRAND SYSTEM. Both brands share the chevron — that shared stroke IS the parent
 * relationship, visible without explanation. The right-hand element and the accent differ:
 *   DevDocs Studio (parent)  chevron + TICK,  green   -> documentation that was verified
 *   Verity Works (specialist) chevron + STOCK ROWS, amber -> a catalogue, descending
 *
 * NOT CLAIMED: that this is registrable or clear of existing marks. A chevron-and-tick is a common
 * construction and only a real clearance search across the relevant registers can answer that —
 * the method used for Northcastle. Until that is run, this is an original drawing, nothing more.
 */
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

const OUT = path.join(__dirname, "assets", "brand");
fs.mkdirSync(OUT, { recursive: true });

const INK = "#16233F";
const PAPER = "#F5F2EC";
const GREEN = "#3F7A5C";
const AMBER = "#C6A355";

/** The refined mark. `second` picks the right-hand element; `accent` its colour. */
function mark(fg, accent, second) {
  const tail = second === "tick"
    ? `<path d="M46 60 L58 72 L86 28" stroke="${accent}" stroke-width="11" stroke-linecap="square" stroke-linejoin="miter"/>`
    : `<rect x="50" y="36" width="34" height="10" fill="${accent}"/>
       <rect x="50" y="52" width="26" height="10" fill="${accent}" opacity="0.72"/>
       <rect x="50" y="68" width="18" height="10" fill="${accent}" opacity="0.46"/>`;
  return `<svg viewBox="0 0 100 100" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(-3 0)">
    <path d="M20 32 L38 50 L20 68" stroke="${fg}" stroke-width="9.5" stroke-linecap="square" stroke-linejoin="miter"/>
    ${tail}
  </g>
</svg>`;
}

const BRANDS = {
  devdocs: { label: "DevDocs Studio", second: "tick", accent: GREEN },
  verity: { label: "Verity Works", second: "block", accent: AMBER },
};

const shell = (w, h, body, bg) => `<!doctype html><html><head><meta charset="utf-8"><style>
 *{margin:0;padding:0;box-sizing:border-box}
 html,body{width:${w}px;height:${h}px;background:${bg};overflow:hidden;
   font-family:"Segoe UI",Arial,Helvetica,sans-serif}
</style></head><body>${body}</body></html>`;

const avatar = (b, inverted) => {
  const bg = inverted ? PAPER : INK;
  const fg = inverted ? INK : PAPER;
  return `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:${bg}">
    <div style="width:62%;height:62%">${mark(fg, b.accent, b.second)}</div></div>`;
};

/** A banner/cover: mark, wordmark, and one line of positioning. */
const banner = (b, w, h, tagline) => {
  const pad = Math.round(w * 0.055);
  const markPx = Math.round(h * 0.34);
  return `<div style="width:100%;height:100%;background:${INK};display:flex;align-items:center;padding:0 ${pad}px;gap:${Math.round(markPx * 0.42)}px">
    <div style="width:${markPx}px;height:${markPx}px;flex:0 0 ${markPx}px">${mark(PAPER, b.accent, b.second)}</div>
    <div style="min-width:0">
      <div style="font:700 ${Math.round(h * 0.135)}px/1.1 'Segoe UI',Arial,sans-serif;color:${PAPER};letter-spacing:-0.012em">${b.label}</div>
      <div style="font:400 ${Math.round(h * 0.078)}px/1.45 'Segoe UI',Arial,sans-serif;color:#A89C7E;margin-top:${Math.round(h * 0.045)}px;max-width:${Math.round(w * 0.64)}px">${tagline}</div>
    </div>
    <div style="margin-left:auto;width:${Math.round(h * 0.055)}px;height:${Math.round(h * 0.55)}px;background:${b.accent}"></div>
  </div>`;
};

const ASSETS = [
  // profile marks, both brands, both grounds
  { file: "devdocs-avatar-1000.png", w: 1000, h: 1000, body: () => avatar(BRANDS.devdocs, false), bg: INK },
  { file: "devdocs-avatar-light-1000.png", w: 1000, h: 1000, body: () => avatar(BRANDS.devdocs, true), bg: PAPER },
  { file: "verity-avatar-1000.png", w: 1000, h: 1000, body: () => avatar(BRANDS.verity, false), bg: INK },
  { file: "verity-avatar-light-1000.png", w: 1000, h: 1000, body: () => avatar(BRANDS.verity, true), bg: PAPER },
  // small-size proofs — the size most marks fail at
  { file: "devdocs-avatar-128.png", w: 128, h: 128, body: () => avatar(BRANDS.devdocs, false), bg: INK },
  { file: "verity-avatar-128.png", w: 128, h: 128, body: () => avatar(BRANDS.verity, false), bg: INK },
  { file: "devdocs-avatar-36.png", w: 36, h: 36, body: () => avatar(BRANDS.devdocs, false), bg: INK },
  // platform banners at their documented sizes
  { file: "linkedin-banner-1584x396.png", w: 1584, h: 396, bg: INK,
    body: () => banner(BRANDS.devdocs, 1584, 396, "Shopify integrations, ecommerce automation and developer documentation — every example executed before it ships.") },
  { file: "facebook-cover-1640x624.png", w: 1640, h: 624, bg: INK,
    body: () => banner(BRANDS.verity, 1640, 624, "Shopify and ecommerce engineering. Every claim traces to something you can check.") },
  { file: "og-card-1200x630.png", w: 1200, h: 630, bg: INK,
    body: () => banner(BRANDS.verity, 1200, 630, "Work you can inspect — Shopify integrations, automation, developer docs.") },
];

/** PNG IHDR, read back from the file rather than trusted from the viewport. */
function pngDims(file) {
  const b = fs.readFileSync(file);
  if (b.length < 24 || b.toString("ascii", 1, 4) !== "PNG") return null;
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  let bad = 0;
  try {
    for (const a of ASSETS) {
      const pg = await browser.newPage({ viewport: { width: a.w, height: a.h }, deviceScaleFactor: 1 });
      await pg.setContent(shell(a.w, a.h, a.body(), a.bg), { waitUntil: "load" });
      const file = path.join(OUT, a.file);
      await pg.screenshot({ path: file });
      await pg.close();

      const d = pngDims(file);
      const ok = d && d.w === a.w && d.h === a.h;
      if (!ok) bad++;
      console.log((ok ? "OK   " : "WRONG") + "  " + a.file.padEnd(32)
        + (d ? d.w + "x" + d.h : "unreadable").padEnd(12)
        + Math.round(fs.statSync(file).size / 1024) + " KB");
    }

    /* A side-by-side sheet so the two brands can be judged as a SYSTEM, not one at a time. */
    const cell = (b, size, inv) => `<div style="width:${size}px;height:${size}px;border-radius:${Math.round(size * 0.11)}px;overflow:hidden;${inv ? "border:1px solid #E3DED4" : ""}">${avatar(b, inv)}</div>`;
    const row = (b) => `<div style="display:flex;align-items:center;gap:22px;padding:20px 24px;border-bottom:1px solid #E3DED4">
        ${cell(b, 112, false)}${cell(b, 56, false)}${cell(b, 32, false)}${cell(b, 112, true)}
        <div><div style="font:700 18px 'Segoe UI';color:${INK}">${b.label}</div>
        <div style="font:400 14px 'Segoe UI';color:#5A6B86;margin-top:4px">shared chevron · ${b.second === "tick" ? "tick, green — documentation that was verified" : "stock rows, amber — a catalogue, descending"}</div></div>
      </div>`;
    const sheetH = 2 * 153 + 86;
    const pg = await browser.newPage({ viewport: { width: 760, height: sheetH }, deviceScaleFactor: 1 });
    await pg.setContent(shell(760, sheetH, `<div style="background:${PAPER};width:100%;height:100%">
      <div style="padding:22px 24px 10px"><div style="font:700 19px 'Segoe UI';color:${INK}">Brand system — one chevron, two tails</div>
      <div style="font:400 13px 'Segoe UI';color:#5A6B86;margin-top:4px">112 · 56 · 32px on ink, then reversed. The shared stroke is the parent relationship.</div></div>
      ${row(BRANDS.devdocs)}${row(BRANDS.verity)}</div>`, PAPER), { waitUntil: "load" });
    await pg.screenshot({ path: path.join(OUT, "system-sheet.png") });
    await pg.close();
    console.log("OK     system-sheet.png");

    console.log("\n" + (bad ? bad + " asset(s) at the WRONG size" : "every asset rendered at its intended size") + " -> " + OUT);
  } finally { await browser.close(); }
})().catch((e) => { console.log("THREW: " + e.message); process.exitCode = 1; });
