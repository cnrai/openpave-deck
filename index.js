#!/usr/bin/env node
/**
 * openpave-deck — render a C&R / PAVE branded HTML deck from a slide DSL file.
 *
 * The input is NOT generic markdown. It is an explicit slide DSL: each slide
 * is a `::: slide type=<TYPE> ... :::` block. The calling LLM designs every
 * slide by picking a type and filling its fields. The renderer is a pure
 * template — it does not invent layouts.
 *
 * Usage:
 *   node index.js generate <input.deck> [--output-dir <dir>] [--client <name>]
 *                          [--client-logo <path>] [--contact-name <name>]
 *                          [--contact-email <email>]
 *   node index.js fetch-logo --client <name> [--domain <example.com>] [--output <path>]
 *   node index.js list-types
 */

const fs = require('fs');
const path = require('path');

// =============================================================================
// CLI
// =============================================================================
function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith('--')) { args[key] = next; i++; }
      else args[key] = true;
    } else args._.push(a);
  }
  return args;
}

// =============================================================================
// String helpers
// =============================================================================
function escHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Strip a single pair of matching surrounding quotes from a scalar.
function unquote(s) {
  if (s == null) return s;
  const t = String(s);
  if ((t.startsWith('"') && t.endsWith('"') && t.length >= 2) ||
      (t.startsWith("'") && t.endsWith("'") && t.length >= 2)) {
    return t.slice(1, -1);
  }
  return t;
}

// Render inline markup. Allows raw HTML pass-through (we trust the DSL author).
// Convenience: **bold** and `code`.
function inline(s) {
  if (s == null) return '';
  let out = String(s);
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
  return out;
}

function slugify(s) {
  return String(s || '').toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function todayStr() {
  const d = new Date();
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// =============================================================================
// DSL parser
// =============================================================================
// Block syntax:
//
//   ::: slide type=stats-grid
//   kicker: About Us
//   title: Why C&R
//   stats:
//     - value: 16+
//       label: Years in business
//       variant: blue
//     - value: 50+
//       label: Enterprise projects
//   :::
//
// Rules:
//   - `key: value`   — scalar (trimmed). Empty value (`key:` alone) starts a
//                      child structure (object or list of objects).
//   - List of strings:
//       bullets:
//         - First item
//         - Second item
//   - List of objects:
//       items:
//         - key: a
//           key2: b
//         - key: c
//   - `key: |`   — block scalar, indented lines until dedent.
//   - Lines starting with `#` are comments (must be flush-left of current indent).
//
// Indentation: 2 spaces per level. Tabs not supported (deliberately strict).
// =============================================================================

function parseDeck(src) {
  const lines = src.replace(/\r\n/g, '\n').split('\n');
  const slides = [];
  const meta = {};
  let i = 0;

  function isBlank(l) { return /^\s*(#.*)?$/.test(l); }

  // Parse a fenced block at top-level. Read all non-blank lines until closing :::
  // and pass them to parseBody().
  while (i < lines.length) {
    const line = lines[i];
    const m = /^:::\s*slide\s+type=([\w-]+)\s*$/.exec(line);
    if (m) {
      const type = m[1];
      const body = [];
      i++;
      while (i < lines.length && !/^:::\s*$/.test(lines[i])) {
        body.push(lines[i]); i++;
      }
      i++; // skip closing :::
      slides.push({ type, ...parseBody(body) });
      continue;
    }
    // top-level meta:  @key: value
    const tm = /^@(\w[\w-]*):\s*(.*)$/.exec(line);
    if (tm) { meta[tm[1]] = tm[2].trim(); i++; continue; }
    i++;
  }
  return { meta, slides };
}

// Parse an array of body lines into a JS object.
// Indent unit: 2 spaces.
function parseBody(lines) {
  let i = 0;

  function indentOf(s) {
    const m = /^( *)/.exec(s); return m[1].length;
  }
  function isBlank(s) { return /^\s*(#.*)?$/.test(s); }

  // Parse a mapping at given indent. Returns object plus new i.
  function parseMap(baseIndent) {
    const obj = {};
    while (i < lines.length) {
      const line = lines[i];
      if (isBlank(line)) { i++; continue; }
      const ind = indentOf(line);
      if (ind < baseIndent) return obj;
      if (ind > baseIndent) {
        // unexpected — skip
        i++; continue;
      }
      const rest = line.slice(baseIndent);
      // List item start — caller handles via parseList
      if (rest.startsWith('- ') || rest === '-') return obj;
      const km = /^([\w-]+):\s*(.*)$/.exec(rest);
      if (!km) { i++; continue; }
      const key = km[1];
      const val = km[2];
      if (val === '|') {
        // block scalar
        i++;
        const blockLines = [];
        while (i < lines.length) {
          const l = lines[i];
          if (isBlank(l)) { blockLines.push(''); i++; continue; }
          const li = indentOf(l);
          if (li <= baseIndent) break;
          blockLines.push(l.slice(baseIndent + 2));
          i++;
        }
        obj[key] = blockLines.join('\n').replace(/\n+$/, '');
      } else if (val === '') {
        // child structure — could be list or map
        i++;
        // peek next non-blank
        let j = i;
        while (j < lines.length && isBlank(lines[j])) j++;
        if (j >= lines.length) { obj[key] = null; continue; }
        const nextLine = lines[j];
        const ni = indentOf(nextLine);
        if (ni <= baseIndent) { obj[key] = null; continue; }
        const nrest = nextLine.slice(ni);
        if (nrest.startsWith('- ') || nrest === '-') {
          obj[key] = parseList(ni);
        } else {
          obj[key] = parseMap(ni);
        }
      } else {
        obj[key] = unquote(val);
        i++;
      }
    }
    return obj;
  }

  function parseList(baseIndent) {
    const items = [];
    while (i < lines.length) {
      const line = lines[i];
      if (isBlank(line)) { i++; continue; }
      const ind = indentOf(line);
      if (ind < baseIndent) return items;
      if (ind > baseIndent) { i++; continue; }
      const rest = line.slice(baseIndent);
      if (!rest.startsWith('-')) return items;
      // strip leading "- "
      const after = rest.replace(/^-\s?/, '');
      // If after is `key: value`, treat the whole list item as a map starting on this line.
      // Strategy: replace this line with `  key: value` at indent baseIndent+2 and parse a map.
      const km = /^([\w-]+):\s*(.*)$/.exec(after);
      if (km) {
        // Rewrite the current line so parseMap picks it up at baseIndent+2.
        lines[i] = ' '.repeat(baseIndent + 2) + after;
        const item = parseMap(baseIndent + 2);
        items.push(item);
      } else {
        // Plain string item.
        items.push(after);
        i++;
      }
    }
    return items;
  }

  // Outer: starts at indent 0
  return parseMap(0);
}

// =============================================================================
// Chrome / shared bits
// =============================================================================

function chromeCnr(client, clientLogo, dark = false) {
  const logo = dark ? 'c&r logo white.png' : 'c&r logo black.png';
  let pillHtml = '';
  if (client) {
    pillHtml = clientLogo
      ? `<span class="pill" style="display:inline-flex;align-items:center;padding:6px 14px;"><img src="assets/${clientLogo}" alt="${escHtml(client)}" style="height:28px;display:block;" /></span>`
      : `<span class="pill"><strong>${escHtml(client)}</strong></span>`;
  }
  return `          <div class="chrome">
            <div class="brand-rail"><img src="assets/${logo}" alt="C&R" class="logo" /></div>
            <div class="slide-meta">${pillHtml}</div>
          </div>`;
}

function chromePave(client, clientLogo, surface = false) {
  const logo = 'PAVE_logo_WHT_lockup_horizontal.png';
  const tag = client
    ? (clientLogo
        ? `<div class="pave-client-tag" style="display:flex;align-items:center;"><img src="assets/${clientLogo}" alt="${escHtml(client)}" style="height:32px;filter:brightness(0) invert(1);opacity:0.9;display:block;" /></div>`
        : `<div class="pave-client-tag" style="color:var(--pave-text);font-size:15px;font-weight:600;"><span>${escHtml(client)}</span></div>`)
    : '';
  return `          <div class="pave-chrome">
            <img src="assets/${logo}" alt="PAVE" class="pave-logo">
            ${tag}
          </div>`;
}

function brandFooter(slideNum) {
  return `          <div class="slide-number">${slideNum}</div>
          <div class="brand-bar"></div>`;
}

// =============================================================================
// Slide renderers
// =============================================================================

function R_title(s, ctx) {
  const meta = (s['meta-tags'] || []).map(t => `<span class="meta-tag"><strong>${inline(t)}</strong></span>`).join('\n              ');
  const clientPill = ctx.client
    ? `<div class="slide-meta">
              <span class="meta-tag" style="background:rgba(255,255,255,0.15);border:3px solid rgba(255,255,255,0.4);color:white;box-shadow:3px 3px 0 rgba(0,0,0,0.3);display:flex;align-items:center;${ctx.clientLogo ? 'padding:8px 14px;' : ''}">
                ${ctx.clientLogo
                  ? `<img src="assets/${ctx.clientLogo}" alt="${escHtml(ctx.client)}" style="height:32px;display:block;filter:brightness(0) invert(1);" />`
                  : `<strong style="color:white;">${escHtml(ctx.client)}</strong>`}
              </span>
            </div>`
    : '';
  // Title may contain HTML (e.g. `<em>&</em>` for accent)
  const title = s.title || 'Untitled';
  const tagline = s.tagline ? `<p class="tagline">${inline(s.tagline)}</p>` : '';
  return `        <section class="slide cnr title-slide center" data-slide="${ctx.n}">
          <div class="chrome">
            <div class="brand-rail"><img src="assets/c&r logo white.png" alt="C&R" class="logo" /></div>
            ${clientPill}
          </div>
          <div class="content">
            <h1>${inline(title)}</h1>
            ${tagline}
            ${meta ? `<div class="title-meta">\n              ${meta}\n            </div>` : ''}
          </div>
        </section>`;
}

function R_statsGrid(s, ctx) {
  const stats = (s.stats || []).slice(0, 4);
  const cells = stats.map(st => {
    const variant = st.variant || '';
    return `              <div class="stat-box${variant ? ' ' + variant : ''}"><span class="stat-value">${inline(st.value)}</span><span class="stat-label">${inline(st.label)}</span></div>`;
  }).join('\n');
  return `        <section class="slide cnr" data-slide="${ctx.n}">
${chromeCnr(ctx.client, ctx.clientLogo)}
          <div class="content">
            ${s.kicker ? `<div class="kicker">${inline(s.kicker)}</div>` : ''}
            <h2>${inline(s.title || '')}</h2>
            ${s.intro ? `<p style="max-width:1400px;">${inline(s.intro)}</p>` : ''}
            <div class="grid${stats.length}" style="margin-top:40px;">
${cells}
            </div>
            ${s.outro ? `<p style="max-width:1200px;margin-top:40px;">${inline(s.outro)}</p>` : ''}
          </div>
        </section>`;
}

function R_featureGrid(s, ctx) {
  const items = s.items || [];
  const cols = parseInt(s.columns || items.length, 10) || items.length;
  const gridClass = `grid${Math.min(Math.max(cols, 2), 6)}`;
  const accentMap = {
    blue: { fa: 'flat-icon-lg blue', border: 'var(--brand-blue)' },
    accent: { fa: 'flat-icon-lg accent', border: 'var(--accent)' },
    green: { fa: 'flat-icon-lg', border: '#10b981', extraStyle: 'background:#d1fae5;color:#10b981;border:var(--border);' },
    light: { fa: 'flat-icon-lg light', border: 'var(--brand-blue-light)' },
  };
  const cells = items.map(it => {
    const a = accentMap[it.accent] || accentMap.blue;
    const iconHtml = it.icon
      ? `<div class="${a.fa}" style="margin-bottom:20px;${a.extraStyle || ''}"><i class="fa-solid fa-${escHtml(it.icon)}"></i></div>`
      : '';
    const borderTop = it.accent ? `border-top:6px solid ${a.border};` : '';
    return `              <div class="feature-card" style="${borderTop}">
                ${iconHtml}
                <h4>${inline(it.title || '')}</h4>
                <p>${inline(it.body || '')}</p>
              </div>`;
  }).join('\n');
  return `        <section class="slide cnr" data-slide="${ctx.n}">
${chromeCnr(ctx.client, ctx.clientLogo)}
          <div class="content">
            ${s.kicker ? `<div class="kicker">${inline(s.kicker)}</div>` : ''}
            <h2>${inline(s.title || '')}</h2>
            ${s.intro ? `<p style="max-width:1400px;margin-bottom:8px;">${inline(s.intro)}</p>` : ''}
            <div class="${gridClass}" style="margin-top:32px;">
${cells}
            </div>
          </div>
        </section>`;
}

function R_caseStudy(s, ctx) {
  const tags = (s.tags || []).map(t => `<span class="case-tag">${inline(t)}</span>`).join('\n                  ');
  const bullets = (s.bullets || []).map(b => `<li>${inline(b)}</li>`).join('\n                  ');
  const heroStat = s.stat
    ? `<div class="hero-stat">${inline(s.stat)}</div>
                <div class="hero-stat-label">${inline(s['stat-label'] || '')}</div>`
    : '';
  const images = s.images || (s.image ? [s.image] : []);
  let imageBlock = '';
  if (images.length === 1) {
    imageBlock = `<div style="display:flex;align-items:center;justify-content:center;">
                <img src="${escHtml(images[0])}" alt="${escHtml(s.title || '')}" class="case-image" style="max-width:560px;" />
              </div>`;
  } else if (images.length > 1) {
    imageBlock = `<div class="case-collage" style="max-width:520px;">
${images.map(im => `                <img src="${escHtml(im)}" alt="${escHtml(s.title || '')}" class="case-image" />`).join('\n')}
              </div>`;
  }
  return `        <section class="slide cnr" data-slide="${ctx.n}">
${chromeCnr(ctx.client, ctx.clientLogo)}
          <div class="content" style="padding-top:0;">
            <div class="two-col">
              <div class="case-content">
                ${tags ? `<div class="case-meta">\n                  ${tags}\n                </div>` : ''}
                <h2>${inline(s.title || '')}</h2>
                ${s.body ? `<p>${inline(s.body)}</p>` : ''}
                ${heroStat}
                ${bullets ? `<ul>\n                  ${bullets}\n                </ul>` : ''}
              </div>
              ${imageBlock}
            </div>
          </div>
        </section>`;
}

// =============================================================================
// C&R-themed variants of normally-PAVE slide types (use theme: cnr)
// =============================================================================

function R_compareCnr(s, ctx) {
  const left = s.left || {};
  const right = s.right || {};
  const renderItems = (items, color) => (items || []).map(it => {
    const icon = color === 'red' ? 'fa-xmark' : 'fa-check';
    const c = color === 'red' ? '#dc2626' : '#16a34a';
    return `              <li style="font-size:20px;line-height:1.5;padding-left:36px;position:relative;margin-bottom:12px;color:var(--fg);"><i class="fa-solid ${icon}" style="position:absolute;left:0;top:6px;color:${c};font-size:18px;"></i>${inline(it)}</li>`;
  }).join('\n');
  const block = (col, color, title, quote) => {
    const tint = color === 'red' ? '#fef2f2' : '#f0fdf4';
    const border = color === 'red' ? '#fca5a5' : '#86efac';
    const head = color === 'red' ? '#dc2626' : '#16a34a';
    return `              <div style="padding:36px;background:${tint};border:2px solid ${border};border-radius:14px;">
                <h4 style="font-size:24px;color:${head};margin-bottom:18px;display:flex;align-items:center;gap:10px;"><i class="fa-solid ${color === 'red' ? 'fa-circle-xmark' : 'fa-circle-check'}"></i> ${escHtml(title)}</h4>
                <ul style="list-style:none;padding:0;margin:0;">
${renderItems(col.items, color)}
                </ul>
                ${quote ? `<div style="margin-top:18px;padding:14px 18px;background:white;border:1px dashed ${border};border-radius:8px;font-family:var(--font-mono);font-size:16px;color:var(--fg-muted);font-style:italic;">${inline(quote)}</div>` : ''}
              </div>`;
  };
  return `        <section class="slide cnr" data-slide="${ctx.n}">
${chromeCnr(ctx.client, ctx.clientLogo)}
          <div class="content">
            ${s.kicker ? `<div class="kicker">${inline(s.kicker)}</div>` : ''}
            <h2>${inline(s.title || '')}</h2>
            <div class="grid2" style="margin-top:32px;gap:32px;align-items:stretch;">
${block(left, 'red', left.title || 'Before', left.quote)}
${block(right, 'green', right.title || 'After', right.quote)}
            </div>
          </div>
        </section>`;
}

function R_processStepsCnr(s, ctx) {
  const steps = s.steps || [];
  const stepHtml = steps.map((st, idx) => {
    const num = st.num || String(idx + 1).padStart(2, '0');
    const arrow = idx < steps.length - 1
      ? `<div style="display:flex;align-items:center;flex-shrink:0;color:var(--brand-blue);opacity:0.4;"><i class="fa-solid fa-chevron-right" style="font-size:24px;"></i></div>`
      : '';
    return `              <div class="feature-card" style="flex:1;position:relative;border-top:6px solid var(--brand-blue);padding:28px;">
                <div style="position:absolute;top:-22px;left:24px;width:44px;height:44px;background:var(--brand-blue);color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:var(--font-mono);font-weight:800;font-size:18px;">${escHtml(num)}</div>
                <div style="margin-top:8px;">
                  ${st.icon ? `<div class="flat-icon-lg blue" style="margin-bottom:16px;"><i class="fa-solid fa-${escHtml(st.icon)}"></i></div>` : ''}
                  <h4 style="font-size:24px;margin-bottom:6px;">${inline(st.title || '')}</h4>
                  ${st.duration ? `<p style="font-family:var(--font-mono);font-size:14px;color:var(--brand-blue);letter-spacing:1px;text-transform:uppercase;margin-bottom:10px;font-weight:700;">${inline(st.duration)}</p>` : ''}
                  <p style="font-size:18px;line-height:1.5;color:var(--fg);">${inline(st.body || '')}</p>
                </div>
              </div>${arrow ? '\n' + arrow : ''}`;
  }).join('\n');
  return `        <section class="slide cnr" data-slide="${ctx.n}">
${chromeCnr(ctx.client, ctx.clientLogo)}
          <div class="content">
            ${s.kicker ? `<div class="kicker">${inline(s.kicker)}</div>` : ''}
            <h2>${inline(s.title || '')}</h2>
            ${s.intro ? `<p style="max-width:1400px;margin-bottom:8px;">${inline(s.intro)}</p>` : ''}
            <div style="display:flex;gap:18px;align-items:stretch;margin-top:48px;">
${stepHtml}
            </div>
          </div>
        </section>`;
}

function R_compare(s, ctx) {
  if (s.theme === 'cnr') return R_compareCnr(s, ctx);
  const renderItems = (items, color) => (items || []).map(it =>
    `<div class="compare-item"><i data-lucide="${color === 'red' ? 'x' : 'check'}" style="color:${color === 'red' ? '#f87171' : 'var(--pave-accent)'};width:18px;height:18px;flex-shrink:0;"></i><span class="p-body" style="font-size:19px;">${inline(it)}</span></div>`
  ).join('\n                ');
  const left = s.left || {};
  const right = s.right || {};
  const leftQuote = left.quote
    ? `<div style="margin-top:20px;padding:16px;background:rgba(241,245,249,0.05);border:1px dashed rgba(148,163,184,0.2);border-radius:8px;font-family:var(--pave-font-mono);font-size:17px;color:var(--pave-muted);">${inline(left.quote)}</div>`
    : '';
  const rightQuote = right.quote
    ? `<div style="margin-top:20px;padding:16px;background:rgba(200,255,0,0.06);border:1px solid rgba(200,255,0,0.15);border-radius:8px;font-family:var(--pave-font-mono);font-size:17px;color:var(--pave-accent);">${inline(right.quote)}</div>`
    : '';
  return `        <section class="slide pave pave-surface" data-slide="${ctx.n}" style="display:flex;flex-direction:column;">
${chromePave(ctx.client, ctx.clientLogo)}
          <div class="pave-content" style="flex:1;justify-content:center;">
            <div class="anim anim-d1" style="text-align:center;">
              ${s.kicker ? `<p class="p-label" style="margin-bottom:16px;">${inline(s.kicker)}</p>` : ''}
              <h2 class="p-headline" style="margin-bottom:40px;">${inline(s.title || '')}</h2>
            </div>
            <div class="p-grid-2 anim anim-d2" style="gap:40px;align-items:stretch;">
              <div style="padding:40px;background:rgba(30,41,59,0.6);border:1px solid var(--pave-border);border-radius:16px;">
                <p class="p-subtitle" style="font-size:24px;color:#f87171;display:flex;align-items:center;gap:8px;margin-bottom:20px;"><i data-lucide="x-circle" style="width:22px;height:22px;"></i> ${inline(left.title || 'Before')}</p>
                ${renderItems(left.items, 'red')}
                ${leftQuote}
              </div>
              <div style="padding:40px;background:rgba(200,255,0,0.04);border:2px solid rgba(200,255,0,0.2);border-radius:16px;">
                <p class="p-subtitle" style="font-size:24px;color:var(--pave-accent);display:flex;align-items:center;gap:8px;margin-bottom:20px;"><i data-lucide="check-circle-2" style="width:22px;height:22px;"></i> ${inline(right.title || 'After')}</p>
                ${renderItems(right.items, 'green')}
                ${rightQuote}
              </div>
            </div>
          </div>
${brandFooter(ctx.n)}
        </section>`;
}

function R_processSteps(s, ctx) {
  if (s.theme === 'cnr') return R_processStepsCnr(s, ctx);
  const colors = [
    { bar: 'var(--pave-accent)', tint: 'rgba(163,230,53,0.06)' },
    { bar: '#60a5fa',             tint: 'rgba(96,165,250,0.06)' },
    { bar: '#4ade80',             tint: 'rgba(74,222,128,0.06)' },
    { bar: '#f59e0b',             tint: 'rgba(245,158,11,0.06)' },
  ];
  const steps = s.steps || [];
  const stepHtml = steps.map((st, idx) => {
    const c = colors[idx % colors.length];
    const num = st.num || String(idx + 1).padStart(2, '0');
    const arrow = idx < steps.length - 1
      ? `<div style="display:flex;align-items:center;flex-shrink:0;"><i data-lucide="chevron-right" style="width:28px;height:28px;color:var(--pave-accent);opacity:0.4;"></i></div>`
      : '';
    return `              <div style="flex:1;position:relative;background:linear-gradient(135deg,${c.tint} 0%,transparent 60%);border:1px solid var(--pave-border);border-top:3px solid ${c.bar};border-radius:16px;padding:32px 28px;">
                <div style="position:absolute;top:-18px;left:28px;width:36px;height:36px;background:${c.bar};border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:var(--pave-font-display);font-weight:800;font-size:18px;color:var(--pave-base);">${escHtml(num)}</div>
                <div style="margin-top:12px;">
                  ${st.icon ? `<i data-lucide="${escHtml(st.icon)}" style="width:28px;height:28px;color:${c.bar};margin-bottom:12px;"></i>` : ''}
                  <p class="p-subtitle" style="font-size:26px;margin-bottom:8px;">${inline(st.title || '')}</p>
                  ${st.duration ? `<p style="font-family:var(--pave-font-mono);font-size:16px;color:${c.bar};letter-spacing:1px;text-transform:uppercase;margin-bottom:12px;">${inline(st.duration)}</p>` : ''}
                  <p style="color:var(--pave-text);font-size:19px;line-height:1.5;">${inline(st.body || '')}</p>
                </div>
              </div>${arrow ? '\n' + arrow : ''}`;
  }).join('\n');
  const callout = s.callout
    ? `<div class="anim anim-d3" style="margin-top:28px;display:flex;align-items:center;gap:14px;padding:20px 32px;background:rgba(163,230,53,0.04);border:1px solid rgba(163,230,53,0.15);border-radius:14px;max-width:1100px;margin-left:auto;margin-right:auto;">
              ${s.callout.icon ? `<i data-lucide="${escHtml(s.callout.icon)}" style="width:24px;height:24px;color:var(--pave-accent);flex-shrink:0;"></i>` : ''}
              <div>
                <p class="p-subtitle" style="font-size:22px;margin-bottom:2px;">${inline(s.callout.title || '')}</p>
                <p style="color:var(--pave-text-secondary);font-size:20px;line-height:1.5;">${inline(s.callout.body || '')}</p>
              </div>
            </div>`
    : '';
  return `        <section class="slide pave pave-surface" data-slide="${ctx.n}" style="display:flex;flex-direction:column;">
${chromePave(ctx.client, ctx.clientLogo)}
          <div class="pave-content" style="flex:1;justify-content:center;">
            <div class="anim anim-d1" style="text-align:center;">
              ${s.kicker ? `<p class="p-label" style="margin-bottom:8px;">${inline(s.kicker)}</p>` : ''}
              <h2 class="p-headline" style="margin-bottom:8px;">${inline(s.title || '')}</h2>
              ${s.intro ? `<p style="color:var(--pave-muted);font-size:20px;max-width:1000px;margin:0 auto 32px;">${inline(s.intro)}</p>` : ''}
            </div>
            <div class="anim anim-d2" style="display:flex;gap:20px;align-items:stretch;">
${stepHtml}
            </div>
            ${callout}
          </div>
${brandFooter(ctx.n)}
        </section>`;
}

function R_paveDivider(s, ctx) {
  const bg = s['bg-image']
    ? `<div class="pave-bg-image" style="background-image:url('${escHtml(s['bg-image'])}');opacity:${s['bg-opacity'] || '0.5'};"></div>`
    : '';
  return `        <section class="slide pave pave-gradient" data-slide="${ctx.n}" style="display:flex;flex-direction:column;">
          ${bg}
${chromePave(ctx.client, ctx.clientLogo)}
          <div class="pave-divider">
            <div class="anim anim-d1" style="margin-bottom:32px;">
              <img src="assets/PAVE_logo_WHT_lockup_horizontal.png" alt="PAVE" style="height:80px;">
            </div>
            ${s.kicker ? `<div class="anim anim-d2"><p class="p-label" style="margin-bottom:24px;">${inline(s.kicker)}</p></div>` : ''}
            <div class="anim anim-d3">
              <h2 class="p-display" style="margin-bottom:24px;">${inline(s.title || '')}</h2>
            </div>
            ${s.body ? `<div class="anim anim-d4"><p class="p-body-large muted-text">${inline(s.body)}</p></div>` : ''}
          </div>
${brandFooter(ctx.n)}
        </section>`;
}

function R_paveStatement(s, ctx) {
  const bg = s['bg-image']
    ? `<div class="pave-bg-image" style="background-image:url('${escHtml(s['bg-image'])}');opacity:${s['bg-opacity'] || '0.25'};"></div>`
    : '';
  const stats = (s.stats || []).map(st => `
              <div style="text-align:center;padding:20px 28px;background:rgba(200,255,0,0.06);border:1px solid rgba(200,255,0,0.2);border-radius:16px;">
                <div style="font-family:var(--pave-font-display);font-weight:800;font-size:56px;color:var(--pave-accent);line-height:1;">${inline(st.value)}</div>
                <p style="font-family:var(--pave-font-mono);font-size:15px;font-weight:600;color:var(--pave-muted);margin-top:8px;letter-spacing:0.08em;text-transform:uppercase;">${inline(st.label)}</p>
              </div>`).join('');
  return `        <section class="slide pave" data-slide="${ctx.n}" style="display:flex;flex-direction:column;">
          ${bg}
${chromePave(ctx.client, ctx.clientLogo)}
          <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 120px;position:relative;z-index:1;">
            ${s.kicker ? `<div class="anim anim-d1"><p class="p-label" style="margin-bottom:24px;font-size:18px;">${inline(s.kicker)}</p></div>` : ''}
            <div class="anim anim-d2">
              <h2 class="p-display" style="font-size:72px;margin-bottom:32px;">${inline(s.title || '')}</h2>
            </div>
            ${s.body ? `<div class="anim anim-d3"><p class="p-subtitle" style="color:var(--pave-accent);font-weight:700;font-size:28px;">${inline(s.body)}</p></div>` : ''}
            ${stats ? `<div class="anim anim-d4" style="display:flex;gap:48px;margin-top:56px;">${stats}\n            </div>` : ''}
          </div>
${brandFooter(ctx.n)}
        </section>`;
}

function R_paveCaseStudy(s, ctx) {
  const tagColors = ['var(--pave-accent)', '#60a5fa', '#4ade80'];
  const tagBgs    = ['rgba(163,230,53,0.1)', 'rgba(96,165,250,0.1)', 'rgba(74,222,128,0.1)'];
  const tagBorders= ['rgba(163,230,53,0.25)', 'rgba(96,165,250,0.25)', 'rgba(74,222,128,0.25)'];
  const tags = (s.tags || []).slice(0, 3).map((t, i) =>
    `<span style="display:inline-block;padding:5px 14px;background:${tagBgs[i]};border:1px solid ${tagBorders[i]};border-radius:6px;font-family:var(--pave-font-mono);font-size:14px;color:${tagColors[i]};font-weight:600;">${inline(t)}</span>`
  ).join('\n                  ');
  const bullets = (s.bullets || []).map(b =>
    `<div style="display:flex;align-items:center;gap:10px;"><i data-lucide="check" style="width:18px;height:18px;color:var(--pave-accent);flex-shrink:0;"></i><p style="color:var(--pave-text);font-size:18px;">${inline(b)}</p></div>`
  ).join('\n                  ');
  const stat = s.stat
    ? `<div style="display:flex;align-items:baseline;gap:12px;margin-bottom:24px;">
                  <span style="font-family:var(--pave-font-display);font-size:64px;font-weight:800;color:var(--pave-accent);line-height:1;">${inline(s.stat)}</span>
                  <span style="color:var(--pave-text-secondary);font-size:18px;">${inline(s['stat-label'] || '')}</span>
                </div>`
    : '';
  const images = s.images || (s.image ? [s.image] : []);
  let imgBlock = '';
  if (images.length === 1) {
    imgBlock = `<div class="anim anim-d2" style="border:1px solid var(--pave-border);border-radius:12px;overflow:hidden;background:var(--pave-base);">
                <img src="${escHtml(images[0])}" alt="${escHtml(s.title || '')}" style="width:100%;height:auto;max-height:540px;object-fit:cover;display:block;" />
              </div>`;
  } else if (images.length > 1) {
    imgBlock = `<div class="anim anim-d2" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
${images.slice(0, 4).map(im =>
  `                <div style="border:1px solid var(--pave-border);border-radius:10px;overflow:hidden;background:var(--pave-base);"><img src="${escHtml(im)}" alt="${escHtml(s.title || '')}" style="width:100%;height:auto;max-height:240px;object-fit:cover;display:block;" /></div>`
).join('\n')}
              </div>`;
  }
  const surfaceClass = s.variant === 'gradient' ? '' : ' pave-surface';
  return `        <section class="slide pave${surfaceClass}" data-slide="${ctx.n}" style="display:flex;flex-direction:column;">
${chromePave(ctx.client, ctx.clientLogo)}
          <div class="pave-content" style="flex:1;justify-content:center;">
            <div style="display:grid;grid-template-columns:1.1fr 0.9fr;gap:24px;align-items:center;">
              <div class="anim anim-d1">
                ${tags ? `<div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;">\n                  ${tags}\n                </div>` : ''}
                <h2 class="p-headline" style="font-size:48px;margin-bottom:16px;">${inline(s.title || '')}</h2>
                ${s.body ? `<p style="color:var(--pave-text-secondary);font-size:20px;line-height:1.6;margin-bottom:24px;">${inline(s.body)}</p>` : ''}
                ${stat}
                ${bullets ? `<div style="display:flex;flex-direction:column;gap:10px;">\n                  ${bullets}\n                </div>` : ''}
              </div>
              ${imgBlock}
            </div>
          </div>
${brandFooter(ctx.n)}
        </section>`;
}

function R_paveContent(s, ctx) {
  // Generic dark content slide with optional bullet list and feature cards
  const bullets = (s.bullets || []).map(b =>
    `<div style="display:flex;align-items:center;gap:10px;"><i data-lucide="check" style="width:20px;height:20px;color:var(--pave-accent);flex-shrink:0;"></i><p style="color:var(--pave-text);font-size:20px;line-height:1.5;">${inline(b)}</p></div>`
  ).join('\n                ');
  const items = (s.items || []).map(it =>
    `<div style="background:var(--pave-surface);border:1px solid var(--pave-border);border-left:4px solid var(--pave-accent);border-radius:14px;padding:24px 28px;">
                ${it.icon ? `<i data-lucide="${escHtml(it.icon)}" style="width:28px;height:28px;color:var(--pave-accent);margin-bottom:12px;"></i>` : ''}
                <p class="p-subtitle" style="font-size:24px;margin-bottom:8px;">${inline(it.title || '')}</p>
                <p style="color:var(--pave-text-secondary);font-size:19px;line-height:1.5;">${inline(it.body || '')}</p>
              </div>`
  ).join('\n              ');
  const cols = (s.items || []).length;
  const gridStyle = cols === 2 ? 'grid-template-columns:1fr 1fr;'
    : cols === 3 ? 'grid-template-columns:repeat(3,1fr);'
    : cols >= 4 ? 'grid-template-columns:repeat(4,1fr);'
    : 'grid-template-columns:1fr;';
  const surface = s.variant === 'gradient' ? '' : ' pave-surface';
  return `        <section class="slide pave${surface}" data-slide="${ctx.n}" style="display:flex;flex-direction:column;">
${chromePave(ctx.client, ctx.clientLogo)}
          <div class="pave-content" style="flex:1;justify-content:center;">
            <div class="anim anim-d1" style="text-align:center;">
              ${s.kicker ? `<p class="p-label" style="margin-bottom:8px;">${inline(s.kicker)}</p>` : ''}
              <h2 class="p-headline" style="margin-bottom:16px;">${inline(s.title || '')}</h2>
              ${s.intro ? `<p style="color:var(--pave-muted);font-size:20px;max-width:1000px;margin:0 auto 32px;">${inline(s.intro)}</p>` : ''}
            </div>
            ${cols ? `<div class="anim anim-d2" style="display:grid;${gridStyle}gap:24px;">\n              ${items}\n            </div>` : ''}
            ${bullets ? `<div class="anim anim-d2" style="display:flex;flex-direction:column;gap:14px;max-width:1100px;margin:0 auto;">\n                ${bullets}\n            </div>` : ''}
          </div>
${brandFooter(ctx.n)}
        </section>`;
}

function R_pricingTable(s, ctx) {
  // Light/CnR theme pricing or roadmap table with rows of {label, value, note?}
  const rows = (s.rows || []).map(r =>
    `              <div style="display:grid;grid-template-columns:1.5fr 1fr 1.7fr;gap:20px;padding:14px 24px;background:var(--bg);border:var(--border);box-shadow:var(--shadow-sm);align-items:center;">
                <div style="font-family:var(--font-mono);font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:var(--brand-blue);line-height:1.2;">${inline(r.label || '')}</div>
                <div style="font-size:24px;font-weight:800;color:var(--fg);line-height:1.1;">${inline(r.value || '')}</div>
                <div style="font-size:15px;color:var(--fg-muted);line-height:1.35;">${inline(r.note || '')}</div>
              </div>`
  ).join('\n');
  return `        <section class="slide cnr" data-slide="${ctx.n}">
${chromeCnr(ctx.client, ctx.clientLogo)}
          <div class="content">
            ${s.kicker ? `<div class="kicker">${inline(s.kicker)}</div>` : ''}
            <h2>${inline(s.title || '')}</h2>
            ${s.intro ? `<p style="max-width:1400px;margin-bottom:8px;font-size:20px;">${inline(s.intro)}</p>` : ''}
            <div style="display:flex;flex-direction:column;gap:10px;margin-top:20px;">
${rows}
            </div>
            ${s.outro ? `<p style="margin-top:24px;font-size:20px;"><strong>${inline(s.outro)}</strong></p>` : ''}
          </div>
        </section>`;
}

function R_thankYou(s, ctx) {
  const meta = (s['meta-tags'] || []).map(t => `<span class="meta-tag"><strong>${inline(t)}</strong></span>`).join('\n              ');
  const name = s['contact-name'] || ctx.contactName;
  const email = s['contact-email'] || ctx.contactEmail;
  return `        <section class="slide cnr title-slide center" data-slide="${ctx.n}">
          <div class="chrome">
            <div class="brand-rail"><img src="assets/c&r logo white.png" alt="C&R" class="logo" /></div>
            ${ctx.client ? `<div class="slide-meta"><span class="meta-tag" style="background:rgba(255,255,255,0.15);border:3px solid rgba(255,255,255,0.4);color:white;box-shadow:3px 3px 0 rgba(0,0,0,0.3);"><strong style="color:white;">${escHtml(ctx.client)}</strong></span></div>` : ''}
          </div>
          <div class="content">
            <h1>${inline(s.title || 'Thank You')}</h1>
            ${s.body ? `<p class="tagline">${inline(s.body)}</p>` : ''}
            <div class="title-meta">
              ${name ? `<span class="meta-tag"><strong>${escHtml(name)}</strong></span>` : ''}
              ${email ? `<span class="meta-tag"><strong>${escHtml(email)}</strong></span>` : ''}
              ${meta}
            </div>
          </div>
        </section>`;
}

function R_clientGrid(s, ctx) {
  // Optional: list of {logo, name} cells with an embedded text block
  const cells = (s.clients || []).map((c, i) => {
    const variant = i % 2 === 0 ? 'blue' : 'accent';
    return `            <div class="client-cell ${variant}"><img src="${escHtml(c.logo)}" alt="${escHtml(c.name || '')}" class="client-logo" /></div>`;
  }).join('\n');
  return `        <section class="slide cnr" data-slide="${ctx.n}">
${chromeCnr(ctx.client, ctx.clientLogo)}
          <div class="client-grid">
${cells}
            <div class="client-cell white text-block">
              <h2>${inline(s.title || '')}</h2>
              <p>${inline(s.body || '')}</p>
            </div>
          </div>
        </section>`;
}

// =============================================================================
// Slide renderers (additions — high-impact visual layouts)
// =============================================================================

// C&R light split: hero text on left, big colour-blocked panel on right.
function R_split(s, ctx) {
  const tags = (s.tags || []).map(t => `<span class="case-tag">${inline(t)}</span>`).join('\n                  ');
  const bullets = (s.bullets || []).map(b => `<li>${inline(b)}</li>`).join('\n                  ');
  const heroStat = s.stat
    ? `<div class="hero-stat" style="margin-top:24px;">${inline(s.stat)}</div>
                <div class="hero-stat-label">${inline(s['stat-label'] || '')}</div>`
    : '';
  const variant = s.variant || 'accent';
  let right;
  if (s.image) {
    right = `<div style="border:var(--border);border-radius:16px;overflow:hidden;background:var(--bg-soft);box-shadow:var(--shadow-md);max-width:560px;"><img src="${escHtml(s.image)}" alt="${escHtml(s.title || '')}" style="width:100%;height:100%;object-fit:cover;display:block;max-height:560px;" /></div>`;
  } else if (s['big-number']) {
    const bg = variant === 'blue' ? 'var(--brand-blue)' : 'var(--accent)';
    const fg = variant === 'blue' ? 'white' : 'var(--brand-blue)';
    right = `<div style="background:${bg};color:${fg};border-radius:16px;padding:64px 48px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;min-height:480px;box-shadow:var(--shadow-md);max-width:560px;">
                ${s['big-icon'] ? `<div style="font-size:64px;margin-bottom:24px;opacity:0.85;"><i class="fa-solid fa-${escHtml(s['big-icon'])}"></i></div>` : ''}
                <div style="font-size:160px;font-weight:800;line-height:1;letter-spacing:-0.04em;">${inline(s['big-number'])}</div>
                ${s['big-label'] ? `<div style="font-family:var(--font-mono);font-size:22px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;margin-top:20px;opacity:0.85;">${inline(s['big-label'])}</div>` : ''}
              </div>`;
  } else {
    right = `<div style="background:var(--accent);color:var(--brand-blue);border-radius:16px;padding:48px;display:flex;align-items:center;justify-content:center;min-height:480px;font-size:32px;font-weight:700;text-align:center;max-width:560px;">${inline(s['right-text'] || '')}</div>`;
  }
  return `        <section class="slide cnr" data-slide="${ctx.n}">
${chromeCnr(ctx.client, ctx.clientLogo)}
          <div class="content" style="padding-top:0;">
            <div class="two-col">
              <div class="case-content">
                ${tags ? `<div class="case-meta">\n                  ${tags}\n                </div>` : ''}
                ${s.kicker ? `<div class="kicker">${inline(s.kicker)}</div>` : ''}
                <h2>${inline(s.title || '')}</h2>
                ${s.body ? `<p>${inline(s.body)}</p>` : ''}
                ${heroStat}
                ${bullets ? `<ul>\n                  ${bullets}\n                </ul>` : ''}
              </div>
              ${right}
            </div>
          </div>
        </section>`;
}

// PAVE dark split.
function R_paveSplit(s, ctx) {
  const bullets = (s.bullets || []).map(b =>
    `<div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:14px;"><i data-lucide="check" style="width:22px;height:22px;color:var(--pave-accent);flex-shrink:0;margin-top:4px;"></i><p style="color:var(--pave-text);font-size:21px;line-height:1.5;">${inline(b)}</p></div>`
  ).join('\n              ');
  let right;
  if (s.image) {
    right = `<div style="border:1px solid var(--pave-border);border-radius:16px;overflow:hidden;background:var(--pave-base);"><img src="${escHtml(s.image)}" alt="${escHtml(s.title || '')}" style="width:100%;height:100%;object-fit:cover;display:block;max-height:540px;" /></div>`;
  } else if (s['big-number']) {
    right = `<div style="background:linear-gradient(160deg,rgba(200,255,0,0.12) 0%,rgba(200,255,0,0.02) 100%);border:2px solid rgba(200,255,0,0.3);border-radius:20px;padding:64px 48px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;min-height:480px;">
                ${s['big-icon'] ? `<i data-lucide="${escHtml(s['big-icon'])}" style="width:56px;height:56px;color:var(--pave-accent);margin-bottom:24px;"></i>` : ''}
                <div style="font-family:var(--pave-font-display);font-size:160px;font-weight:800;line-height:1;color:var(--pave-accent);letter-spacing:-0.04em;">${inline(s['big-number'])}</div>
                ${s['big-label'] ? `<div style="font-family:var(--pave-font-mono);font-size:20px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:var(--pave-muted);margin-top:24px;">${inline(s['big-label'])}</div>` : ''}
              </div>`;
  } else {
    right = `<div style="background:rgba(30,41,59,0.6);border:1px solid var(--pave-border);border-radius:16px;padding:48px;display:flex;align-items:center;justify-content:center;min-height:480px;font-family:var(--pave-font-display);font-size:32px;font-weight:700;color:var(--pave-text);text-align:center;">${inline(s['right-text'] || '')}</div>`;
  }
  return `        <section class="slide pave pave-surface" data-slide="${ctx.n}" style="display:flex;flex-direction:column;">
${chromePave(ctx.client, ctx.clientLogo)}
          <div class="pave-content" style="flex:1;justify-content:center;">
            <div style="display:grid;grid-template-columns:1.1fr 0.9fr;gap:48px;align-items:center;">
              <div class="anim anim-d1">
                ${s.kicker ? `<p class="p-label" style="margin-bottom:16px;">${inline(s.kicker)}</p>` : ''}
                <h2 class="p-headline" style="font-size:52px;margin-bottom:20px;">${inline(s.title || '')}</h2>
                ${s.body ? `<p style="color:var(--pave-text-secondary);font-size:22px;line-height:1.55;margin-bottom:24px;">${inline(s.body)}</p>` : ''}
                ${bullets ? `<div style="margin-top:8px;">\n              ${bullets}\n            </div>` : ''}
              </div>
              <div class="anim anim-d2">${right}</div>
            </div>
          </div>
${brandFooter(ctx.n)}
        </section>`;
}

// Big statement: full-bleed PAVE slide with one giant statement and at most a quiet sub-line.
function R_bigStatement(s, ctx) {
  const bg = s['bg-image']
    ? `<div class="pave-bg-image" style="background-image:url('${escHtml(s['bg-image'])}');opacity:${s['bg-opacity'] || '0.4'};"></div>`
    : '';
  const variant = s.variant || 'gradient';
  const surfaceClass = variant === 'accent' ? ' pave-accent-bg' : variant === 'dark' ? '' : ' pave-gradient';
  return `        <section class="slide pave${surfaceClass}" data-slide="${ctx.n}" style="display:flex;flex-direction:column;">
          ${bg}
${chromePave(ctx.client, ctx.clientLogo)}
          <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 140px;position:relative;z-index:1;">
            ${s.kicker ? `<div class="anim anim-d1" style="margin-bottom:32px;"><p class="p-label" style="font-size:18px;">${inline(s.kicker)}</p></div>` : ''}
            <div class="anim anim-d2">
              <h2 class="p-display" style="font-size:96px;line-height:1.05;margin-bottom:32px;">${inline(s.title || '')}</h2>
            </div>
            ${s.body ? `<div class="anim anim-d3" style="max-width:1100px;"><p class="p-body-large" style="font-size:30px;line-height:1.4;">${inline(s.body)}</p></div>` : ''}
            ${s.attribution ? `<div class="anim anim-d4" style="margin-top:48px;"><p class="p-caption">${inline(s.attribution)}</p></div>` : ''}
          </div>
${brandFooter(ctx.n)}
        </section>`;
}

// Phase bars: rising bar chart, current phase highlighted.
function R_phaseBars(s, ctx) {
  const bars = (s.bars || []).slice(0, 6);
  const max = Math.max(...bars.map(b => Number(b.height || 1)), 1);
  const barHtml = bars.map((b, idx) => {
    const h = Math.max(80, Math.round((Number(b.height || 1) / max) * 380));
    const accent = b.current === true || b.current === 'true';
    const barBg = accent
      ? 'background:linear-gradient(180deg,rgba(200,255,0,0.32) 0%,rgba(200,255,0,0.06) 100%);border:2px solid rgba(200,255,0,0.4);'
      : 'background:linear-gradient(180deg,rgba(100,116,139,0.28) 0%,rgba(100,116,139,0.08) 100%);border:1px solid rgba(100,116,139,0.25);';
    const labelBg = accent
      ? 'background:rgba(200,255,0,0.06);border:2px solid rgba(200,255,0,0.4);border-top:none;'
      : 'background:rgba(30,41,59,0.6);border:1px solid rgba(100,116,139,0.25);border-top:none;';
    const titleColor = accent ? 'color:var(--pave-accent);font-weight:800;font-size:22px;' : 'color:rgba(241,245,249,0.85);font-weight:700;font-size:19px;';
    const tagColor = accent ? 'color:var(--pave-accent);font-weight:700;' : 'color:rgba(241,245,249,0.4);';
    const badge = accent ? `<div style="position:absolute;top:16px;right:16px;background:var(--pave-accent);color:var(--pave-base);font-family:var(--pave-font-mono);font-size:12px;font-weight:700;padding:4px 10px;border-radius:4px;letter-spacing:0.08em;">${inline(b.badge || 'WE ARE HERE')}</div>` : '';
    const icon = b.icon
      ? `<i data-lucide="${escHtml(b.icon)}" style="width:${accent ? 48 : 36}px;height:${accent ? 48 : 36}px;color:${accent ? 'var(--pave-accent)' : 'rgba(148,163,184,0.6)'};"></i>`
      : '';
    return `              <div style="flex:1;max-width:${accent ? 280 : 260}px;display:flex;flex-direction:column;align-items:center;">
                <div style="width:100%;height:${h}px;${barBg}border-radius:${accent ? 20 : 16}px ${accent ? 20 : 16}px 0 0;border-bottom:none;display:flex;align-items:center;justify-content:center;position:relative;">
                  ${badge}
                  ${icon}
                </div>
                <div style="width:100%;padding:20px 16px;${labelBg}border-radius:0 0 12px 12px;text-align:center;">
                  <p style="font-family:var(--pave-font-display);${titleColor}margin-bottom:6px;">${inline(b.title || '')}</p>
                  <p style="font-size:17px;color:rgba(241,245,249,0.6);line-height:1.4;">${inline(b.body || '')}</p>
                  ${b.tag ? `<p style="font-family:var(--pave-font-mono);font-size:15px;${tagColor}margin-top:8px;letter-spacing:0.05em;">${inline(b.tag)}</p>` : ''}
                </div>
              </div>`;
  }).join('\n');
  return `        <section class="slide pave pave-surface" data-slide="${ctx.n}" style="display:flex;flex-direction:column;">
${chromePave(ctx.client, ctx.clientLogo)}
          <div class="pave-content" style="flex:1;justify-content:center;">
            <div class="anim anim-d1" style="text-align:center;">
              ${s.kicker ? `<p class="p-label" style="margin-bottom:16px;">${inline(s.kicker)}</p>` : ''}
              <h2 class="p-headline" style="margin-bottom:48px;">${inline(s.title || '')}</h2>
            </div>
            <div class="anim anim-d2" style="display:flex;align-items:flex-end;justify-content:center;gap:32px;padding:0 40px;">
${barHtml}
            </div>
            ${s.outro ? `<p class="anim anim-d3" style="text-align:center;color:var(--pave-muted);font-size:20px;margin-top:32px;max-width:1000px;margin-left:auto;margin-right:auto;">${inline(s.outro)}</p>` : ''}
          </div>
${brandFooter(ctx.n)}
        </section>`;
}

const RENDERERS = {
  'title': R_title,
  'stats-grid': R_statsGrid,
  'feature-grid': R_featureGrid,
  'case-study': R_caseStudy,
  'compare': R_compare,
  'process-steps': R_processSteps,
  'pave-divider': R_paveDivider,
  'pave-statement': R_paveStatement,
  'pave-case-study': R_paveCaseStudy,
  'pave-content': R_paveContent,
  'pricing-table': R_pricingTable,
  'thank-you': R_thankYou,
  'client-grid': R_clientGrid,
  'split': R_split,
  'big-statement': R_bigStatement,
  'phase-bars': R_phaseBars,
  'pave-split': R_paveSplit,
};

// =============================================================================
// Generate
// =============================================================================

function generate(args) {
  const inputPath = args.input || args._[0];
  if (!inputPath || !fs.existsSync(inputPath)) {
    console.error('Error: input deck file is required and must exist.');
    console.error('Usage: openpave-deck generate <input.deck>');
    process.exit(1);
  }
  const src = fs.readFileSync(inputPath, 'utf8');
  const { meta, slides } = parseDeck(src);

  if (slides.length === 0) {
    console.error('Error: no `::: slide type=...` blocks found in input.');
    console.error('See `openpave-deck list-types` for available slide types.');
    process.exit(1);
  }

  const docTitle = meta.title || (slides[0] && slides[0].title) || 'Untitled Deck';
  const slug = slugify(docTitle);
  const inputDir = path.dirname(path.resolve(inputPath));
  const outDir = args['output-dir'] || path.join(inputDir, `${slug}-deck`);

  const client = args.client || meta.client || '';
  const contactName = args['contact-name'] || meta['contact-name'] || 'Anne So';
  const contactEmail = args['contact-email'] || meta['contact-email'] || 'anne.so@candrholdings.com';

  fs.mkdirSync(outDir, { recursive: true });
  const outAssets = path.join(outDir, 'assets');
  fs.mkdirSync(outAssets, { recursive: true });
  const tmplAssets = path.join(__dirname, 'templates', 'assets');
  for (const f of fs.readdirSync(tmplAssets)) {
    fs.copyFileSync(path.join(tmplAssets, f), path.join(outAssets, f));
  }

  let clientLogo = null;
  if (args['client-logo'] && fs.existsSync(args['client-logo'])) {
    const ext = path.extname(args['client-logo']);
    clientLogo = `client-logo${ext}`;
    fs.copyFileSync(args['client-logo'], path.join(outAssets, clientLogo));
  }

  const slidesHtml = [];
  let n = 1;
  for (const s of slides) {
    const r = RENDERERS[s.type];
    if (!r) {
      console.warn(`! Unknown slide type "${s.type}" — skipping`);
      continue;
    }
    slidesHtml.push(r(s, { n, client, clientLogo, contactName, contactEmail, docTitle }));
    n++;
  }

  const head = fs.readFileSync(path.join(__dirname, 'templates', '_head.html'), 'utf8')
    .replace('{{TITLE}}', escHtml(`${docTitle} — C&R Holdings`));
  const foot = fs.readFileSync(path.join(__dirname, 'templates', '_foot.html'), 'utf8')
    .replace(/\{\{DECK_KEY\}\}/g, slug)
    .replace(/>1 \/ \d+</, `>1 / ${slidesHtml.length}<`);

  const html = `${head}
  <body>
    <div class="stage">
      <div class="deck" id="deck">

${slidesHtml.join('\n\n')}

      </div>
    </div>

    ${foot}
`;
  const outFile = path.join(outDir, 'index.html');
  fs.writeFileSync(outFile, html, 'utf8');
  console.log(`✓ Deck generated: ${outFile}`);
  console.log(`  ${slidesHtml.length} slides`);
  console.log(`  Open: open "${outFile}"`);
}

function listTypes() {
  console.log(`openpave-deck slide types:

  title           Title slide (C&R blue, big H1, tagline, meta tags)
  stats-grid      4-up bold stat boxes — for "by the numbers" slides
  feature-grid    2/3/4-up icon cards — capabilities, pillars, features
  case-study      2-col light case study with image collage and hero stat
  compare         Two-column dark before/after with red ✗ and green ✓ items
  process-steps   3-4 numbered steps in a row with chevrons (PAVE dark)
  pave-divider    PAVE-themed transition slide (big text on gradient)
  pave-statement  PAVE-themed bold statement with optional small stat tiles
  pave-case-study PAVE-themed dark case study with tags + stat + image(s)
  pave-content    Generic PAVE-themed content (title + bullets and/or items)
  pricing-table   C&R light pricing/roadmap rows (label / value / note)
  thank-you       Closing C&R blue slide with contact details
  client-grid     C&R coloured grid of client logos with embedded text block

See SKILL.md for the full DSL with worked examples.`);
}

// =============================================================================
// fetch-logo — preserved from previous version
// =============================================================================

async function fetchLogo(args) {
  const https = require('https');
  const http = require('http');
  const url = require('url');
  const name = args.client || args.name;
  const domain = args.domain;
  if (!name && !domain) {
    console.error('Usage: fetch-logo --client <name> [--domain <example.com>] [--output <path>]');
    process.exit(1);
  }
  const out = args.output || `${slugify(name || domain || 'logo')}-logo.png`;

  function get(u, redirects = 5) {
    return new Promise((resolve, reject) => {
      const lib = u.startsWith('https') ? https : http;
      lib.get(u, { headers: { 'User-Agent': 'Mozilla/5.0 openpave-deck/1.0' } }, res => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirects > 0) {
          const next = url.resolve(u, res.headers.location);
          res.resume();
          return get(next, redirects - 1).then(resolve, reject);
        }
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`HTTP ${res.statusCode} ${u}`));
        }
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => resolve({ body: Buffer.concat(chunks), contentType: res.headers['content-type'] || '' }));
        res.on('error', reject);
      }).on('error', reject);
    });
  }

  const domains = [];
  if (domain) domains.push(domain);
  if (name) {
    const slug = name.toLowerCase().replace(/\s+/g, '');
    domains.push(`${slug}.com`, `${slug}.com.hk`, `www.${slug}.com`, `www.${slug}.com.hk`);
  }

  for (const d of domains) {
    for (const proto of ['https', 'http']) {
      try {
        const home = await get(`${proto}://${d}/`);
        const html = home.body.toString('utf8');
        const imgs = [...html.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi)].map(m => m[1]);
        const logos = imgs.filter(s => /logo/i.test(s) && !/chat|footer|partner|sponsor|payment/i.test(s));
        logos.sort((a, b) => {
          const score = s => (/\.svg/i.test(s) ? 100 : 0) + (/header|main|primary/i.test(s) ? 10 : 0) - (/short|mobile|small|icon/i.test(s) ? 20 : 0);
          return score(b) - score(a);
        });
        for (const candidate of logos.slice(0, 5)) {
          const abs = candidate.startsWith('http') ? candidate : url.resolve(`${proto}://${d}/`, candidate);
          try {
            const r = await get(abs);
            if (r.body.length > 500) {
              fs.writeFileSync(out, r.body);
              console.log(`✓ Logo saved (${r.body.length} bytes)`);
              console.log(`  source: ${abs}`);
              console.log(`  → ${path.resolve(out)}`);
              return;
            }
          } catch (e) { /* continue */ }
        }
        break;
      } catch (e) { /* try next proto/domain */ }
    }
  }

  for (const d of domains) {
    try {
      const r = await get(`https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${d}&size=256`);
      if (r.body.length > 500) {
        fs.writeFileSync(out, r.body);
        console.log(`✓ Favicon saved (${r.body.length} bytes from gstatic for ${d})`);
        console.log(`  → ${path.resolve(out)}`);
        return;
      }
    } catch (e) { /* continue */ }
  }

  console.error('✗ Could not find a logo for that client.');
  process.exit(2);
}

// =============================================================================
// Entry
// =============================================================================
function main() {
  const [, , cmd, ...rest] = process.argv;
  const args = parseArgs(rest);
  switch (cmd) {
    case 'generate': return generate(args);
    case 'fetch-logo': return fetchLogo(args);
    case 'list-types': return listTypes();
    case undefined:
    case '-h':
    case '--help':
      console.log(`openpave-deck — render a C&R/PAVE branded HTML deck from a slide DSL.

Commands:
  generate <input.deck> [--output-dir <dir>] [--client <name>] [--client-logo <path>]
                        [--contact-name <name>] [--contact-email <email>]
  fetch-logo --client <name> [--domain <example.com>] [--output <path>]
  list-types
`); return;
    default:
      console.error(`Unknown command: ${cmd}`);
      process.exit(1);
  }
}

main();
