"use strict";
// Generate the Verity Works brand assets as SVG. Deterministic: re-running produces identical
// bytes, so the identity is reproducible rather than a one-off export nobody can regenerate.
const fs = require("node:fs");
const path = require("node:path");

// Writes beside itself, so the generator travels with the assets and works from any checkout.
const OUT = __dirname;
fs.mkdirSync(OUT, { recursive: true });

// Palette, lifted from the live site's base.css rather than invented.
const C = {
  ground: "#0B0A08", surface: "#16140F", ink: "#EFE7D3", inkSoft: "#A89C7E",
  accent: "#C6A355", accentBright: "#E4C878", inkOnLight: "#17150F",
};

// The V: real thick/thin stroke contrast, drawn as one filled path so it stays crisp at any size.
const V_PATH = "M16,22 L31,22 L50,66 L69,22 L79,22 L55,78 L45,78 Z";
// The citation dot, pulled further out and slightly smaller than the first draft so it survives
// a 16px render without merging into the V's right arm.
const DOT = { cx: 86, cy: 17, r: 6.5 };

const head = (w, h, vb) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${vb}" role="img">`;

const mark = (ink, dot = C.accentBright) =>
  `<path d="${V_PATH}" fill="${ink}"/><circle cx="${DOT.cx}" cy="${DOT.cy}" r="${DOT.r}" fill="${dot}"/>`;

const files = {};

// 1. The mark alone, transparent, for dark and light grounds.
files["mark-dark.svg"] =
  `${head(100, 100, "0 0 100 100")}<title>Verity Works</title>${mark(C.ink)}</svg>\n`;
files["mark-light.svg"] =
  `${head(100, 100, "0 0 100 100")}<title>Verity Works</title>${mark(C.inkOnLight, C.accent)}</svg>\n`;

// 2. Favicon. Square ground so it reads against any browser chrome, and the mark inset enough
//    that the dot keeps its air at 16px.
files["favicon.svg"] =
  `${head(32, 32, "0 0 32 32")}<title>Verity Works</title>` +
  `<rect width="32" height="32" rx="5" fill="${C.ground}"/>` +
  `<g transform="translate(3.2,3.2) scale(0.256)">${mark(C.ink)}</g></svg>\n`;

// 3. Profile avatar. Every platform crops this to a circle, so the mark is inset to survive it --
//    checked against a circle mask, not assumed.
files["avatar.svg"] =
  `${head(400, 400, "0 0 400 400")}<title>Verity Works</title>` +
  `<rect width="400" height="400" fill="${C.ground}"/>` +
  `<g transform="translate(92,92) scale(2.16)">${mark(C.ink)}</g></svg>\n`;

// 4. Horizontal lockup. Fraunces for the name, mono for the line under it -- the same pairing the
//    website already uses, so the logo and the site are visibly one thing.
const lockup = (ink, soft, ground) =>
  `${head(640, 160, "0 0 640 160")}<title>Verity Works</title>` +
  (ground ? `<rect width="640" height="160" fill="${ground}"/>` : "") +
  `<g transform="translate(40,34) scale(0.92)">${mark(ink)}</g>` +
  `<text x="170" y="82" font-family="Fraunces, Georgia, 'Times New Roman', serif" font-weight="600" font-size="56" fill="${ink}" letter-spacing="-0.6">Verity Works</text>` +
  `<text x="173" y="116" font-family="'IBM Plex Mono', ui-monospace, monospace" font-size="18" fill="${soft}" letter-spacing="2.9">EVIDENCE YOU CAN CHECK</text>` +
  `</svg>\n`;
files["lockup-dark.svg"] = lockup(C.ink, C.inkSoft, C.ground);
files["lockup-transparent.svg"] = lockup(C.ink, C.inkSoft, null);
files["lockup-light.svg"] = lockup(C.inkOnLight, "#6B6250", "#F7F3EA");

// 5. Banners. LinkedIn 1584x396 and Facebook 1640x856 -- different enough that one image stretched
//    to both would crop badly, so each is composed for its own safe area.
const banner = (w, h, markX, markY, markS, textX, textY, nameSize, lineSize) =>
  `${head(w, h, `0 0 ${w} ${h}`)}<title>Verity Works</title>` +
  `<rect width="${w}" height="${h}" fill="${C.ground}"/>` +
  `<rect x="0" y="${h - 6}" width="${w}" height="6" fill="${C.accent}"/>` +
  `<g transform="translate(${markX},${markY}) scale(${markS})">${mark(C.ink)}</g>` +
  `<text x="${textX}" y="${textY}" font-family="Fraunces, Georgia, serif" font-weight="600" font-size="${nameSize}" fill="${C.ink}" letter-spacing="-1">Verity Works</text>` +
  `<text x="${textX + 3}" y="${textY + nameSize * 0.62}" font-family="'IBM Plex Mono', monospace" font-size="${lineSize}" fill="${C.inkSoft}" letter-spacing="3">DEVELOPER DOCUMENTATION &#183; CONTENT REPURPOSING &#183; SOURCE-CITED RESEARCH</text>` +
  `</svg>\n`;
files["banner-linkedin-1584x396.svg"] = banner(1584, 396, 150, 128, 1.45, 330, 212, 76, 19);
// Facebook's cover is 1640x856 but mobile crops hard top and bottom, so the lockup is centred on
// the vertical midline rather than sitting in the upper third -- the first draft left a dead
// lower half and risked losing the tagline on a phone.
files["banner-facebook-1640x856.svg"] = banner(1640, 856, 300, 360, 1.9, 530, 468, 92, 22);

for (const [name, svg] of Object.entries(files)) {
  fs.writeFileSync(path.join(OUT, name), svg, "utf8");
  console.log("wrote " + name + "  (" + Buffer.byteLength(svg) + " bytes)");
}
