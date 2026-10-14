# Verity Works — website

A real, standalone static site for the five service lines (Lead Generation, Missed Call Audit,
Content Repurposing, DevDocs Studio; Back-Office is intentionally not listed here yet — see below).

## Architecture decision (made, not asked)
Plain static HTML + one shared CSS file. No framework, no build step, no JavaScript. Justified by
the actual size of this project: 5 pages, no dynamic data, no backend logic — a framework (React,
a static-site generator) would be unnecessary complexity for content that doesn't change
programmatically. Contact uses `mailto:` links with pre-filled subject/body, reusing the same
process already proven across this whole portfolio (manual read → manual reply → manual invoice),
rather than adding a third-party form-service account dependency.

## Why Back-Office isn't listed here
Its real channel is Etsy (a different marketplace with its own listing, once the pending proposal
is approved), not this site. Adding it here with no real link to point to would be the "claiming
something is launched when it isn't" problem this whole portfolio has deliberately avoided. Add a
page once that listing is actually live.

## Hosting recommendation: GitHub Pages
Chosen over Netlify/Vercel/Cloudflare Pages because: genuinely free with no credit card required,
and it needs a GitHub account anyway — the same account DevDocs Studio's own outreach plan already
needed (see `ventures/devdocs-studio/OFFER_SPEC.md`), so this is one owner action unlocking two
things, not a new standalone dependency.

**Limitations of GitHub Pages, stated honestly, not glossed over:**
- Free tier: 1 GB site size (irrelevant here — this project is a few hundred KB), 100 GB/month
  bandwidth (far more than this traffic level will ever need), soft limit ~10 builds/hour.
- No server-side code, no databases, no server-side form handling — fine here since there's none.
- Served at `<username>.github.io/<repo>` unless a custom domain is added later (not needed now,
  and not purchased — no paid domain assumed or required).
- Public repos get Pages for free; a private repo needs GitHub Pro (paid) for Pages specifically —
  **use a public repo** (the HTML/CSS here has no secrets in it — verified, nothing but static
  marketing copy and a public contact email already used throughout this portfolio).

## Deployment — the exact owner action, nothing more
1. Create a free GitHub account (if one doesn't already exist) — https://github.com/signup
2. Create a new **public** repository (e.g. `verity-works-site`)
3. Push this `website/` folder's contents to that repo's default branch
4. In the repo's Settings → Pages, set source to the default branch, root folder
5. GitHub gives you a real URL: `https://<username>.github.io/verity-works-site/`
6. Replace every `https://example.invalid/...` placeholder in `sitemap.xml`, `robots.txt`, and each
   page's `<link rel="canonical">` with that real URL, then push again

Nothing above was done by the agent — account creation and the actual push/publish are real,
consequential, owner-only actions.

**Before any future deploy**, run `node verify-site.js` from this folder -- automated checks (added
2026-10-14, informed by github.com/moalsayed95/cookbook's pre-deployment-checklist, adapted to what
actually applies to a static, backend-free site) for broken internal links/asset references, the
full required meta-tag set on every page, sitemap accuracy, and a cheap scan for accidentally-
committed secret-shaped strings. All checks currently pass.

**Rollback**: this is a plain static site on a single branch with no build step -- a bad deploy is
just a bad commit. `git revert` the commit (or push the previous commit's tree) and re-push; GitHub
Pages redeploys the new HEAD automatically within about a minute. No blue-green/traffic-shifting
infrastructure is needed or justified at this scale.

## Quality pass performed (objective checks, not invented metrics)
- **Accessibility**: semantic headings, a skip-link to `#main` on every page, visible keyboard focus
  (`:focus-visible`, never suppressed), `lang="en"`, real `alt`-equivalent text context (no
  meaningful images needing alt text — code/data shown as real text, not screenshots).
- **Mobile responsiveness**: fluid type (`clamp()`), card grids collapse to one column under 560px,
  no fixed pixel widths wider than content.
- **Performance**: zero images, two Google Fonts requests per page (same CDN already used
  throughout this portfolio's other artifacts) — total page weight is a few KB of HTML and one
  shared CSS file, plus one tiny first-party script (`assets/ref-tracking.js`, no network calls) and
  one optional analytics script (see below, inert by default).
- **Security**: no inline event handlers, no secrets anywhere in this folder (checked). One
  first-party script (`assets/ref-tracking.js`) only reads the page's own URL and rewrites mailto
  links — no data leaves the browser. One third-party script (GoatCounter, see "Analytics" below) is
  shipped commented out and loads nothing until a real account is wired in.

## Analytics (added 2026-10-14, opt-in)
GitHub's own repo traffic API measures visits to the repo page on github.com, not this published
site — confirmed from GitHub's docs, not assumed. [GoatCounter](https://www.goatcounter.com) (free,
no cookies, no personal data collected) is wired in but shipped **commented out** in every page, so
no tracking script loads and no data is sent anywhere until you deliberately activate it:
1. Create a free account at goatcounter.com (owner-only — not done by the agent)
2. Run `./set-analytics-code.sh <your-site-code>` — fills in your real code and uncomments the tag
3. Review the diff, then commit and push

Separately, `assets/ref-tracking.js` is always on and needs no account: it reads a `?ref=<channel>`
query param on the landing URL and appends it to that page's mailto inquiry link, so a reply shows
which channel it came from even before analytics is activated.
- **Cross-browser**: no bleeding-edge CSS (no `:has()`, no subgrid) — flexbox/grid/custom
  properties only, supported in every browser from roughly 2020 onward.
- **SEO fundamentals**: unique `<title>`/`<meta description>` per page, Open Graph tags, a real
  `sitemap.xml` and `robots.txt`, one `<h1>` per page, semantic nav with `aria-current="page"`.
- **Navigation/UX**: the same header/nav/footer on every page (not an orphaned single Artifact),
  each service's own CTA states exactly what to send and why.

**Not done, and why**: real performance profiling (Lighthouse, WebPageTest) and real SEO ranking
checks require the site to actually be live and crawlable — doing that against local files would
produce numbers that don't mean anything. Worth running once this is actually deployed.
