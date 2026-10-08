#!/usr/bin/env node
// The docs/web-estate.md "Per-site metadata package" as a script.
//
// Usage (from the repo root):  node shared/check-metadata.mjs <site-folder>
//
// Per page (every *.html under the folder): <title>, meta description,
// canonical, Open Graph (og:title, og:description, og:image, og:url),
// twitter:card, alt on every <img>, a parseable JSON-LD block.
// Per site (at the folder root): robots.txt, sitemap.xml, llms.txt,
// site.webmanifest, a favicon, an Apple touch icon.
//
// Pages carrying <meta name="robots" content="noindex"> are listed but exempt.
// Prints a table per page and exits 1 on any miss. No dependencies.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

const site = process.argv[2];
if (!site) {
  console.error('Usage: node shared/check-metadata.mjs <site-folder>');
  process.exit(2);
}
const ROOT = resolve(site);
if (!existsSync(ROOT)) {
  console.error(`No such folder: ${ROOT}`);
  process.exit(2);
}

const SKIP_DIRS = new Set(['node_modules', '.git', '.vercel']);

function walk(dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (!SKIP_DIRS.has(e.name)) out.push(...walk(join(dir, e.name)));
    } else if (e.name.toLowerCase().endsWith('.html')) {
      out.push(join(dir, e.name));
    }
  }
  return out;
}

const ATTR = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;

function attrs(tag) {
  const body = tag.replace(/^<[a-zA-Z0-9]+/, '').replace(/\/?>$/, '');
  const a = {};
  for (const m of body.matchAll(ATTR)) {
    a[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? '';
  }
  return a;
}

function tags(html, name) {
  return [...html.matchAll(new RegExp(`<${name}(?=[\\s/>])[^>]*>`, 'gi'))].map((m) => attrs(m[0]));
}

function checkPage(raw) {
  // JSON-LD is read before comments are stripped: the academy wraps its block
  // in structured-data:start/end comment markers, but the script sits between them.
  const ldBlocks = [...raw.matchAll(/<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  let ld = ldBlocks.length > 0;
  for (const b of ldBlocks) {
    try {
      JSON.parse(b[1]);
    } catch {
      ld = false;
    }
  }

  const html = raw.replace(/<!--[\s\S]*?-->/g, '');
  const head = html.split(/<\/head>/i)[0];
  const metas = tags(head, 'meta');
  const meta = (key, val) => metas.find((m) => (m[key] ?? '').toLowerCase() === val && (m.content ?? '').trim() !== '');
  const title = /<title[^>]*>\s*[^<\s][^<]*<\/title>/i.test(head);
  const canonical = tags(head, 'link').some((l) => (l.rel ?? '').toLowerCase().split(/\s+/).includes('canonical') && (l.href ?? '').trim() !== '');
  const og = ['og:title', 'og:description', 'og:image', 'og:url'].filter((p) => !meta('property', p) && !meta('name', p));
  const twitter = Boolean(meta('name', 'twitter:card') || meta('property', 'twitter:card'));
  const imgs = tags(html, 'img');
  const noAlt = imgs.filter((i) => !('alt' in i)).length;

  const noindex = metas.some((m) => (m.name ?? '').toLowerCase() === 'robots' && /noindex/i.test(m.content ?? ''));

  return {
    noindex,
    title,
    description: Boolean(meta('name', 'description')),
    canonical,
    og: og.length === 0,
    ogMissing: og,
    twitter,
    alt: noAlt === 0,
    altDetail: `${imgs.length - noAlt}/${imgs.length}`,
    jsonld: ld,
  };
}

const COLS = [
  ['title', 'title'],
  ['description', 'desc'],
  ['canonical', 'canon'],
  ['og', 'og'],
  ['twitter', 'twitter'],
  ['alt', 'img alt'],
  ['jsonld', 'json-ld'],
];

const pages = walk(ROOT).sort();
const rows = pages.map((f) => {
  const rel = relative(ROOT, f).split(sep).join('/');
  return { rel, r: checkPage(readFileSync(f, 'utf8')) };
});

let misses = 0;
const width = Math.max(4, ...rows.map((x) => x.rel.length));
const cell = (ok, extra = '') => (ok ? 'ok' : 'MISS') + extra;

console.log(`\n${site}: ${rows.length} page(s)\n`);
console.log(['page'.padEnd(width), ...COLS.map(([, h]) => h.padEnd(9))].join('  '));
console.log(['-'.repeat(width), ...COLS.map(() => '-'.repeat(9))].join('  '));
for (const { rel, r } of rows) {
  if (r.noindex) {
    // A noindex page (e.g. a print source for a PDF) is not part of the public
    // metadata package; it is listed but not scored.
    console.log([rel.padEnd(width), 'noindex: exempt'].join('  '));
    continue;
  }
  const cells = COLS.map(([k]) => {
    if (!r[k]) misses++;
    const extra = k === 'alt' ? ` ${r.altDetail}` : '';
    return cell(r[k], extra).padEnd(9);
  });
  console.log([rel.padEnd(width), ...cells].join('  '));
}
const ogNotes = rows.filter((x) => !x.r.noindex && x.r.ogMissing.length && x.r.ogMissing.length < 4);
for (const { rel, r } of ogNotes) console.log(`  ${rel}: missing ${r.ogMissing.join(', ')}`);

const dir = readdirSync(ROOT);
const has = (re) => dir.some((n) => re.test(n));
const rootChecks = [
  ['robots.txt', existsSync(join(ROOT, 'robots.txt'))],
  ['sitemap.xml', existsSync(join(ROOT, 'sitemap.xml'))],
  ['llms.txt', existsSync(join(ROOT, 'llms.txt'))],
  ['site.webmanifest', existsSync(join(ROOT, 'site.webmanifest'))],
  ['favicon', has(/^favicon(\.ico|\.svg|-\d+x\d+\.png|\.png)$/i)],
  ['apple-touch-icon', has(/^apple-touch-icon(-\d+x\d+)?\.png$/i)],
];
console.log('\nsite root');
for (const [name, ok] of rootChecks) {
  if (!ok) misses++;
  console.log(`  ${name.padEnd(18)}${ok ? 'ok' : 'MISS'}`);
}

console.log(`\n${misses === 0 ? 'PASS' : `FAIL: ${misses} miss(es)`}\n`);
process.exit(misses === 0 ? 0 : 1);
