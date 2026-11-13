#!/usr/bin/env node
// Click-tracking checklist for a site that loads /js/analytics.js (PostHog).
//
// Usage (from the repo root):  node shared/check-tracking.mjs <site-folder>
//
// Per site: <site>/js/analytics.js exists.
// Per page (every *.html under the folder):
//   - loads <script src="/js/analytics.js">;
//   - every link that leaves the site (another host, sms:, tel:, mailto:)
//     carries data-event and data-location;
//   - every <form> carries data-event and data-location;
//   - every data-event is snake_case.
// Other links and buttons are still recorded by analytics.js as
// link_clicked / button_clicked, so they are not required to carry a name.
// Prints each page's named events and exits 1 on any miss. No dependencies.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

const site = process.argv[2];
if (!site) {
  console.error('Usage: node shared/check-tracking.mjs <site-folder>');
  process.exit(2);
}
const ROOT = resolve(site);
if (!existsSync(ROOT)) {
  console.error(`No such folder: ${ROOT}`);
  process.exit(2);
}

// Hosts that count as this site, so links to them need no name.
const SITE_HOSTS = new Set(['tapathletes.com', 'www.tapathletes.com']);
const SKIP_DIRS = new Set(['node_modules', '.git', '.vercel']);
const EVENT_NAME = /^[a-z][a-z0-9]*(_[a-z0-9]+)+$/;

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
  for (const m of body.matchAll(ATTR)) a[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? '';
  return a;
}

function tags(html, name) {
  return [...html.matchAll(new RegExp(`<${name}(?=[\\s/>])[^>]*>`, 'gi'))].map((m) => ({
    line: html.slice(0, m.index).split('\n').length,
    a: attrs(m[0]),
  }));
}

function leavesSite(href) {
  if (/^(sms|tel|mailto):/i.test(href)) return true;
  if (!/^https?:\/\//i.test(href)) return false;
  try {
    return !SITE_HOSTS.has(new URL(href).hostname);
  } catch {
    return true;
  }
}

const misses = [];
if (!existsSync(join(ROOT, 'js', 'analytics.js'))) misses.push(`${site}/js/analytics.js is missing`);

const pages = walk(ROOT).sort();
for (const file of pages) {
  const rel = relative(ROOT, file).split(sep).join('/');
  // Comments are blanked (newlines kept) so commented-out markup is ignored and line numbers hold.
  const html = readFileSync(file, 'utf8').replace(/<!--[\s\S]*?-->/g, (c) => c.replace(/[^\n]/g, ' '));

  if (!tags(html, 'script').some(({ a }) => a.src === '/js/analytics.js')) {
    misses.push(`${rel}: does not load /js/analytics.js`);
  }

  const named = [];
  const check = (kind, line, a, required) => {
    const event = a['data-event'];
    if (event !== undefined) {
      if (!EVENT_NAME.test(event)) misses.push(`${rel}:${line}: data-event "${event}" is not snake_case`);
      if (!a['data-location']) misses.push(`${rel}:${line}: ${kind} data-event="${event}" has no data-location`);
      named.push(event);
    } else if (required) {
      misses.push(`${rel}:${line}: ${kind} ${a.href ?? a.id ?? ''} has no data-event`);
    }
  };
  for (const { line, a } of tags(html, 'a')) check('<a>', line, a, leavesSite(a.href ?? ''));
  for (const { line, a } of tags(html, 'button')) check('<button>', line, a, false);
  for (const { line, a } of tags(html, 'form')) check('<form>', line, a, true);

  const counts = {};
  for (const e of named) counts[e] = (counts[e] ?? 0) + 1;
  const list = Object.entries(counts).map(([e, n]) => (n > 1 ? `${e} x${n}` : e)).join(', ');
  console.log(`${rel}: ${named.length} named${list ? ` (${list})` : ''}`);
}

if (misses.length) {
  console.error(`\n${misses.length} miss(es):`);
  for (const m of misses) console.error(`  ${m}`);
  process.exit(1);
}
console.log(`\nAll ${pages.length} pages pass.`);
