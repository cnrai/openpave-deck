# openpave-deck

Generate a beautiful **C&R-branded HTML presentation deck** from an explicit slide DSL.
The skill is a pure renderer — *you* (the calling LLM) decide the slide type for every
slide. There is no auto-detection or auto-pagination.

---

## Authoring Philosophy — read this first

When asked to turn a Dropbox Paper / proposal / report into a deck, follow this rule:

> **Stay true to the source. Don't miss anything. Don't invent anything. Shorten where
> possible. Design every slide. The order of slides should match the order of sections
> in the source paper.**

Concretely:

1. **Read the source paper end-to-end first.** Use `dropbox_read` if it's a Dropbox Paper.
   Confirm the URL/path with the user if there's any ambiguity — there are often multiple
   versions.
2. **Map paper sections → slides 1:1, in order.** §1 Exec Summary → slide 2,
   §1.1 → slide 3, etc. Don't reorder for "narrative flow"; the author already chose the order.
3. **Every fact, number, and bullet must trace to a line in the paper.** No invented
   stats, fabricated quotes, or made-up credentials. If you can't cite the line, cut it.
4. **Shorten, don't expand.** A 7-row feature table becomes 7 short bullets, not 4
   bullets plus 3 invented ones. A long paragraph becomes one tight sentence.
5. **Design every slide** — never a wall of bullets. Pick the slide type that best
   matches the content shape (3 items → `feature-grid`; before/after → `compare`;
   numbered phases → `process-steps`; one big idea → `big-statement`).
6. **PAVE-themed slides only for PAVE-specific content.** If the paper mentions PAVE
   Studio in §1.2, that's the *only* slide that should use a `pave-*` type. Every other
   slide is C&R themed. Don't sprinkle PAVE slides for visual variety.
7. **Cluster theme switches.** If you do have multiple PAVE slides, put them in one
   contiguous block. Minimise C&R↔PAVE transitions.

---

## Workflow

```bash
# 1. Read the source paper
dropbox_read "/CnR/Client/Project/proposal.paper"

# 2. Author the deck DSL → /tmp/deck.md (see syntax below)

# 3. Fetch client logo
node /path/to/openpave-deck/index.js fetch-logo \
  --client "Acme" --domain acme.com --output /tmp/acme-logo.png

# 4. Generate
node /path/to/openpave-deck/index.js generate /tmp/deck.md \
  --client Acme --client-logo /tmp/acme-logo.png

# 5. Open the result
open /tmp/<deck-title>-deck/index.html
```

---

## DSL syntax

A deck file has front-matter `@key: value` lines, then one or more slide blocks:

```
@title: My Deck Title
@client: Acme
@contact-name: Anne So
@contact-email: anne.so@candrholdings.com

::: slide type=<slide-type>
key: value
key: value
list-key:
  - item one
  - item two
nested-list:
  - title: First
    body: Description
  - title: Second
    body: Description
:::
```

Front-matter keys: `@title`, `@client`, `@contact-name`, `@contact-email`.

CLI flags `--client` and `--client-logo` override `@client`.

Every slide is rendered exactly as authored — no pagination, no auto-detection. If a
slide overflows, fix it in the DSL.

---

## Slide types reference

### C&R light theme

#### `title` — cover slide
```
::: slide type=title
title: Above-Ground <em>Photo</em><br/>Verification System
tagline: Proof-of-Concept Proposal · v2.0
meta-tags:
  - C&R Wise AI Limited
  - 13 April 2026
  - Customer Installation Services
:::
```

#### `split` — text + stat panel (best for "intro a topic with a hero number")
```
::: slide type=split
kicker: Executive Summary
title: AI-Powered <em>Visual Verification</em>
body: One short paragraph explaining the slide.
bullets:
  - <strong>Pilot scope</strong> — 2 use cases
  - <strong>Timeline</strong> — 8–10 weeks
variant: blue
big-number: 200k
big-icon: hk-dollar-sign
big-label: HKD · Phase 1
:::
```

#### `feature-grid` — 3 to 6 cards in a single row
```
::: slide type=feature-grid
kicker: Solution Overview
title: Five <em>Verification Modules</em>
intro: Optional one-line lead.
items:
  - icon: fire
    title: Exhaust Pipe
    body: One-sentence description.
    accent: blue
  - icon: link
    title: Pipe Joint
    body: One-sentence description.
    accent: accent
:::
```
Accents: `blue`, `accent` (lime), `light`, `green`. Icons are FontAwesome 6 solid names
(no `fa-` prefix).

**Hard rule:** if you have 5 cards, put all 5 in one row. Never have one orphan card on
a second row. The renderer already enforces `grid5` and `grid6`; just keep counts to
3, 4, 5, or 6.

#### `stats-grid` — 4 big numbers
```
::: slide type=stats-grid
kicker: Success Metrics
title: How We'll <em>Measure Success</em>
stats:
  - value: <10s
    label: Per-photo processing
    variant: accent
  - value: >99%
    label: Sync reliability
:::
```
Variants: `accent` (lime), `light` (blue tint), or omit for default. Max 4 stats.

#### `compare` — left vs right (with `theme: cnr` to stay light)
```
::: slide type=compare
theme: cnr
kicker: Demarcation
title: Who Does What
left:
  title: C&R
  items:
    - Discovery and requirements
    - AI model development
right:
  title: Towngas
  items:
    - Provide sample images
    - Provide API access
:::
```

Without `theme: cnr` this renders dark/PAVE — usually you want `theme: cnr`.

#### `process-steps` — numbered phases (with `theme: cnr` to stay light)
```
::: slide type=process-steps
theme: cnr
kicker: Timeline · 8–10 Weeks
title: Six Phases to <em>Pilot Deployment</em>
intro: Optional lead.
steps:
  - num: 01
    icon: magnifying-glass
    title: Discovery
    duration: 1 week
    body: One-sentence description.
:::
```

Without `theme: cnr` → PAVE dark theme. Use 4–6 steps.

#### `pricing-table` — itemised cost table
```
::: slide type=pricing-table
kicker: Investment · Phase 1
title: HKD <em>200,000</em> · Total
intro: Optional lead.
rows:
  - label: Discovery & Planning
    value: HKD 12,000
    note: Requirements, data collection
  - label: Phase 1 Total
    value: HKD 200,000
    note: All-inclusive
:::
```
Sized to fit up to 8 rows. Keep total row last.

#### `big-statement` — one bold sentence, full bleed
```
::: slide type=big-statement
kicker: Anti-Fraud · Optional Scope
title: One unit photographed from <em>multiple angles</em>, submitted as evidence for several.
body: Optional supporting line.
:::
```

#### `client-grid` — logo wall
#### `case-study` — case-study layout
#### `phase-bars` — rising bar chart with "WE ARE HERE" highlight
#### `thank-you` — closing contact slide

```
::: slide type=thank-you
title: Let's <em>Build</em>.
body: Proposal validity — 30 days from issue.
contact-name: Anne So, Chief Strategy Officer
contact-email: anne.so@candrholdings.com
:::
```

### PAVE dark theme — use sparingly, only for genuine PAVE content

#### `pave-divider` — section break into PAVE territory
```
::: slide type=pave-divider
kicker: Development Approach
title: Powered by <span class="accent-text">PAVE Studio</span>
body: One-sentence pitch.
bg-image: https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1920&q=80
bg-opacity: 0.5
:::
```

#### `pave-statement`, `pave-content`, `pave-case-study`, `pave-split`

Same structure patterns as their C&R counterparts but with the dark theme. **Only use
these when the slide is genuinely about PAVE Studio / PAVE methodology.** A section
about anti-fraud, architecture, or pricing should *not* use PAVE slides.

---

## Authoring rules — quick reference

| Rule | Why |
| --- | --- |
| Map paper sections 1:1 in order | Don't reorder the author's narrative |
| Every bullet traces to a paper line | No fabrication, ever |
| Shorten, don't expand | Decks are not papers |
| 3, 4, 5, or 6 cards per `feature-grid` | Single row, no orphans |
| Max 4 `stats-grid` stats | Layout breaks past 4 |
| `compare` and `process-steps` need `theme: cnr` | Otherwise they're dark/PAVE |
| Pricing tables ≤ 8 rows | Fits the frame |
| One PAVE block, contiguous | Minimise theme thrash |
| `pave-*` types for PAVE-specific content only | Anti-fraud, pricing, architecture are *not* PAVE topics |
| Use `<em>...</em>` for accent words in titles | Adds the lime underline treatment |

---

## Chrome behaviour (handled by renderer)

- **Logo area:** if `--client-logo` is provided, only the logo is shown (never logo + text
  duplicated). If no logo, the client name is shown as text. This applies to title,
  C&R chrome, and PAVE chrome.
- **C&R logo** flips automatically (black on light slides, white on title/PAVE).
- **Slide visibility**: slide 1 is shown on first paint regardless of `?slide=` URL.
- **Overflow:** `.slide.cnr .content` clips at the frame so overlong slides don't bleed.

---

## CLI

### `generate <input.md>`

```
node /path/to/openpave-deck/index.js generate <input.md> \
  [--output-dir <dir>] \
  [--client <name>] \
  [--client-logo <path-to-logo.png>] \
  [--contact-name <name>] \
  [--contact-email <email>]
```

Output goes to `<input-dir>/<slugified-title>-deck/index.html`.

### `fetch-logo`

```
node /path/to/openpave-deck/index.js fetch-logo \
  --client "<name>" \
  [--domain <example.com>] \
  [--output <path>]
```

Always pass `--domain` for best results. Falls back to Google's faviconV2 service.

### `list-themes`

Show the two themes (`cnr` / `pave`) and per-slide-type theme defaults.

---

## Stage size

All slides are 1920 × 1080 and scaled to fit the viewport.

---

## Common pitfalls

1. **Using the wrong source doc.** Multiple versions of the same paper often exist
   (`v2`, `v3`, `v4`, `PoC`, `SoW`). Confirm the URL/path with the user.
2. **Inventing pricing or stats** to "fill out" a slide. Cut the slide instead.
3. **Picking PAVE slide types for non-PAVE content** because they look cooler. They
   confuse the reader about what's being pitched.
4. **5-card `feature-grid` causing an orphan.** Renderer handles `grid5`/`grid6` —
   just keep counts to 3, 4, 5, or 6.
5. **Pricing table with 10+ rows** → overflows. Consolidate sub-items into notes.
6. **Long bullets** (>12 words) → wrap awkwardly. Shorten or split.
